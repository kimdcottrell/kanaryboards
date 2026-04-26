import CloseButton from "./buttons/CloseButton.tsx";

export default function Modal({ open, onClose, children }) {
  return (
    <dialog className={`modal${open ? " modal-open" : ""}`}>
      <div className="w-11/12 max-h-11/12 max-w-5xl modal-box modal-middle relative">
        <CloseButton
          onClick={onClose}
          className="absolute right-6 top-6"
        />

        {children}
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}
