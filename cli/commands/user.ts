import { api } from "../api.ts";
import { login, logout } from "../auth.ts";
import { config } from "../config.ts";

interface Me {
  userId: string;
  email: string | null;
  name: string | null;
}

export async function whoami() {
  const { data } = await api<Me>("GET", "/api/v1/me");
  console.log(
    `${data.name ? `${data.name} <${data.email}>` : data.email ?? data.userId}`,
  );
  console.log(`Environment: ${config.apiUrl}`);
}

export async function loginCommand() {
  await login();
  const { data } = await api<Me>("GET", "/api/v1/me");
  console.log(`Logged in as ${data.email ?? data.userId}.`);
}

export async function logoutCommand() {
  console.log(await logout() ? "Logged out." : "You weren't logged in.");
}
