# kanby CLI

Manage your Kanby board from the terminal. Paid plans only; you must be logged
in for every command except `kanby user login`.

```
kanby user  login | logout | whoami
kanby row   list | create | edit --id <id>
kanby task  list [--row <id>] | create | edit --id <id>
kanby [task [create]] --help    # all commands, one group's, or one command's
```

`kanby task` with no subcommand shows the same help as `kanby task --help`.

`<id>` (`--id`/`-i`, `--row`/`-r`) is a full id, or the last 8 characters
`list` shows (UUIDv7 ids start with a timestamp, so their first characters
aren't unique). Ids are flags rather than positional arguments because
`@bomb.sh/args` turns a positional that starts with a digit into a number.

`create` and `edit` walk you through each field with
[`@clack/prompts`](https://bomb.sh/docs/clack/packages/prompts/):

- Titles are text inputs. Every answer is checked by the server
  (`POST /api/v1/validate/{task|row}/{field}`) before moving on; an empty
  required field (a title) is an error and asks again.
- Row, column and color are menus.
- The description takes several lines: Enter adds a line; press Tab to move
  to `[ submit ]`, then Enter to finish.
- In `task edit`, the checklist is a multiselect: selected items are done, and
  Space checks or unchecks one (or the whole group).
- The AI checklist is offered with a yes/no, and its items are shown for you
  to accept or decline. Declining offers to regenerate from an edited
  description; say no to move on without it.

In `edit`, each field starts with its current value. A spinner shows while the
CLI waits on the server. Nothing is saved until you confirm at the end, and
Ctrl+C at any prompt quits without saving.

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
- Saves go through `applyBoardChanges` in `src/lib/db/kv.ts`, the same write
  the web app's autosave uses, and run the same field rules
  (`src/lib/api/fields.ts`; the CLI's differ only in how checklist items are
  sent). Rows and tasks the CLI writes are stored exactly
  like the web app's, so each client sees the other's.
- Descriptions are stored as Lexical JSON. The CLI shows and edits them as plain
  text, so saving a changed description drops formatting added in the web app.
  An unchanged description is never rewritten.
- The AI checklist uses the same `/api/v1/ai/task-titles` as the web app.

## Editing from the CLI and the web app at once

- `edit` reads the row or task's version (its ETag) when it starts, and saves
  only if it's unchanged. If the row or task was saved anywhere else while you
  were answering prompts (the web app, another CLI session), nothing is saved
  and you're asked to re-run `edit`. Changes to other rows and tasks don't
  count.
- An open web tab shows CLI changes within moments, without reloading (it
  refetches on each board write, over `/api/v1/board/events`).
- If that tab has the task's modal open, the modal closes and its unsaved
  edits are discarded, with a notice, so they can't overwrite the CLI's edit.
- If that tab saves an edit to the same task before it has the CLI's change,
  its save is refused (409). The tab then reloads the board, keeps its changes
  to anything the CLI didn't touch, and shows the CLI's version of that task
  with a notice. Its copy never overwrites the CLI's edit.
- If the row or column picked in `task edit` was deleted in the meantime, the
  save fails with "No such row." / "No such column."
