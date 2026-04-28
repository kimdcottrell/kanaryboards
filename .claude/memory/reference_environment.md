---
name: Shell environment & available tooling
description: OS distro, shell, JS runtimes/package managers, and available CLI tools in this devcontainer — what to use and what NOT to reach for
type: reference
---

## OS
Debian GNU/Linux 13 (trixie)

## Shell
- Available: `bash` (5.2.37), `sh`, `dash`, `rbash`
- NOT available: `zsh`, `fish`

## JavaScript / TypeScript
- **`deno` 2.7.12** — the ONLY JS runtime. Use `deno run`, `deno task`, etc.
- `node` is a shim that resolves to deno — don't rely on it for npm-specific behavior
- **NOT available: `npm`, `yarn`, `pnpm`, `bun`** — do not attempt these commands

## Other languages / runtimes
- `perl` (5.40) — available
- NOT available: `python`, `python3`, `pip`, `ruby`, `go`, `rustc`, `cargo`, `java`, `javac`

## Key CLI tools available
curl, git, jq, find, grep, sed, awk, openssl, ssh, sudo, apt/apt-get, docker-entrypoint.sh (Docker daemon may be accessible via socket)

**How to apply:** Always use `deno` for JS/TS tasks. Never suggest or run npm/yarn/pnpm/bun/python/node as a standalone runtime. Use `deno task <name>` to run project scripts defined in deno.jsonc.
