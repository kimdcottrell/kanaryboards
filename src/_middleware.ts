import { sequence } from "astro:middleware";

//

async function logErrorAndRedirectOnNonSuccess({ locals, request }, next) {
  const { url } = request;
  const { pathname, search } = new URL(url);
  const timestamp = new Date().toISOString();

  let response = await next();
  if (!response.ok) {
    (locals as { timestamp: string }).timestamp = timestamp;
    locals.statusText = response.statusText ?? "statusText not provided";
    locals.status = response.status;

    const logData = {
      dt: timestamp,
      level: "warn",
      message: locals.statusText,
      request: {
        path: `${pathname}${search}`,
        status: locals.status,
        method: request.method,
        headers: Object.fromEntries([...request.headers]),
      },
    };

    return await next("/error");
  }

  return response;
}

export const onRequest = sequence(logErrorAndRedirectOnNonSuccess);
