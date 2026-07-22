import type { ClerkOptions } from '@clerk/shared/types';
/**
 * Creates a snippet that initializes Clerk before client-side framework hydration occurs.
 *
 * This script runs before frameworks like React, Vue, or Svelte hydrate their components,
 * ensuring the Clerk instance is ready and stores are populated to prevent hydration mismatches.
 * It performs a simple, synchronous initialization without handling view transitions.
 *
 * @param command - The Astro command being run ('dev' or 'build')
 * @param packageName - The name of the Clerk package for debug logging
 * @param buildImportPath - The import path to the internal Clerk utilities
 * @param internalParams - Clerk configuration options including SDK metadata
 * @returns A script string to be injected via Astro's 'before-hydration' stage
 */
export declare function buildBeforeHydrationSnippet({ command, packageName, buildImportPath, internalParams, }: {
    command: string;
    packageName: string;
    buildImportPath: string;
    internalParams: ClerkOptions;
}): string;
/**
 * Creates a snippet that initializes Clerk on page load with support for Astro View Transitions.
 *
 * This script handles two scenarios:
 * 1. **With View Transitions enabled**: Listens for astro:page-load and astro:before-swap events
 *    to properly initialize Clerk and preserve its DOM elements during page transitions.
 * 2. **Without View Transitions**: Performs standard initialization on initial page load.
 *
 * This script is necessary for pages without client-side frameworks, as the before-hydration
 * script only runs when framework hydration occurs. This ensures Clerk is always initialized,
 * regardless of whether UI frameworks are present.
 *
 * @param command - The Astro command being run ('dev' or 'build')
 * @param packageName - The name of the Clerk package for debug logging
 * @param buildImportPath - The import path to the internal Clerk utilities
 * @param internalParams - Clerk configuration options including SDK metadata
 * @returns A script string to be injected via Astro's 'page' stage
 */
export declare function buildPageLoadSnippet({ command, packageName, buildImportPath, internalParams, }: {
    command: string;
    packageName: string;
    buildImportPath: string;
    internalParams: ClerkOptions;
}): string;
//# sourceMappingURL=snippets.d.ts.map