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

function isAsyncIterable(obj: any): obj is AsyncIterable<any> {
  return typeof obj[Symbol.asyncIterator] === 'function';
}

// To start subscription:
//   - an url that Sofa should trigger
//   - name of a subscription
//   - variables if needed
//   - some sort of an auth token
//   - Sofa should return a unique id of that subscription
//   - respond with OK 200

// To stop subscription
//   - an id is required
//   - respond with OK 200

// To update subscription
//   - an id is required
//   - new set of variables

export type ID = string;
export type SubscriptionFieldName = string;

export interface StartSubscriptionEvent {
  subscription: SubscriptionFieldName;
  variables: any;
  url: string;
}

export interface UpdateSubscriptionEvent {
  id: ID;
  variables: any;
}

export interface StopSubscriptionResponse {
  id: ID;
}

interface BuiltOperation {
  operationName: string;
  document: DocumentNode;
  variables: ReadonlyArray<VariableDefinitionNode>;
}

interface StoredClient {
  name: SubscriptionFieldName;
  url: string;
  iterator: AsyncIterator<any>;
  maxLifetimeTimeout?: NodeJS.Timeout;
}

export class SubscriptionManager {
  private operations = new Map<SubscriptionFieldName, BuiltOperation>();
  private clients = new Map<ID, StoredClient>();

  constructor(private sofa: Sofa) {
    this.buildOperations();
  }

  public async start(
    event: StartSubscriptionEvent,
    contextValue: ContextValue
  ) {
    const id = crypto.randomUUID();
    const name = event.subscription;

    if (!this.operations.has(name)) {
      throw new Error(`Subscription '${name}' is not available`);
    }

    logger.info(`[Subscription] Start ${id}`, event);

    const result = await this.execute({
      id,
      name,
      url: event.url,
      variables: event.variables,
      contextValue,
    });

    if (typeof result !== 'undefined') {
      return result;
    }

    return { id };
  }

  public async stop(
    /**
     * Subscription ID
     */
    id: ID,
    /**
     * Reason for termination. Set to null to skip sending termination message.
     */
    terminationReason?: string | null
  ): Promise<StopSubscriptionResponse> {
    logger.info(`[Subscription] Stop ${id}`);

    if (!this.clients.has(id)) {
      throw new Error(
        `Subscription with ID '${id}' does not exist (${terminationReason})`
      );
    }

    const execution = this.clients.get(id)!;

    if (execution.maxLifetimeTimeout) {
      clearTimeout(execution.maxLifetimeTimeout);
    }

    if (this.sofa.webhooks?.terminationMessage && terminationReason !== null) {
      const termination =
        typeof this.sofa.webhooks.terminationMessage === 'function'
          ? this.sofa.webhooks.terminationMessage(
              terminationReason || 'Subscription terminated'
            )
          : {
              reason:
                typeof this.sofa.webhooks.terminationMessage === 'boolean'
                  ? terminationReason || 'Subscription terminated'
                  : this.sofa.webhooks.terminationMessage,
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
      await this.sendData({
        id,
        result: terminationMessage,
      });
    }

    if (execution.iterator.return) {
      execution.iterator.return();
    }

    this.clients.delete(id);

    return { id };
  }

  public async update(
    event: UpdateSubscriptionEvent,
    contextValue: ContextValue
  ) {
    const { variables, id } = event;

    logger.info(`[Subscription] Update ${id}`, event);

    if (!this.clients.has(id)) {
      throw new Error(`Subscription with ID '${id}' does not exist`);
    }

    const { name: subscription, url } = this.clients.get(id)!;

    this.stop(id, null);

    return this.start(
      {
        url,
        subscription,
        variables,
      },
      contextValue
    );
  }

  private async execute({
    id,
    name,
    url,
    variables,
    contextValue,
  }: {
    id: ID;
    name: SubscriptionFieldName;
    url: string;
    variables: Record<string, any>;
    contextValue: ContextValue;
  }) {
    const {
      document,
      operationName,
      variables: variableNodes,
    } = this.operations.get(name)!;

    const variableValues = variableNodes.reduce((values, variable) => {
      const value = parseVariable({
        value: variables[variable.variable.name.value],
        variable,
        schema: this.sofa.schema,
      });

      if (typeof value === 'undefined') {
        return values;
      }

      return {
        ...values,
        [variable.variable.name.value]: value,
      };
    }, {});

    const execution = await this.sofa.subscribe({
      schema: this.sofa.schema,
      document,
      operationName,
      variableValues,
      contextValue,
    });

    if (isAsyncIterable(execution)) {
      // successful

      const client: StoredClient = {
        name,
        url,
        iterator: execution as any,
        maxLifetimeTimeout: this.sofa.webhooks
          ?.maxSubscriptionWebhookLifetimeSeconds
          ? (() => {
              logger.info(
                `[Subscription] Setting max lifetime for subscription ${id} to ${this.sofa.webhooks?.maxSubscriptionWebhookLifetimeSeconds}s`
              );
              return setTimeout(() => {
                if (!this.clients.has(id)) {
                  return;
                }
                logger.info(
                  `[Subscription] Max lifetime reached for subscription ${id}, closing.`
                );
                this.stop(
                  id,
                  `Max subscription lifetime reached (${this.sofa.webhooks?.maxSubscriptionWebhookLifetimeSeconds}s)`
                );
              }, this.sofa.webhooks?.maxSubscriptionWebhookLifetimeSeconds * 1000);
            })()
          : undefined,
      };

      // add execution to clients
      this.clients.set(id, client);

      // success
      (async () => {
        for await (const result of execution) {
          await this.sendData({
            id,
            result,
          });
        }
      })().then(
        () => {
          // completes
          if (this.clients.has(id)) {
            this.stop(id, 'Subscription completed, no further data available');
          }
        },
        (e) => {
          logger.error(e);
          if (this.clients.has(id)) {
            this.stop(id, 'Subscription errored out');
          }
        }
      );
    } else {
      return execution as ExecutionResult;
    }
  }

  private async sendData({ id, result }: { id: ID; result: any }) {
    if (!this.clients.has(id)) {
      throw new Error(`Subscription with ID '${id}' does not exist`);
    }

    const { url } = this.clients.get(id)!;

    logger.info(`[Subscription] Trigger ${id}`);

    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(result),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    await response.text();
  }

  private buildOperations() {
    const subscription = this.sofa.schema.getSubscriptionType();

    if (!subscription) {
      return;
    }

    const fieldMap = subscription.getFields();

    for (const field in fieldMap) {
      const operationNode = buildOperationNodeForField({
        kind: 'subscription' as OperationTypeNode,
        field,
        schema: this.sofa.schema,
        models: this.sofa.models,
        ignore: this.sofa.ignore,
        circularReferenceDepth: this.sofa.depthLimit,
      });
      const document: DocumentNode = {
        kind: Kind.DOCUMENT,
        definitions: [operationNode],
      };

      const { variables, name: operationName } = getOperationInfo(document)!;

      this.operations.set(field, {
        operationName,
        document,
        variables,
      });
    }
  }
}
