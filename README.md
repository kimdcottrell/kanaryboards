# Kanary Boards

An AI-native kanban-style project management app built with Astro, React, Deno, and TailwindCSS / DaisyUI.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) (v2+)
- [VS Code](https://code.visualstudio.com/) with the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) _(recommended)_
- [Claude Code](https://claude.ai/code) CLI installed on your **local machine** _(recommended)_

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

### 4. Start the dev container

Open the project in VS Code and when prompted, click **"Reopen in Container"**. VS Code will build the Docker image and start the services defined in `compose.yaml` (the app and a Redis instance).

Alternatively, bring the containers up manually:

```bash
docker compose up --build
```

Then attach to the running container in VS Code via the **Remote Explorer** sidebar.

### 5. Start the development server

Inside the container terminal:

```bash
deno task dev
```

The app will be available at [http://localhost:4321](http://localhost:4321).

## Available tasks

| Command | Description |
|---|---|
| `deno task dev` | Start the Astro dev server with hot reload |
| `deno task build` | Build for production |
| `deno task preview` | Preview the production build |

## Services

| Service | Port | Description |
|---|---|---|
| App | `4321` | Astro dev server |
