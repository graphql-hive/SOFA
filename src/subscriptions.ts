import {
  type DocumentNode,
  type VariableDefinitionNode,
  type ExecutionResult,
  Kind,
  type OperationTypeNode,
} from 'graphql';
import { fetch, crypto } from '@whatwg-node/fetch';
import { buildOperationNodeForField } from '@graphql-tools/utils';
import type { ContextValue } from './types.js';
import type { Sofa } from './sofa.js';
import { getOperationInfo } from './ast.js';
import { parseVariable } from './parse.js';
import { logger } from './logger.js';
import { ObjMap } from 'graphql/jsutils/ObjMap.js';
import { pipeline, Readable, Writable } from 'readable-stream';

type SubscriptionFieldName = string;
type ID = string;

export interface StartSubscriptionEvent {
  subscription: SubscriptionFieldName;
  variables: any;
  url: string;
}

export interface UpdateSubscriptionEvent {
  id: ID;
  variables: any;
}

interface BuiltOperation {
  operationName: string;
  document: DocumentNode;
  variables: ReadonlyArray<VariableDefinitionNode>;
}

interface StoredClient {
  subscriptionName: SubscriptionFieldName;
  rx: Readable;
  tx: Writable;
}

function isAsyncIterable(obj: any): obj is AsyncIterable<any> {
  return typeof obj[Symbol.asyncIterator] === 'function';
}

export function createSubscriptionManager(sofa: Sofa) {
  const subscription = sofa.schema.getSubscriptionType();

  if (!subscription) {
    throw new Error('Schema does not have subscription type');
  }

  const fieldMap = subscription.getFields();
  const operations = new Map<SubscriptionFieldName, BuiltOperation>();
  const clients = new Map<ID, StoredClient>();

  for (const field in fieldMap) {
    const operationNode = buildOperationNodeForField({
      kind: 'subscription' as OperationTypeNode,
      field,
      schema: sofa.schema,
      models: sofa.models,
      ignore: sofa.ignore,
      circularReferenceDepth: sofa.depthLimit,
    });
    const document: DocumentNode = {
      kind: Kind.DOCUMENT,
      definitions: [operationNode],
    };

    const { variables, name: operationName } = getOperationInfo(document)!;

    operations.set(field, {
      operationName,
      document,
      variables,
    });
  }

  const readableStreamFromOperationCall = async (
    id: ID,
    subscriptionName: SubscriptionFieldName,
    event: StartSubscriptionEvent | UpdateSubscriptionEvent,
    contextValue: ContextValue
  ) => {
    const operation = operations.get(subscriptionName);
    if (!operation) {
      throw new Error(`Subscription '${subscriptionName}' is not available`);
    }

    logger.info(`[Subscription] Start ${id}`, event);

    const variableValues = operation.variables.reduce((values, variable) => {
      const value = parseVariable({
        value: event.variables[variable.variable.name.value],
        variable,
        schema: sofa.schema,
      });

      if (typeof value === 'undefined') {
        return values;
      }

      return {
        ...values,
        [variable.variable.name.value]: value,
      };
    }, {});

    const subscriptionIterable = await sofa.subscribe({
      schema: sofa.schema,
      document: operation.document,
      operationName: operation.operationName,
      variableValues,
      contextValue,
    });

    if (!isAsyncIterable(subscriptionIterable)) {
      throw subscriptionIterable as ExecutionResult;
    }

    // In case we do not get yielded an actual readable stream
    // we want to convert it to one
    return Readable.from(subscriptionIterable, {
      objectMode: true,
      highWaterMark: 100,
    });
  };

  const mergeTxRxStreams = (id: ID, rx: Readable, tx: Writable) => {
    pipeline(rx, tx, (err) => {
      if (err) {
        logger.error(`[Subscription] Pipeline error on ${id}: ${err.message}`);
        stop(id, 'Subscription pipeline errored out');
      }
    });

    rx.on('data', (chunk) => {
      console.log('rx data', chunk);
    });
    rx.on('close', () => {
      stop(id, 'Subscription closed by client');
    });
    rx.on('end', () => {
      stop(id, 'Subscription completed, no further data available');
    });
    rx.on('error', (err) => {
      logger.error(`[Subscription] Error on ${id}: ${err.message}`);
      stop(id, 'Subscription errored out (rx)');
    });
  };

  const start = async (
    event: StartSubscriptionEvent,
    contextValue: ContextValue
  ) => {
    const id = crypto.randomUUID();
    const subscriptionName = event.subscription;

    const rx = await readableStreamFromOperationCall(
      id,
      subscriptionName,
      event,
      contextValue
    );

    const tx = new Writable({
      objectMode: true,
      highWaterMark: 100,
      async write(message, _encoding, callback) {
        logger.info(`[Subscription] Trigger ${id}`);

        try {
          const response = await fetch(event.url, {
            method: 'POST',
            body: JSON.stringify(message),
            headers: {
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(
              (sofa.webhooks?.timeoutSeconds || 5) * 1000
            ),
          });

          if (!response.ok) {
            logger.error(
              `[Subscription] Failed to send data for ${id} to ${event.url}: ${response.status} ${response.statusText}`
            );
            callback(
              new Error(
                `Failed to send data for ${id} to ${event.url}: ${response.status} ${response.statusText}`
              )
            );
            return;
          }

          response.body?.cancel(); // We don't care about the response body but want to free up resources
          callback();
        } catch (err) {
          callback(err instanceof Error ? err : new Error(String(err)));
        }
      },
    });

    tx.on('error', (err) => {
      logger.error(`[Subscription] Error on ${id}: ${err.message}`);
      stop(id, 'Subscription errored out (tx)');
    });

    mergeTxRxStreams(id, rx, tx);

    console.log(rx._readableState);

    clients.set(id, {
      subscriptionName,
      rx,
      tx,
    });

    return { id };
  };

  const stop = async (
    /**
     * Subscription ID
     */
    id: ID,
    /**
     * Reason for termination. Set to null to skip sending termination message.
     */
    terminationReason?: string | null
  ) => {
    logger.info(`[Subscription] Stop ${id}`);

    const client = clients.get(id);

    if (!client) {
      throw new Error(
        `Subscription with ID '${id}' does not exist (${terminationReason})`
      );
    }

    if (sofa.webhooks?.terminationMessage && terminationReason !== null) {
      const termination =
        typeof sofa.webhooks.terminationMessage === 'function'
          ? sofa.webhooks.terminationMessage(
              terminationReason || 'Subscription terminated'
            )
          : {
              reason:
                typeof sofa.webhooks.terminationMessage === 'boolean'
                  ? terminationReason || 'Subscription terminated'
                  : sofa.webhooks.terminationMessage,
            };

      const terminationMessage: ExecutionResult<
        ObjMap<unknown>,
        ObjMap<unknown>
      > = {
        extensions: {
          webhook: {
            termination,
          },
        },
      };
      client.tx.write(terminationMessage);
    }

    // stop listening for messages on the subscription
    client.rx.destroy();
    // clear the sending stream since we are done
    client.tx.end();
    // remove the client from the map
    clients.delete(id);

    return { id };
  };

  const update = async (
    event: UpdateSubscriptionEvent,
    contextValue: ContextValue
  ) => {
    logger.info(`[Subscription] Update ${event.id}`, event);
    const client = clients.get(event.id);
    if (!client) {
      throw new Error(`Subscription with ID '${event.id}' does not exist`);
    }

    client.rx.destroy();

    const rx = await readableStreamFromOperationCall(
      event.id,
      client.subscriptionName,
      event,
      contextValue
    );

    mergeTxRxStreams(event.id, rx, client.tx);
    client.rx = rx;
    return { id: event.id };
  };
  return { start, stop, update };
}
