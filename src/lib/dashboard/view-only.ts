import type { KeyboardEvent, SyntheticEvent } from "react";

const block = (e: SyntheticEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

// Spread on a wrapper to make everything inside it view-only (e.g. a trashed
// task in the edit modal). Capture-phase, so it runs before any handler inside.
// Tab and Escape pass through so focus navigation and closing the modal work.
export const preventEdits = {
  onClickCapture: block,
  onKeyDownCapture: (e: KeyboardEvent) => {
    if (e.key !== "Tab" && e.key !== "Escape") block(e);
  },
  onBeforeInputCapture: block,
  onPasteCapture: block,
  onDropCapture: block,
  onDragStartCapture: block,
};
