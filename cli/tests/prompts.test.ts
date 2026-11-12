import assert from "node:assert/strict";
import { fieldCheck } from "../prompts.ts";
import { CliError } from "../errors.ts";

const server = (v: string) =>
  Promise.resolve(
    v === "bad" ? { error: "Nope." } : { value: v.trim().toUpperCase() },
  );

Deno.test("fieldCheck: an empty required answer is an error", async () => {
  const { validate } = fieldCheck("Title", true, server);
  assert.equal(await validate("  "), "Title is required.");
  assert.equal(await validate(undefined), "Title is required.");
});

Deno.test("fieldCheck: an empty optional answer passes as ''", async () => {
  const { validate, normalize } = fieldCheck("Description", false, server);
  assert.equal(await validate(""), undefined);
  assert.equal(normalize(""), "");
});

Deno.test("fieldCheck: a server-rejected answer shows its error", async () => {
  const { validate } = fieldCheck("Title", true, server);
  assert.equal(await validate("bad"), "Nope.");
});

Deno.test("fieldCheck: a failed request is shown as the error", async () => {
  const { validate } = fieldCheck(
    "Title",
    true,
    () => Promise.reject(new CliError("Not logged in.")),
  );
  assert.equal(await validate("x"), "Not logged in.");
});

Deno.test("fieldCheck: normalize returns the server's value", async () => {
  const { validate, normalize } = fieldCheck("Title", true, server);
  assert.equal(await validate(" good "), undefined);
  assert.equal(normalize(" good "), "GOOD");
});

Deno.test("fieldCheck: without a check, the answer is trimmed", async () => {
  const { validate, normalize } = fieldCheck("Prompt", true);
  assert.equal(await validate(" x "), undefined);
  assert.equal(normalize(" x "), "x");
});
