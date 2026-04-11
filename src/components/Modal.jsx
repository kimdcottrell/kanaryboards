export default function Modal({ open, onClose, children }) {
  if (!open) return null;

  return (
    <div class="modal modal-open">
      <div class="modal-box relative">
        <button
          type="button"
          class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={onClose}
          aria-label="Close modal"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
