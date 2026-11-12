import assert from "node:assert/strict";
import { pkcePair, receiveCode } from "../auth.ts";

Deno.test("pkcePair: challenge is the base64url SHA-256 of the verifier", async () => {
  const { verifier, challenge } = await pkcePair();
  assert.match(verifier, /^[A-Za-z0-9_-]{43}$/);
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)),
  );
  const expected = btoa(String.fromCharCode(...digest))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  assert.equal(challenge, expected);
});

Deno.test("receiveCode: takes the code from the 127.0.0.1 callback", async () => {
  let redirectUri = "";
  const code = receiveCode("s1", (uri) => redirectUri = uri);
  await new Promise((r) => setTimeout(r, 0));
  const res = await fetch(`${redirectUri}?code=abc&state=s1`);
  assert.match(await res.text(), /Logged in/);
  assert.equal(await code, "abc");
});

Deno.test("receiveCode: rejects a redirect with the wrong state", async () => {
  let redirectUri = "";
  const code = receiveCode("s1", (uri) => redirectUri = uri);
  await new Promise((r) => setTimeout(r, 0));
  const rejected = assert.rejects(code, /state mismatch/);
  await (await fetch(`${redirectUri}?code=abc&state=forged`)).body?.cancel();
  await rejected;
});
