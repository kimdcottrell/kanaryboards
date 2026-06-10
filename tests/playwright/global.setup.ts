import { clerk, clerkSetup } from '@clerk/testing/playwright'
import { createClerkClient } from "@clerk/backend";
import { expect, test as setup } from "@playwright/test";
import path from "node:path";

// Must run serially: https://playwright.dev/docs/test-parallel
setup.describe.configure({ mode: "serial" });

const __dirname = path.resolve(path.dirname('.')); 
const authFile = path.join(__dirname, '/tests/playwright/.clerk/user.json');

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
      "Please provide E2E_CLERK_USER_EMAIL and E2E_CLERK_USER_PASSWORD environment variables."
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
  }else{
    // Ensure the password matches in case it was changed manually
    await clerkClient.users.updateUser(users[0].id, {
      password: process.env.E2E_CLERK_USER_PASSWORD!,
    });
  }
});

setup('authenticate and save state to storage', async ({ page }) => {
  // Sign in using the emailAddress parameter, which creates a
  // server-side token and bypasses all verification steps
  await page.goto('/')
  await clerk.signIn({
    page,
    emailAddress: process.env.E2E_CLERK_USER_EMAIL!,
  })
  // Reload so the server recomputes isAuthenticated and renders the signed-in nav
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeHidden()

  await page.context().storageState({ path: authFile })
})
