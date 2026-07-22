import type { SignedInSessionResource } from '@clerk/shared/types';
/**
 * A client side store that returns the loaded state of clerk-js.
 *
 * @example
 * $isLoadedStore.subscribe((authloaded => console.log(loaded))
 */
export declare const $isLoadedStore: import("nanostores").ReadableAtom<boolean>;
/**
 * A client side store that is prepopulated with the authentication context during SSR.
 * It is a nanostore, for instructions on how to use nanostores please review the [documentation](https://github.com/nanostores/nanostores)
 *
 * @example
 * $authStore.subscribe((auth) => console.log(auth.userId))
 */
export declare const $authStore: import("nanostores").ReadableAtom<{
    userId: string | null | undefined;
    user: import("@clerk/shared/types").UserResource | null | undefined;
    sessionId: string | null | undefined;
    session: SignedInSessionResource | null | undefined;
    sessionStatus: "active" | "pending" | undefined;
    sessionClaims: import("@clerk/shared/types").JwtPayload | null | undefined;
    organization: import("@clerk/shared/types").OrganizationResource | null | undefined;
    orgId: string | null | undefined;
    orgRole: string | null | undefined;
    orgSlug: string | null | undefined;
    orgPermissions: import("@clerk/shared/types").Autocomplete<import("@clerk/shared/types").OrganizationSystemPermissionKey>[] | null | undefined;
    actor: import("@clerk/shared/types").ActClaim | null | undefined;
    factorVerificationAge: [number, number] | null;
}>;
/**
 * A client side store that is populated after clerk-js has loaded.
 * The store returns back the authenticated user or `null`.
 * It is a nanostore, for instructions on how to use nanostores please review the [documentation](https://github.com/nanostores/nanostores)
 *
 * @example
 * $userStore.subscribe((user) => console.log(user.id))
 */
export declare const $userStore: import("nanostores").ReadableAtom<import("@clerk/shared/types").UserResource | null | undefined>;
/**
 * A client side store that is populated after clerk-js has loaded.
 * The store returns the session of the authenticated user or `null`.
 * It is a nanostore, for instructions on how to use nanostores please review the [documentation](https://github.com/nanostores/nanostores)
 *
 * @example
 * $sessionStore.subscribe((session) => console.log(session.id))
 */
export declare const $sessionStore: import("nanostores").ReadableAtom<import("@clerk/shared/types").ActiveSessionResource | import("@clerk/shared/types").PendingSessionResource | null | undefined>;
/**
 * A client side store that is populated after clerk-js has loaded.
 * The store returns the Active Organization of the authenticated user or `null`.
 * It is a nanostore, for instructions on how to use nanostores please review the [documentation](https://github.com/nanostores/nanostores)
 *
 * @example
 * $organizationStore.subscribe((org) => console.log(org.id))
 */
export declare const $organizationStore: import("nanostores").ReadableAtom<import("@clerk/shared/types").OrganizationResource | null | undefined>;
/**
 * A client side store that is populated after clerk-js has loaded.
 * The store returns the clerk client or `null`.
 * It is a nanostore, for instructions on how to use nanostores please review the [documentation](https://github.com/nanostores/nanostores)
 *
 * @example
 * $clientStore.subscribe((client) => console.log(client?.signedInSessions?.length))
 */
export declare const $clientStore: import("nanostores").ReadableAtom<import("@clerk/shared/types").ClientResource | null | undefined>;
/**
 * A client side store that is populated after clerk-js is instanciated.
 * The store returns the clerk instance or `null`.
 * It is a nanostore, for instructions on how to use nanostores please review the [documentation](https://github.com/nanostores/nanostores)
 *
 * @example
 * $clerkStore.subscribe((clerk) => console.log(clerk.publishableKey))
 */
export declare const $clerkStore: import("nanostores").ReadableAtom<import("@clerk/shared/types").Clerk | null>;
/**
 * A client side store that is populated after clerk-js has loaded.
 * The store returns all the sessions of the current clerk client or `null`.
 * It is a nanostore, for instructions on how to use nanostores please review the [documentation](https://github.com/nanostores/nanostores)
 *
 * @example
 * $sessionListStore.subscribe((sessionList) => sessionList.map((session) => console.log('Session id:', sessino.id) ))
 */
export declare const $sessionListStore: import("nanostores").ReadableAtom<import("@clerk/shared/types").SessionResource[] | undefined>;
/**
 * A client side store that is populated after clerk-js has loaded.
 * The store returns a `SignInResource` or `null`.
 * It is a nanostore, for instructions on how to use nanostores please review the [documentation](https://github.com/nanostores/nanostores)
 *
 * @example
 * $signInStore.subscribe((signIn) => console.log(signIn.status))
 */
export declare const $signInStore: import("nanostores").ReadableAtom<import("@clerk/shared/types").SignInResource | undefined>;
/**
 * A client side store that is populated after clerk-js has loaded.
 * The store returns a `SignUpResource` or `null`.
 * It is a nanostore, for instructions on how to use nanostores please review the [documentation](https://github.com/nanostores/nanostores)
 *
 * @example
 * $signUpStore.subscribe((signUp) => console.log(signUp.status))
 */
export declare const $signUpStore: import("nanostores").ReadableAtom<import("@clerk/shared/types").SignUpResource | undefined>;
/**
 * A client side store that is populated after clerk-js has loaded.
 * The store returns a `BillingNamespace` or `null`.
 * It is a nanostore, for instructions on how to use nanostores please review the [documentation](https://github.com/nanostores/nanostores)
 *
 * @example
 * $billingStore.subscribe((billing) => billing.getPlans().then((plans) => console.log(plans.data.length)))
 */
export declare const $billingStore: import("nanostores").ReadableAtom<import("@clerk/shared/types").BillingNamespace | undefined>;
//# sourceMappingURL=external.d.ts.map