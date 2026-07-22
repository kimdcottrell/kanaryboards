import type { AstroIntegration } from 'astro';
import type { AstroClerkIntegrationParams } from '../types';
type HotloadAstroClerkIntegrationParams = AstroClerkIntegrationParams & {
    enableEnvSchema?: boolean;
};
declare function createIntegration<Params extends HotloadAstroClerkIntegrationParams>(): (params?: Params) => AstroIntegration;
export { createIntegration };
//# sourceMappingURL=create-integration.d.ts.map