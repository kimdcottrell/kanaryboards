# Kanary Boards

An AI-native kanban-style project management app built with Astro, React, Deno, and TailwindCSS / DaisyUI.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) (v2+)
- [VS Code](https://code.visualstudio.com/) with the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) _(recommended)_
- [Claude Code](https://claude.ai/code) CLI installed on your **local machine** _(recommended)_
- An SSH key on your **local machine** authorized for GitHub (`~/.ssh/id_*`)

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

### 4. Set up SSH agent forwarding for Git

Git operations inside the container (push, pull, fetch) are authenticated via your **local machine's** SSH agent — no keys are copied into the container.

When VS Code starts the dev container, `devcontainer.json` runs this on your local machine:

```bash
eval $(ssh-agent -s -a ~/.ssh/agent.sock 2>/dev/null)
for key in ~/.ssh/id_*; do
  [[ "$key" == *.pub ]] || ssh-add -S ~/.ssh/agent.sock "$key"
done
```

This starts an SSH agent bound to the socket `~/.ssh/agent.sock` and loads all your private keys into it. The socket is then bind-mounted into the container at `/home/deno/ssh-agent`, and `SSH_AUTH_SOCK` is set to that path so git and other SSH tools use it automatically.

**Requirements on your local machine:**

- At least one SSH key in `~/.ssh/` that is authorized on GitHub
- The `~/.ssh/` directory must be writable (so the socket file can be created)

You can verify the forwarding works inside the container with:

```bash
ssh -T git@github.com
```

**Extra details you may be wondering about**

- **Git identity (name & email):** The VS Code Git extension automatically forwards your local machine's `user.name` and `user.email` from `~/.gitconfig` into the container. You don't need to configure git identity inside the container — it comes from your local git config via the extension.

- **Why `openssh-client` is in the `Dockerfile` and not a devcontainer feature:** Dev container features run their install scripts as `root` after the image is built, but because the `Dockerfile` sets `USER deno`, the feature scripts can land files with the wrong ownership and break the SSH socket. Installing `openssh-client` directly in the `Dockerfile` (before the `USER` switch) sidesteps this. This is a known rough edge that will be addressed in a future cleanup.

### 5. Start the dev container

Open the project in VS Code and when prompted, click **"Reopen in Container"**. VS Code will build the Docker image and start the services defined in `compose.yaml` (the app and a Redis instance).

Alternatively, bring the containers up manually:

```bash
docker compose up --build
```

Then attach to the running container in VS Code via the **Remote Explorer** sidebar.

### 6. Start the development server

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
