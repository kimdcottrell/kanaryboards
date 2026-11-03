import { useId } from "react";
import { preventEdits } from "@lib/dashboard/view-only.ts";

// "labeled": a fieldset with a visible label (create modal).
// "heading": an unlabeled, heading-styled field above the modal body (edit /
// view-only modals); `form` ties it to the form it sits outside of.
// `error` is the save's validation message for the title, if any.
export default function TitleInput({
  variant,
  value,
  onChange,
  form,
  readOnly = false,
  error,
}: {
  variant: "labeled" | "heading";
  value: string;
  onChange?: (title: string) => void;
  form?: string;
  readOnly?: boolean;
  error?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const inputProps = {
    id,
    form,
    value,
    // Titles are single-line; flatten newlines pasted into the textarea.
    onChange: (e: { currentTarget: HTMLInputElement | HTMLTextAreaElement }) =>
      onChange?.(e.currentTarget.value.replace(/\r?\n/g, " ")),
    readOnly,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? errorId : undefined,
    ...(readOnly ? preventEdits : {}),
  };
  const errorText = error && (
    <span id={errorId} className="text-error text-sm">{error}</span>
  );

  if (variant === "heading") {
    // A textarea so long titles wrap; field-sizing-content grows it to fit.
    // Enter submits the form, as it would from a single-line input.
    return (
      <>
        <textarea
          {...inputProps}
          rows={1}
          aria-label="Title"
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
            e.preventDefault();
            if (!readOnly) e.currentTarget.form?.requestSubmit();
          }}
          className={`textarea py-0 textarea-ghost -mx-2 w-[calc(100%+1rem)] min-h-0 px-2 rounded resize-none field-sizing-content border-none text-2xl font-roboto-slab font-semibold ${
            readOnly ? "" : "hover:bg-base-content/20"
          }${error ? " text-error" : ""}`}
        />
        {errorText}
      </>
    );
  }

  return (
    <fieldset className="fieldset">
      <label className="fieldset-legend" htmlFor={id}>Title</label>
      <input
        {...inputProps}
        type="text"
        className={`input input-bordered w-full${error ? " input-error" : ""}`}
      />
      {errorText}
    </fieldset>
  );
}
