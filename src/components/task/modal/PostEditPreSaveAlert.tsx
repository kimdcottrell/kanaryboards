import { useMemo } from "react";
import { readEditDraft } from "../editDraftStore.ts";

// Shown in TaskEditModal when the task has changes that were closed without
// saving (see editDraftStore) and have been restored into the form.
export default function PostEditPreSaveAlert({ taskId }: { taskId: string }) {
  // Read once per opened task, so the alert reflects the stored changes that
  // were restored into the draft (see startEditTask).
  const lastEditedAt = useMemo(
    () => readEditDraft(taskId)?.updatedAt,
    [taskId],
  );
  if (lastEditedAt === undefined) return null;

  return (
    <div
      role="alert"
      className="mt-4 alert alert-soft border border-warning/50 alert-warning w-full md:mx-0"
    >
      <span className="iconify hugeicons--edit-01 text-xl"></span>
      <span>
        Warning: This was last edited on{" "}
        {new Date(lastEditedAt).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })}. Changes must be saved to be preserved.
      </span>
    </div>
  );
}
