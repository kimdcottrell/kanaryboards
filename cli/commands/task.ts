import {
  confirm,
  groupMultiselect,
  intro,
  log,
  note,
  outro,
  select,
} from "@clack/prompts";
import { api, ApiError, validateField } from "../api.ts";
import { config } from "../config.ts";
import { CliError } from "../errors.ts";
import { answer, askText, printTable, waiting } from "../prompts.ts";
import type {
  ChecklistItem,
  ColumnView,
  RowView,
  TaskView,
} from "../../src/lib/types.ts";

const askTitle = (initialValue?: string) =>
  askText("Title", {
    initialValue,
    check: (value) => validateField("task", "title", value),
  });

const askDescription = (initialValue?: string) =>
  askText("Description (Press Tab, then Enter, to finish)", {
    initialValue: initialValue || undefined,
    required: false,
    multiline: true,
    check: (value) => validateField("task", "description", value),
  });

// The rows and columns to pick from. Fetched one after the other: parallel
// calls could both refresh an expired token with the same refresh token.
async function rowsAndColumns() {
  const { rows, columns } = await waiting((async () => ({
    rows: (await api<RowView[]>("GET", "/api/v1/rows")).data,
    columns: (await api<ColumnView[]>("GET", "/api/v1/columns")).data,
  }))());
  if (rows.length === 0) {
    throw new CliError("No rows yet. Create one with `kanby row create`.");
  }
  return { rows, columns };
}

const pick = async (
  message: string,
  items: { id: string; title: string }[],
  initialValue?: string,
) =>
  answer(
    await select({
      message,
      options: items.map((i) => ({ label: i.title, value: i.id })),
      initialValue,
    }),
  );

// Which existing items are done. Returns the checked items' ids.
const askChecked = async (items: ChecklistItem[]) =>
  answer(
    await groupMultiselect({
      message: "Checklist (selected items are done)",
      options: {
        Checklist: items.map((i) => ({ label: i.text, value: i.id })),
      },
      initialValues: items.filter((i) => i.checked).map((i) => i.id),
      required: false,
    }),
  );

// Offers an AI-generated checklist (POST /api/v1/ai/task-titles, as the web
// app's checklist button does). Returns the items to add; [] if declined.
// Rejecting the items offers a regenerate, starting from the last description.
async function aiChecklist(title: string): Promise<string[]> {
  const generate = await confirm({
    message: "Generate an AI checklist?",
    initialValue: false,
  });
  if (!answer(generate)) return [];
  let prompt = title;
  while (true) {
    prompt = await askText("Describe the checklist", { initialValue: prompt });
    const { ok, body } = await waiting((async () => {
      const res = await fetch(`${config.apiUrl}/api/v1/ai/task-titles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, maxTasks: 10 }),
      });
      return { ok: res.ok, body: await res.json().catch(() => ({})) };
    })());
    const items: string[] = body.response ?? [];
    if (!ok || items.length === 0) {
      log.warn(
        `${body.error ?? "No checklist items were generated."} Skipping.`,
      );
      return [];
    }
    note(items.map((item) => `- ${item}`).join("\n"), "AI checklist");
    const accept = await confirm({
      message: `Add these ${items.length} items?`,
    });
    if (answer(accept)) return items;
    const regenerate = await confirm({
      message: "Regenerate the checklist?",
      initialValue: false,
    });
    if (!answer(regenerate)) return [];
  }
}

const done = (task: TaskView) =>
  `${task.checklist.filter((i) => i.checked).length}/${task.checklist.length}`;

export async function listTasks({ row }: { row?: string }) {
  const { data } = await waiting((async () => {
    let query = "";
    if (row) {
      const { data } = await api<RowView>(
        "GET",
        `/api/v1/rows/${encodeURIComponent(row)}`,
      );
      query = `?rowId=${encodeURIComponent(data.id)}`;
    }
    return api<TaskView[]>("GET", `/api/v1/tasks${query}`);
  })());
  if (data.length === 0) {
    console.log("No tasks.");
    return;
  }
  printTable(
    ["ID", "TITLE", "ROW", "COLUMN", "CHECKLIST", "URL"],
    data.map((t) => [
      t.shortId,
      t.title,
      t.rowTitle,
      t.colTitle,
      done(t),
      `${config.apiUrl}/dashboard/task/${t.shortId}`,
    ]),
  );
}

export async function createTask() {
  intro("kanby task create");
  const { rows, columns } = await rowsAndColumns();
  const rowId = await pick("Row", rows);
  const colId = await pick("Column", columns, columns[0]?.id);
  const title = await askTitle();
  const description = await askDescription();
  const checklist = await aiChecklist(title);
  const { data } = await waiting(api<TaskView>("POST", "/api/v1/tasks", {
    body: { rowId, colId, title, description, checklist },
  }));
  outro(
    `Created task ${data.shortId} "${data.title}".\n` +
      `${config.apiUrl}/dashboard/task/${data.shortId}`,
  );
}

export async function editTask(ref: string) {
  intro("kanby task edit");
  const { data: task, etag } = await waiting(api<TaskView>(
    "GET",
    `/api/v1/tasks/${encodeURIComponent(ref)}`,
  ));
  if (task.trashed) {
    throw new CliError(
      "This task is in Trash. Restore it in the web app first.",
    );
  }
  const { rows, columns } = await rowsAndColumns();
  const title = await askTitle(task.title);
  const description = await askDescription(task.description);
  const rowId = await pick("Row", rows, task.rowId);
  const colId = await pick("Column", columns, task.colId);
  const wasChecked = task.checklist.filter((i) => i.checked).map((i) => i.id);
  const checked = task.checklist.length > 0
    ? await askChecked(task.checklist)
    : wasChecked;
  const checklist = await aiChecklist(title);

  const changes: Record<string, unknown> = {};
  if (title !== task.title) changes.title = title;
  // Only sent when changed: saving rewrites it as plain paragraphs, dropping
  // any formatting added in the web app.
  if (description !== task.description) changes.description = description;
  if (rowId !== task.rowId) changes.rowId = rowId;
  if (colId !== task.colId) changes.colId = colId;
  if (
    checked.length !== wasChecked.length ||
    checked.some((id) => !wasChecked.includes(id))
  ) {
    changes.checked = checked;
  }
  if (checklist.length > 0) changes.checklist = checklist;
  if (Object.keys(changes).length === 0) {
    outro("No edits were made. Task remains unchanged.");
    return;
  }
  if (!answer(await confirm({ message: "Save changes?" }))) {
    outro("You have declined to save changes. Task remains unchanged.");
    return;
  }
  try {
    await waiting(api<TaskView>("PATCH", `/api/v1/tasks/${task.id}`, {
      body: changes,
      headers: { "If-Match": etag ?? "" },
    }));
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      throw new ApiError(
        409,
        `This task changed while you were editing. Re-run \`kanby task edit --id ${task.shortId}\`.`,
      );
    }
    throw error;
  }
  outro(`Saved task ${task.shortId}.`);
}
