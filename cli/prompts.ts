// Interactive prompts on top of @clack/prompts. Every answer is re-asked
// until it's valid; Ctrl+C quits without saving.
import { cancel, isCancel, multiline, spinner, text } from "@clack/prompts";
import { CliError } from "./errors.ts";

type Check = (
  value: string,
) => Promise<{ value: unknown } | { error: string }>;

// Every prompt's answer goes through here: a cancelled prompt (Ctrl+C or Esc)
// exits cleanly, before anything is saved.
export function answer<T>(value: T): Exclude<T, symbol> {
  if (isCancel(value)) {
    cancel("Cancelled. Nothing was saved.");
    Deno.exit(0);
  }
  return value as Exclude<T, symbol>;
}

// A clack `validate` for one field. An empty answer is an error when
// `required`. Anything else goes through `check` (the server's field rules),
// whose normalized value `normalize` then returns, so one request both
// validates and normalizes.
export function fieldCheck(label: string, required: boolean, check?: Check) {
  const normalized = new Map<string, string>();
  return {
    validate: async (value = "") => {
      if (!value.trim()) {
        return required ? `${label} is required.` : undefined;
      }
      if (!check) return undefined;
      let result;
      try {
        result = await check(value);
      } catch (error) {
        // clack doesn't catch a rejected validate, so e.g. "Not logged in"
        // is shown as the field's error; Enter retries, Ctrl+C quits.
        if (error instanceof CliError) return error.message;
        throw error;
      }
      if ("error" in result) return result.error;
      normalized.set(value, String(result.value));
      return undefined;
    },
    normalize: (value: string) => normalized.get(value) ?? value.trim(),
  };
}

// Asks for text, starting from `initialValue` (the current value, in edit).
// `multiline` takes several lines: Enter adds a line, and Tab then Enter
// presses its [ submit ] button.
export async function askText(
  label: string,
  { initialValue, required = true, check, multiline: multi = false }: {
    initialValue?: string;
    required?: boolean;
    check?: Check;
    multiline?: boolean;
  } = {},
): Promise<string> {
  const { validate, normalize } = fieldCheck(label, required, check);
  const optional = required ? "" : "Optional. ";
  return normalize(answer(
    multi
      ? await multiline({
        message: label,
        initialValue,
        placeholder: `${optional}`,
        showSubmit: true,
        validate,
      })
      : await text({
        message: label,
        initialValue,
        placeholder: required ? undefined : "Optional",
        validate,
      }),
  ));
}

// Shows a spinner until `promise` settles.
export async function waiting<T>(promise: Promise<T>): Promise<T> {
  const spin = spinner();
  spin.start("Waiting on response from server...");
  try {
    const result = await promise;
    spin.clear();
    return result;
  } catch (error) {
    spin.error("Request failed.");
    throw error;
  }
}

// Left-aligned columns, for the list commands.
export function printTable(headers: string[], rows: string[][]) {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => r[i].length))
  );
  const line = (cells: string[]) =>
    cells.map((c, i) => c.padEnd(widths[i])).join("  ").trimEnd();
  console.log(line(headers));
  rows.forEach((r) => console.log(line(r)));
}
