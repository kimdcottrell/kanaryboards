import type { Ref } from "react";

// A centered dock that floats over the bottom of a scrolling modal. Sticky,
// so it overlays content while scrolling; its in-flow height leaves a
// dock-sized gap once you reach the bottom. Pass the element (via a state
// setter ref) to TaskForm's `actionsContainer` so the form's
// Delete/Cancel/Submit buttons render inside it.
export default function ActionsDock(
  { ref, className = "" }: { ref: Ref<HTMLDivElement>; className?: string },
) {
  return (
    <div
      className={`sticky bottom-2 mt-3 flex justify-center pointer-events-none ${className}`}
    >
      <div
        ref={ref}
        className="flex gap-2 p-1 rounded-box bg-base-200 border border-base-content/10 shadow-sm shadow-base-900/5 pointer-events-auto empty:hidden"
        data-testid="task-actions-dock"
      />
    </div>
  );
}
