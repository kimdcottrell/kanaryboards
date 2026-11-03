import Modal from "@components/react/shared/Modal.tsx";
import CreateRowSection from "./CreateRowSection.tsx";
import {
  useRowFormActions,
  useRowFormState,
} from "@components/react/context/hooks.ts";

export default function CreateRowModal() {
  const { createRowModalOpen } = useRowFormState();
  const { closeCreateRowModal } = useRowFormActions();

  return (
    <Modal open={createRowModalOpen} onClose={closeCreateRowModal}>
      <h2 className="text-3xl font-semibold">Add a project row</h2>
      <CreateRowSection />
    </Modal>
  );
}
