import { api, ApiError, validateField } from "../api.ts";
import { config } from "../config.ts";
import { ask, printTable, select, yesNo } from "../prompts.ts";

export interface RowView {
  id: string;
  shortId: string;
  title: string;
  color: string; // label, e.g. "Blue"
  taskCount: number;
}

// rowColorOptions' labels (src/components/react/context/constants.ts); the
// server maps them to the stored values and rejects anything else.
const COLORS = ["Blue", "Red", "Yellow", "Green", "Purple", "Grey"];
const colorOptions = COLORS.map((c) => ({ label: c, value: c }));

const askTitle = (current?: string) =>
  ask("Title", {
    current,
    validate: (value) => validateField("row", "title", value),
  });

export async function listRows() {
  const { data } = await api<RowView[]>("GET", "/api/v1/rows");
  if (data.length === 0) {
    console.log("No rows yet. Create one with `kanby row create`.");
    return;
  }
  printTable(
    ["ID", "TITLE", "COLOR", "TASKS", "URL"],
    data.map((r) => [
      r.shortId,
      r.title,
      r.color,
      String(r.taskCount),
      `${config.apiUrl}/dashboard/row/${r.shortId}`,
    ]),
  );
}

export async function createRow() {
  const title = await askTitle();
  const color = select("Color", colorOptions, "Blue");
  const { data } = await api<RowView>("POST", "/api/v1/rows", {
    body: { title, color },
  });
  console.log(`Created row ${data.shortId} "${data.title}".`);
  console.log(`${config.apiUrl}/dashboard/row/${data.shortId}`);
}

export async function editRow(ref: string) {
  const { data: row, etag } = await api<RowView>(
    "GET",
    `/api/v1/rows/${encodeURIComponent(ref)}`,
  );
  console.log(`Editing row ${row.shortId}. Press Enter to keep a value.`);
  const title = await askTitle(row.title);
  const color = select("Color", colorOptions, row.color);
  const changes: Record<string, string> = {};
  if (title !== row.title) changes.title = title;
  if (color !== row.color) changes.color = color;
  if (Object.keys(changes).length === 0) {
    console.log("Nothing changed.");
    return;
  }
  if (!yesNo("Save changes?", true)) return;
  try {
    await api<RowView>("PATCH", `/api/v1/rows/${row.id}`, {
      body: changes,
      headers: { "If-Match": etag ?? "" },
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      throw new ApiError(
        409,
        `This row changed while you were editing. Re-run \`kanby row edit ${row.shortId}\`.`,
      );
    }
    throw error;
  }
  console.log(`Saved row ${row.shortId}.`);
}
