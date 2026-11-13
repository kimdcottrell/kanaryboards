// Shown when the task open in the modal was saved elsewhere (another device,
// another tab, the kanby CLI), which closed the modal and discarded its
// unsaved edits.
export default function EditDiscardedAlert(
  { onDismiss }: { onDismiss: () => void },
) {
  return (
    <div
      id="edit-discarded-alert"
      role="alert"
      className="alert alert-info fixed inset-x-0 top-15.25 z-50 mx-auto w-11/12 max-w-2xl shadow-lg"
    >
      <span className="iconify hugeicons--information-circle text-xl" />
      <span>
        <strong>This task was changed elsewhere.</strong>{" "}
        It was saved from another device, tab, or the CLI, so your unsaved edits
        were discarded.
      </span>
      <button
        type="button"
        aria-label="Dismiss"
        className="btn btn-ghost btn-sm btn-circle text-info-content"
        onClick={onDismiss}
      >
        ✕
      </button>
    </div>
  );
}
