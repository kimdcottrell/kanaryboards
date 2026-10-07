import { useRef, useState } from "react";
import type { ExtensiveEditorRef } from "@lyfie/luthor";
import type { TaskComment } from "../../context/types.ts";
import { hasLexicalText } from "@lib/lexical.ts";
import CommentEditor from "./CommentEditor.tsx";

const timeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

function relativeTime(iso: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      return timeFormat.format(Math.round(seconds / size), unit);
    }
  }
  return "just now";
}

export default function CommentItem({
  comment,
  onEdit,
  onDelete,
}: {
  comment: TaskComment;
  onEdit: (content: string) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "confirmDelete">("view");
  const [busy, setBusy] = useState(false);
  const editorRef = useRef<ExtensiveEditorRef | null>(null);

  const save = async () => {
    const content = editorRef.current?.getJSON() ?? "";
    if (!hasLexicalText(content)) return;
    setBusy(true);
    if (await onEdit(content)) setMode("view");
    setBusy(false);
  };

  const remove = async () => {
    setBusy(true);
    if (!(await onDelete())) {
      setBusy(false);
      setMode("view");
    }
  };

  // daisyUI chat layout: avatar | header (name + time) / bubble / footer.
  // The footer holds the edit/delete controls (or the edit/delete prompts).
  return (
    <li className="chat chat-start shrink-0" data-testid="comment">
      <div className="chat-image avatar avatar-placeholder">
        <div className="w-10 rounded-full bg-neutral text-neutral-content">
          {comment.authorImageUrl
            ? <img src={comment.authorImageUrl} alt="" />
            : <span className="iconify hugeicons--user-circle text-2xl"></span>}
        </div>
      </div>
      <div className="chat-header">
        {comment.authorName}
        <time
          dateTime={comment.createdAt}
          title={new Date(comment.createdAt).toLocaleString()}
          className="text-xs opacity-50"
        >
          {relativeTime(comment.createdAt)}
        </time>
      </div>

      {mode === "edit"
        ? (
          <div className="chat-bubble w-full p-0 overflow-hidden">
            <CommentEditor
              defaultContent={comment.content}
              onReady={(methods) => {
                editorRef.current = methods;
              }}
            />
          </div>
        )
        : (
          <div className="chat-bubble text-sm" data-testid="comment-body">
            <CommentEditor
              key={comment.updatedAt ?? comment.createdAt}
              defaultContent={comment.content}
              readOnly
            />
          </div>
        )}

      <div className="chat-footer flex items-center gap-1 mt-1">
        {mode === "view" && (
          <>
            {comment.updatedAt && (
              <span className="text-xs opacity-50 mr-1">(edited)</span>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-square tooltip opacity-60 hover:opacity-100"
              data-tip="Edit comment"
              aria-label="Edit comment"
              onClick={() => setMode("edit")}
            >
              <span className="iconify hugeicons--pencil-edit-02 text-sm">
              </span>
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-square tooltip opacity-60 hover:opacity-100"
              data-tip="Delete comment"
              aria-label="Delete comment"
              onClick={() => setMode("confirmDelete")}
            >
              <span className="iconify hugeicons--delete-02 text-sm"></span>
            </button>
          </>
        )}
        {mode === "edit" && (
          <>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setMode("view")}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-success btn-xs"
              onClick={save}
              disabled={busy}
            >
              Save
            </button>
          </>
        )}
        {mode === "confirmDelete" && (
          <>
            <span className="text-xs mr-1 whitespace-nowrap">Delete?</span>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setMode("view")}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-error btn-xs"
              onClick={remove}
              disabled={busy}
            >
              Delete
            </button>
          </>
        )}
      </div>
    </li>
  );
}
