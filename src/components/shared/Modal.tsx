import CloseButton from "./CloseButton.tsx";

export default function Modal({ open, onClose, children }) {
  return (
    <dialog className={`modal${open ? " modal-open" : ""}`}>
      <div className="p-2 md:p-6 sm:min-w-[98%] md:min-w-[85%] max-h-11/12 modal-box relative text-left">
        <CloseButton
          onClick={onClose}
          className="absolute right-2 md:right-6 top-2 md:top-6"
        />

        <div className="w-full">{children}</div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}
