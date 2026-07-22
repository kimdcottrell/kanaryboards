type SwapFunctions = typeof import('astro:transitions/client').swapFunctions;
/**
 * @internal
 * Custom swap function to make mounting and styling
 * of Clerk components work with View Transitions in Astro.
 *
 * See https://docs.astro.build/en/guides/view-transitions/#building-a-custom-swap-function
 */
export declare function swapDocument(swapFunctions: SwapFunctions, doc: Document): void;
export {};
//# sourceMappingURL=swap-document.d.ts.map