import { log } from "@clack/prompts";
import { CliError } from "./errors.ts";
import {
  type CliArgs,
  type Command,
  GROUPS,
  helpFor,
  parseCli,
  unsupportedOption,
} from "./args.ts";
import { loginCommand, logoutCommand, whoami } from "./commands/user.ts";
import { createRow, editRow, listRows } from "./commands/row.ts";
import { createTask, editTask, listTasks } from "./commands/task.ts";

const requireId = ({ id }: CliArgs) => {
  if (!id) throw new CliError("Pass the id with --id <id>.");
  return id;
};

const handlers: Record<Command, (args: CliArgs) => Promise<void>> = {
  "user login": loginCommand,
  "user logout": logoutCommand,
  "user whoami": whoami,
  "row list": listRows,
  "row create": createRow,
  "row edit": (args) => editRow(requireId(args)),
  "task list": listTasks,
  "task create": createTask,
  "task edit": (args) => editTask(requireId(args)),
};

const args = parseCli(Deno.args);
// `kanby` and `kanby task` print help, like --help does.
if (
  args.help || !args.command || Object.hasOwn(GROUPS, args.command)
) {
  console.log(helpFor(args.command));
  Deno.exit(0);
}
if (!Object.hasOwn(handlers, args.command)) {
  console.log(helpFor(args.command));
  log.error(`Unknown command "${args.command}".`);
  Deno.exit(1);
}
const unsupported = unsupportedOption(args);
if (unsupported) {
  console.log(helpFor(args.command));
  log.error(`"${args.command}" doesn't take ${unsupported}.`);
  Deno.exit(1);
}

// User-facing errors are shown without a stack trace.
try {
  await handlers[args.command as Command](args);
} catch (error) {
  if (!(error instanceof CliError)) throw error;
  log.error(error.message);
  Deno.exit(1);
}
