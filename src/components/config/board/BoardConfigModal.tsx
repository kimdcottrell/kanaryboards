import { useEffect } from "react";
import Modal from "../../shared/Modal.tsx";
import ColumnSettingsSection from "./ColumnSettingsSection.tsx";
import RowSettingsSection from "./RowSettingsSection.tsx";
import DangerZoneSection from "./DangerZoneSection.tsx";
import { useBoardConfigActions, useBoardConfigState } from "../../context/hooks.ts";
import { useRenderCount } from "@lib/use-render-count.ts";

export default function BoardConfigModal() {
  const { boardConfigModalOpen, boardConfigScrollTarget } =
    useBoardConfigState();
  const { closeBoardConfigModal } = useBoardConfigActions();
  const renderCount = useRenderCount();

  // When opened with a scroll target (e.g. "Add new column to all rows" jumps to
  // #create-new-column), scroll it into view. The modal is a DaisyUI <dialog>
  // whose children are always mounted; defer one frame so the now-visible dialog
  // is laid out before scrolling. The target only changes on dispatch and is
  // cleared on close, so this fires once per open.
  useEffect(() => {
    if (!boardConfigModalOpen || !boardConfigScrollTarget) return;
    requestAnimationFrame(() => {
      document.getElementById(boardConfigScrollTarget)?.scrollIntoView({
        block: "start",
      });
    });
  }, [boardConfigModalOpen, boardConfigScrollTarget]);

  return (
    <Modal open={boardConfigModalOpen} onClose={closeBoardConfigModal}>
      <div id="board-config" data-render-count={renderCount}>
        <h2 className="text-3xl font-semibold">
          Board Configuration
        </h2>
        <p className="mt-3">
          Add rows and columns, then place tasks into each column. Each task can
          include a title, description, and optional checklist.
        </p>
        <ColumnSettingsSection />
        <RowSettingsSection />
        <DangerZoneSection />
      </div>
    </Modal>
  );
}
