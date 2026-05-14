# Kanary Boards

An AI-native kanban-style project management app built with Astro, React, Deno, and TailwindCSS / DaisyUI.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) (v2+)
- [VS Code](https://code.visualstudio.com/) with the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) _(recommended)_
- [Claude Code](https://claude.ai/code) CLI installed on your **local machine** _(recommended)_
- An SSH key on your **local machine** authorized for GitHub (`~/.ssh/id_*`)

### Local Proxy Setup

This is a requirement of this project.

This localdev is available via `https://kanary.local.dev`, which means you need to setup a reverse proxy. 

#### 1. Clone the repository

```bash
git clone git@github.com:kimdcottrell/localdev-proxy.git
cd localdev-proxy
```

#### 2. Edit hostsfile

```bash
# the below line needs to be added to /etc/hosts
127.0.0.1    kanary.local.dev
```

#### 3. Add self-signed certs

Install this: https://github.com/FiloSottile/mkcert 

Run this:

```
cd certs
mkcert -install
mkcert -key-file wildcard-local-dev-key.pem -cert-file wildcard-local-dev-cert.pem *.local.dev
```

#### 4. Start the reverse proxy

```
docker compose up -d
```

#### 5. (optional) blow the Firefox DNS cache

In Firefox, search for `about:networking#dns` in the url bar.

Hit the `Clear DNS Cache` button.

Restart Firefox.

Some company bought the domain name of `local.dev`, so we need to go out of our way to tell Firefox where to look.

## Setup

### 1. Clone the repository

```bash
git clone git@github.com:kimdcottrell/kanaryboards.git
cd kanaryboards
```

### 2. Configure environment variables

```bash
cp .env.sample .env
```

Open `.env` and fill in the values:

| Variable | Description |
|---|---|
| `LOCAL_MACHINE_UID` | Your local user ID — run `id -u` |
| `LOCAL_MACHINE_GID` | Your local group ID — run `id -g` |
| `GOOGLE_AI_STUDIO_KEY` | Google AI Studio API key (used for board autocomplete) |
| `CLAUDE_CODE_OAUTH_TOKEN` | OAuth token for Claude Code inside the container (see below) |

### 3. Generate a Claude OAuth token

The dev container disables the Claude Code login prompt, so you must generate an OAuth token on your **local machine** and paste it into `.env`.

Run this on your local machine (**not inside the container**):

```bash
claude setup-token
```

Copy the token that is printed and set it as `CLAUDE_CODE_OAUTH_TOKEN` in this project's `.env` file (which should be based off of `.env.sample`).

> If the token stops working, reset it on your local machine with:
> ```bash
> rm -rf ~/.claude ~/.claude.json && claude setup-token
> ```

### 4. Set up SSH for Git

`git push`, `git pull`, and `git fetch` inside the container authenticate using a copy of your local SSH key. Here is what happens automatically when VS Code opens the dev container:

1. **`initializeCommand`** runs on your local machine. It connects to `git@github.com` in verbose mode to discover which key GitHub accepts, then saves that key's filename to `.devcontainer/gitsshkey`.
2. Your local `~/.ssh/` directory is bind-mounted **read-only** into the container at `/var/host_ssh/`.
3. **`postAttachCommand`** runs inside the container after attach. It reads the filename from `gitsshkey` and copies that private key and its `.pub` counterpart from `/var/host_ssh/` into `/home/deno/.ssh/`.

**Requirements on your local machine:**

- At least one SSH key in `~/.ssh/` that is authorized on GitHub
- That key must authenticate to GitHub non-interactively (no passphrase, or the passphrase is already cached in your local SSH agent) — `initializeCommand` runs without a terminal so it cannot prompt

Verify it is working inside the container with:

```bash
ssh -T git@github.com
```

You should see: `Hi <username>! You've successfully authenticated…`

If it fails, the most common cause is that no key in your local `~/.ssh/` is registered with GitHub, or the key requires a passphrase that was not cached before the container started.

**Extra details you may be wondering about**

- **Git identity (name & email):** The VS Code Git extension automatically forwards your local machine's `user.name` and `user.email` from `~/.gitconfig` into the container. You do not need to configure git identity inside the container.

- **Why `openssh-client` is in the `Dockerfile` and not a devcontainer feature:** Dev container features run their install scripts as `root` after the image is built, but because the `Dockerfile` sets `USER deno`, the feature scripts can land files with the wrong ownership. Installing `openssh-client` directly in the `Dockerfile` (before the `USER` switch) sidesteps this.

### 5. Customize your shell (optional)

The dev container mounts `.devcontainer/home/.bashrc` and `.devcontainer/home/.zshrc` directly into the container as `~/.bashrc` and `~/.zshrc`. Both files are gitignored — they're personal to your machine and won't affect other contributors.

The `initializeCommand` in `devcontainer.json` creates them as empty files the first time if they don't exist yet, so there's nothing to do if you're happy with a plain prompt.

Sample configs are provided as a starting point:

| Sample file | What it includes |
|---|---|
| `.devcontainer/home/.sample_bashrc` | Colored prompt with git branch, `vivid` LS colors, GitHub SSH check |
| `.devcontainer/home/.sample_zshrc` | oh-my-zsh with the `robbyrussell` theme |

To use a sample, copy it to the real file before opening the container:

```bash
cp .devcontainer/home/.sample_bashrc .devcontainer/home/.bashrc
# and/or
cp .devcontainer/home/.sample_zshrc .devcontainer/home/.zshrc
```

Edit either file freely — your changes stay local and are picked up the next time the container starts.

### 6. Start the dev container

Open the project in VS Code and when prompted, click **"Reopen in Container"**. VS Code will build the Docker image and start the services defined in `compose.yaml` (the app and a Redis instance).

Alternatively, bring the containers up manually:

```bash
docker compose up --build
```

Then attach to the running container in VS Code via the **Remote Explorer** sidebar.

### 7. Start the development server

Inside the container terminal:

```bash
deno task dev
```

The app will be available at [http://localhost:4321](http://localhost:4321).

## Available tasks

| Command | Description |
|---|---|
| `deno task astro` | Wrapper for the Astro CLI |
| `deno task build` | Clear `.astro`/`dist` and build for production |
| `deno task dev` | Start the Astro dev server with hot reload |
| `deno task e2e-test` | Auto-start dev server if needed, trigger the Playwright E2E suite, then shut it down |
| `deno task husky` | Wrapper for the Husky git hooks CLI |
| `deno task preview` | Serve the production build from `dist/server/entry.mjs` |

## Services

| Service | Port | Description |
|---|---|---|
| App | `4321` | Astro dev server |
| Playwright (test runner) | `3000` | HTTP trigger server — `GET /run` fires the full Playwright suite |
| Playwright (MCP) | `8931` | Playwright MCP server for Claude Code browser automation |
| MCPDoc | `8082` | Documentation MCP server |

## E2E Testing

Playwright tests run inside a dedicated `playwright` Docker container (`images/playwright.Dockerfile`). The container uses `node:25-trixie` (not the official Playwright image, which can act unpredictably at times, partly thanks to a possible version difference between the image and the package in package.json) and exposes a lightweight HTTP trigger server on port 3000.

### Architecture

```
app container
  └─ deno task e2e-test
       └─ curl http://playwright:3000/run   ← triggers tests
             └─ npx playwright test         ← runs in playwright container
                    └─ https://kanary.local.dev  ← via Traefik reverse proxy
```

The entrypoint (`images/playwright-entrypoint.sh`) resolves the Traefik container IP at runtime and writes it to `/etc/hosts` so `kanary.local.dev` resolves inside the container. `gosu` is used to drop back from root to the `node` user after that write.

`deno task e2e-test` auto-starts the Astro dev server if it is not already running, triggers the test suite, then shuts the server back down if it started it.

### Running locally

```bash
deno task e2e-test
```

Tests run in Chromium, Firefox, and WebKit. The base URL is `https://kanary.local.dev` with HTTPS errors ignored (self-signed cert from the local proxy).

### Pre-commit enforcement

Every commit runs three checks in sequence:

```
deno fmt → deno lint → deno task e2e-test
```

The hook lives in `.husky/pre-commit` and is installed via `npm run prepare` (husky). The E2E suite must pass before a commit is accepted.

### CI (GitHub Actions)

Two workflows run automatically:

| Workflow | Trigger | What it does |
|---|---|---|
| `auto-create-pr.yml` | Push to `feature/**` or `bugfix/**` | Creates a draft PR automatically (idempotent — skips if one already exists) |
| `e2e.yml` | Pull request | Waits for the Deno Deploy preview URL, then runs the full Playwright suite against it; uploads the HTML report as an artifact |

The `e2e.yml` workflow polls the GitHub Statuses API until the Deno Deploy build URL appears, then polls the Deno Deploy API until the preview domain is live before handing it to `npx playwright test`.

## MCP Servers

Claude Code inside the dev container connects to three MCP servers, configured in [.mcp.json](.mcp.json).

**Extra details you may be wondering about**

- **the placement of `.mcp.json`**: Placing this in `.claude/.mcp.json` makes it ignored by both Claude Code's VSCode chat and the VSCode terminal window. **IT MUST STAY WHERE IT IS** All other `.mcp.json` files may be ignored.

- **how to add to `.mcp.json`**: It is IMPERATIVE that you add `--scope project` to `claude mcp add` commands. e.g. `claude mcp add --scope project --transport http tickettailor https://mcp.tickettailor.ai/mcp`. 

### Playwright

**Type:** HTTP — `http://playwright:8931/mcp`

Runs the [official Microsoft Playwright MCP server](https://github.com/microsoft/playwright-mcp) as a Docker service. It gives Claude Code a headless browser it can navigate, click, fill forms, take screenshots, and inspect network traffic — useful for end-to-end testing and verifying UI changes without leaving the editor.

### Astro Docs

**Type:** HTTP — `https://mcp.docs.astro.build/mcp`

A remote MCP server hosted by the Astro team. It exposes the full Astro documentation as a searchable tool so Claude Code can look up framework APIs, component syntax, and configuration options in context.

### MCPDoc

**Type:** SSE — `http://mcpdoc:8082/sse`

Runs [mcpdoc](https://github.com/lancedb/mcpdoc) as a Docker service, configured via [.mcpdoc.yaml](.mcpdoc.yaml). It fetches and serves `llms.txt`-formatted documentation for the libraries used in this project:

| Library | Source |
|---|---|
| Daisy UI | `daisyui.com/llms.txt` |
| Deno | `docs.deno.com/llms.txt` |
| Docker | `docs.docker.com/llms.txt` |
| Luthor | `luthor.fyi/llms.txt` |
| Google GenAI | GitHub — `googleapis/js-genai` |
| Zod | `zod.dev/llms.txt` |
| React | `react.dev/llms.txt` |
| Tailwind | GitHub — `rgfx/tailwind-llms` |
