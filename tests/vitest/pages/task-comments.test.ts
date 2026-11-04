// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import type { APIContext } from "astro";
import { _setKvForTest, listTaskComments } from "@lib/db/kv.ts";
import type { TaskComment } from "@components/react/context/types.ts";

const comments = await import("@pages/api/v1/tasks/[id]/comments/index.ts");
const comment = await import(
  "@pages/api/v1/tasks/[id]/comments/[commentId].ts"
);

let memKv: Deno.Kv;

beforeEach(async () => {
  memKv = await Deno.openKv(":memory:");
  _setKvForTest(memKv);
});

afterEach(() => {
  memKv.close();
});

const boardId = "board_1";
const content = JSON.stringify({
  root: { children: [{ children: [{ text: "Hello" }] }] },
});

// A request to /api/v1/tasks/{params.id}/comments[/{params.commentId}].
function makeContext<P extends { id: string; commentId?: string }>(
  params: P,
  { userId = "user_1", method = "GET", body }: {
    userId?: string | null;
    method?: string;
    body?: object;
  } = {},
): APIContext<Record<string, unknown>, P> {
  const url = new URL(
    `http://localhost/api/v1/tasks/${params.id}/comments${
      params.commentId ? `/${params.commentId}` : ""
    }`,
  );
  return {
    url,
    params,
    request: new Request(url, {
      method,
      body: body ? JSON.stringify(body) : undefined,
    }),
    locals: { auth: () => ({ userId }), boardId },
  } as unknown as APIContext<Record<string, unknown>, P>;
}

async function post(taskId: string, userId = "user_1"): Promise<TaskComment> {
  const res = await comments.POST(makeContext({ id: taskId }, {
    userId,
    method: "POST",
    body: { content, authorName: "Kim", authorImageUrl: null },
  }));
  expect(res.status).toBe(201);
  return res.json();
}

describe("/api/v1/tasks/[id]/comments", () => {
  test.each(
    [["GET", comments.GET], ["POST", comments.POST], [
      "DELETE",
      comments.DELETE,
    ]] as const,
  )("%s returns 401 when unauthenticated", async (method, fn) => {
    const res = await fn(
      makeContext({ id: "task-1" }, { userId: null, method }),
    );
    expect(res.status).toBe(401);
  });

  test("POST stamps id, taskId, author and createdAt from the server", async () => {
    const created = await post("task-1");
    expect(created).toMatchObject({
      taskId: "task-1",
      authorId: "user_1",
      authorName: "Kim",
      content,
      updatedAt: null,
    });
    expect(created.id).toBeTruthy();
    expect(Date.parse(created.createdAt)).not.toBeNaN();
  });

  test("POST rejects an empty comment", async () => {
    const res = await comments.POST(makeContext({ id: "t" }, {
      method: "POST",
      body: { content: "", authorName: "K", authorImageUrl: null },
    }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid request body." });
  });

  test("GET lists only that task's comments, newest first", async () => {
    const first = await post("task-1");
    await new Promise((r) => setTimeout(r, 5));
    const second = await post("task-1");
    await post("task-2");
    const res = await comments.GET(makeContext({ id: "task-1" }));
    const list: TaskComment[] = await res.json();
    expect(list.map((c) => c.id)).toEqual([second.id, first.id]);
  });

  test("DELETE removes all of the task's comments", async () => {
    await post("task-1");
    await post("task-1", "user_2");
    await post("task-2");
    const res = await comments.DELETE(
      makeContext({ id: "task-1" }, { method: "DELETE" }),
    );
    expect(res.status).toBe(200);
    expect(await listTaskComments(boardId, "task-1")).toEqual([]);
    expect(await listTaskComments(boardId, "task-2")).toHaveLength(1);
  });
});

describe("/api/v1/tasks/[id]/comments/[commentId]", () => {
  const one = (commentId: string) => ({ id: "task-1", commentId });

  test.each(
    [["PATCH", comment.PATCH], ["DELETE", comment.DELETE]] as const,
  )("%s returns 401 when unauthenticated", async (method, fn) => {
    const res = await fn(makeContext(one("c"), { userId: null, method }));
    expect(res.status).toBe(401);
  });

  test("PATCH updates content and sets updatedAt", async () => {
    const created = await post("task-1");
    const newContent = content.replace("Hello", "Edited");
    const res = await comment.PATCH(makeContext(one(created.id), {
      method: "PATCH",
      body: { content: newContent },
    }));
    expect(res.status).toBe(200);
    const updated: TaskComment = await res.json();
    expect(updated.content).toBe(newContent);
    expect(updated.updatedAt).not.toBeNull();
  });

  test("PATCH and DELETE refuse another user's comment", async () => {
    const created = await post("task-1", "user_2");
    const params = one(created.id);
    const patch = await comment.PATCH(
      makeContext(params, { method: "PATCH", body: { content } }),
    );
    expect(patch.status).toBe(403);
    expect(await patch.json()).toEqual({ error: "Forbidden" });
    const del = await comment.DELETE(makeContext(params, { method: "DELETE" }));
    expect(del.status).toBe(403);
  });

  test("PATCH and DELETE return 404 for a missing comment", async () => {
    const patch = await comment.PATCH(
      makeContext(one("nope"), { method: "PATCH", body: { content } }),
    );
    expect(patch.status).toBe(404);
    expect(await patch.json()).toEqual({ error: "Not found." });
    const del = await comment.DELETE(
      makeContext(one("nope"), { method: "DELETE" }),
    );
    expect(del.status).toBe(404);
  });

  test("DELETE removes one comment", async () => {
    const keep = await post("task-1");
    const gone = await post("task-1");
    const res = await comment.DELETE(
      makeContext(one(gone.id), { method: "DELETE" }),
    );
    expect(res.status).toBe(200);
    const list = await listTaskComments(boardId, "task-1");
    expect(list.map((c) => c.id)).toEqual([keep.id]);
  });
});
