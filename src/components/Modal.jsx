import CloseButton from "./buttons/CloseButton.tsx";

export default function Modal({ open, onClose, children }) {
  return (
    <dialog className={`modal${open ? " modal-open" : ""}`}>
      <div className="w-[90vw] h-[90vh] max-w-none modal-box relative text-left overflow-hidden flex flex-col">
        <CloseButton
          onClick={onClose}
          className="absolute right-6 top-6"
        />

        <div className="w-full flex-1 min-h-0">{children}</div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}
