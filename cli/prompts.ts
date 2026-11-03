// Interactive prompts on top of Deno's prompt(). Every answer is re-asked
// until it's valid; Ctrl+C quits without saving.

type Validate = (
  value: string,
) => Promise<{ value: unknown } | { error: string }>;

const fail = (message: string) => console.error(`✖ ${message}`);

const preview = (value: string, max = 40) => {
  const line = value.split("\n")[0];
  return line.length > max || value.includes("\n")
    ? `${line.slice(0, max)}…`
    : line;
};

// Asks for text. An empty answer keeps `current` when there is one (edit),
// is "" when `optional`, and otherwise is an error that asks again. A
// non-empty answer goes through `validate` (the server's field check).
export async function ask(
  label: string,
  { current, optional = false, validate }: {
    current?: string;
    optional?: boolean;
    validate?: Validate;
  } = {},
): Promise<string> {
  const hint = current
    ? ` [${preview(current)}]`
    : optional
    ? " (optional, Enter to skip)"
    : "";
  while (true) {
    const answer = (prompt(`${label}${hint}:`) ?? "").trim();
    if (!answer) {
      if (current !== undefined) return current;
      if (optional) return "";
      fail(`${label} is required.`);
      continue;
    }
    if (!validate) return answer;
    const result = await validate(answer);
    if ("error" in result) {
      fail(result.error);
      continue;
    }
    return String(result.value);
  }
}

// A numbered menu. Enter picks `current` when given.
export function select<T extends string>(
  label: string,
  options: { label: string; value: T }[],
  current?: T,
): T {
  console.log(`${label}:`);
  options.forEach((option, i) =>
    console.log(
      `  ${i + 1}) ${option.label}${
        option.value === current ? " (current)" : ""
      }`,
    )
  );
  const currentIndex = options.findIndex((o) => o.value === current);
  const hint = currentIndex >= 0 ? ` [${currentIndex + 1}]` : "";
  while (true) {
    const answer = (prompt(`Choose 1-${options.length}${hint}:`) ?? "").trim();
    if (!answer && currentIndex >= 0) return options[currentIndex].value;
    const n = Number(answer);
    if (Number.isInteger(n) && n >= 1 && n <= options.length) {
      return options[n - 1].value;
    }
    fail(`Enter a number from 1 to ${options.length}.`);
  }
}

// y/n with a default for a bare Enter.
export function yesNo(label: string, defaultYes: boolean): boolean {
  const answer = (prompt(`${label} ${defaultYes ? "[Y/n]" : "[y/N]"}`) ?? "")
    .trim().toLowerCase();
  if (!answer) return defaultYes;
  return answer === "y" || answer === "yes";
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
