import { ExtensiveEditor } from "@lyfie/luthor";
import type {
  CoreEditorMode,
  ExtensiveEditorRef,
  ToolbarLayout,
} from "@lyfie/luthor";
import { useLuthorTheme } from "../useLuthorTheme.ts";

const MD_TOOLBAR_LAYOUT: ToolbarLayout = {
  sections: [
    { items: ["undo", "redo"] },
    {
      items: [
        "blockFormat",
        "quote",
        "alignLeft",
        "alignCenter",
        "alignRight",
        "alignJustify",
      ],
    },
    { items: ["bold", "italic", "strikethrough", "code", "link"] },
    {
      items: [
        "unorderedList",
        "orderedList",
        "checkList",
        "indentList",
        "outdentList",
      ],
    },
    { items: ["codeBlock", "horizontalRule", "table", "image"] },
    { items: ["themeToggle"] },
  ],
};

export default function DescriptionEditor({
  defaultContent,
  initialMode = "visual-only",
  readOnly = false,
  onReady,
}: {
  defaultContent: string;
  initialMode?: CoreEditorMode;
  readOnly?: boolean;
  onReady?: (methods: ExtensiveEditorRef) => void;
}) {
  const luthorTheme = useLuthorTheme();
  return (
    <fieldset className="fieldset">
      <div className="border border-base-content/20 rounded-lg overflow-hidden">
        <ExtensiveEditor
          className="task-description-editor"
          defaultContent={defaultContent}
          onReady={onReady}
          initialTheme={luthorTheme}
          initialMode={initialMode}
          availableModes={readOnly
            ? ["visual-only"]
            : ["visual-only", "visual-editor", "markdown"]}
          markdownSourceOfTruth
          markdownBridgeFlavor="github"
          sourceMetadataMode="none"
          isListStyleDropdownEnabled={false}
          toolbarLayout={MD_TOOLBAR_LAYOUT}
          featureFlags={{ codeIntelligence: false, iframeEmbed: false }}
        />
      </div>
    </fieldset>
  );
}
