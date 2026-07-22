import type { CreateClerkInstanceInternalFn } from './types';
/**
 * Prevents mounting components multiple times when the `createClerkInstanceInternal` was been called twice without await first
 * This is useful as the "integration" may call the function twice at the same time.
 */
declare const runOnce: (onFirst: CreateClerkInstanceInternalFn) => (params: Parameters<CreateClerkInstanceInternalFn>[0]) => Promise<unknown>;
export { runOnce };
//# sourceMappingURL=run-once.d.ts.map