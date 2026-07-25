import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { createClerkClient } from "@clerk/backend";
import { expect, test as setup } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Must run serially: https://playwright.dev/docs/test-parallel
setup.describe.configure({ mode: "serial" });

const __dirname = path.resolve(path.dirname("."));
const authFile = path.join(__dirname, "/tests/playwright/.clerk/user.json");

setup("global setup", async () => {
  await clerkSetup({
    // Astro uses PUBLIC_CLERK_PUBLISHABLE_KEY; the testing package looks for
    // CLERK_PUBLISHABLE_KEY. Pass it directly to avoid duplicating the var in .env.
    // --env-file=.env in the deno task makes this available.
    publishableKey: process.env.PUBLIC_CLERK_PUBLISHABLE_KEY,
  });

  // Ensure a test user exists with a +clerk_test email so no real
  // emails are sent during tests (verification codes, notifications, etc.)
  const email = process.env.E2E_CLERK_USER_EMAIL!;
  const password = process.env.E2E_CLERK_USER_PASSWORD!;

  if (!email || !password) {
    throw new Error(
      "Please provide E2E_CLERK_USER_EMAIL and E2E_CLERK_USER_PASSWORD environment variables.",
    );
  }

  const clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  const { data: users } = await clerkClient.users.getUserList({
    emailAddress: [email],
  });

  if (users.length === 0) {
    await clerkClient.users.createUser({ emailAddress: [email], password });
  } else {
    // Ensure the password matches in case it was changed manually
    await clerkClient.users.updateUser(users[0].id, {
      password: process.env.E2E_CLERK_USER_PASSWORD!,
    });
  }
});

setup("authenticate and save state to storage", async ({ page }) => {
  // Sign in using the emailAddress parameter, which creates a
  // server-side token and bypasses all verification steps
  await page.goto("/dashboard");
  await clerk.signIn({
    page,
    emailAddress: process.env.E2E_CLERK_USER_EMAIL!,
  });
  // Reload so the server recomputes isAuthenticated and renders the signed-in nav
  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: "Sign In" })).toBeHidden();

  // Strip the guest board out of the persisted state. /dashboard writes the
  // board to localStorage under kanby-v0-1-0, and storageState() captures
  // localStorage as well as cookies — so leaving it in would seed every
  // testAuthed spec with whatever board this setup happened to leave behind,
  // clobbering the KV boards those specs seed for themselves.
  const state = await page.context().storageState();
  for (const origin of state.origins ?? []) {
    origin.localStorage = origin.localStorage.filter(
      (entry) => entry.name !== "kanby-v0-1-0",
    );
  }
  // `.clerk/` is gitignored, so it doesn't exist on a fresh CI checkout.
  await mkdir(path.dirname(authFile), { recursive: true });
  await writeFile(authFile, JSON.stringify(state, null, 2));
});
