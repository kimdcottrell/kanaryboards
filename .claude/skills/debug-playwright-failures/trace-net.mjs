// Dump the network requests recorded in a Playwright trace.zip, grouped by URL
// with counts. Useful for spotting redirect loops, unexpected external calls,
// or a hung/missing request behind a flaky e2e failure.
//
// Why this exists: this container is deno-only and has no `unzip`, so the usual
// `unzip trace.zip` doesn't work. This reads the zip with a JSR module instead.
//
// Usage (from repo root):
//   deno run --allow-read .claude/skills/debug-playwright-failures/trace-net.mjs \
//     test-results/<test-dir>/trace.zip
//
// Add a substring filter to narrow the output:
//   deno run --allow-read .../trace-net.mjs <trace.zip> clerk
import { BlobReader, TextWriter, ZipReader } from "jsr:@zip-js/zip-js";

const [zipPath, filter] = Deno.args;
if (!zipPath) {
  console.error("usage: trace-net.mjs <trace.zip> [url-substring-filter]");
  Deno.exit(1);
}

const buf = await Deno.readFile(zipPath);
const zr = new ZipReader(new BlobReader(new Blob([buf])));
const counts = new Map();
for (const entry of await zr.getEntries()) {
  if (!/\.(trace|network)$/.test(entry.filename)) continue;
  const txt = await entry.getData(new TextWriter());
  for (const line of txt.split("\n")) {
    // Trace events store the request URL as "url":"…"; take request events only.
    if (!/"type":"resource-snapshot"|"method":|"requestUrl"|"url":/.test(line)) continue;
    const m = line.match(/"(?:requestUrl|url)":"([^"]+)"/);
    if (!m) continue;
    const url = m[1].replace(/\?.*$/, ""); // drop query string for grouping
    if (!/^https?:|^wss?:/.test(url)) continue;
    if (filter && !url.includes(filter)) continue;
    counts.set(url, (counts.get(url) ?? 0) + 1);
  }
}
await zr.close();

const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);
for (const [url, n] of rows) console.log(String(n).padStart(4), url);
console.log(`\n${rows.length} distinct URL(s)`);
