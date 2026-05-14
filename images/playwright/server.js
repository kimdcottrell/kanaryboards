import http from "http";
import { spawn } from "child_process";
import process from "process";

const server = http.createServer((req, res) => {
  if (req.url === "/run" && (req.method === "GET" || req.method === "POST")) {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.write("Starting playwright tests...\n\n");

    const proc = spawn("npx", ["playwright", "test"], {
      cwd: "/usr/src/app",
      env: { ...process.env, CI: "true" },
    });

    proc.stdout.on("data", (data) => res.write(data));
    proc.stderr.on("data", (data) => res.write(data));
    proc.on("close", (code) => {
      res.write(`\nExit code: ${code}\n`);
      res.end();
    });
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found. GET /run to trigger tests.\n");
  }
});

server.listen(3000, "0.0.0.0", () => {
  console.log("Playwright trigger server listening on :3000");
});
