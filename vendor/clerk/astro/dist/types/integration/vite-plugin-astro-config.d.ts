import type { AstroConfig } from 'astro';
type VitePlugin = Required<AstroConfig['vite']>['plugins'][number];
/**
 * This Vite module exports a `isStaticOutput` function that is imported inside our control components
 * to determine which components to use depending on the Astro config output option.
 *
 * @param {AstroConfig} astroConfig - The Astro configuration object
 * @returns {VitePlugin} A Vite plugin
 */
export declare function vitePluginAstroConfig(astroConfig: AstroConfig): VitePlugin;
export {};
//# sourceMappingURL=vite-plugin-astro-config.d.ts.map