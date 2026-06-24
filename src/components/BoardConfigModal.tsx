import Modal from "./Modal.tsx";
import CreateRowSection from "./config/board/CreateRowSection.tsx";
import ColumnSettingsSection from "./config/board/ColumnSettingsSection.tsx";
import RowSettingsSection from "./config/board/RowSettingsSection.tsx";
import DangerZoneSection from "./config/board/DangerZoneSection.tsx";
import { useBoardConfigActions, useBoardConfigState } from "./context/hooks.ts";
import { useRenderCount } from "@lib/use-render-count.ts";

export default function BoardConfigModal() {
  const { boardConfigModalOpen } = useBoardConfigState();
  const { closeBoardConfigModal } = useBoardConfigActions();
  const renderCount = useRenderCount();

  return (
    <Modal open={boardConfigModalOpen} onClose={closeBoardConfigModal}>
      <div id="board-config" data-render-count={renderCount}>
        <h2 className="text-3xl font-semibold">
          Board Configuration
        </h2>
        <p className="mt-3">
          Add rows and columns, then place tasks into each column. Each task
          can include a title, description, and optional checklist.
        </p>
        <CreateRowSection />
        <ColumnSettingsSection />
        <RowSettingsSection />
        <DangerZoneSection />
      </div>
    </Modal>
  );
}
