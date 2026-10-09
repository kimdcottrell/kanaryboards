import { useId } from "react";
import { preventEdits } from "@lib/dashboard/view-only.ts";

// "labeled": a fieldset with a visible label (create modal).
// "heading": an unlabeled, heading-styled field above the modal body (edit /
// view-only modals); `form` ties it to the form it sits outside of.
export default function TitleInput({
  variant,
  value,
  onChange,
  form,
  readOnly = false,
}: {
  variant: "labeled" | "heading";
  value: string;
  onChange?: (title: string) => void;
  form?: string;
  readOnly?: boolean;
}) {
  const id = useId();
  const inputProps = {
    id,
    form,
    type: "text",
    value,
    onChange: (e: { currentTarget: HTMLInputElement }) =>
      onChange?.(e.currentTarget.value),
    required: true,
    readOnly,
    ...(readOnly ? preventEdits : {}),
  };

  if (variant === "heading") {
    return (
      <input
        {...inputProps}
        aria-label="Title"
        className="input input-ghost validator w-full px-0 hover:border-base-content/50 text-2xl font-roboto-slab font-semibold"
      />
    );
  }

  return (
    <fieldset className="fieldset">
      <label className="fieldset-legend" htmlFor={id}>Title</label>
      <input
        {...inputProps}
        className="input validator input-bordered w-full"
      />
      <span className="validator-hint hidden">Required</span>
    </fieldset>
  );
}
