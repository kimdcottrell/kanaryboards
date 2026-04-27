import CloseButton from "./buttons/CloseButton.tsx";

export default function Modal({ open, onClose, children }) {
  return (
    <dialog className={`modal${open ? " modal-open" : ""}`}>
      <div className="w-[95%] md:w-[80%] lg:w-[70%] max-w-5xl max-h-11/12 modal-box relative text-left">
        <CloseButton
          onClick={onClose}
          className="absolute right-6 top-6"
        />

        <div className="w-full">{children}</div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}
