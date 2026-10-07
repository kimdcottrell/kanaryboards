import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../../shared/Modal.tsx";
import ActionsDock from "./ActionsDock.tsx";
import { preventEdits } from "@lib/dashboard/view-only.ts";
import { useTaskActions } from "../../context/hooks.ts";

// An existing task's modal lives at /dashboard/task/:id, so every way out of
// it (close, save, trash, restore, delete) also returns to /dashboard.
export function useCloseTaskDetails() {
  const navigate = useNavigate();
  const { cancelEditTask } = useTaskActions();
  const closeAfter =
    <A extends unknown[]>(fn: (...args: A) => void) => (...args: A) => {
      fn(...args);
      navigate("/dashboard");
    };
  return { close: closeAfter(cancelEditTask), closeAfter };
}

// Shell for an existing task (TaskEditModal / TaskViewOnlyModal). `viewOnly`
// blocks edits to everything but the dock's buttons.
export default function ExistingTaskModalWrapper({
  open,
  viewOnly = false,
  title,
  comments,
  actions,
  children,
}: {
  open: boolean;
  viewOnly?: boolean;
  title?: ReactNode;
  comments?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const { close } = useCloseTaskDetails();
  const lock = viewOnly ? preventEdits : {};

  return (
    <Modal open={open} onClose={close} boxClassName="md:overflow-hidden">
      {
        /* Desktop: below the full-width title input, the body (70%) and
          comments sidebar (30%) sit side by side, each scrolling on its own.
          The max height mirrors the modal box's max-h-11/12 minus its md:p-6
          padding. The buttons float in a centered dock over the bottom:
          pinned over the body column on desktop (whose md:pb-16 keeps its end
          clear of it), sticky in the scrolling modal on mobile. Mobile: one
          column, comments after the body. */
      }
      <div className="grid md:grid-cols-[7fr_3fr] md:grid-rows-[auto_minmax(0,1fr)] md:relative md:gap-x-6 md:max-h-[calc(100dvh*11/12-3rem)]">
        <div className="pr-10 md:col-span-2" {...lock}>{title}</div>
        <div
          className="md:overflow-y-auto md:min-h-0 md:pr-2 md:pb-16"
          {...lock}
        >
          {children}
        </div>
        {comments && <div className="contents" {...lock}>{comments}</div>}
        <ActionsDock className="md:absolute md:inset-x-0 md:bottom-0 md:mt-0">
          {actions}
        </ActionsDock>
      </div>
    </Modal>
  );
}
