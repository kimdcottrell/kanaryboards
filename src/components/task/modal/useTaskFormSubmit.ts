import { useRef } from "react";
import type { SubmitEvent as ReactSubmitEvent } from "react";
import type { ExtensiveEditorRef } from "@lyfie/luthor";

// Submits only from the form's own submit button (editor toolbar buttons sit
// inside the form) and hands over the description editor's JSON. It is
// undefined if the editor isn't ready yet, so the draft's description is kept.
export function useTaskFormSubmit(
  onSubmit: (event: Event, description?: string) => void,
) {
  const editorRef = useRef<ExtensiveEditorRef | null>(null);
  const submitButtonRef = useRef<HTMLButtonElement | null>(null);

  function handleSubmit(e: ReactSubmitEvent<HTMLFormElement>) {
    const submitter = (e.nativeEvent as SubmitEvent)?.submitter;
    if (submitter && submitter !== submitButtonRef.current) {
      e.preventDefault();
      return;
    }
    onSubmit(e.nativeEvent, editorRef.current?.getJSON());
  }

  return {
    handleSubmit,
    submitButtonRef,
    getDescription: () => editorRef.current?.getJSON(),
    onEditorReady: (methods: ExtensiveEditorRef) => {
      editorRef.current = methods;
    },
  };
}
