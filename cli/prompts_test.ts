import assert from "node:assert/strict";
import { ask, select } from "./prompts.ts";

// Answers prompt() calls in order, and captures what was printed to stderr.
function stubPrompt(answers: (string | null)[]) {
  const asked: string[] = [];
  const errors: string[] = [];
  const originalPrompt = globalThis.prompt;
  const originalError = console.error;
  globalThis.prompt = (message?: string) => {
    asked.push(message ?? "");
    return answers.shift() ?? null;
  };
  console.error = (message: string) => errors.push(message);
  const restore = () => {
    globalThis.prompt = originalPrompt;
    console.error = originalError;
  };
  return { asked, errors, restore };
}

Deno.test("ask: an empty required answer is an error and asks again", async () => {
  const io = stubPrompt(["", "  ", "Ship it"]);
  try {
    assert.equal(await ask("Title"), "Ship it");
    assert.deepEqual(io.errors, [
      "✖ Title is required.",
      "✖ Title is required.",
    ]);
  } finally {
    io.restore();
  }
});

Deno.test("ask: Enter keeps the current value when editing", async () => {
  const io = stubPrompt([""]);
  try {
    assert.equal(await ask("Title", { current: "Old title" }), "Old title");
    assert.deepEqual(io.asked, ["Title [Old title]:"]);
  } finally {
    io.restore();
  }
});

Deno.test("ask: an optional field can be skipped", async () => {
  const io = stubPrompt([null]);
  try {
    assert.equal(await ask("Description", { optional: true }), "");
  } finally {
    io.restore();
  }
});

Deno.test("ask: a server-rejected answer is shown and asked again", async () => {
  const io = stubPrompt(["bad", "good"]);
  try {
    const value = await ask("Title", {
      validate: (v) =>
        Promise.resolve(
          v === "bad" ? { error: "Nope." } : { value: v.toUpperCase() },
        ),
    });
    assert.equal(value, "GOOD");
    assert.deepEqual(io.errors, ["✖ Nope."]);
  } finally {
    io.restore();
  }
});

Deno.test("select: Enter picks the current option; bad input asks again", () => {
  const io = stubPrompt(["9", "x", ""]);
  const log = console.log;
  console.log = () => {};
  try {
    const options = [
      { label: "To Do", value: "a" },
      { label: "Done", value: "b" },
    ];
    assert.equal(select("Column", options, "b"), "b");
    assert.equal(io.errors.length, 2);
  } finally {
    console.log = log;
    io.restore();
  }
});
