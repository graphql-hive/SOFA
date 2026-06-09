import {
  GraphQLSchema,
  isObjectType,
  GraphQLObjectType,
  getNamedType,
  GraphQLNamedType,
  isNonNullType,
  GraphQLOutputType,
  subscribe,
  execute,
} from 'graphql';

import type { Ignore, ContextFn, ContextValue } from './types.js';
import { convertName } from './common.js';
import { logger } from './logger.js';
import type { ErrorHandler } from './router.js';
import type { HTTPMethod, StatusCode } from 'fets/typings/typed-fetch';
import type { RouterOpenAPIOptions, RouterSwaggerUIOptions } from 'fets';

// user passes:
// - schema
// - error handler
// - execute function
// - context

export interface RouteConfig {
  method?: HTTPMethod;
  path?: string;
  responseStatus?: StatusCode;
  tags?: string[];
  description?: string;
}

export interface Route {
  method: HTTPMethod;
  path: string;
  tags?: string[];
  description?: string;
  responseStatus: StatusCode;
}

/**
 * Configuration options for the Scalar API Reference UI.
 * Pass this as `scalarUI` in `SofaConfig` to enable the Scalar UI endpoint.
 */
export interface ScalarUIOptions {
  /** Path at which the Scalar UI is served. Defaults to '/api-reference'. */
  endpoint?: string;
  /**
   * URL of the OpenAPI spec to display.
   * Defaults to '<basePath>/openapi.json'.
   */
  specUrl?: string;
  /** Theme name (e.g. 'default', 'moon', 'purple', 'solarized', 'bluePlanet', 'saturn', 'kepler', 'mars', 'deepSpace', 'laserwave', 'alternate', 'none'). */
  theme?: string;
  /** Enable dark mode. */
  darkMode?: boolean;
  /** Layout style: 'modern' (default) or 'classic'. */
  layout?: 'modern' | 'classic';
  /** Show or hide the sidebar. Defaults to true. */
  showSidebar?: boolean;
  /** Hide the models section. */
  hideModels?: boolean;
  /** Hide the "Try it" / test request button. */
  hideTestRequestButton?: boolean;
  /** Hide the dark mode toggle. */
  hideDarkModeToggle?: boolean;
  /** Hide the search bar. */
  hideSearch?: boolean;
  /** Inject custom CSS into the Scalar UI page. */
  customCss?: string;
  /** HTML page title shown in the browser tab. */
  pageTitle?: string;
  /** Override the CDN URL used to load Scalar's frontend bundle. */
  cdn?: string;
  /** Proxy URL to avoid CORS issues when sending test requests. */
  proxyUrl?: string;
}

export interface SofaConfig {
  basePath: string;
  schema: GraphQLSchema;
  execute?: typeof execute;
  subscribe?: typeof subscribe;
  /**
   * Treats an Object with an ID as not a model.
   * @example ["User", "Message.author"]
   */
  ignore?: Ignore;
  depthLimit?: number;
  errorHandler?: ErrorHandler;
  /**
   * Overwrites the default HTTP route.
   */
  routes?: Record<string, RouteConfig>;
  context?: ContextFn | ContextValue;
  customScalars?: Record<string, any>;
  enumTypes?: Record<string, any>;

  openAPI?: RouterOpenAPIOptions<any>;
  swaggerUI?: RouterSwaggerUIOptions;
  scalarUI?: ScalarUIOptions;
}

export interface Sofa {
  basePath: string;
  schema: GraphQLSchema;
  models: string[];
  ignore: Ignore;
  depthLimit: number;
  routes?: Record<string, RouteConfig>;
  execute: typeof execute;
  subscribe: typeof subscribe;
  errorHandler?: ErrorHandler;
  contextFactory: ContextFn;
  customScalars: Record<string, any>;
  enumTypes: Record<string, any>;

  openAPI?: RouterOpenAPIOptions<any>;
  swaggerUI?: RouterSwaggerUIOptions;
  scalarUI?: ScalarUIOptions;
}

export function createSofa(config: SofaConfig): Sofa {
  logger.debug('[Sofa] Created');

  const models = extractsModels(config.schema);
  const ignore = config.ignore || [];
  const depthLimit = config.depthLimit || 1;

  logger.debug(`[Sofa] models: ${models.join(', ')}`);
  logger.debug(`[Sofa] ignore: ${ignore.join(', ')}`);

  return {
    execute,
    subscribe,
    models,
    ignore,
    depthLimit,
    contextFactory(serverContext) {
      if (config.context != null) {
        if (isContextFn(config.context)) {
          return config.context(serverContext);
        } else {
          return config.context;
        }
      }
      return serverContext;
    },
    customScalars: config.customScalars || {},
    enumTypes: config.enumTypes || {},
    ...config,
  };
}

export function isContextFn(context: any): context is ContextFn {
  return typeof context === 'function';
}

// Objects and Unions are the only things that are used to define return types
// and both might contain an ID
// We don't treat Unions as models because
// they might represent an Object that is not a model
// We check it later, when an operation is being built
function extractsModels(schema: GraphQLSchema): string[] {
  const modelMap: {
    [name: string]: {
      list?: boolean;
      single?: boolean;
    };
  } = {};
  const query = schema.getQueryType()!;
  const fields = query.getFields();

  // if Query[type] (no args) and Query[type](just id as an argument)

  // loop through every field
  for (const fieldName in fields) {
    const field = fields[fieldName];
    const namedType = getNamedType(field.type);

    if (hasID(namedType)) {
      if (!modelMap[namedType.name]) {
        modelMap[namedType.name] = {};
      }

      if (isArrayOf(field.type, namedType)) {
        // check if type is a list
        // check if name of a field matches a name of a named type (in plural)
        // check if has no non-optional arguments
        // add to registry with `list: true`
        const sameName = isNameEqual(field.name, namedType.name + 's');
        const allOptionalArguments = !field.args.some((arg) =>
          isNonNullType(arg.type)
        );

        modelMap[namedType.name].list ||= sameName && allOptionalArguments;
      } else if (
        isObjectType(field.type) ||
        (isNonNullType(field.type) && isObjectType(field.type.ofType))
      ) {
        // check if type is a graphql object type
        // check if name of a field matches with name of an object type
        // check if has only one argument named `id`
        // add to registry with `single: true`
        const sameName = isNameEqual(field.name, namedType.name);
        const hasIdArgument =
          field.args.length === 1 && field.args[0].name === 'id';

        modelMap[namedType.name].single ||= sameName && hasIdArgument;
      }
    }
  }

  return Object.keys(modelMap).filter(
    (name) => modelMap[name].list && modelMap[name].single
  );
}

// it's dumb but let's leave it for now
function isArrayOf(
  type: GraphQLOutputType,
  expected: GraphQLObjectType
): boolean {
  const typeNameInSdl = type.toString();
  return (
    typeNameInSdl.includes('[') && typeNameInSdl.includes(expected.toString())
  );
}

function hasID(type: GraphQLNamedType): type is GraphQLObjectType {
  return isObjectType(type) && !!type.getFields().id;
}

function isNameEqual(a: string, b: string): boolean {
  return convertName(a) === convertName(b);
}
