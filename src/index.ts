import { createSofaRouter } from './router.js';
import type { SofaConfig } from './sofa.js';
import { createSofa } from './sofa.js';

export { OpenAPI } from './open-api/index.js';
export type { ScalarUIOptions } from './sofa.js';

export function useSofa(config: SofaConfig) {
  return createSofaRouter(createSofa(config));
}

export { createSofaRouter, createSofa };
