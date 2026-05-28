import type { Task, TaskDraft } from "./types.ts";

export const STORAGE_KEY = "kanary-boards";

export const createId = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });

export const initialDefaultColumnNames = ["To Do", "In Progress", "Done"];

export const rowColorOptions = [
  { label: "Blue", value: "var(--color-row-blue)" },
  { label: "Red", value: "var(--color-row-red)" },
  { label: "Yellow", value: "var(--color-row-yellow)" },
  { label: "Green", value: "var(--color-row-green)" },
  { label: "Purple", value: "var(--color-row-purple)" },
  { label: "Grey", value: "var(--color-row-grey)" },
];

export const emptyTaskDraft = (rowId: string, colId: string): TaskDraft => ({
  title: "",
  description: "",
  checklist: [{ id: createId(), text: "", checked: false }],
  rowId,
  colId,
});

export const createDefaultBoard = () => {
  const rowId = createId();
  const columns = initialDefaultColumnNames.map((name) => ({
    id: createId(),
    name,
  }));
  const todoColId = columns[0].id;

  const task: Task = {
    id: createId(),
    rowId,
    colId: todoColId,
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
    checklist: [
      { id: createId(), text: "Open me up", checked: false },
      {
        id: createId(),
        text: "Create a new row via the Board Configuration",
        checked: false,
      },
    ],
  };

  return {
    rows: [{
      id: rowId,
      name: "Sample Project",
      color: "var(--color-row-blue)",
    }],
    columns,
    tasks: [task],
    defaultColumnNames: initialDefaultColumnNames,
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
