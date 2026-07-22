import { SessionAuthObject } from "@clerk/backend";
import { GetAuthFnNoRequest, RedirectFun } from "@clerk/backend/internal";
import { APIContext } from "astro";

//#region src/server/types.d.ts
/**
 * These types are copied from astro.
 * In Astro v3 and v4 both resolve in the save types, but
 * in v3 `MiddlewareNext` is a generic and in v4 it is not.
 */
type MiddlewareNext = () => Promise<Response>;
type MiddlewareHandler = (context: APIContext, next: MiddlewareNext) => Promise<Response> | Response | Promise<void> | void;
type AstroMiddleware = MiddlewareHandler;
type AstroMiddlewareContextParam = APIContext;
type AstroMiddlewareNextParam = MiddlewareNext;
type AstroMiddlewareReturn = Response | Promise<Response>;
type SessionAuthObjectWithRedirect = SessionAuthObject & {
  redirectToSignIn: RedirectFun<Response>;
};
type AuthFn = GetAuthFnNoRequest<SessionAuthObjectWithRedirect>;
//#endregion
export { AuthFn as a, AstroMiddlewareReturn as i, AstroMiddlewareContextParam as n, SessionAuthObjectWithRedirect as o, AstroMiddlewareNextParam as r, AstroMiddleware as t };
//# sourceMappingURL=types-DXY3sfKg.d.ts.map