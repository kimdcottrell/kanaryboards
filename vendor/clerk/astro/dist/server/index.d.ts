import { a as AuthFn, i as AstroMiddlewareReturn, n as AstroMiddlewareContextParam, r as AstroMiddlewareNextParam, t as AstroMiddleware } from "../types-DXY3sfKg.js";
import { AllowlistIdentifier, ClerkClient, Client, EmailAddress, ExternalAccount, Invitation, OauthAccessToken, Organization, OrganizationDomain, OrganizationInvitation, OrganizationMembership, OrganizationMembershipPublicUserData, OrganizationMembershipRole, PhoneNumber, SMSMessage, Session, SignInToken, Token, User, WebhookEvent, WebhookEventType, createClerkClient, verifyToken } from "@clerk/backend";
import { AuthenticateRequestOptions, SignedInAuthObject, SignedOutAuthObject } from "@clerk/backend/internal";
import { APIContext } from "astro";

//#region src/server/clerk-middleware.d.ts
type ClerkAstroMiddlewareHandler = (auth: AuthFn, context: AstroMiddlewareContextParam, next: AstroMiddlewareNextParam) => AstroMiddlewareReturn | undefined;
type ClerkAstroMiddlewareOptions = AuthenticateRequestOptions;
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
declare const clerkMiddleware: ClerkMiddleware;
//#endregion
//#region src/server/clerk-client.d.ts
declare const clerkClient: (context: APIContext) => ClerkClient;
//#endregion
//#region src/server/index.d.ts
/**
 * @deprecated Use `AuthObject` instead. This type only supports session auth.
 * `context.locals.auth()` can now return an `AuthObject` with session and machine auth support.
 */
type GetAuthReturn = SignedInAuthObject | SignedOutAuthObject;
//#endregion
export { type AllowlistIdentifier, type AuthFn, type Client, type EmailAddress, type ExternalAccount, type GetAuthReturn, type Invitation, type OauthAccessToken, type Organization, type OrganizationDomain, type OrganizationInvitation, type OrganizationMembership, type OrganizationMembershipPublicUserData, type OrganizationMembershipRole, type PhoneNumber, type SMSMessage, type Session, type SignInToken, type Token, type User, type WebhookEvent, type WebhookEventType, clerkClient, clerkMiddleware, createClerkClient, verifyToken };
//# sourceMappingURL=index.d.ts.map