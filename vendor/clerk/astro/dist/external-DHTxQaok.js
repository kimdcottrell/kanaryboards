import { atom, batched, computed, map, onMount } from "nanostores";
import { deriveState } from "@clerk/shared/deriveState";
import { eventMethodCalled } from "@clerk/shared/telemetry";

//#region src/stores/internal.ts
const $csrState = map({
	isLoaded: false,
	client: void 0,
	user: void 0,
	session: void 0,
	organization: void 0
});
const $initialState = map();
const $clerk = atom(null);

//#endregion
//#region src/stores/external.ts
/**
* A client side store that returns the loaded state of clerk-js.
*
* @example
* $isLoadedStore.subscribe((authloaded => console.log(loaded))
*/
const $isLoadedStore = computed([$csrState], (state) => state.isLoaded);
/**
* A client side store that is prepopulated with the authentication context during SSR.
* It is a nanostore, for instructions on how to use nanostores please review the [documentation](https://github.com/nanostores/nanostores)
*
* @example
* $authStore.subscribe((auth) => console.log(auth.userId))
*/
const $authStore = batched([$csrState, $initialState], (state, initialState) => {
	return deriveState(state.isLoaded, {
		session: state.session,
		user: state.user,
		organization: state.organization,
		client: state.client
	}, initialState);
});
/**
* A client side store that is populated after clerk-js has loaded.
* The store returns back the authenticated user or `null`.
* It is a nanostore, for instructions on how to use nanostores please review the [documentation](https://github.com/nanostores/nanostores)
*
* @example
* $userStore.subscribe((user) => console.log(user.id))
*/
const $userStore = computed([$authStore], (auth) => auth.user);
/**
* A client side store that is populated after clerk-js has loaded.
* The store returns the session of the authenticated user or `null`.
* It is a nanostore, for instructions on how to use nanostores please review the [documentation](https://github.com/nanostores/nanostores)
*
* @example
* $sessionStore.subscribe((session) => console.log(session.id))
*/
const $sessionStore = computed([$authStore], (auth) => auth.session);
/**
* A client side store that is populated after clerk-js has loaded.
* The store returns the Active Organization of the authenticated user or `null`.
* It is a nanostore, for instructions on how to use nanostores please review the [documentation](https://github.com/nanostores/nanostores)
*
* @example
* $organizationStore.subscribe((org) => console.log(org.id))
*/
const $organizationStore = computed([$authStore], (auth) => auth.organization);
/**
* A client side store that is populated after clerk-js has loaded.
* The store returns the clerk client or `null`.
* It is a nanostore, for instructions on how to use nanostores please review the [documentation](https://github.com/nanostores/nanostores)
*
* @example
* $clientStore.subscribe((client) => console.log(client?.signedInSessions?.length))
*/
const $clientStore = computed([$csrState], (csr) => csr.client);
/**
* A client side store that is populated after clerk-js is instanciated.
* The store returns the clerk instance or `null`.
* It is a nanostore, for instructions on how to use nanostores please review the [documentation](https://github.com/nanostores/nanostores)
*
* @example
* $clerkStore.subscribe((clerk) => console.log(clerk.publishableKey))
*/
const $clerkStore = computed([$clerk], (clerk) => clerk);
/**
* A client side store that is populated after clerk-js has loaded.
* The store returns all the sessions of the current clerk client or `null`.
* It is a nanostore, for instructions on how to use nanostores please review the [documentation](https://github.com/nanostores/nanostores)
*
* @example
* $sessionListStore.subscribe((sessionList) => sessionList.map((session) => console.log('Session id:', sessino.id) ))
*/
const $sessionListStore = computed([$clientStore], (client) => client?.sessions);
/**
* A client side store that is populated after clerk-js has loaded.
* The store returns a `SignInResource` or `null`.
* It is a nanostore, for instructions on how to use nanostores please review the [documentation](https://github.com/nanostores/nanostores)
*
* @example
* $signInStore.subscribe((signIn) => console.log(signIn.status))
*/
const $signInStore = computed([$clientStore], (client) => client?.signIn);
/**
* A client side store that is populated after clerk-js has loaded.
* The store returns a `SignUpResource` or `null`.
* It is a nanostore, for instructions on how to use nanostores please review the [documentation](https://github.com/nanostores/nanostores)
*
* @example
* $signUpStore.subscribe((signUp) => console.log(signUp.status))
*/
const $signUpStore = computed([$clientStore], (client) => client?.signUp);
/**
* A client side store that is populated after clerk-js has loaded.
* The store returns a `BillingNamespace` or `null`.
* It is a nanostore, for instructions on how to use nanostores please review the [documentation](https://github.com/nanostores/nanostores)
*
* @example
* $billingStore.subscribe((billing) => billing.getPlans().then((plans) => console.log(plans.data.length)))
*/
const $billingStore = computed([$clerk], (clerk) => clerk?.billing);
/**
* Records a telemetry event when a store is used to match React hooks telemetry.
*
* @param {Store} store - The nanostore instance to monitor.
* @param {string} method - The name of the method associated with the store usage.
*/
const recordTelemetryEvent = (store, method) => {
	onMount(store, () => {
		$clerk.get()?.telemetry?.record(eventMethodCalled(method));
	});
};
recordTelemetryEvent($signInStore, "$signInStore");
recordTelemetryEvent($signUpStore, "$signUpStore");
recordTelemetryEvent($organizationStore, "$organizationStore");

//#endregion
export { $isLoadedStore as a, $sessionStore as c, $userStore as d, $clerk as f, $clientStore as i, $signInStore as l, $initialState as m, $billingStore as n, $organizationStore as o, $csrState as p, $clerkStore as r, $sessionListStore as s, $authStore as t, $signUpStore as u };
//# sourceMappingURL=external-DHTxQaok.js.map