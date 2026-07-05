import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { BoardProvider } from "./context/BoardContext.tsx";
import { router } from "@lib/spa-router.ts";

export default function BoardController(
  { boardId, isAuthenticated }: { boardId: string; isAuthenticated: boolean },
) {
  // Route drawer row links (marked data-board-link) through React Router so
  // navigating to a row on the dashboard doesn't trigger a full page reload.
  // The drawer lives outside this island, so we delegate from document.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented || e.button !== 0 ||
        e.metaKey || e.ctrlKey || e.shiftKey || e.altKey
      ) return;
      const anchor = (e.target as Element).closest?.("a[data-board-link]");
      if (!anchor) return;
      const url = new URL((anchor as HTMLAnchorElement).href);
      if (url.origin !== location.origin) return;
      e.preventDefault();
      router.navigate(url.pathname + url.search);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <BoardProvider boardId={boardId} isAuthenticated={isAuthenticated}>
      <RouterProvider router={router} />
    </BoardProvider>
  );
}
