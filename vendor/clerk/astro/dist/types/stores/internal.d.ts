import type { Clerk, ClientResource, OrganizationResource, SignedInSessionResource, UserResource } from '@clerk/shared/types';
export declare const $csrState: import("nanostores").PreinitializedMapStore<{
    isLoaded: boolean;
    client: ClientResource | undefined | null;
    user: UserResource | undefined | null;
    session: SignedInSessionResource | undefined | null;
    organization: OrganizationResource | undefined | null;
}> & object;
export declare const $initialState: import("nanostores").PreinitializedMapStore<import("@clerk/shared/types").Serializable<{
    sessionClaims: import("@clerk/shared/types").JwtPayload;
    sessionId: string | undefined;
    sessionStatus: import("@clerk/shared/types").SessionStatusClaim;
    session: import("@clerk/shared/types").SessionResource | undefined;
    actor: import("@clerk/shared/types").ActClaim | undefined;
    userId: string | undefined;
    user: UserResource | undefined;
    orgId: string | undefined;
    orgRole: import("@clerk/shared/types").OrganizationCustomRoleKey | undefined;
    orgSlug: string | undefined;
    orgPermissions: import("@clerk/shared/types").OrganizationCustomPermissionKey[] | undefined;
    organization: OrganizationResource | undefined;
    factorVerificationAge: [number, number];
}>> & object;
export declare const $clerk: import("nanostores").PreinitializedWritableAtom<Clerk | null> & object;
//# sourceMappingURL=internal.d.ts.map