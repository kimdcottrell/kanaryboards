import { parse } from "@bomb.sh/args";

const FLAGS = { id: "-i, --id <id>", row: "-r, --row <id>" };
type Option = keyof typeof FLAGS;
type Spec = { description: string; options?: Partial<Record<Option, string>> };

// Each command, with its help line and the options it takes. main.ts maps
// these to handlers.
export const COMMANDS = {
  "user login": { description: "Log in with your browser." },
  "user logout": { description: "Log out on this machine." },
  "user whoami": { description: "Show who you're logged in as." },
  "row list": { description: "List rows." },
  "row create": { description: "Create a row." },
  "row edit": {
    description: "Edit a row.",
    options: { id: "the row's id, or its last 8 characters (required)" },
  },
  "task list": {
    description: "List tasks (Trash excluded).",
    options: { row: "only tasks in this row" },
  },
  "task create": { description: "Create a task." },
  "task edit": {
    description: "Edit a task.",
    options: { id: "the task's id, or its last 8 characters (required)" },
  },
} satisfies Record<string, Spec>;

export type Command = keyof typeof COMMANDS;

// The first word of each command, with its help line.
export const GROUPS = {
  user: "Log in, log out, and see who you're logged in as.",
  row: "List, create, and edit rows.",
  task: "List, create, and edit tasks.",
};

const specs: [string, Spec][] = Object.entries(COMMANDS);

type Row = [left: string, right: string];

// Each command with its description, followed by the options it takes.
const commandRows = (entries: [string, Spec][]): Row[] =>
  entries.flatMap(([name, { description, options = {} }]) => [
    [`  ${name}`, description],
    ...Object.entries(options).map((
      [option, help],
    ): Row => [`    ${FLAGS[option as Option]}`, help]),
  ]);

const optionRows = (options: Spec["options"] = {}): Row[] => [
  ...Object.entries(options).map((
    [option, help],
  ): Row => [`  ${FLAGS[option as Option]}`, help]),
  ["  -h, --help", "show this help"],
];

// `intro`, then each titled section, with every section's columns lined up.
function help(intro: string, sections: [string, Row[]][]): string {
  const width = Math.max(
    ...sections.flatMap(([, rows]) => rows.map(([left]) => left.length)),
  );
  return [
    intro,
    ...sections.map(([title, rows]) =>
      `${title}:\n` +
      rows.map(([left, right]) => `${left.padEnd(width)}  ${right}`).join("\n")
    ),
  ].join("\n\n");
}

export const USAGE = help(
  "Manage your Kanby board from the terminal.\n\nUsage: kanby <command> [options]",
  [["Commands", commandRows(specs)], ["Options", optionRows()]],
);

// Help for a command ("task edit"), a group ("task", or "task bogus"), or,
// for anything else, USAGE.
export function helpFor(command: string): string {
  if (Object.hasOwn(COMMANDS, command)) {
    const { description, options } = COMMANDS[command as Command] as Spec;
    return help(`${description}\n\nUsage: kanby ${command} [options]`, [
      ["Options", optionRows(options)],
    ]);
  }
  const group = command.split(" ")[0];
  if (!Object.hasOwn(GROUPS, group)) return USAGE;
  const entries = specs
    .filter(([name]) => name.startsWith(`${group} `))
    .map((
      [name, spec],
    ): [string, Spec] => [name.slice(group.length + 1), spec]);
  return help(
    `${
      GROUPS[group as keyof typeof GROUPS]
    }\n\nUsage: kanby ${group} <command> [options]`,
    [["Commands", commandRows(entries)], ["Options", optionRows()]],
  );
}

// The first option given that `command` doesn't take, e.g. "--id".
export function unsupportedOption(args: CliArgs): string | undefined {
  const options = Object.fromEntries(specs)[args.command]?.options ?? {};
  const given = (Object.keys(FLAGS) as Option[]).filter((o) =>
    args[o] !== undefined
  );
  const option = given.find((o) => !(o in options));
  return option && `--${option}`;
}

export interface CliArgs {
  command: string; // e.g. "task edit"; "" when none was given
  id?: string;
  row?: string;
  help: boolean;
}

// Ids are `string` flags, not positionals: args turns a positional that
// starts with a digit into a Number (so "0012ab34" would be NaN). Aliases are
// listed too, because args looks up a flag's type before resolving its alias.
export function parseCli(argv: string[]): CliArgs {
  const args = parse(argv, {
    string: ["id", "i", "row", "r"],
    boolean: ["help", "h"],
    alias: { i: "id", r: "row", h: "help" },
  });
  return {
    command: args._.slice(0, 2).join(" "),
    id: args.id,
    row: args.row,
    help: args.help === true,
  };
}
