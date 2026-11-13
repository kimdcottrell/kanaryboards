import assert from "node:assert/strict";
import type { TaskView } from "../../src/lib/types.ts";

// A logged-in CLI (credentials from fixtures/) whose API calls hit the stub
// below. config.ts reads these when first imported.
Deno.env.set("KANBY_API_URL", "http://127.0.0.1:1");
Deno.env.set("KANBY_CLERK_ISSUER", "https://issuer.test");
Deno.env.set("KANBY_CLERK_OAUTH_CLIENT_ID", "test-client");
Deno.env.set(
  "XDG_CONFIG_HOME",
  new URL("./fixtures/config", import.meta.url).pathname,
);
const { saveTaskEdit } = await import("../commands/task.ts");
const { ApiError } = await import("../api.ts");

const task: TaskView = {
  id: "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b",
  shortId: "2e3f4a5b",
  title: "Write CLI",
  description: "",
  rowId: "row-1",
  rowTitle: "Project",
  colId: "col-1",
  colTitle: "To Do",
  checklist: [],
  trashed: false,
};

// Answers every request with `status` and `body`, recording the requests.
function stubFetch(status: number, body: unknown) {
  const requests: Request[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    requests.push(new Request(input, init));
    return Promise.resolve(Response.json(body, { status }));
  };
  return { requests, restore: () => globalThis.fetch = original };
}

Deno.test("saveTaskEdit: sends the ETag from the start of the edit as If-Match", async () => {
  const { requests, restore } = stubFetch(200, task);
  try {
    await saveTaskEdit(task, { title: "Renamed" }, '"v1"');
  } finally {
    restore();
  }
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, "PATCH");
  assert.equal(new URL(requests[0].url).pathname, `/api/v1/tasks/${task.id}`);
  assert.equal(requests[0].headers.get("If-Match"), '"v1"');
});

Deno.test("saveTaskEdit: a task saved elsewhere during the edit (409) is reported, not saved", async () => {
  const { restore } = stubFetch(409, {
    error: "This task changed since it was read.",
  });
  try {
    await assert.rejects(
      saveTaskEdit(task, { title: "Renamed" }, '"v1"'),
      (error: unknown) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.status, 409);
        assert.equal(
          error.message,
          "This task changed while you were editing. Re-run `kanby task edit --id 2e3f4a5b`.",
        );
        return true;
      },
    );
  } finally {
    restore();
  }
});
