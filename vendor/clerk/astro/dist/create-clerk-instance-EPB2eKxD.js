import { f as $clerk, p as $csrState, r as $clerkStore } from "./external-DHTxQaok.js";
import { loadClerkJSScript, loadClerkUIScript, setClerkJSLoadingErrorPackageName } from "@clerk/shared/loadClerkJsScript";

//#region src/internal/invoke-clerk-astro-js-functions.ts
/**
* Loop through any Astro component that has requested to invoke a function and invoke it with its respective props.
*/
const invokeClerkAstroJSFunctions = () => {
	["handleRedirectCallback"].forEach((fnName) => {
		document.querySelectorAll(`[data-clerk-function-id^="clerk-${fnName}"]`).forEach((el) => {
			const id = el.getAttribute("data-clerk-function-id");
			const props = window.__astro_clerk_function_props?.get(fnName)?.get(id) ?? {};
			$clerk.get()?.[fnName]?.(props);
		});
	});
};

//#endregion
//#region src/internal/mount-clerk-astro-js-components.ts
/**
* Loop through any Astro component that has requested to mount a UI component and mount it with its respective props.
*/
const mountAllClerkAstroJSComponents = () => {
	Object.entries({
		"create-organization": "mountCreateOrganization",
		"organization-list": "mountOrganizationList",
		"organization-profile": "mountOrganizationProfile",
		"organization-switcher": "mountOrganizationSwitcher",
		"user-avatar": "mountUserAvatar",
		"user-button": "mountUserButton",
		"user-profile": "mountUserProfile",
		"sign-in": "mountSignIn",
		"sign-up": "mountSignUp",
		"google-one-tap": "openGoogleOneTap",
		waitlist: "mountWaitlist",
		"pricing-table": "mountPricingTable",
		"api-keys": "mountAPIKeys"
	}).forEach(([category, mountFn]) => {
		document.querySelectorAll(`[data-clerk-id^="clerk-${category}"]`).forEach((el) => {
			const clerkId = el.getAttribute("data-clerk-id");
			const props = window.__astro_clerk_component_props?.get(category)?.get(clerkId);
			if (el) $clerk.get()?.[mountFn](el, props);
		});
	});
};

//#endregion
//#region src/internal/run-once.ts
/**
* Prevents mounting components multiple times when the `createClerkInstanceInternal` was been called twice without await first
* This is useful as the "integration" may call the function twice at the same time.
*/
const runOnce = (onFirst) => {
	let hasRun = false;
	return (params) => {
		if (hasRun) {
			const clerkJSInstance = window.Clerk;
			return new Promise((res) => {
				if (!clerkJSInstance) return res(false);
				if (clerkJSInstance.loaded) {
					mountAllClerkAstroJSComponents();
					invokeClerkAstroJSFunctions();
				}
				return res(clerkJSInstance.loaded);
			});
		}
		/**
		* Probably html streaming has delayed the component from mounting immediately.
		* In Astro, js modules will start executing only after html streaming has ended.
		*/
		hasRun = true;
		return onFirst(params);
	};
};

//#endregion
//#region src/internal/create-clerk-instance.ts
let initOptions;
setClerkJSLoadingErrorPackageName("@clerk/astro");
function createNavigationHandler(windowNav) {
	return (to, opts) => {
		if (opts?.__internal_metadata?.navigationType === "internal") windowNav(history.state, "", to);
		else opts?.windowNavigate(to);
	};
}
/**
* Prevents firing clerk.load() multiple times
*/
const createClerkInstance = runOnce(createClerkInstanceInternal);
async function createClerkInstanceInternal(options) {
	const clerkJsChunk = getClerkJsEntryChunk(options);
	const ClerkUI = getClerkUIEntryChunk(options);
	await clerkJsChunk;
	if (!window.Clerk) throw new Error("Failed to download latest ClerkJS. Contact support@clerk.com.");
	const clerkJSInstance = window.Clerk;
	if (!$clerk.get()) $clerk.set(clerkJSInstance);
	const internalOptions = options;
	const keylessClaimUrl = internalOptions.__internal_keylessClaimUrl;
	const keylessApiKeysUrl = internalOptions.__internal_keylessApiKeysUrl;
	const clerkOptions = {
		routerPush: createNavigationHandler(window.history.pushState.bind(window.history)),
		routerReplace: createNavigationHandler(window.history.replaceState.bind(window.history)),
		...options,
		ui: {
			...options?.ui,
			ClerkUI
		},
		...keylessClaimUrl && { __internal_keyless_claimKeylessApplicationUrl: keylessClaimUrl },
		...keylessApiKeysUrl && { __internal_keyless_copyInstanceKeysUrl: keylessApiKeysUrl }
	};
	initOptions = clerkOptions;
	return clerkJSInstance.load(clerkOptions).then(() => {
		$csrState.setKey("isLoaded", true);
		$clerkStore.notify();
		mountAllClerkAstroJSComponents();
		invokeClerkAstroJSFunctions();
		clerkJSInstance.addListener((payload) => {
			$csrState.setKey("client", payload.client);
			$csrState.setKey("user", payload.user);
			$csrState.setKey("session", payload.session);
			$csrState.setKey("organization", payload.organization);
		});
	}).catch(() => {});
}
function updateClerkOptions(options) {
	const clerk = $clerk.get();
	if (!clerk) throw new Error("Missing clerk instance");
	const updateOptions = {
		options: {
			...initOptions,
			...options
		},
		appearance: {
			...initOptions?.appearance,
			...options.appearance
		}
	};
	clerk.__internal_updateProps(updateOptions);
}
/**
* Loads clerk-js script if not already loaded.
* Returns early if window.Clerk already exists.
*/
async function getClerkJsEntryChunk(options) {
	await loadClerkJSScript(options);
}
/**
* Gets the ClerkUI constructor, either from options or by loading the script.
* Returns early if window.__internal_ClerkUICtor already exists.
* Returns undefined when prefetchUI={false} (no UI needed).
*/
function getClerkUIEntryChunk(options) {
	if (options?.ui?.ClerkUI) return options.ui.ClerkUI;
	if (options?.ui || options?.prefetchUI === false) return;
	return loadClerkUIEntryChunk(options);
}
async function loadClerkUIEntryChunk(options) {
	await loadClerkUIScript(options);
	if (!window.__internal_ClerkUICtor) throw new Error("Failed to download latest Clerk UI. Contact support@clerk.com.");
	return window.__internal_ClerkUICtor;
}

//#endregion
export { updateClerkOptions as n, createClerkInstance as t };
//# sourceMappingURL=create-clerk-instance-EPB2eKxD.js.map