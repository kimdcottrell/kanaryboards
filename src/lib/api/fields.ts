import { z } from "astro/zod";
import type { PersistedBoard } from "@lib/db/kv.ts";
import { rowColorOptions } from "@components/react/context/constants.ts";

// One validator per field the kanby CLI can set. POST /api/v1/validate/... runs
// a single one as the user answers each prompt; the rows/tasks POST and PATCH
// handlers run them again on the whole body. Each returns the normalized
// value to save, or the message to show.
type FieldResult = { ok: true; value: unknown } | { ok: false; error: string };
type FieldValidator = (value: unknown, board: PersistedBoard) => FieldResult;

const fromSchema = (schema: z.ZodType): FieldValidator => (value) => {
  const result = schema.safeParse(value);
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, error: result.error.issues[0].message };
};

// Newlines become spaces, as TitleInput.tsx does.
const title = (label: string) =>
  z.string({ error: `${label} must be text.` })
    .transform((s) => s.replace(/\r?\n/g, " ").trim())
    .pipe(z.string().min(1, { error: `${label} is required.` }));

const rowId: FieldValidator = (value, board) =>
  board.rows.some((r) => r.id === value)
    ? { ok: true, value }
    : { ok: false, error: "No such row." };

const colId: FieldValidator = (value, board) => {
  const column = board.columns.find((c) => c.id === value);
  if (!column) return { ok: false, error: "No such column." };
  if (column.isTrash) {
    return { ok: false, error: "Tasks can't be moved to Trash from the CLI." };
  }
  return { ok: true, value };
};

// Accepts a color's label ("Blue", any case) or its stored value.
const color: FieldValidator = (value) => {
  const option = rowColorOptions.find((o) =>
    o.value === value ||
    (typeof value === "string" && o.label.toLowerCase() === value.toLowerCase())
  );
  return option ? { ok: true, value: option.value } : {
    ok: false,
    error: `Color must be one of: ${
      rowColorOptions.map((o) => o.label).join(", ")
    }.`,
  };
};

export const fieldValidators: Record<
  "task" | "row",
  Record<string, FieldValidator>
> = {
  task: {
    title: fromSchema(title("Title")),
    description: fromSchema(z.string({ error: "Description must be text." })),
    rowId,
    colId,
    checklist: fromSchema(
      z.array(z.string().trim().min(1), {
        error: "Checklist must be a list of non-empty items.",
      }),
    ),
  },
  row: {
    title: fromSchema(title("Title")),
    color,
  },
};

// Validates every field present in `body` (and requires `required`). Unknown
// fields are ignored. Returns the normalized fields, or the first error.
export function validateFields(
  entity: "task" | "row",
  body: Record<string, unknown>,
  board: PersistedBoard,
  required: string[] = [],
): { ok: true; values: Record<string, unknown> } | {
  ok: false;
  error: string;
} {
  const values: Record<string, unknown> = {};
  for (const [field, validate] of Object.entries(fieldValidators[entity])) {
    if (body[field] === undefined) {
      if (required.includes(field)) {
        return { ok: false, error: `${field} is required.` };
      }
      continue;
    }
    const result = validate(body[field], board);
    if (!result.ok) return result;
    values[field] = result.value;
  }
  return { ok: true, values };
}
