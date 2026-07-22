import { m as $initialState } from "../external-DHTxQaok.js";
import { t as createClerkInstance } from "../create-clerk-instance-EPB2eKxD.js";
import { isTruthy } from "@clerk/shared/underscore";
import { customAlphabet, urlAlphabet } from "nanoid";

//#region src/internal/merge-env-vars-with-params.ts
/**
 * Merges `prefetchUI` param with env vars.
 * - If param `prefetchUI` is explicitly `false`, return `false`
 * - If env `PUBLIC_CLERK_PREFETCH_UI` is "false", return `false`
 * - Otherwise return `undefined` (default behavior: prefetch UI)
 */
function mergePrefetchUIConfig(paramPrefetchUI) {
  if (paramPrefetchUI === false) return false;
  if (import.meta.env.PUBLIC_CLERK_PREFETCH_UI === "false") return false;
}
/**
 * @internal
 */
const mergeEnvVarsWithParams = (params) => {
  const {
    signInUrl: paramSignIn,
    signUpUrl: paramSignUp,
    isSatellite: paramSatellite,
    proxyUrl: paramProxy,
    domain: paramDomain,
    publishableKey: paramPublishableKey,
    telemetry: paramTelemetry,
    __internal_clerkJSUrl: paramClerkJSUrl,
    __internal_clerkJSVersion: paramClerkJSVersion,
    __internal_clerkUIUrl: paramClerkUIUrl,
    __internal_clerkUIVersion: paramClerkUIVersion,
    prefetchUI: paramPrefetchUI,
    unsafe_disableDevelopmentModeConsoleWarning:
      paramUnsafeDisableDevelopmentModeConsoleWarning,
    ...rest
  } = params || {};
  const internalOptions = params;
  return {
    signInUrl: paramSignIn || import.meta.env.PUBLIC_CLERK_SIGN_IN_URL,
    signUpUrl: paramSignUp || import.meta.env.PUBLIC_CLERK_SIGN_UP_URL,
    isSatellite: paramSatellite || import.meta.env.PUBLIC_CLERK_IS_SATELLITE,
    proxyUrl: paramProxy || import.meta.env.PUBLIC_CLERK_PROXY_URL,
    domain: paramDomain || import.meta.env.PUBLIC_CLERK_DOMAIN,
    publishableKey: globalThis.__clerkPublishableKey ||
      paramPublishableKey || internalOptions?.publishableKey ||
      import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY || "",
    __internal_clerkJSUrl: paramClerkJSUrl ||
      import.meta.env.PUBLIC_CLERK_JS_URL,
    __internal_clerkJSVersion: paramClerkJSVersion ||
      import.meta.env.PUBLIC_CLERK_JS_VERSION,
    __internal_clerkUIUrl: paramClerkUIUrl ||
      import.meta.env.PUBLIC_CLERK_UI_URL,
    __internal_clerkUIVersion: paramClerkUIVersion ||
      import.meta.env.PUBLIC_CLERK_UI_VERSION,
    prefetchUI: mergePrefetchUIConfig(paramPrefetchUI),
    telemetry: paramTelemetry || {
      disabled: isTruthy(import.meta.env.PUBLIC_CLERK_TELEMETRY_DISABLED),
      debug: isTruthy(import.meta.env.PUBLIC_CLERK_TELEMETRY_DEBUG),
    },
    unsafe_disableDevelopmentModeConsoleWarning:
      paramUnsafeDisableDevelopmentModeConsoleWarning ??
        isTruthy(
          import.meta.env
            .PUBLIC_CLERK_UNSAFE_DISABLE_DEVELOPMENT_MODE_CONSOLE_WARNING,
        ),
    __internal_keylessClaimUrl: internalOptions?.keylessClaimUrl,
    __internal_keylessApiKeysUrl: internalOptions?.keylessApiKeysUrl,
    ...rest,
  };
};

//#endregion
//#region src/internal/create-injection-script-runner.ts
/**
 * @internal
 * Before initializing Clerk do:
 * 1) Populate stores with the authentication state during SSR.
 * 2) Merge the environment variables from the server context with the ones from the integration.
 */
function createInjectionScriptRunner(creator) {
  async function runner(astroClerkOptions) {
    const ssrDataContainer = document.getElementById("__CLERK_ASTRO_DATA__");
    if (ssrDataContainer) {
      $initialState.set(JSON.parse(ssrDataContainer.textContent || "{}"));
    }
    const clientSafeVarsContainer = document.getElementById(
      "__CLERK_ASTRO_SAFE_VARS__",
    );
    let clientSafeVars = {};
    if (clientSafeVarsContainer) {
      clientSafeVars = JSON.parse(clientSafeVarsContainer.textContent || "{}");
    }
    await creator({
      ...mergeEnvVarsWithParams({
        ...astroClerkOptions,
        ...clientSafeVars,
      }),
    });
  }
  return runner;
}

//#endregion
//#region src/internal/utils/generateSafeId.ts
/**
 * Generates a safe, URL-friendly unique identifier.
 *
 * @example
 * const id = generateSafeId();
 * console.log(id); // Outputs something like: "f3x2P9Xn1K"
 */
const generateSafeId = (defaultSize = 10) =>
  customAlphabet(urlAlphabet, defaultSize)();

//#endregion
//#region src/internal/swap-document.ts
const PERSIST_ATTR = "data-astro-transition-persist";
const EMOTION_ATTR = "data-emotion";
/**
 * @internal
 * Custom swap function to make mounting and styling
 * of Clerk components work with View Transitions in Astro.
 *
 * See https://docs.astro.build/en/guides/view-transitions/#building-a-custom-swap-function
 */
function swapDocument(swapFunctions, doc) {
  swapFunctions.deselectScripts(doc);
  swapFunctions.swapRootAttributes(doc);
  const emotionElements = document.querySelectorAll(`style[${EMOTION_ATTR}]`);
  swapHeadElements(doc, Array.from(emotionElements));
  const restoreFocusFunction = swapFunctions.saveFocus();
  swapFunctions.swapBodyElement(doc.body, document.body);
  restoreFocusFunction();
}
/**
 * This function is a copy of the original `swapHeadElements` function from `astro:transitions/client`.
 * The difference is that you can pass a list of elements that should not be removed
 * in the new document.
 *
 * See https://github.com/withastro/astro/blob/d6f17044d3873df77cfbc73230cb3194b5a7d82a/packages/astro/src/transitions/swap-functions.ts#L51
 */
function swapHeadElements(doc, ignoredElements) {
  for (const el of Array.from(document.head.children)) {
    const newEl = persistedHeadElement(el, doc);
    if (newEl) newEl.remove();
    else if (!ignoredElements.includes(el)) el.remove();
  }
  document.head.append(...doc.head.children);
}
function persistedHeadElement(el, newDoc) {
  const id = el.getAttribute(PERSIST_ATTR);
  const newEl = id && newDoc.head.querySelector(`[${PERSIST_ATTR}="${id}"]`);
  if (newEl) return newEl;
  if (el.matches("link[rel=stylesheet]")) {
    const href = el.getAttribute("href");
    return newDoc.head.querySelector(`link[rel=stylesheet][href="${href}"]`);
  }
  return null;
}

//#endregion
//#region src/internal/index.ts
/**
 * The following code will be used in order to be injected as script via the astro integration.
 * F.e.
 *
 * injectScript('before-hydration', `...`)
 */
const runInjectionScript = createInjectionScriptRunner(createClerkInstance);

//#endregion
export { generateSafeId, runInjectionScript, swapDocument };
//# sourceMappingURL=index.js.map
