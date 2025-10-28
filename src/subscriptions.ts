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
  url: string;
  subscriptionName: SubscriptionFieldName;
  rx: AsyncIterator<any>;
  timeoutHandle?: NodeJS.Timeout;
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

    return subscriptionIterable;
  };

  const sendMessage = async (message: any, url: string) => {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(message),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to send data to ${url}: ${response.status} ${response.statusText}`
      );
    }

    response.body?.cancel(); // We don't care about the response body but want to free up resources
  };

  const startMessaging = (id: string, url: string, rx: AsyncIterable<any>) => {
    (async () => {
      for await (const message of rx) {
        try {
          await sendMessage(message, url);
          logger.debug(`[Subscription] Sent message to ${url}`, message);
        } catch (error) {
          logger.error(
            `[Subscription] Error sending message to ${url}:`,
            error
          );
          stop(id, `Subscription stopped due to delivery error`);
          break;
        }
      }
      stop(id, 'Subscription completed gracefully');
    })();
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

    startMessaging(id, event.url, rx);

    clients.set(id, {
      url: event.url,
      subscriptionName,
      rx,
      timeoutHandle: sofa.webhooks?.maxSubscriptionWebhookLifetimeSeconds
        ? setTimeout(() => {
            stop(id, 'Max subscription lifetime reached');
          }, sofa.webhooks?.maxSubscriptionWebhookLifetimeSeconds * 1000)
        : undefined,
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
      logger.warn(
        `Subscription with ID '${id}' does not exist (${terminationReason}), might have been already stopped. Skipping stop.`
      );
      return { id };
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
      await sendMessage(terminationMessage, client.url);
    }

    if (client.timeoutHandle) {
      clearTimeout(client.timeoutHandle);
    }

    // this terminates the rx stream
    if (client.rx.return) {
      await client.rx.return();
    }
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

    if (client.rx.return) {
      await client.rx.return();
    }

    const rx = await readableStreamFromOperationCall(
      event.id,
      client.subscriptionName,
      event,
      contextValue
    );

    startMessaging(event.id, client.url, rx);
    client.rx = rx;
    return { id: event.id };
  };
  return { start, stop, update };
}
