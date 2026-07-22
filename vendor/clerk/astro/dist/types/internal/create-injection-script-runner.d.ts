import type { AstroClerkIntegrationParams } from '../types';
import type { CreateClerkInstanceInternalFn } from './types';
/**
 * @internal
 * Before initializing Clerk do:
 * 1) Populate stores with the authentication state during SSR.
 * 2) Merge the environment variables from the server context with the ones from the integration.
 */
declare function createInjectionScriptRunner(creator: CreateClerkInstanceInternalFn): (astroClerkOptions?: AstroClerkIntegrationParams) => Promise<void>;
export { createInjectionScriptRunner };
//# sourceMappingURL=create-injection-script-runner.d.ts.map