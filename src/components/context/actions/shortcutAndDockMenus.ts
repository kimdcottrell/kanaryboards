import { useEffect, useRef } from "react";
import type { MouseEvent } from "react";

import { useBoardDataState, useColumnFilterState } from "../BoardContext.tsx";
import { useBoardConfigActions } from "./boardConfig.ts";
import { useRowFormActions } from "./rowForm.ts";
import { useTaskActions } from "./task.ts";
import { useColumnFilterActions } from "./view.ts";

/**
 * Shared wiring for the board's quick-action surfaces (BoardMenu and
 * BoardDock). Both render the same "Add" menu, Settings button, and
 * column-filter toggles, and both close their dropdown on outside click and
 * suppress interaction while in preview mode. Only the surrounding markup
 * differs, so that stays in each component.
 */
export function useSharedMenuActions(isPreview?: boolean) {
  const { rows, tasks, columns } = useBoardDataState();
  const { openBoardConfigModal } = useBoardConfigActions();
  const { openCreateRowModal } = useRowFormActions();
  const { openTaskForm } = useTaskActions();
  const { selectedColumnIds } = useColumnFilterState();
  const { toggleColumnFilter } = useColumnFilterActions();

  const detailsRef = useRef<HTMLDetailsElement>(null);
  const rowsDetailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: globalThis.MouseEvent) => {
      for (const ref of [detailsRef, rowsDetailsRef]) {
        const details = ref.current;
        if (details?.open && !details.contains(e.target as Node)) {
          details.open = false;
        }
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  const handleClick = (action?: () => void) => (e: MouseEvent) => {
    if (isPreview) {
      e.preventDefault();
      return;
    }
    action?.();
  };

  const addActions = [
    {
      icon: "hugeicons--add-square",
      label: "Create new task",
      run: () => openTaskForm("", ""),
    },
    {
      icon: "hugeicons--row-insert",
      label: "Add new project row",
      run: openCreateRowModal,
    },
    {
      icon: "hugeicons--column-insert",
      label: "Add new column to all rows",
      run: () => openBoardConfigModal("create-new-column"),
    },
  ];

  return {
    rows,
    tasks,
    columns,
    selectedColumnIds,
    toggleColumnFilter,
    openSettings: () => openBoardConfigModal(),
    detailsRef,
    rowsDetailsRef,
    handleClick,
    addActions,
  };
}
