import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ExtensiveEditorRef } from "@lyfie/luthor";
import { $userStore } from "@clerk/astro/client";
import { hasLexicalText } from "@lib/lexical.ts";
import CommentEditor from "./CommentEditor.tsx";
import CommentItem from "./CommentItem.tsx";
import { useTaskComments } from "./useTaskComments.ts";

const MOBILE_VISIBLE_COMMENTS = 3;
const DESKTOP_QUERY = "(min-width: 768px)"; // Tailwind `md`

const subscribeUser = (onChange: () => void) => $userStore.listen(onChange);
const getUser = () => $userStore.get();

// Below `md`, cap the list at the height of its first 3 comments so the rest
// scroll. Comments vary in height, so this is measured rather than fixed, and
// re-measured whenever the list's content or the viewport size changes.
function useMobileListCap(count: number) {
  const listRef = useRef<HTMLUListElement>(null);
  const [maxHeight, setMaxHeight] = useState<number | undefined>();

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const desktop = matchMedia(DESKTOP_QUERY);
    const measure = () => {
      const last = list.children[MOBILE_VISIBLE_COMMENTS - 1] as
        | HTMLElement
        | undefined;
      if (desktop.matches || count <= MOBILE_VISIBLE_COMMENTS || !last) {
        setMaxHeight(undefined);
        return;
      }
      // Offsets, not getBoundingClientRect: the modal's open animation scales
      // it with a transform, which bounding rects include but ResizeObserver
      // never reports. Both share the aside as offsetParent.
      setMaxHeight(last.offsetTop + last.offsetHeight - list.offsetTop);
    };
    measure();
    const observer = new ResizeObserver(measure);
    for (const child of Array.from(list.children)) observer.observe(child);
    desktop.addEventListener("change", measure);
    return () => {
      observer.disconnect();
      desktop.removeEventListener("change", measure);
    };
  }, [count]);

  return { listRef, maxHeight };
}

// Edit-modal comments. One render serves both layouts: on desktop the aside's
// inner wrapper is absolutely positioned to fill the sidebar column (so the
// form, not the comments, decides the modal's height), the list scrolls, and
// the composer is pinned to the bottom. On mobile it stacks below the form.
export default function TaskComments({ taskId }: { taskId: string }) {
  const { comments, loading, error, add, edit, remove } = useTaskComments(
    taskId,
  );
  const user = useSyncExternalStore(subscribeUser, getUser, () => null);
  const editorRef = useRef<ExtensiveEditorRef | null>(null);
  const [composerKey, setComposerKey] = useState(0);
  const [posting, setPosting] = useState(false);
  const { listRef, maxHeight } = useMobileListCap(comments.length);

  const post = async () => {
    if (posting) return;
    const content = editorRef.current?.getJSON() ?? "";
    if (!hasLexicalText(content)) return;
    setPosting(true);
    const ok = await add({
      content,
      authorName: user?.fullName || user?.username || "You",
      authorImageUrl: user?.imageUrl ?? null,
    });
    setPosting(false);
    if (ok) setComposerKey((k) => k + 1);
  };

  return (
    <aside
      className="relative mt-6 md:mt-5 pt-6 md:pt-0 border-t md:border-t-0 md:border-l border-base-content/20 md:min-h-[min(24rem,70vh)]"
      aria-label="Comments"
      data-testid="task-comments"
    >
      <div className="md:absolute md:inset-0 md:pl-6 flex flex-col gap-3">
        <h4 className="font-semibold shrink-0">
          Comments{comments.length > 0 && ` (${comments.length})`}
        </h4>

        {comments.length > 0
          ? (
            <ul
              ref={listRef}
              className="flex flex-col gap-4 overflow-y-auto md:flex-1 md:min-h-0 pr-1"
              style={{ maxHeight }}
              data-testid="comment-list"
            >
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onEdit={(content) => edit(comment, content)}
                  onDelete={() => remove(comment)}
                />
              ))}
            </ul>
          )
          : (
            <p className="md:flex-1 text-sm text-base-content/60">
              {loading ? "Loading..." : "No comments yet."}
            </p>
          )}
        {error && <p className="text-sm text-error" role="alert">{error}</p>}

        <div className="shrink-0" data-testid="comment-composer">
          {/* Enter posts, Shift+Enter is a newline. Capture phase so the
              editor never sees the Enter; toolbar inputs (link URL) and IME
              composition keep their own Enter handling. */}
          <div
            className="border border-base-content/20 rounded-lg overflow-hidden"
            onKeyDownCapture={(e) => {
              if (
                e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing ||
                e.target instanceof HTMLInputElement
              ) return;
              e.preventDefault();
              e.stopPropagation();
              post();
            }}
          >
            <CommentEditor
              key={composerKey}
              onReady={(methods) => {
                editorRef.current = methods;
              }}
            />
          </div>
          <div className="flex justify-end mt-2">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={post}
              disabled={posting}
            >
              Comment
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
