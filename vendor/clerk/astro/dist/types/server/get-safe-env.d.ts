import type { APIContext } from 'astro';
type ContextOrLocals = APIContext | APIContext['locals'];
/**
 * @internal
 * Attempts to import env from `cloudflare:workers` and caches the result.
 * This is needed for Astro v6+ where `locals.runtime.env` is no longer available.
 * Safe to call in non-Cloudflare environments — will no-op.
 */
declare function initCloudflareEnv(): Promise<void>;
/**
 * @internal
 */
declare function getSafeEnv(context: ContextOrLocals): {
    domain: string | undefined;
    isSatellite: boolean;
    proxyUrl: string | undefined;
    pk: string | undefined;
    sk: string | undefined;
    machineSecretKey: string | undefined;
    signInUrl: string | undefined;
    signUpUrl: string | undefined;
    clerkJsUrl: string | undefined;
    clerkJsVersion: string | undefined;
    clerkUIUrl: string | undefined;
    clerkUIVersion: string | undefined;
    prefetchUI: boolean | undefined;
    apiVersion: string | undefined;
    apiUrl: string | undefined;
    telemetryDisabled: boolean;
    telemetryDebug: boolean;
    keylessClaimUrl: string | undefined;
    keylessApiKeysUrl: string | undefined;
};
/**
 * @internal
 * This should be used in order to pass environment variables from the server safely to the client.
 * When running an application with `wrangler pages dev` client side environment variables are not attached to `import.meta.env.*`
 * This is not the case when deploying to cloudflare pages directly
 * This is a way to get around it.
 */
declare function getClientSafeEnv(context: ContextOrLocals): {
    domain: string | undefined;
    isSatellite: boolean;
    proxyUrl: string | undefined;
    signInUrl: string | undefined;
    signUpUrl: string | undefined;
    publishableKey: string | undefined;
    keylessClaimUrl: string | undefined;
    keylessApiKeysUrl: string | undefined;
};
export { getSafeEnv, getClientSafeEnv, initCloudflareEnv };
//# sourceMappingURL=get-safe-env.d.ts.map