import type { Task } from "./types.ts";
import { createId } from "@lib/uuid.ts";
import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";

export { createId };

export const STORAGE_KEY = "kanby-v0-1-0";

const initialDefaultColumnNames = ["To Do", "In Progress", "Done"];

export const rowColorOptions = [
  { label: "Blue", value: "var(--color-row-blue)" },
  { label: "Red", value: "var(--color-row-red)" },
  { label: "Yellow", value: "var(--color-row-yellow)" },
  { label: "Green", value: "var(--color-row-green)" },
  { label: "Purple", value: "var(--color-row-purple)" },
  { label: "Grey", value: "var(--color-row-grey)" },
];

export const emptyTaskDraft = (rowId: string, colId: string): Task => ({
  id: "",
  order: "",
  title: "",
  description: "",
  checklist: [{
    id: createId(),
    text: "",
    checked: false,
    order: generateKeyBetween(null, null),
  }],
  rowId,
  colId,
});

export const createDefaultBoard = () => {
  const rowId = createId();
  const columnOrders = generateNKeysBetween(
    null,
    null,
    initialDefaultColumnNames.length,
  );
  const columns = initialDefaultColumnNames.map((title, i) => ({
    id: createId(),
    title,
    order: columnOrders[i],
  }));
  const todoColId = columns[0].id;

  const task: Task = {
    id: createId(),
    rowId,
    colId: todoColId,
    order: generateKeyBetween(null, null),
    title: "Getting Started",
    description: JSON.stringify({
      "root": {
        "children": [{
          "children": [{
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text": "What does this do?",
            "type": "text",
            "version": 1,
          }],
          "direction": null,
          "format": "",
          "indent": 0,
          "type": "heading",
          "version": 1,
          "tag": "h1",
        }, {
          "children": [{
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text":
              "Think of this as a really fancy todo board. You can use AI to do a lot of the grunt work, such as planning the tasks or checklist subtask items - or even some task execution!",
            "type": "text",
            "version": 1,
          }],
          "direction": null,
          "format": "",
          "indent": 0,
          "type": "paragraph",
          "version": 1,
          "textFormat": 0,
          "textStyle": "",
        }, {
          "children": [{
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text": "How can I get started?",
            "type": "text",
            "version": 1,
          }],
          "direction": null,
          "format": "",
          "indent": 0,
          "type": "heading",
          "version": 1,
          "tag": "h1",
        }, {
          "children": [{
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text": "You can add cards in here, but that's boring.",
            "type": "text",
            "version": 1,
          }],
          "direction": null,
          "format": "",
          "indent": 0,
          "type": "paragraph",
          "version": 1,
          "textFormat": 0,
          "textStyle": "",
        }, {
          "children": [{
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text": "Open up the ",
            "type": "text",
            "version": 1,
          }, {
            "detail": 0,
            "format": 16,
            "mode": "normal",
            "style": "",
            "text": "Board Configuration",
            "type": "text",
            "version": 1,
          }, {
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text":
              " outside of this task modal and higher up in the page. In it, fill out the fields in ",
            "type": "text",
            "version": 1,
          }, {
            "detail": 0,
            "format": 16,
            "mode": "normal",
            "style": "",
            "text": "Create a new row",
            "type": "text",
            "version": 1,
          }, {
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text": " to really get the party started.",
            "type": "text",
            "version": 1,
          }],
          "direction": null,
          "format": "",
          "indent": 0,
          "type": "paragraph",
          "version": 1,
          "textFormat": 0,
          "textStyle": "",
        }],
        "direction": null,
        "format": "",
        "indent": 0,
        "type": "root",
        "version": 1,
      },
    }),
    checklist: (() => {
      const orders = generateNKeysBetween(null, null, 2);
      return [
        { id: createId(), text: "Open me up", checked: false, order: orders[0] },
        {
          id: createId(),
          text: "Create a new row via the Board Configuration",
          checked: false,
          order: orders[1],
        },
      ];
    })(),
  };

  return {
    rows: [{
      id: rowId,
      title: "Sample Project",
      color: "var(--color-row-blue)",
      order: generateKeyBetween(null, null),
    }],
    columns,
    tasks: [task],
  };
};

export const loadPersistedState = () => {
  if (typeof globalThis.localStorage === "undefined") return null;
  try {
    const stored = globalThis.localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};
