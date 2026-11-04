# kanby CLI

Manage your Kanby board from the terminal. Paid plans only; you must be logged
in for every command except `kanby user login`.

```
kanby user  login | logout | whoami
kanby row   list | create | edit <id>
kanby task  list [--row <id>] | create | edit <id>
```

`<id>` is a full id, or the last 8 characters `list` shows (UUIDv7 ids start
with a timestamp, so their first characters aren't unique).

`create` and `edit` walk you through each field. Every answer is checked by the
server (`POST /api/v1/validate/{task|row}/{field}`) before moving on; an empty
required field (a title) is an error and asks again. In `edit`, pressing Enter
keeps the current value. Nothing is saved until you confirm at the end.

## Running

```sh
deno task cli task list         # run from source
deno task cli:compile           # build a standalone binary at cli/bin/kanby
deno task cli:test              # unit tests
```

## Configuration

Set in the environment or in `./.env` (the CLI reads only the `KANBY_*` lines
and `PUBLIC_CLERK_PUBLISHABLE_KEY`; empty values count as unset):

| Variable                      |                                                                                                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `KANBY_API_URL`               | Kanby environment. Default `https://kanary.local.dev`; `http://localhost:4321` also works.                                                                 |
| `KANBY_CLERK_ISSUER`          | The Clerk instance's Frontend API URL, e.g. `https://foo.clerk.accounts.dev`. Optional: defaults to the instance `PUBLIC_CLERK_PUBLISHABLE_KEY` points at. |
| `KANBY_CLERK_OAUTH_CLIENT_ID` | Client ID of the OAuth application below.                                                                                                                  |

Login tokens are stored per Clerk issuer in `~/.config/kanby/credentials.json`
(mode 0600).

## Clerk setup (once per Clerk instance)

In the Clerk dashboard, under **Configure → OAuth applications**, create an
application:

- **Public client**, with PKCE required. The CLI has no client secret; a
  non-public app rejects its token request.
- Redirect URI `http://127.0.0.1:8976/callback`. The CLI listens on port 8976,
  which `.devcontainer/devcontainer.json` forwards to the host, so the
  browser's redirect reaches it from inside the dev container. If 8976 is
  taken, it uses a random port; also listing `http://127.0.0.1/callback`
  covers that case where Clerk accepts any loopback port.
- Scopes `profile email offline_access`

Put its client ID in `KANBY_CLERK_OAUTH_CLIENT_ID`.

## How it works

- Login follows
  [clerk/cli-auth-example](https://github.com/clerk/cli-auth-example):
  `kanby user login` opens your browser (via `$BROWSER` when set, which in a VS
  Code dev container opens the host's browser), you log in, and Clerk redirects
  back to a one-shot server on 127.0.0.1 that records the tokens. When the CLI
  runs in a container or over SSH and that redirect page can't load, paste its
  address into the terminal instead. Tokens refresh automatically; `logout`
  revokes them.
- The CLI calls `/api/v1/{me,rows,tasks,columns,validate}` (`src/pages/api/v1/`, built with `cliRoute`) with the OAuth access token.
  Those routes verify it with `locals.auth({ acceptsToken: "oauth_token" })` and
  check `isPaidUser()` (`src/lib/api/billing.ts`, currently a stub). Their
  request and response shapes are in `docs/api/openapi.yaml`, browsable at
  `http://localhost:4321/api/docs` on the dev server.
- Descriptions are stored as Lexical JSON. The CLI shows and edits them as plain
  text, so saving a changed description drops formatting added in the web app.
  An unchanged description is never rewritten.
- The AI checklist uses the same `/api/v1/ai/task-titles` as the web app.

## Known limitation

`edit` rejects your changes if the row or task changed on the server while you
were answering prompts (you'll be asked to re-run it). But an already-open web
tab shows CLI changes only after it reloads, and if that tab then edits the same
task, its copy overwrites the CLI's edit.
