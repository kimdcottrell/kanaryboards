import { createClerkClient } from "@clerk/backend";
import { test as teardown } from "@playwright/test";
import fs from "node:fs";
import { signUpUserFile } from "./global.setup.ts";

teardown("cleanup test users", async () => {
  if (!fs.existsSync(signUpUserFile)) return;

  const clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  const users: { userId: string; email: string }[] = JSON.parse(
    fs.readFileSync(signUpUserFile, "utf-8"),
  );

  for (const { userId, email } of users) {
    try {
      await clerkClient.users.deleteUser(userId);
    } catch {
      // If delete by ID fails, try by email as fallback
      const { data: found } = await clerkClient.users.getUserList({
        emailAddress: [email],
      });
      for (const user of found) {
        await clerkClient.users.deleteUser(user.id);
      }
    }
  }

  fs.unlinkSync(signUpUserFile);
});
