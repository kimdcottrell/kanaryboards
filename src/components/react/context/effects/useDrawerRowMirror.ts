import { useEffect } from "react";
import type { Row } from "../types.ts";
import { byOrder } from "../ordering.ts";

// DrawerMenu.astro renders its row list outside this React island (an Astro
// server island, hydrated once at load), so it never learns about client-side
// row changes on its own. Mirror rows into its DOM here instead.
// boardId === "demo": these rows are the landing-page demo board, not the
// visitor's real rows — never let them overwrite the shared drawer.
export function useDrawerRowMirror(
  rows: Row[],
  boardLoaded: boolean,
  boardId: string | undefined,
) {
  useEffect(() => {
    if (boardId === "demo") return;
    if (!boardLoaded) return;
    const list = document.getElementById("drawer-row-list");
    if (!list) return;
    list.replaceChildren(
      ...[...rows].sort(byOrder).map((row) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = `/dashboard/row/${row.id}`;
        a.dataset.boardLink = "";
        a.textContent = row.title;
        li.appendChild(a);
        return li;
      }),
    );
  }, [rows, boardLoaded, boardId]);
}
