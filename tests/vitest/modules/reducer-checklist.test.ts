import { describe, expect, test, vi } from "vitest";
import {
  boardReducer,
  createInitialState,
} from "@components/context/reducer.ts";
import { handleChecklistKeyDown } from "@components/context/actions/shared.ts";
import type { BoardState, ChecklistItem } from "@components/context/types.ts";

// ── Helpers ───────────────────────────────────────────────────────────────────

function stateWithChecklist(checklist: ChecklistItem[]): BoardState {
  const base = createInitialState();
  return {
    ...base,
    taskDraft: { ...base.taskDraft, checklist },
  };
}

const items: ChecklistItem[] = [
  { id: "a", text: "first", checked: false, order: "a0" },
  { id: "b", text: "second", checked: false, order: "a1" },
];

const newItem: ChecklistItem = {
  id: "new",
  text: "",
  checked: false,
  order: "",
};

// ── Add ordering (button path) ────────────────────────────────────────────────

describe("CHECKLIST/ADD_ITEM ordering", () => {
  test("appends to the end when no insertBeforeIndex is given (button add)", () => {
    const state = stateWithChecklist(items);
    const next = boardReducer(state, {
      type: "CHECKLIST/ADD_ITEM",
      payload: { target: "draft", item: newItem },
    });
    const ids = next.taskDraft.checklist.map((i) => i.id);
    expect(ids).toEqual(["a", "b", "new"]);
  });

  test("inserts at the given index when insertBeforeIndex is provided", () => {
    const state = stateWithChecklist(items);
    const next = boardReducer(state, {
      type: "CHECKLIST/ADD_ITEM",
      payload: { target: "draft", item: newItem, insertBeforeIndex: 1 },
    });
    const ids = next.taskDraft.checklist.map((i) => i.id);
    expect(ids).toEqual(["a", "new", "b"]);
  });

  test("Shift+Enter on the last item appends after it (index + 1)", () => {
    const state = stateWithChecklist(items);
    // handleChecklistKeyDown forwards index + 1 — simulate that here.
    const next = boardReducer(state, {
      type: "CHECKLIST/ADD_ITEM",
      payload: { target: "draft", item: newItem, insertBeforeIndex: 2 },
    });
    const ids = next.taskDraft.checklist.map((i) => i.id);
    expect(ids).toEqual(["a", "b", "new"]);
  });
});

// ── Reorder (drag-and-drop) ───────────────────────────────────────────────────

describe("CHECKLIST/REORDER_ITEM", () => {
  const three: ChecklistItem[] = [
    { id: "a", text: "first", checked: false, order: "a0" },
    { id: "b", text: "second", checked: false, order: "a1" },
    { id: "c", text: "third", checked: false, order: "a2" },
  ];

  test("moves the first item to the end (beforeItemId null)", () => {
    const state = stateWithChecklist(three);
    const next = boardReducer(state, {
      type: "CHECKLIST/REORDER_ITEM",
      payload: { target: "draft", itemId: "a", beforeItemId: null },
    });
    expect(next.taskDraft.checklist.map((i) => i.id)).toEqual(["b", "c", "a"]);
  });

  test("moves the last item before the middle item", () => {
    const state = stateWithChecklist(three);
    const next = boardReducer(state, {
      type: "CHECKLIST/REORDER_ITEM",
      payload: { target: "draft", itemId: "c", beforeItemId: "b" },
    });
    expect(next.taskDraft.checklist.map((i) => i.id)).toEqual(["a", "c", "b"]);
  });

  test("dropping an item onto itself is a no-op", () => {
    const state = stateWithChecklist(three);
    const next = boardReducer(state, {
      type: "CHECKLIST/REORDER_ITEM",
      payload: { target: "draft", itemId: "a", beforeItemId: "a" },
    });
    expect(next.taskDraft.checklist.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
});

// ── handleChecklistKeyDown ────────────────────────────────────────────────────

function fakeEvent(overrides: Partial<KeyboardEvent>): KeyboardEvent {
  return {
    key: "Enter",
    shiftKey: false,
    preventDefault: vi.fn(),
    target: { blur: vi.fn() } as unknown as EventTarget,
    ...overrides,
  } as KeyboardEvent;
}

describe("handleChecklistKeyDown", () => {
  test("Shift+Enter adds a new item after the current index (index + 1)", () => {
    const addItemFn = vi.fn();
    const event = fakeEvent({ key: "Enter", shiftKey: true });
    handleChecklistKeyDown(event, 1, addItemFn);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(addItemFn).toHaveBeenCalledWith(true, 2);
  });

  test("plain Enter blurs the input and does not add an item", () => {
    const addItemFn = vi.fn();
    const blur = vi.fn();
    const event = fakeEvent({
      key: "Enter",
      shiftKey: false,
      target: { blur } as unknown as EventTarget,
    });
    handleChecklistKeyDown(event, 0, addItemFn);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(blur).toHaveBeenCalled();
    expect(addItemFn).not.toHaveBeenCalled();
  });
});
