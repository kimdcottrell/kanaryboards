import { useReducer } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { makeBoardRefs } from "./setup.ts";

vi.mock("@components/context/hooks.ts", () => ({
  useBoardRefs: vi.fn(),
  useChecklistAIState: vi.fn(),
  useChecklistAIActions: vi.fn(),
  handleChecklistKeyDown: vi.fn(),
}));

import { useBoardRefs } from "@components/context/hooks.ts";
import {
  boardReducer,
  createInitialState,
} from "@components/context/reducer.ts";
import type { ChecklistItem } from "@components/context/types.ts";
import ChecklistSection from "@components/task/form-elements/ChecklistSection.tsx";

beforeEach(() => {
  vi.mocked(useBoardRefs).mockReturnValue(makeBoardRefs());
});

// Wires ChecklistSection to the real reducer so pasted items land in state the
// same way they do through useTaskCreateActions.
function Harness({ initial }: { initial: ChecklistItem[] }) {
  const [state, dispatch] = useReducer(boardReducer, undefined, () => {
    const base = createInitialState();
    return { ...base, taskDraft: { ...base.taskDraft, checklist: initial } };
  });
  let n = 0;
  return (
    <ChecklistSection
      checklist={state.taskDraft.checklist}
      addChecklistItem={(_focusNew, insertBeforeIndex, text = "") =>
        dispatch({
          type: "CHECKLIST/ADD_ITEM",
          payload: {
            target: "draft",
            item: { id: `new-${n++}`, text, checked: false, order: "" },
            insertBeforeIndex,
          },
        })}
      updateChecklistItem={vi.fn()}
      deleteChecklistItem={vi.fn()}
      reorderChecklistItem={vi.fn()}
    />
  );
}

const entry: ChecklistItem = {
  id: "entry",
  text: "",
  checked: false,
  order: "a0",
};
const existing: ChecklistItem = {
  id: "x",
  text: "existing",
  checked: false,
  order: "a1",
};

const inputs = () =>
  screen.getAllByTestId("checklist-item-awaiting-input") as HTMLInputElement[];
const texts = () => inputs().map((i) => i.value);
const paste = (el: HTMLElement, text: string) =>
  fireEvent.paste(el, { clipboardData: { getData: () => text } });

describe("ChecklistSection paste", () => {
  test("multi-line paste into the entry row adds one item per line, in order", () => {
    render(<Harness initial={[entry, existing]} />);
    paste(inputs()[0], "a\nb\nc");
    expect(texts()).toEqual(["", "a", "b", "c", "existing"]);
  });

  test("multi-line paste into an existing item inserts the lines below it", () => {
    render(<Harness initial={[entry, existing]} />);
    paste(inputs()[1], "a\nb");
    expect(texts()).toEqual(["", "existing", "a", "b"]);
  });

  test("trims lines, skips blank ones, and handles CRLF", () => {
    render(<Harness initial={[entry]} />);
    paste(inputs()[0], "  a \r\n\r\n b\r\n");
    expect(texts()).toEqual(["", "a", "b"]);
  });

  test("single-line paste is left to the browser", () => {
    render(<Harness initial={[entry]} />);
    const event = paste(inputs()[0], "just one\n");
    // fireEvent returns false when the handler called preventDefault.
    expect(event).toBe(true);
    expect(texts()).toEqual([""]);
  });
});
