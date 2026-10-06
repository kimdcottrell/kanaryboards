// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import type { APIContext } from "astro";
import { _setKvForTest, listTaskComments } from "@lib/db/kv.ts";
import type { TaskComment } from "@components/context/types.ts";

const { GET, POST, PATCH, DELETE } = await import(
  "@pages/api/task-comments.ts"
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

function makeContext(
  { userId = "user_1", method = "GET", body, query = "" }: {
    userId?: string | null;
    method?: string;
    body?: object;
    query?: string;
  } = {},
): APIContext {
  const url = new URL(`http://localhost/api/task-comments${query}`);
  return {
    url,
    request: new Request(url, {
      method,
      body: body ? JSON.stringify(body) : undefined,
    }),
    locals: { auth: () => ({ userId }), boardId },
  } as unknown as APIContext;
}

async function post(taskId: string, userId = "user_1"): Promise<TaskComment> {
  const res = await POST(makeContext({
    userId,
    method: "POST",
    body: { taskId, content, authorName: "Kim", authorImageUrl: null },
  }));
  expect(res.status).toBe(201);
  return res.json();
}

describe("/api/task-comments", () => {
  test.each(
    [["GET", GET], ["POST", POST], ["PATCH", PATCH], [
      "DELETE",
      DELETE,
    ]] as const,
  )("%s returns 401 when unauthenticated", async (method, fn) => {
    const res = await fn(makeContext({ userId: null, method }));
    expect(res.status).toBe(401);
  });

  test("POST stamps id, author and createdAt from the server", async () => {
    const comment = await post("task-1");
    expect(comment).toMatchObject({
      taskId: "task-1",
      authorId: "user_1",
      authorName: "Kim",
      content,
      updatedAt: null,
    });
    expect(comment.id).toBeTruthy();
    expect(Date.parse(comment.createdAt)).not.toBeNaN();
  });

  test("POST rejects an empty comment", async () => {
    const res = await POST(makeContext({
      method: "POST",
      body: { taskId: "t", content: "", authorName: "K", authorImageUrl: null },
    }));
    expect(res.status).toBe(400);
  });

  test("GET lists only that task's comments, newest first", async () => {
    const first = await post("task-1");
    await new Promise((r) => setTimeout(r, 5));
    const second = await post("task-1");
    await post("task-2");
    const res = await GET(makeContext({ query: "?taskId=task-1" }));
    const list: TaskComment[] = await res.json();
    expect(list.map((c) => c.id)).toEqual([second.id, first.id]);
  });

  test("PATCH updates content and sets updatedAt", async () => {
    const comment = await post("task-1");
    const newContent = content.replace("Hello", "Edited");
    const res = await PATCH(makeContext({
      method: "PATCH",
      body: { taskId: "task-1", id: comment.id, content: newContent },
    }));
    expect(res.status).toBe(200);
    const updated: TaskComment = await res.json();
    expect(updated.content).toBe(newContent);
    expect(updated.updatedAt).not.toBeNull();
  });

  test("PATCH and DELETE refuse another user's comment", async () => {
    const comment = await post("task-1", "user_2");
    const body = { taskId: "task-1", id: comment.id, content };
    expect((await PATCH(makeContext({ method: "PATCH", body }))).status).toBe(
      403,
    );
    expect((await DELETE(makeContext({ method: "DELETE", body }))).status)
      .toBe(403);
  });

  test("PATCH returns 404 for a missing comment", async () => {
    const res = await PATCH(makeContext({
      method: "PATCH",
      body: { taskId: "task-1", id: "nope", content },
    }));
    expect(res.status).toBe(404);
  });

  test("DELETE with an id removes one comment", async () => {
    const keep = await post("task-1");
    const gone = await post("task-1");
    await DELETE(makeContext({
      method: "DELETE",
      body: { taskId: "task-1", id: gone.id },
    }));
    const list = await listTaskComments(boardId, "task-1");
    expect(list.map((c) => c.id)).toEqual([keep.id]);
  });

  test("DELETE without an id removes all of the task's comments", async () => {
    await post("task-1");
    await post("task-1");
    await post("task-2");
    await DELETE(makeContext({ method: "DELETE", body: { taskId: "task-1" } }));
    expect(await listTaskComments(boardId, "task-1")).toEqual([]);
    expect(await listTaskComments(boardId, "task-2")).toHaveLength(1);
  });
});
