import { useRef, useState } from "react";
import type { SubmitEvent as ReactSubmitEvent } from "react";
import type { ExtensiveEditorRef } from "@lyfie/luthor";
import type { FieldError } from "../../context/actions/shared.ts";

// Submits only from the form's own submit button (editor toolbar buttons sit
// inside the form) and hands over the description editor's JSON. It is
// undefined if the editor isn't ready yet, so the draft's description is kept.
// The last submit's validation error is cleared on the next submit.
export function useTaskFormSubmit(
  onSubmit: (event: Event, description?: string) => Promise<FieldError | null>,
) {
  const editorRef = useRef<ExtensiveEditorRef | null>(null);
  const submitButtonRef = useRef<HTMLButtonElement | null>(null);
  const [error, setError] = useState<FieldError | null>(null);

  function handleSubmit(e: ReactSubmitEvent<HTMLFormElement>) {
    const submitter = (e.nativeEvent as SubmitEvent)?.submitter;
    if (submitter && submitter !== submitButtonRef.current) {
      e.preventDefault();
      return;
    }
    setError(null);
    onSubmit(e.nativeEvent, editorRef.current?.getJSON()).then(setError);
  }

  // Fields with their own error slot (TitleInput, StatusSteps, ProjectMenu);
  // any other error (description, checklist, unreachable) shows as formError.
  const errorFor = (field: "title" | "colId" | "rowId") =>
    error?.field === field ? error.error : undefined;
  const formError =
    error && !["title", "colId", "rowId"].includes(error.field ?? "")
      ? error.error
      : undefined;

  return {
    handleSubmit,
    submitButtonRef,
    errorFor,
    formError,
    getDescription: () => editorRef.current?.getJSON(),
    onEditorReady: (methods: ExtensiveEditorRef) => {
      editorRef.current = methods;
    },
  };
}
