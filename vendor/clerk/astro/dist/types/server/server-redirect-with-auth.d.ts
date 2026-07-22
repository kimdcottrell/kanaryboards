import type { AuthenticateRequestOptions, ClerkRequest } from '@clerk/backend/internal';
import type { AstroMiddlewareContextParam } from './types';
/**
 * Grabs the dev browser from cookies and appends it to the redirect URL when redirecting to cross-origin.
 */
export declare const serverRedirectWithAuth: (context: AstroMiddlewareContextParam, clerkRequest: ClerkRequest, res: Response, opts: AuthenticateRequestOptions) => Response;
//# sourceMappingURL=server-redirect-with-auth.d.ts.map