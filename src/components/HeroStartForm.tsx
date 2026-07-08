import { useState } from "react";
import type { FormEvent } from "react";
import {
  createId,
  loadPersistedState,
  rowColorOptions,
  STORAGE_KEY,
} from "./context/constants.ts";
import { reset } from "./context/reducers/board.ts";
import {
  buildTasksFromTitles,
  fetchGeneratedItems,
} from "./context/actions/shared.ts";
import { generateKeyBetween } from "fractional-indexing";
import GeneratingTasksAlert from "./shared/GeneratingTasksAlert.tsx";
import type { Column, Row, Task } from "./context/types.ts";

type Board = { rows: Row[]; columns: Column[]; tasks: Task[] };

// Load the visitor's current board so we can append to it. Authenticated users'
// board lives in KV (via /api/board); anonymous visitors' in localStorage. When
// no board exists yet, seed the default columns so generated tasks have a "To Do"
// column to land in (ignoring reset()'s sample row, so the new project stands alone).
async function loadBoard(isAuthenticated: boolean): Promise<Board> {
  let existing:
    | { rows?: Row[]; columns?: Column[]; tasks?: Task[] }
    | null = null;
  if (isAuthenticated) {
    try {
      const res = await fetch("/api/board");
      if (res.ok) existing = await res.json();
    } catch { /* treat as no board */ }
  } else {
    existing = loadPersistedState();
  }
  if (
    existing && Array.isArray(existing.columns) && existing.columns.length > 0
  ) {
    return {
      rows: existing.rows ?? [],
      columns: existing.columns,
      tasks: existing.tasks ?? [],
    };
  }
  return { rows: [], columns: reset().columns, tasks: [] };
}

export default function HeroStartForm(
  { isAuthenticated }: { isAuthenticated: boolean },
) {
  const [value, setValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isGenerating) return;
    const goal = value.trim();
    if (!goal) return;

    setError("");
    setIsGenerating(true);
    setStatus("Generating tasks...");

    try {
      const board = await loadBoard(isAuthenticated);
      const lastRow = board.rows[board.rows.length - 1];
      const newRow: Row = {
        id: createId(),
        title: goal,
        color: rowColorOptions[0].value,
        order: generateKeyBetween(lastRow?.order ?? null, null),
      };
      const titles = await fetchGeneratedItems(goal, 10);
      const newTasks = buildTasksFromTitles(titles, newRow.id, board.columns);
      const merged: Board = {
        rows: [...board.rows, newRow],
        columns: board.columns,
        tasks: [...newTasks, ...board.tasks],
      };

      if (isAuthenticated) {
        await fetch("/api/board", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(merged),
        });
      } else {
        globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(merged));
      }

      // Keep isGenerating true through navigation so the alert stays visible.
      globalThis.location.href = "/dashboard";
    } catch (err) {
      console.error(err);
      setError(`Unable to generate tasks. ${err}`);
      setIsGenerating(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="join join-vertical gap-3 md:gap-0 md:join-horizontal">
        <label className="input input-lg input-warning join-item md:rounded-none md:rounded-l!">
          <span className="iconify hugeicons--ai-magic"></span>
          <span className="relative grow">
            <input
              type="text"
              className="w-full"
              required
              disabled={isGenerating}
              value={value}
              onChange={(e) => setValue(e.currentTarget.value)}
              placeholder="What do you want to do?"
            />
            {!value && (
              <span
                aria-hidden="true"
                className="fake-cursor animate-blink absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none"
              >
                |
              </span>
            )}
          </span>
        </label>
        <button
          type="submit"
          disabled={isGenerating}
          className={`md:rounded-none! md:rounded-r! btn btn-lg btn-warning font-roboto-slab! font-normal text-xl md:self-end inline-flex items-center gap-2 shadow-none${
            isGenerating ? " btn-disabled" : ""
          }`}
        >
          <span className="iconify hugeicons--rocket-01 text-xl"></span>
          Get Started
        </button>
      </div>
      {isGenerating && (
        <div className="mt-3 w-fit">
          <GeneratingTasksAlert status={status} />
        </div>
      )}
      {error && (
        <div role="alert" className="alert alert-error mt-3 w-fit">
          <span className="iconify hugeicons--alert-02 text-xl"></span>
          <span>{error}</span>
        </div>
      )}
    </form>
  );
}
