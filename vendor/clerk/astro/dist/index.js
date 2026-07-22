import { envField } from "astro/config";

//#region package.json
var name = "@clerk/astro";
var version = "4.0.0";

//#endregion
//#region src/integration/snippets.ts
function buildInternalParamsExpression(internalParams) {
	const serializedParams = JSON.stringify(internalParams);
	if (!internalParams.ui) return {
		imports: "",
		params: serializedParams
	};
	return {
		imports: "import { ui as __internal_clerkAstroUi } from \"@clerk/ui\";",
		params: `{ ...${serializedParams}, ui: __internal_clerkAstroUi }`
	};
}
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
function buildBeforeHydrationSnippet({ command, packageName, buildImportPath, internalParams }) {
	const { imports, params } = buildInternalParamsExpression(internalParams);
	return `
  ${command === "dev" ? `console.log("${packageName}","Initialize Clerk: before-hydration")` : ""}
  ${imports}
  import { runInjectionScript } from "${buildImportPath}";
  await runInjectionScript(${params});`;
}
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
function buildPageLoadSnippet({ command, packageName, buildImportPath, internalParams }) {
	const { imports, params } = buildInternalParamsExpression(internalParams);
	return `
  ${command === "dev" ? `console.log("${packageName}","Initialize Clerk: page")` : ""}
  ${imports}
  import { runInjectionScript, swapDocument } from "${buildImportPath}";

  // Taken from https://github.com/withastro/astro/blob/e10b03e88c22592fbb42d7245b65c4f486ab736d/packages/astro/src/transitions/router.ts#L39.
  // Importing it directly from astro:transitions/client breaks custom client-side routing
  // even when View Transitions is disabled.
  const transitionEnabledOnThisPage = () => {
    return !!document.querySelector('[name="astro-view-transitions-enabled"]');
  }

  if (transitionEnabledOnThisPage()) {
    // Start loading eagerly without awaiting so both listeners share one module load.
    // Listeners are registered synchronously here, which avoids the race where awaiting
    // before addEventListener would cause us to miss the initial astro:page-load event.
    const transitionClient = import('astro:transitions/client');

    document.addEventListener('astro:before-swap', async (e) => {
      const nextDocument = e.newDocument;
      const nextHead = nextDocument?.head;
      if (!nextDocument || !nextHead) {
        return;
      }

      const { swapFunctions } = await transitionClient;

      e.swap = () => {
        const clerkComponents = document.querySelector('#clerk-components');
        // Move (not clone) the element so Clerk's React root stays bound to its host node
        // across the body swap. Cloning produces a detached copy with no React associated,
        // which breaks style injection on subsequent navigations.
        if (clerkComponents) {
          nextDocument.body.appendChild(clerkComponents);
        }
        swapDocument(swapFunctions, nextDocument);
      };
    });

    document.addEventListener('astro:page-load', async (e) => {
      const { navigate } = await transitionClient;

      await runInjectionScript({
        ...${params},
        routerPush: navigate,
        routerReplace: (url) => navigate(url, { history: 'replace' }),
      });
    });
  } else {
    await runInjectionScript(${params});
  }`;
}

//#endregion
//#region src/integration/vite-plugin-astro-config.ts
/**
* This Vite module exports a `isStaticOutput` function that is imported inside our control components
* to determine which components to use depending on the Astro config output option.
*
* @param {AstroConfig} astroConfig - The Astro configuration object
* @returns {VitePlugin} A Vite plugin
*/
function vitePluginAstroConfig(astroConfig) {
	const virtualModuleId = "virtual:@clerk/astro/config";
	const resolvedVirtualModuleId = "\0virtual:@clerk/astro/config";
	return {
		name: "vite-plugin-astro-config",
		resolveId(id) {
			if (id === virtualModuleId) return resolvedVirtualModuleId;
		},
		config(config) {
			config.optimizeDeps?.include?.push("@clerk/astro/client");
			config.optimizeDeps?.exclude?.push("astro:transitions/client");
		},
		load(id) {
			if (id === resolvedVirtualModuleId) return `
          const configOutput = '${astroConfig.output}';

          export function isStaticOutput(forceStatic) {
            if (configOutput === 'hybrid' && forceStatic === undefined) {
              // Default page is prerendered in hybrid mode
              return true;
            }

            if (forceStatic !== undefined) {
              return forceStatic;
            }

            return configOutput === 'static';
          }
        `;
		}
	};
}

//#endregion
//#region src/integration/create-integration.ts
const buildEnvVarFromOption = (valueToBeStored, envName) => {
	return valueToBeStored ? { [`import.meta.env.${envName}`]: JSON.stringify(valueToBeStored) } : {};
};
function createIntegration() {
	return (params) => {
		const { proxyUrl, isSatellite, domain, signInUrl, signUpUrl, enableEnvSchema = true } = params || {};
		const clerkJSUrl = params?.__internal_clerkJSUrl;
		const clerkJSVersion = params?.__internal_clerkJSVersion;
		const clerkUIUrl = params?.__internal_clerkUIUrl;
		const clerkUIVersion = params?.__internal_clerkUIVersion;
		const prefetchUI = params?.prefetchUI;
		const hasUI = !!params?.ui;
		return {
			name: "@clerk/astro/integration",
			hooks: {
				"astro:config:setup": ({ config, injectScript, updateConfig, logger, command }) => {
					if (["server", "hybrid"].includes(config.output) && !config.adapter) logger.error("Missing adapter, please update your Astro config to use one.");
					const internalParams = {
						...params,
						sdkMetadata: {
							version,
							name,
							environment: command === "dev" ? "development" : "production"
						}
					};
					const buildImportPath = `${name}/internal`;
					updateConfig({
						vite: {
							plugins: [vitePluginAstroConfig(config)],
							define: {
								/**
								* Convert the integration params to environment variable in order for it to be readable from the server
								*/
								...buildEnvVarFromOption(signInUrl, "PUBLIC_CLERK_SIGN_IN_URL"),
								...buildEnvVarFromOption(signUpUrl, "PUBLIC_CLERK_SIGN_UP_URL"),
								...buildEnvVarFromOption(isSatellite, "PUBLIC_CLERK_IS_SATELLITE"),
								...buildEnvVarFromOption(proxyUrl, "PUBLIC_CLERK_PROXY_URL"),
								...buildEnvVarFromOption(domain, "PUBLIC_CLERK_DOMAIN"),
								...buildEnvVarFromOption(clerkJSUrl, "PUBLIC_CLERK_JS_URL"),
								...buildEnvVarFromOption(clerkJSVersion, "PUBLIC_CLERK_JS_VERSION"),
								...buildEnvVarFromOption(clerkUIUrl, "PUBLIC_CLERK_UI_URL"),
								...buildEnvVarFromOption(clerkUIVersion, "PUBLIC_CLERK_UI_VERSION"),
								...buildEnvVarFromOption(prefetchUI === false || hasUI ? "false" : void 0, "PUBLIC_CLERK_PREFETCH_UI")
							},
							ssr: { external: ["node:async_hooks"] },
							optimizeDeps: { esbuildOptions: { target: "es2022" } },
							build: {
								target: "es2022",
								rollupOptions: { external: ["cloudflare:workers"] }
							}
						},
						env: { schema: { ...enableEnvSchema ? createClerkEnvSchema() : {} } }
					});
					/**
					* ------------- Script Injection --------------------------
					* Below we are injecting the same script twice. `runInjectionScript` is build in such way in order to instanciate and load Clerk only once.
					* We need both scripts in order to support applications with or without UI frameworks.
					*/
					/**
					* The before-hydration script will run before client frameworks like React hydrate.
					* This makes sure that we have initialized a Clerk instance and populated stores in order to avoid hydration issues.
					*/
					injectScript("before-hydration", buildBeforeHydrationSnippet({
						command,
						packageName: name,
						buildImportPath,
						internalParams
					}));
					/**
					* The page script only executes if a client framework like React needs to hydrate.
					* We need to run the same script again for each page in order to initialize Clerk even if no UI framework is used in the client.
					* If no UI framework is used in the client, the before-hydration script will never run.
					*/
					injectScript("page", buildPageLoadSnippet({
						command,
						packageName: name,
						buildImportPath,
						internalParams
					}));
				},
				"astro:config:done": ({ injectTypes }) => {
					injectTypes({
						filename: "types.d.ts",
						content: `/// <reference types="@clerk/astro/env" />`
					});
				}
			}
		};
	};
}
function createClerkEnvSchema() {
	return {
		PUBLIC_CLERK_PUBLISHABLE_KEY: envField.string({
			context: "client",
			access: "public",
			optional: true
		}),
		PUBLIC_CLERK_SIGN_IN_URL: envField.string({
			context: "client",
			access: "public",
			optional: true
		}),
		PUBLIC_CLERK_SIGN_UP_URL: envField.string({
			context: "client",
			access: "public",
			optional: true
		}),
		PUBLIC_CLERK_IS_SATELLITE: envField.boolean({
			context: "client",
			access: "public",
			optional: true
		}),
		PUBLIC_CLERK_PROXY_URL: envField.string({
			context: "client",
			access: "public",
			optional: true,
			url: true
		}),
		PUBLIC_CLERK_DOMAIN: envField.string({
			context: "client",
			access: "public",
			optional: true,
			url: true
		}),
		PUBLIC_CLERK_JS_URL: envField.string({
			context: "client",
			access: "public",
			optional: true,
			url: true
		}),
		PUBLIC_CLERK_JS_VERSION: envField.string({
			context: "client",
			access: "public",
			optional: true
		}),
		PUBLIC_CLERK_UI_URL: envField.string({
			context: "client",
			access: "public",
			optional: true,
			url: true
		}),
		PUBLIC_CLERK_UI_VERSION: envField.string({
			context: "client",
			access: "public",
			optional: true
		}),
		PUBLIC_CLERK_PREFETCH_UI: envField.string({
			context: "client",
			access: "public",
			optional: true
		}),
		PUBLIC_CLERK_TELEMETRY_DISABLED: envField.boolean({
			context: "client",
			access: "public",
			optional: true
		}),
		PUBLIC_CLERK_TELEMETRY_DEBUG: envField.boolean({
			context: "client",
			access: "public",
			optional: true
		}),
		PUBLIC_CLERK_KEYLESS_DISABLED: envField.boolean({
			context: "client",
			access: "public",
			optional: true
		}),
		CLERK_SECRET_KEY: envField.string({
			context: "server",
			access: "secret",
			optional: true
		}),
		CLERK_MACHINE_SECRET_KEY: envField.string({
			context: "server",
			access: "secret",
			optional: true
		}),
		CLERK_JWT_KEY: envField.string({
			context: "server",
			access: "secret",
			optional: true
		})
	};
}

//#endregion
//#region src/index.ts
var src_default = createIntegration();

//#endregion
export { src_default as default };
//# sourceMappingURL=index.js.map