/**
 * The following code will be used in order to be injected as script via the astro integration.
 * F.e.
 *
 * injectScript('before-hydration', `...`)
 */
declare const runInjectionScript: (astroClerkOptions?: import("../types").AstroClerkIntegrationParams) => Promise<void>;
export { runInjectionScript };
export { generateSafeId } from './utils/generateSafeId';
export { swapDocument } from './swap-document';
//# sourceMappingURL=index.d.ts.map