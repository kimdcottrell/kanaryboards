# Kanby

An AI-native kanban-style project management app built with Astro, React, Deno, and TailwindCSS / DaisyUI.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) (v2+)
- [VS Code](https://code.visualstudio.com/) with the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) _(recommended)_
- [Claude Code](https://claude.ai/code) CLI installed on your **local machine** _(recommended)_
- An SSH key on your **local machine** authorized for GitHub (`~/.ssh/id_*`)
- `make` available on your **local machine**

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

### 2. Set up SSH agent

Run this on your **host machine** (not inside the container):

```bash
make setup-ssh-agent
```

This is a one-time setup. It adds an `ssh_agent_reload` function to your `~/.bash_profile` that starts a persistent `ssh-agent` bound to `~/.ssh/agent.sock`, and adds `export SSH_AUTH_SOCK="$HOME/.ssh/agent.sock"` to your `~/.bashrc`. All `~/.ssh/id_*` keys are loaded automatically on login.

The dev container bind-mounts that socket instead of copying your keys, so your private keys never leave your machine.

> If the socket is ever stale or missing, run `ssh_agent_reload` in your host terminal to restart the agent.

### 3. Configure environment variables

```bash
cp .env.sample .env
```

Open `.env` and fill in the values indicated as REQUIRED in the comments.

### 4. Generate a Claude OAuth token

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

**Requirements on your local machine:**

- `make setup-ssh-agent` must have been run at least once
- The ssh-agent must be running — it starts automatically on login via `~/.bash_profile`, but if the socket is missing, run `ssh_agent_reload` in your host terminal before opening the container

Verify it is working inside the container with:

```bash
ssh -T git@github.com
```

You should see: `Hi <username>! You've successfully authenticated…`

**Extra details you may be wondering about**

- **Git identity (name & email):** The VS Code Git extension automatically forwards your local machine's `user.name` and `user.email` from `~/.gitconfig` into the container. You do not need to configure git identity inside the container.

- **Why `openssh-client` is in the `Dockerfile` and not a devcontainer feature:** Dev container features run their install scripts as `root` after the image is built, but because the `Dockerfile` sets `USER deno`, the feature scripts can land files with the wrong ownership. Installing `openssh-client` directly in the `Dockerfile` (before the `USER` switch) sidesteps this.

### 5. Customize your shell (optional)

The dev container mounts `.devcontainer/home/.bashrc` and `.devcontainer/home/.zshrc` directly into the container as `~/.bashrc` and `~/.zshrc`. Both files are gitignored — they're personal to your machine and won't affect other contributors.

The `postAttachCommand` in `devcontainer.json` copies the sample files into place the first time if they don't exist or are empty, so you'll get a sensible default prompt without any extra steps.

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

Open the project in VS Code and when prompted, click **"Rebuild Container"**. VS Code will build the Docker image and start the services defined in `compose.yaml` (the app container plus its Playwright and MCP server companions).

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
| `deno task e2e-test:ui` | Same as `e2e-test`, but opens the Playwright UI mode |
| `deno task husky` | Wrapper for the Husky git hooks CLI |
| `deno task playwright` | Wrapper for the Playwright CLI, configured to connect to the remote `playwright` container |
| `deno task preview` | Serve the production build from `dist/server/entry.mjs` |
| `deno task vitest` | Run the Vitest unit test suite |

## Make commands

These run on your **host machine** (not inside the container).

| Command | Description |
|---|---|
| `make setup-ssh-agent` | One-time host setup — adds `ssh_agent_reload` to `~/.bash_profile` and `SSH_AUTH_SOCK` export to `~/.bashrc`, then starts the agent immediately, assigning your ssh-keys to it |
| `make codegen` | Open a browser to record a Playwright test; saves the generated script to `tests/playwright/generated.spec.ts` |
| `make nuke` | Kill all running Docker containers and prune all containers, images, and volumes |
| `make help` | List all available make targets with descriptions |

## Services

| Service | Port | Description |
|---|---|---|
| App | `4321` | Astro dev server |
| Playwright (test runner) | `3000` | Remote Playwright server (`playwright run-server`) — `deno task e2e-test` connects to it via `PW_TEST_CONNECT_WS_ENDPOINT` to run the E2E suite |
| Playwright (MCP) | `8931` | Playwright MCP server for Claude Code browser automation |
| MCPDoc | `8082` | Documentation MCP server |

## E2E Testing

Playwright tests run inside a dedicated `playwright` Docker container (`images/playwright/Dockerfile`). The container uses `node:25-trixie` (not the official Playwright image, which can act unpredictably at times, partly thanks to a possible version difference between the image and the package in package.json) and exposes a remote Playwright server (`playwright run-server`) on port 3000.

### Architecture

```
app container
  └─ deno task e2e-test
       └─ playwright test (PW_TEST_CONNECT_WS_ENDPOINT=ws://playwright:3000)
             └─ connects to remote browsers in the playwright container
                    └─ https://kanary.local.dev  ← via Traefik reverse proxy
```

The `playwright` container runs `npx playwright run-server`, hosting Chromium, Firefox, and WebKit for remote use. Its entrypoint (`images/playwright/entrypoint.sh`) resolves the Traefik container IP at runtime and writes it to `/etc/hosts` so `kanary.local.dev` resolves inside the container. `gosu` is used to drop back from root to the `node` user after that write.

`deno task e2e-test` auto-starts the Astro dev server if it is not already running (via Playwright's `webServer` config), triggers the test suite, then shuts the server back down if it started it.

### Running locally

```bash
deno task e2e-test
```

Tests run in Chromium, Firefox, and WebKit. The base URL is `https://kanary.local.dev` with HTTPS errors ignored (self-signed cert from the local proxy).

### Generating tests (codegen)

Playwright's codegen mode opens a real browser on your screen and records your interactions as a test script. Because it requires a visible display, **it must be run from your host machine** — not inside the dev container.

A `Makefile` at the project root simplifies this. From your host machine (with the containers running), just run:

```bash
make codegen
```

This executes `playwright codegen` inside the `playwright` container against `https://kanary.local.dev` using Firefox, and saves the recorded script to `tests/playwright/generated.spec.ts`.

### Pre-commit enforcement

Every commit runs six checks in sequence:

```
deno fmt → deno lint → deno check → deno task astro check → deno task vitest → deno task e2e-test
```

The hook lives in `.husky/pre-commit` and is installed via `deno task husky`, which runs automatically when the dev container image is built. Type checking (`deno check` and `deno task astro check`) and the unit and E2E suites must all pass before a commit is accepted.

### CI (GitHub Actions)

Four workflows run automatically:

| Workflow | Trigger | What it does |
|---|---|---|
| `auto-create-pr.yml` | Push to `feature/**` or `bugfix/**` | Creates a PR automatically, titled `WIP: <branch>` and labeled `enhancement` (idempotent — skips if one already exists) |
| `vitest.yml` | Pull request | Runs the Vitest unit test suite |
| `e2e.yml` | Pull request | Waits for the Deno Deploy preview URL, then runs the full Playwright suite against it; uploads the HTML report as an artifact |
| `dependabot-auto-merge.yml` | Pull request | Enables auto-merge (squash) on pull requests opened by Dependabot |

The `e2e.yml` workflow polls the GitHub Statuses API until the Deno Deploy build URL appears, then polls the Deno Deploy API until the preview domain is live before handing it to `npx playwright test`.

## MCP Servers

Claude Code inside the dev container connects to four MCP servers, configured in [.mcp.json](.mcp.json).

**Extra details you may be wondering about**

- **the placement of `.mcp.json`**: Placing this in `.claude/.mcp.json` makes it ignored by both Claude Code's VSCode chat and the VSCode terminal window. **IT MUST STAY WHERE IT IS** All other `.mcp.json` files may be ignored.

- **how to add to `.mcp.json`**: It is IMPERATIVE that you add `--scope project` to `claude mcp add` commands. e.g. `claude mcp add --scope project --transport http tickettailor https://mcp.tickettailor.ai/mcp`. 

### Playwright

**Type:** HTTP — `http://mcp_playwright:8931/mcp`

Runs the [official Microsoft Playwright MCP server](https://github.com/microsoft/playwright-mcp) as a Docker service. It gives Claude Code a headless browser it can navigate, click, fill forms, take screenshots, and inspect network traffic — useful for end-to-end testing and verifying UI changes without leaving the editor.

### Astro Docs

**Type:** HTTP — `https://mcp.docs.astro.build/mcp`

A remote MCP server hosted by the Astro team. It exposes the full Astro documentation as a searchable tool so Claude Code can look up framework APIs, component syntax, and configuration options in context.

### Clerk Docs

**Type:** HTTP — `https://mcp.clerk.com/mcp`

A remote MCP server hosted by Clerk. It exposes Clerk's SDK documentation and code snippets so Claude Code can look up authentication APIs and integration patterns in context.

### MCPDoc

**Type:** SSE — `http://mcp_mcpdoc:8082/sse`

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
| Vitest | `vitest.dev/llms.txt` |

## Sequence Diagrams

`docs/sequence-diagrams/` documents how the Kanban board's `BoardContext` reducer architecture handles key user-triggered events — what gets dispatched, which reducers run, and which components re-render:

| File | Covers |
|---|---|
| `task-drag-and-drop.mmd` | Dragging tasks (and checklist items) between rows/columns |
| `task-lifecycle-checklist-ai.mmd` | Creating, editing, and deleting tasks, plus AI checklist generation |
| `board-load-autosave.mmd` | Initial board load and debounced autosave |
| `row-column-management.mmd` | Adding, renaming, reordering, and deleting rows/columns |

These use [Mermaid](https://mermaid.js.org/) sequence diagram syntax — paste a file's contents into [mermaid.live](https://mermaid.live/) to render it visually, or preview with a Mermaid-compatible editor extension.
