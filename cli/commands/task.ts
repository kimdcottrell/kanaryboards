import { api, ApiError, validateField } from "../api.ts";
import { config } from "../config.ts";
import { CliError } from "../errors.ts";
import { ask, printTable, select, yesNo } from "../prompts.ts";
import type { RowView } from "./row.ts";

interface TaskView {
  id: string;
  shortId: string;
  title: string;
  description: string; // plain text
  rowId: string;
  rowTitle: string;
  colId: string;
  colTitle: string;
  checklist: { id: string; text: string; checked: boolean }[];
  trashed: boolean;
}

interface ColumnView {
  id: string;
  title: string;
}

const askTitle = (current?: string) =>
  ask("Title", {
    current,
    validate: (value) => validateField("task", "title", value),
  });

const askDescription = (current?: string) =>
  ask("Description", {
    current: current || undefined,
    optional: true,
    validate: (value) => validateField("task", "description", value),
  });

async function pickRow(current?: string): Promise<string> {
  const { data: rows } = await api<RowView[]>("GET", "/api/v1/rows");
  if (rows.length === 0) {
    throw new CliError("No rows yet. Create one with `kanby row create`.");
  }
  return select(
    "Row",
    rows.map((r) => ({ label: r.title, value: r.id })),
    current,
  );
}

async function pickColumn(current?: string): Promise<string> {
  const { data: columns } = await api<ColumnView[]>("GET", "/api/v1/columns");
  return select(
    "Column",
    columns.map((c) => ({ label: c.title, value: c.id })),
    current ?? columns[0]?.id,
  );
}

// Offers an AI-generated checklist (POST /api/generate-tasks, as the web
// app's checklist button does). Returns the items to add; [] if declined.
async function aiChecklist(title: string): Promise<string[]> {
  if (!yesNo("Generate an AI checklist?", false)) return [];
  const prompt = await ask("Describe the checklist", { current: title });
  console.log("Generating…");
  const res = await fetch(`${config.apiUrl}/api/generate-tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, maxTasks: 10 }),
  });
  const body = await res.json().catch(() => ({}));
  const items: string[] = body.response ?? [];
  if (!res.ok || items.length === 0) {
    console.error(
      `✖ ${body.error ?? "No checklist items were generated."} Skipping.`,
    );
    return [];
  }
  items.forEach((item) => console.log(`  - ${item}`));
  return yesNo(`Add these ${items.length} items?`, true) ? items : [];
}

const done = (task: TaskView) =>
  `${task.checklist.filter((i) => i.checked).length}/${task.checklist.length}`;

export async function listTasks({ row }: { row?: string }) {
  let query = "";
  if (row) {
    const { data } = await api<RowView>(
      "GET",
      `/api/v1/rows/${encodeURIComponent(row)}`,
    );
    query = `?rowId=${encodeURIComponent(data.id)}`;
  }
  const { data } = await api<TaskView[]>("GET", `/api/v1/tasks${query}`);
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
  const rowId = await pickRow();
  const colId = await pickColumn();
  const title = await askTitle();
  const description = await askDescription();
  const checklist = await aiChecklist(title);
  const { data } = await api<TaskView>("POST", "/api/v1/tasks", {
    body: { rowId, colId, title, description, checklist },
  });
  console.log(`Created task ${data.shortId} "${data.title}".`);
  console.log(`${config.apiUrl}/dashboard/task/${data.shortId}`);
}

export async function editTask(ref: string) {
  const { data: task, etag } = await api<TaskView>(
    "GET",
    `/api/v1/tasks/${encodeURIComponent(ref)}`,
  );
  if (task.trashed) {
    throw new CliError(
      "This task is in Trash. Restore it in the web app first.",
    );
  }
  console.log(`Editing task ${task.shortId}. Press Enter to keep a value.`);
  const title = await askTitle(task.title);
  const description = await askDescription(task.description);
  const rowId = await pickRow(task.rowId);
  const colId = await pickColumn(task.colId);
  if (task.checklist.length > 0) {
    console.log("Checklist:");
    task.checklist.forEach((i) =>
      console.log(`  [${i.checked ? "x" : " "}] ${i.text}`)
    );
  }
  const checklist = await aiChecklist(title);

  const changes: Record<string, unknown> = {};
  if (title !== task.title) changes.title = title;
  // Only sent when changed: saving rewrites it as plain paragraphs, dropping
  // any formatting added in the web app.
  if (description !== task.description) changes.description = description;
  if (rowId !== task.rowId) changes.rowId = rowId;
  if (colId !== task.colId) changes.colId = colId;
  if (checklist.length > 0) changes.checklist = checklist;
  if (Object.keys(changes).length === 0) {
    console.log("Nothing changed.");
    return;
  }
  if (!yesNo("Save changes?", true)) return;
  try {
    await api<TaskView>("PATCH", `/api/v1/tasks/${task.id}`, {
      body: changes,
      headers: { "If-Match": etag ?? "" },
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      throw new ApiError(
        409,
        `This task changed while you were editing. Re-run \`kanby task edit ${task.shortId}\`.`,
      );
    }
    throw error;
  }
  console.log(`Saved task ${task.shortId}.`);
}
