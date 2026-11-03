import type { ReactNode } from "react";

// A centered dock that floats over the bottom of a scrolling modal. Sticky,
// so it overlays content while scrolling; its in-flow height leaves a
// dock-sized gap once you reach the bottom. Holds a task modal's
// Trash/Cancel/Submit buttons; submit buttons reach their form via `form`.
export default function ActionsDock(
  { children, className = "" }: { children: ReactNode; className?: string },
) {
  return (
    <div
      className={`sticky bottom-2 mt-3 flex justify-center pointer-events-none ${className}`}
    >
      <div
        className="flex gap-2 p-1 rounded-box bg-base-200 border border-base-content/10 shadow-sm shadow-base-900/5 pointer-events-auto empty:hidden"
        data-testid="task-actions-dock"
      >
        {children}
      </div>
    </div>
  );
}
