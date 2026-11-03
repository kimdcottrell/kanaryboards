import { Command } from "commander";
import { CliError } from "./errors.ts";
import { loginCommand, logoutCommand, whoami } from "./commands/user.ts";
import { createRow, editRow, listRows } from "./commands/row.ts";
import { createTask, editTask, listTasks } from "./commands/task.ts";

// Prints user-facing errors without a stack trace.
const run =
  <A extends unknown[]>(fn: (...args: A) => Promise<void>) =>
  async (...args: A) => {
    try {
      await fn(...args);
    } catch (error) {
      if (!(error instanceof CliError)) throw error;
      console.error(`✖ ${error.message}`);
      Deno.exit(1);
    }
  };

const program = new Command()
  .name("kanby")
  .description("Manage your Kanby board from the terminal.");

const user = program.command("user").description("Log in and out.");
user.command("login").description("Log in with your browser.")
  .action(run(loginCommand));
user.command("logout").description("Log out on this machine.")
  .action(run(logoutCommand));
user.command("whoami").description("Show who you're logged in as.")
  .action(run(whoami));

const row = program.command("row").description("Rows (projects).");
row.command("list").description("List rows.").action(run(listRows));
row.command("create").description("Create a row.").action(run(createRow));
row.command("edit").description("Edit a row.")
  .argument("<id>", "row id, or its last 8 characters")
  .action(run(editRow));

const task = program.command("task").description("Tasks.");
task.command("list").description("List tasks (Trash excluded).")
  .option("-r, --row <id>", "only tasks in this row")
  .action(run(listTasks));
task.command("create").description("Create a task.").action(run(createTask));
task.command("edit").description("Edit a task.")
  .argument("<id>", "task id, or its last 8 characters")
  .action(run(editTask));

await program.parseAsync(Deno.args, { from: "user" });
