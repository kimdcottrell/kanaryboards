import type { APIContext } from 'astro';
export type { KeylessResult } from '@clerk/shared/keyless';
/**
 * Resolves Clerk keys, falling back to keyless mode in development if configured keys are missing.
 */
export declare function resolveKeysWithKeylessFallback(configuredPublishableKey: string | undefined, configuredSecretKey: string | undefined, context: APIContext): Promise<import("@clerk/shared/keyless").KeylessResult>;
//# sourceMappingURL=utils.d.ts.map