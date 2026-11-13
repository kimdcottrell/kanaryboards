// Shown when an autosave lost a race with a write made elsewhere (another
// device, another tab, the kanby CLI) and some of this tab's changes were
// replaced by the server's version.
export default function SaveConflictAlert(
  { onDismiss }: { onDismiss: () => void },
) {
  return (
    <div
      id="save-conflict-alert"
      role="alert"
      className="alert alert-warning fixed inset-x-0 top-4 z-50 mx-auto w-11/12 max-w-2xl shadow-lg"
    >
      <span className="iconify hugeicons--alert-02 text-xl" />
      <span>
        <strong>Some of your changes were replaced.</strong>{" "}
        They were also changed elsewhere (another device or the CLI), and that
        version was kept.
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
