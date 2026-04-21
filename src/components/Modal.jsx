export default function Modal({ open, onClose, children }) {
  return (
    <dialog class={`modal${open ? " modal-open" : ""}`}>
      <div class="w-11/12 max-w-5xl modal-box relative">
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
      <div class="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}
