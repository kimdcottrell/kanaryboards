import { test as teardown } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const __dirname = path.resolve(path.dirname('.'));
const clerkDir = path.join(__dirname, '/tests/playwright/.clerk');

teardown("clean up Clerk auth state", async () => {
  const files = await fs.readdir(clerkDir);
  await Promise.all(files.map((file) => fs.unlink(path.join(clerkDir, file))));
});
