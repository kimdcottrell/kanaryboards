import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { TaskComment } from "@components/context/types.ts";
import { COMMENTS_STORAGE_KEY } from "@components/task/comments/commentStore.ts";

vi.mock("@components/context/hooks.ts", () => ({
  useBoardMeta: () => ({ boardId: "board-1", isAuthenticated: false }),
}));

vi.mock("@clerk/astro/client", () => ({
  $userStore: { get: () => null, listen: () => () => {} },
}));

const toLexical = (text: string) =>
  JSON.stringify({ root: { children: [{ children: [{ text }] }] } });
const fromLexical = (json?: string) =>
  json ? JSON.parse(json).root.children[0].children[0].text : "";

// Editable editors are a textarea whose value getJSON() serializes; read-only
// ones just render the comment's text.
vi.mock("@lyfie/luthor", () => ({
  ExtensiveEditor: (props: {
    defaultContent?: string;
    initialMode?: string;
    onReady?: (m: { getJSON: () => string }) => void;
  }) => {
    const ref = React.useRef<HTMLTextAreaElement>(null);
    React.useEffect(() => {
      props.onReady?.({ getJSON: () => toLexical(ref.current?.value ?? "") });
    }, []);
    if (props.initialMode === "visual-only") {
      return React.createElement("p", null, fromLexical(props.defaultContent));
    }
    return React.createElement("textarea", {
      ref,
      "aria-label": "comment editor",
      defaultValue: fromLexical(props.defaultContent),
    });
  },
}));

import TaskComments from "@components/task/comments/TaskComments.tsx";

function seed(...texts: string[]) {
  const comments: TaskComment[] = texts.map((text, i) => ({
    id: `c${i}`,
    taskId: "task-1",
    authorId: null,
    authorName: "You",
    authorImageUrl: null,
    content: toLexical(text),
    createdAt: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
    updatedAt: null,
  }));
  localStorage.setItem(
    COMMENTS_STORAGE_KEY,
    JSON.stringify({ "task-1": comments }),
  );
}

const bodies = () =>
  screen.queryAllByTestId("comment-body").map((el) => el.textContent);

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  localStorage.clear();
});

describe("TaskComments", () => {
  test("shows an empty state when the task has no comments", async () => {
    render(<TaskComments taskId="task-1" />);
    expect(await screen.findByText("No comments yet.")).toBeTruthy();
  });

  test("lists the newest comment first", async () => {
    seed("oldest", "middle", "newest");
    render(<TaskComments taskId="task-1" />);
    await waitFor(() =>
      expect(bodies()).toEqual(["newest", "middle", "oldest"])
    );
  });

  test("posting adds the comment at the top and clears the composer", async () => {
    seed("older");
    render(<TaskComments taskId="task-1" />);
    await screen.findByText("older");
    const composer = screen.getByTestId("comment-composer");
    fireEvent.change(within(composer).getByLabelText("comment editor"), {
      target: { value: "brand new" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Comment" }));
    await waitFor(() => expect(bodies()).toEqual(["brand new", "older"]));
    expect(
      (within(composer).getByLabelText("comment editor") as HTMLTextAreaElement)
        .value,
    ).toBe("");
    expect(localStorage.getItem(COMMENTS_STORAGE_KEY)).toContain("brand new");
  });

  test("Enter posts the comment; Shift+Enter does not", async () => {
    render(<TaskComments taskId="task-1" />);
    await screen.findByText("No comments yet.");
    const editor = within(screen.getByTestId("comment-composer"))
      .getByLabelText("comment editor");
    fireEvent.change(editor, { target: { value: "via enter" } });
    fireEvent.keyDown(editor, { key: "Enter", shiftKey: true });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryAllByTestId("comment")).toHaveLength(0);
    fireEvent.keyDown(editor, { key: "Enter" });
    await waitFor(() => expect(bodies()).toEqual(["via enter"]));
  });

  test("an empty comment is not posted", async () => {
    render(<TaskComments taskId="task-1" />);
    await screen.findByText("No comments yet.");
    fireEvent.click(screen.getByRole("button", { name: "Comment" }));
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryAllByTestId("comment")).toHaveLength(0);
  });

  test("editing a comment saves it and marks it (edited)", async () => {
    seed("typo");
    render(<TaskComments taskId="task-1" />);
    await screen.findByText("typo");
    fireEvent.click(screen.getByRole("button", { name: "Edit comment" }));
    const item = screen.getByTestId("comment");
    fireEvent.change(within(item).getByLabelText("comment editor"), {
      target: { value: "fixed" },
    });
    fireEvent.click(within(item).getByRole("button", { name: "Save" }));
    await screen.findByText("fixed");
    expect(screen.getByText("(edited)")).toBeTruthy();
  });

  test("deleting a comment asks for confirmation, then removes it", async () => {
    seed("keep", "remove me");
    render(<TaskComments taskId="task-1" />);
    await screen.findByText("remove me");
    fireEvent.click(
      screen.getAllByRole("button", { name: "Delete comment" })[0],
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(bodies()).toEqual(["keep"]));
    expect(localStorage.getItem(COMMENTS_STORAGE_KEY)).not.toContain(
      "remove me",
    );
  });
});
