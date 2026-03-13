import { createSofaRouter } from './router.js';
import type { SofaConfig } from './sofa.js';
import { createSofa } from './sofa.js';

export { OpenAPI } from './open-api/index.js';
export { resolveFieldType, buildSchemaObjectFromType } from './open-api/types.js';
export { mapToPrimitive } from './open-api/utils.js';

export function useSofa(config: SofaConfig) {
  return createSofaRouter(createSofa(config));
}

export { createSofaRouter, createSofa };
