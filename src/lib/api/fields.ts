import { z } from "astro/zod";
import type { PersistedBoard } from "@lib/db/kv.ts";
import { rowColorOptions } from "@components/react/context/constants.ts";

// One validator per field the web app or the kanby CLI can set. Each looks at
// the value alone (never a board), so the same checks run whether or not the
// user is logged in. POST /api/v1/validate/... runs them; the CLI's rows/tasks
// POST and PATCH handlers run them again on the whole body. Each returns the
// normalized value to save, or the message to show.
type FieldResult = { ok: true; value: unknown } | { ok: false; error: string };
type FieldValidator = (value: unknown) => FieldResult;

// Who is asking: requests with `X-Kanby-Client: cli` get the CLI's rules where
// they differ from the app's (see cliValidators).
export type Client = "app" | "cli";
export type Entity = "task" | "row" | "column";

const fromSchema = (schema: z.ZodType): FieldValidator => (value) => {
  const result = schema.safeParse(value);
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, error: result.error.issues[0].message };
};

// Newlines become spaces, as TitleInput.tsx does while typing.
const title = (label: string) =>
  z.string({ error: `${label} must be text.` })
    .transform((s) => s.replace(/\r?\n/g, " ").trim())
    .pipe(z.string().min(1, { error: `${label} is required.` }));

const requiredId = (message: string) =>
  z.string({ error: message }).min(1, { error: message });

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

// The app sends checklist items as the task stores them; blank ones (such as
// the always-present empty entry row) are dropped.
const appChecklist = z.array(
  z.object({
    id: z.string(),
    text: z.string(),
    checked: z.boolean(),
    order: z.string(),
  }),
  { error: "Checklist must be a list of items." },
).transform((items) => items.filter((item) => item.text.trim()));

const appValidators: Record<Entity, Record<string, FieldValidator>> = {
  task: {
    title: fromSchema(title("Title")),
    description: fromSchema(z.string({ error: "Description must be text." })),
    rowId: fromSchema(requiredId("Project is required.")),
    colId: fromSchema(requiredId("Status is required.")),
    checklist: fromSchema(appChecklist),
  },
  row: {
    title: fromSchema(title("Title")),
    color,
  },
  column: {
    title: fromSchema(title("Title")),
  },
};

// Only where the CLI's rules differ from the app's.
const cliValidators: Partial<
  Record<Entity, Record<string, FieldValidator>>
> = {
  task: {
    checklist: fromSchema(
      z.array(z.string().trim().min(1), {
        error: "Checklist must be a list of non-empty items.",
      }),
    ),
  },
};

export const isEntity = (value: unknown): value is Entity =>
  value === "task" || value === "row" || value === "column";

// The validator `client` gets for `entity`.`field`, or undefined if there is
// no such field.
export function fieldValidator(
  entity: Entity,
  field: string,
  client: Client,
): FieldValidator | undefined {
  const cli = client === "cli" ? cliValidators[entity] : undefined;
  if (cli && Object.hasOwn(cli, field)) return cli[field];
  const app = appValidators[entity];
  return Object.hasOwn(app, field) ? app[field] : undefined;
}

// Validates every field present in `body` (and requires `required`). Unknown
// fields are ignored. Returns the normalized fields, or the first error and
// the field it is about.
export function validateFields(
  entity: Entity,
  body: Record<string, unknown>,
  client: Client,
  required: string[] = [],
): { ok: true; values: Record<string, unknown> } | {
  ok: false;
  field: string;
  error: string;
} {
  const values: Record<string, unknown> = {};
  for (const field of Object.keys(appValidators[entity])) {
    if (body[field] === undefined) {
      if (required.includes(field)) {
        return { ok: false, field, error: `${field} is required.` };
      }
      continue;
    }
    const result = fieldValidator(entity, field, client)!(body[field]);
    if (!result.ok) return { ok: false, field, error: result.error };
    values[field] = result.value;
  }
  return { ok: true, values };
}

// The checks on a task's rowId/colId that need the board. Only the CLI's
// task routes run these: the app picks rows and columns from its own board.
export function checkTaskRefs(
  values: { rowId?: unknown; colId?: unknown },
  board: PersistedBoard,
): { ok: true } | { ok: false; error: string } {
  if (
    values.rowId !== undefined &&
    !board.rows.some((r) => r.id === values.rowId)
  ) {
    return { ok: false, error: "No such row." };
  }
  if (values.colId !== undefined) {
    const column = board.columns.find((c) => c.id === values.colId);
    if (!column) return { ok: false, error: "No such column." };
    if (column.isTrash) {
      return {
        ok: false,
        error: "Tasks can't be moved to Trash from the CLI.",
      };
    }
  }
  return { ok: true };
}
