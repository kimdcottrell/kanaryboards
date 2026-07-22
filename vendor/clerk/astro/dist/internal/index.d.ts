import { n as AstroClerkIntegrationParams } from "../types-D1e50xiL.js";

//#region src/internal/utils/generateSafeId.d.ts
/**
 * Generates a safe, URL-friendly unique identifier.
 *
 * @example
 * const id = generateSafeId();
 * console.log(id); // Outputs something like: "f3x2P9Xn1K"
 */
declare const generateSafeId: (defaultSize?: number) => string;
//#endregion
//#region src/internal/swap-document.d.ts
type SwapFunctions = typeof import('astro:transitions/client').swapFunctions;
/**
 * @internal
 * Custom swap function to make mounting and styling
 * of Clerk components work with View Transitions in Astro.
 *
 * See https://docs.astro.build/en/guides/view-transitions/#building-a-custom-swap-function
 */
declare function swapDocument(swapFunctions: SwapFunctions, doc: Document): void;
//#endregion
//#region src/internal/index.d.ts
/**
 * The following code will be used in order to be injected as script via the astro integration.
 * F.e.
 *
 * injectScript('before-hydration', `...`)
 */
declare const runInjectionScript: (astroClerkOptions?: AstroClerkIntegrationParams) => Promise<void>;
//#endregion
export { generateSafeId, runInjectionScript, swapDocument };
//# sourceMappingURL=index.d.ts.map