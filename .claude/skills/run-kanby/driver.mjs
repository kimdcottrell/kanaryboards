// Driver for the Kanby web app (Astro + React island, served by `deno task dev`).
//
// This container has no local Chromium. The repo drives the app the same way
// its Playwright e2e suite does: connect to the remote Playwright browser
// server (the `playwright` compose service, ws://playwright:3000) and point it
// at the app via the traefik proxy hostname (https://kanary.local.dev). That is
// the ONLY app URL the remote browser can reach — http://localhost:4321 is
// local to *this* (app) container, not the browser's.
//
// Screenshots are streamed back over the wire and written by THIS process, so
// they land on the app-container filesystem under ./screenshots/.
//
// Usage (run from repo root so bare imports + --env-file resolve):
//   deno run --env-file=.env --allow-all \
//     .claude/skills/run-kanby/driver.mjs [homepage|dashboard|all]
//
// Env overrides: APP_URL, PW_WS.
import { chromium } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

const FLOW = Deno.args[0] ?? "all";
const APP_URL = Deno.env.get("APP_URL") ?? "https://kanary.local.dev";
const PW_WS = Deno.env.get("PW_WS") ?? "ws://playwright:3000/";
const SHOT_DIR = new URL("./screenshots/", import.meta.url).pathname;

// Guest board written to localStorage before navigation, so /dashboard renders
// a populated board instead of the empty-state prompt. Shape matches BOARD/LOAD
// (see src/components/context/reducers/board.ts) and STORAGE_KEY "kanby-v0-1-0".
const SEED_BOARD = {
  rows: [
    { id: "row-1", title: "Launch Plan", color: "var(--color-row-blue)", order: "a0" },
    { id: "row-2", title: "Marketing", color: "var(--color-row-green)", order: "a1" },
  ],
  columns: [
    { id: "col-todo", title: "To Do", order: "a0" },
    { id: "col-doing", title: "In Progress", order: "a1" },
    { id: "col-done", title: "Done", order: "a2" },
  ],
  tasks: [
    { id: "t1", title: "Draft the pitch", description: "", checklist: [], rowId: "row-1", colId: "col-todo", order: "a0" },
    { id: "t2", title: "Book the venue", description: "", checklist: [], rowId: "row-1", colId: "col-doing", order: "a0" },
    { id: "t3", title: "Ship the site", description: "", checklist: [], rowId: "row-2", colId: "col-done", order: "a0" },
  ],
};

// PUBLIC_CLERK_PUBLISHABLE_KEY -> Clerk Frontend API URL, mirroring fixtures.ts.
// The testing token makes the guest /dashboard skip Clerk's dev-browser
// handshake; without it the handshake redirect-loops and remounts the board
// island, so html[data-board-loaded='true'] never latches.
const pk = Deno.env.get("PUBLIC_CLERK_PUBLISHABLE_KEY") ?? "";
const fapiFromKey = atob(pk.split("_")[2] ?? "").replace(/\$$/, "");

async function shot(page, name) {
  const path = `${SHOT_DIR}${name}.png`;
  await page.screenshot({ path });
  console.log(`  📸 ${path}`);
}

// Fill a React-controlled input, retrying until the value sticks (an early
// post-load re-render can clobber a freshly-filled controlled input).
async function fillStable(loc, value) {
  for (let i = 0; i < 20; i++) {
    await loc.fill(value);
    if ((await loc.inputValue()) === value) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`could not commit value into ${loc}`);
}

async function homepage(ctx) {
  console.log("▶ homepage");
  const page = await ctx.newPage();
  const resp = await page.goto(`${APP_URL}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  console.log(`  GET / -> ${resp?.status()}  title="${await page.title()}"`);
  await page.getByRole("button", { name: "Get Started" }).waitFor({ timeout: 15000 });
  await shot(page, "homepage");
  await page.close();
}

async function dashboard(ctx) {
  console.log("▶ dashboard (seeded guest board)");
  const page = await ctx.newPage();
  await setupClerkTestingToken({
    page,
    options: { frontendApiUrl: Deno.env.get("CLERK_FAPI") ?? fapiFromKey },
  });
  await page.addInitScript((board) => {
    localStorage.setItem("kanby-v0-1-0", JSON.stringify(board));
  }, SEED_BOARD);
  await page.goto(`${APP_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator("html[data-board-loaded='true']").waitFor({ state: "attached", timeout: 30000 });
  await page.getByRole("heading", { name: "Launch Plan" }).waitFor({ timeout: 15000 });
  console.log("  board loaded (data-board-loaded=true)");
  await shot(page, "dashboard-board");

  // Real user flow: add a new project row through the UI and confirm it renders.
  console.log("  flow: add a new project row");
  await page.locator("#board-menu summary:has(.hugeicons--dashboard-square-add)").click();
  await page.locator("#board-menu").getByText("Add new project row").click();
  const modal = page.locator("dialog [data-testid='create-new-row']");
  await modal.waitFor({ state: "visible", timeout: 15000 });
  await fillStable(
    modal.getByPlaceholder("A project name, a category for large project tasks, etc."),
    "Driver Smoke Row",
  );
  await modal.getByRole("button", { name: "Add Row" }).click();
  await page.getByRole("heading", { name: "Driver Smoke Row" }).waitFor({ timeout: 15000 });
  console.log('  ✅ new row "Driver Smoke Row" appeared on the board');
  await shot(page, "dashboard-new-row");
  await page.close();
}

console.log(`Kanby driver — flow=${FLOW}  app=${APP_URL}  ws=${PW_WS}`);
await Deno.mkdir(SHOT_DIR, { recursive: true });
const browser = await chromium.connect(PW_WS);
console.log(`connected to remote chromium ${browser.version()}`);
const ctx = await browser.newContext({
  ignoreHTTPSErrors: true,
  extraHTTPHeaders: { "x-playwright-test": "true" },
});
try {
  if (FLOW === "homepage" || FLOW === "all") await homepage(ctx);
  if (FLOW === "dashboard" || FLOW === "all") await dashboard(ctx);
  console.log("done ✅");
} finally {
  await browser.close();
}
