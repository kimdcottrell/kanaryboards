import { ExtensiveEditor } from "@lyfie/luthor";
import type { ExtensiveEditorRef, ToolbarLayout } from "@lyfie/luthor";
import { useLuthorTheme } from "../useLuthorTheme.ts";

const COMMENT_TOOLBAR_LAYOUT: ToolbarLayout = {
  sections: [
    { items: ["bold", "italic", "strikethrough", "code", "link"] },
    { items: ["unorderedList", "orderedList"] },
  ],
};

// A compact Luthor editor for writing comments. With `readOnly` it renders a
// saved comment: no toolbar, no mode tabs, not editable.
export default function CommentEditor({
  defaultContent,
  onReady,
  readOnly = false,
}: {
  defaultContent?: string;
  onReady?: (methods: ExtensiveEditorRef) => void;
  readOnly?: boolean;
}) {
  const luthorTheme = useLuthorTheme();
  return (
    <ExtensiveEditor
      className={readOnly
        ? "comment-editor comment-editor--readonly"
        : "comment-editor"}
      defaultContent={defaultContent}
      onReady={onReady}
      initialTheme={luthorTheme}
      initialMode={readOnly ? "visual-only" : "visual-editor"}
      availableModes={readOnly ? ["visual-only"] : ["visual-editor"]}
      isEditorViewTabsVisible={false}
      isToolbarEnabled={!readOnly}
      editOnClick={false}
      isDraggableBoxEnabled={false}
      placeholder={readOnly ? undefined : "Write a comment..."}
      markdownSourceOfTruth
      markdownBridgeFlavor="github"
      sourceMetadataMode="none"
      isListStyleDropdownEnabled={false}
      toolbarLayout={COMMENT_TOOLBAR_LAYOUT}
      featureFlags={{ codeIntelligence: false, iframeEmbed: false }}
    />
  );
}
