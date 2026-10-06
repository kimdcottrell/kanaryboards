import { useCallback, useEffect, useState } from "react";
import { useBoardMeta } from "../context/hooks.ts";
import type { TaskComment } from "../context/types.ts";
import {
  byNewest,
  createComment,
  deleteComment,
  listComments,
  type NewComment,
  updateComment,
} from "./commentStore.ts";

// Comments are local to the open task's modal, not board reducer state: they
// save immediately through commentStore and never trigger the board autosave.
export function useTaskComments(taskId: string) {
  const { boardId, isAuthenticated } = useBoardMeta();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listComments({ boardId, isAuthenticated }, taskId)
      .then((list) => {
        if (!cancelled) setComments(list);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load comments.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [boardId, isAuthenticated, taskId]);

  // Each mutation resolves to whether it succeeded, so callers can keep the
  // editor's contents when it didn't.
  const run = useCallback(
    async (fn: () => Promise<void>, failure: string): Promise<boolean> => {
      setError(null);
      try {
        await fn();
        return true;
      } catch {
        setError(failure);
        return false;
      }
    },
    [],
  );

  const target = { boardId, isAuthenticated };

  return {
    comments,
    loading,
    error,
    add: (input: NewComment) =>
      run(async () => {
        const created = await createComment(target, taskId, input);
        setComments((prev) => [created, ...prev].sort(byNewest));
      }, "Couldn't post comment."),
    edit: (comment: TaskComment, content: string) =>
      run(async () => {
        const updated = await updateComment(target, comment, content);
        setComments((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
      }, "Couldn't save comment."),
    remove: (comment: TaskComment) =>
      run(async () => {
        await deleteComment(target, comment);
        setComments((prev) => prev.filter((c) => c.id !== comment.id));
      }, "Couldn't delete comment."),
  };
}
