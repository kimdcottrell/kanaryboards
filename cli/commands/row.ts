import { confirm, intro, outro, select } from "@clack/prompts";
import { api, ApiError, validateField } from "../api.ts";
import { config } from "../config.ts";
import { answer, askText, printTable, waiting } from "../prompts.ts";

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

const askTitle = (initialValue?: string) =>
  askText("Title", {
    initialValue,
    check: (value) => validateField("row", "title", value),
  });

const askColor = async (initialValue: string) =>
  answer(
    await select({ message: "Color", options: colorOptions, initialValue }),
  );

export async function listRows() {
  const { data } = await waiting(api<RowView[]>("GET", "/api/v1/rows"));
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
  intro("kanby row create");
  const title = await askTitle();
  const color = await askColor("Blue");
  const { data } = await waiting(api<RowView>("POST", "/api/v1/rows", {
    body: { title, color },
  }));
  outro(
    `Created row ${data.shortId} "${data.title}".\n` +
      `${config.apiUrl}/dashboard/row/${data.shortId}`,
  );
}

export async function editRow(ref: string) {
  intro("kanby row edit");
  const { data: row, etag } = await waiting(api<RowView>(
    "GET",
    `/api/v1/rows/${encodeURIComponent(ref)}`,
  ));
  const title = await askTitle(row.title);
  const color = await askColor(row.color);
  const changes: Record<string, string> = {};
  if (title !== row.title) changes.title = title;
  if (color !== row.color) changes.color = color;
  if (Object.keys(changes).length === 0) {
    outro("Nothing changed.");
    return;
  }
  if (!answer(await confirm({ message: "Save changes?" }))) {
    outro("Nothing was saved.");
    return;
  }
  try {
    await waiting(api<RowView>("PATCH", `/api/v1/rows/${row.id}`, {
      body: changes,
      headers: { "If-Match": etag ?? "" },
    }));
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      throw new ApiError(
        409,
        `This row changed while you were editing. Re-run \`kanby row edit --id ${row.shortId}\`.`,
      );
    }
    throw error;
  }
  outro(`Saved row ${row.shortId}.`);
}
