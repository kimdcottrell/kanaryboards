import { config } from "./config.ts";
import { getAccessToken } from "./auth.ts";
import { CliError } from "./errors.ts";

// A non-2xx response the caller may want to handle (e.g. 409 on edit).
export class ApiError extends CliError {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

// Calls the Kanby API at KANBY_API_URL as the logged-in user. Returns the JSON
// body and ETag. Every command but `user login` needs a stored login.
export async function api<T>(
  method: string,
  path: string,
  { body, headers = {} }: { body?: unknown; headers?: Record<string, string> } =
    {},
): Promise<{ data: T; etag: string | null }> {
  const token = await getAccessToken();
  if (!token) throw new CliError("Not logged in. Run `kanby user login`.");
  let res: Response;
  try {
    res = await fetch(`${config.apiUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        // Selects the CLI's field rules on /api/v1/validate (see fields.ts).
        "X-Kanby-Client": "cli",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new CliError(
      `Couldn't reach ${config.apiUrl}: ${(error as Error).message}`,
    );
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    throw new CliError("Not logged in. Run `kanby user login`.");
  }
  if (res.status === 402) {
    throw new CliError("The Kanby CLI requires a paid plan.");
  }
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data.error ?? `Request failed (${res.status}).`,
    );
  }
  return { data: data as T, etag: res.headers.get("ETag") };
}

// Checks one prompt answer with POST /api/v1/validate/{entity}/{field}.
// Returns the normalized value, or the error to show.
export async function validateField(
  entity: "task" | "row",
  field: string,
  value: unknown,
): Promise<{ value: unknown } | { error: string }> {
  try {
    const { data } = await api<{ value: unknown }>(
      "POST",
      `/api/v1/validate/${entity}/${field}`,
      { body: { value } },
    );
    return { value: data.value };
  } catch (error) {
    if (error instanceof ApiError && error.status === 422) {
      return { error: error.message };
    }
    throw error;
  }
}
