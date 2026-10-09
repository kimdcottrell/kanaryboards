import { useEffect, useRef, useState } from "react";
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
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Opening in "Task Details" (visual-only) shows only that tab; the other
  // mode tabs appear once the user clicks into the description.
  const [modeTabsRevealed, setModeTabsRevealed] = useState(
    initialMode !== "visual-only",
  );

  // When the user leaves the description, switch back to "Task Details" and
  // hide the other tabs again. Luthor has no mode API, so click its tab.
  useEffect(() => {
    if (initialMode !== "visual-only" || !modeTabsRevealed) return;
    const onOutside = (e: Event) => {
      const target = e.target as Element;
      if (wrapperRef.current?.contains(target)) return;
      // Luthor portals its dropdowns/dialogs to <body>; those still count as
      // inside. Other editors (e.g. comments) don't.
      if (
        target.closest?.('[class*="luthor-"]') &&
        !target.closest(".luthor-editor-wrapper")
      ) return;
      wrapperRef.current
        ?.querySelector<HTMLButtonElement>(
          ".luthor-mode-tab:first-child:not(.active)",
        )
        ?.click();
      setModeTabsRevealed(false);
    };
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("focusin", onOutside);
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("focusin", onOutside);
    };
  }, [initialMode, modeTabsRevealed]);

  return (
    <fieldset className="fieldset">
      <div
        ref={wrapperRef}
        className="border border-base-content/20 rounded-lg overflow-hidden"
        onFocus={() => setModeTabsRevealed(true)}
      >
        <ExtensiveEditor
          className={modeTabsRevealed
            ? "task-description-editor"
            : "task-description-editor task-description-editor--tabs-hidden"}
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
          featureFlags={{
            codeIntelligence: true,
            iframeEmbed: false,
            draggableBlock: false,
          }}
        />
      </div>
    </fieldset>
  );
}
