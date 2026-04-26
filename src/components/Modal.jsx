import CloseButton from "./buttons/CloseButton.tsx";

export default function Modal({ open, onClose, children }) {
  return (
    <dialog class={`modal${open ? " modal-open" : ""}`}>
      <div class="w-11/12 max-h-11/12 max-w-5xl modal-box modal-middle relative">
        <CloseButton
          onClick={onClose}
          tooltip="Close modal"
          tooltipPosition="left"
          class="absolute right-6 top-6"
        />

        {children}
      </div>
      <div class="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}
