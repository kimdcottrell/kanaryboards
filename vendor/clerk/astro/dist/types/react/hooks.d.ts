import type { PendingSessionOptions, UseAuthReturn } from '@clerk/shared/types';
type UseAuth = (options?: PendingSessionOptions) => UseAuthReturn;
/**
 * Returns the current auth state, the user and session ids and the `getToken`
 * that can be used to retrieve the given template or the default Clerk token.
 *
 * Until Clerk loads, `isLoaded` will be set to `false`.
 * Once Clerk loads, `isLoaded` will be set to `true`, and you can
 * safely access the `userId` and `sessionId` variables.
 *
 * For projects using a server, you can have immediate access to this data during SSR.
 *
 * @example
 * function Hello() {
 *   const { isSignedIn, sessionId, userId } = useAuth();
 *   if(isSignedIn) {
 *     return null;
 *   }
 *   console.log(sessionId, userId)
 *   return <div>...</div>
 * }
 *
 * This page will be fully rendered during SSR:
 * @example
 * export HelloPage = () => {
 *   const { isSignedIn, sessionId, userId } = useAuth();
 *   console.log(isSignedIn, sessionId, userId)
 *   return <div>...</div>
 * }
 */
export declare const useAuth: UseAuth;
export {};
//# sourceMappingURL=hooks.d.ts.map