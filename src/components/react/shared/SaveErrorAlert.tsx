// Same alert as SPA.astro's ?unauthorized=1 one, shown when the server rejects
// a board autosave.
export default function SaveErrorAlert(
  { onDismiss }: { onDismiss: () => void },
) {
  return (
    <div
      id="save-error-alert"
      role="alert"
      className="alert alert-error fixed inset-x-0 top-4 z-50 mx-auto w-11/12 max-w-2xl shadow-lg"
    >
      <span className="iconify hugeicons--alert-02 text-xl" />
      <span>
        <strong>Your changes could not be saved.</strong>{" "}
        The server rejected them. Reloading or leaving this page will lose them.
        Try again momentarily, and if the problem persists, please contact
        support.
      </span>
      <button
        type="button"
        aria-label="Dismiss"
        className="btn btn-ghost btn-sm btn-circle"
        onClick={onDismiss}
      >
        ✕
      </button>
    </div>
  );
}
