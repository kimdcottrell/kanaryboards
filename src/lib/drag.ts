// Shared HTML5 drag-and-drop helpers for reordering within a list (tasks in a
// column, items in a checklist).

export type DropPosition = "before" | "after";

export interface DropTarget {
  id: string;
  position: DropPosition;
}

// Whether the cursor is over the top ("before") or bottom ("after") half of the
// element currently under it.
export function dropPositionFromEvent(
  event: { clientY: number; currentTarget: Element },
): DropPosition {
  const rect = event.currentTarget.getBoundingClientRect();
  return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
}

// Resolve the drop target into the id of the item the dragged item should be
// placed before (null = append to the end). `orderedList` must be in display
// order.
export function beforeIdFromOrderedList(
  orderedList: { id: string }[],
  target: DropTarget | null,
): string | null {
  if (!target) return null;
  if (target.position === "before") return target.id;
  const idx = orderedList.findIndex((i) => i.id === target.id);
  return idx !== -1 && idx < orderedList.length - 1
    ? orderedList[idx + 1].id
    : null;
}
