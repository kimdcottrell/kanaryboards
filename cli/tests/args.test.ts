import assert from "node:assert/strict";
import { helpFor, parseCli, unsupportedOption, USAGE } from "../args.ts";

Deno.test("helpFor: a command shows just its own options", () => {
  assert.equal(
    helpFor("task edit"),
    `Edit a task.

Usage: kanby task edit [options]

Options:
  -i, --id <id>  the task's id, or its last 8 characters (required)
  -h, --help     show this help`,
  );
  assert.equal(
    helpFor("task create"),
    `Create a task.

Usage: kanby task create [options]

Options:
  -h, --help  show this help`,
  );
});

Deno.test("helpFor: a group shows just its commands", () => {
  const task = `List, create, and edit tasks.

Usage: kanby task <command> [options]

Commands:
  list              List tasks (Trash excluded).
    -r, --row <id>  only tasks in this row
  create            Create a task.
  edit              Edit a task.
    -i, --id <id>   the task's id, or its last 8 characters (required)

Options:
  -h, --help        show this help`;
  assert.equal(helpFor("task"), task);
  assert.equal(helpFor("task bogus"), task);
  assert.doesNotMatch(helpFor("user"), /list|create|edit/);
});

Deno.test("helpFor: anything else shows every command", () => {
  for (const command of ["", "bogus", "bogus list", "constructor"]) {
    assert.equal(helpFor(command), USAGE);
  }
  assert.match(USAGE, /user login[\s\S]*task edit/);
});

Deno.test("parseCli: routes the first two words", () => {
  assert.equal(parseCli(["task", "edit"]).command, "task edit");
  assert.equal(parseCli([]).command, "");
});

Deno.test("parseCli: ids that start with a digit stay strings", () => {
  for (
    const argv of [
      ["task", "edit", "--id", "0012ab34"],
      ["task", "edit", "--id=0012ab34"],
      ["task", "edit", "-i", "0012ab34"],
    ]
  ) {
    assert.equal(parseCli(argv).id, "0012ab34");
  }
  assert.equal(parseCli(["task", "list", "-r", "12345e67"]).row, "12345e67");
  assert.equal(parseCli(["task", "list", "--row", "0012ab34"]).row, "0012ab34");
});

Deno.test("parseCli: a bare --id is empty; -h is help", () => {
  assert.equal(parseCli(["row", "edit", "--id"]).id, "");
  assert.equal(parseCli(["-h"]).help, true);
  assert.equal(parseCli(["task", "-h", "list"]).command, "task list");
  assert.equal(parseCli(["task", "list"]).help, false);
});

Deno.test("unsupportedOption: --id only on row/task edit, --row only on task list", () => {
  const check = (...argv: string[]) => unsupportedOption(parseCli(argv));
  assert.equal(check("row", "edit", "--id", "ab"), undefined);
  assert.equal(check("task", "edit", "-i", "ab"), undefined);
  assert.equal(check("task", "list", "--row", "ab"), undefined);
  assert.equal(check("task", "list"), undefined);
  assert.equal(check("user", "login", "--id", "ab"), "--id");
  assert.equal(check("row", "list", "--row", "ab"), "--row");
  assert.equal(check("task", "edit", "--id", "ab", "-r", "cd"), "--row");
  assert.equal(check("task", "list", "--id"), "--id");
});
