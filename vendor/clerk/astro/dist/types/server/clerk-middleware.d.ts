import type { ClerkClient } from '@clerk/backend';
import type { AuthenticateRequestOptions, ClerkRequest, RequestState } from '@clerk/backend/internal';
import type { AstroMiddleware, AstroMiddlewareContextParam, AstroMiddlewareNextParam, AstroMiddlewareReturn, AuthFn } from './types';
type ClerkAstroMiddlewareHandler = (auth: AuthFn, context: AstroMiddlewareContextParam, next: AstroMiddlewareNextParam) => AstroMiddlewareReturn | undefined;
export type ClerkAstroMiddlewareOptions = AuthenticateRequestOptions;
/**
 * Middleware for Astro that handles authentication and authorization with Clerk.
 */
interface ClerkMiddleware {
    /**
     * @example
     * export default clerkMiddleware((auth, context, next) => { ... }, options);
     */
    (handler: ClerkAstroMiddlewareHandler, options?: ClerkAstroMiddlewareOptions): AstroMiddleware;
    /**
     * @example
     * export default clerkMiddleware(options);
     */
    (options?: ClerkAstroMiddlewareOptions): AstroMiddleware;
}
export declare const clerkMiddleware: ClerkMiddleware;
type AuthenticateRequest = Pick<ClerkClient, 'authenticateRequest'>['authenticateRequest'];
export declare const createAuthenticateRequestOptions: (clerkRequest: ClerkRequest, options: ClerkAstroMiddlewareOptions, context: AstroMiddlewareContextParam) => Parameters<AuthenticateRequest>[1];
export declare const decorateResponseWithObservabilityHeaders: (res: Response, requestState: RequestState) => Response;
export declare const handleMultiDomainAndProxy: (clerkRequest: ClerkRequest, opts: AuthenticateRequestOptions, context: AstroMiddlewareContextParam) => {
    proxyUrl: string | undefined;
    isSatellite: boolean;
    domain: string | undefined;
};
export declare const missingDomainAndProxy = "\nMissing domain and proxyUrl. A satellite application needs to specify a domain or a proxyUrl.\n\n1) With middleware\n   e.g. export default clerkMiddleware({domain:'YOUR_DOMAIN',isSatellite:true});\n2) With environment variables e.g.\n   PUBLIC_CLERK_DOMAIN='YOUR_DOMAIN'\n   PUBLIC_CLERK_IS_SATELLITE='true'\n   ";
export declare const missingSignInUrlInDev = "\nInvalid signInUrl. A satellite application requires a signInUrl for development instances.\nCheck if signInUrl is missing from your configuration or if it is not an absolute URL\n\n1) With middleware\n   e.g. export default clerkMiddleware({signInUrl:'SOME_URL', isSatellite:true});\n2) With environment variables e.g.\n   PUBLIC_CLERK_SIGN_IN_URL='SOME_URL'\n   PUBLIC_CLERK_IS_SATELLITE='true'";
export {};
//# sourceMappingURL=clerk-middleware.d.ts.map