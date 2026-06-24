import { useBoardLifecycleActions } from "../../context/hooks.ts";

export default function DangerZoneSection() {
  const { confirmResetBoard } = useBoardLifecycleActions();

  return (
    <div id="board-config-danger-zone" className="mt-6 bg-base-200 p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">D-D-D-Danger Zone</h3>
        <p className="text-sm">
          These are changes you cannot undo! Be careful.
        </p>
      </div>
      <button
        type="button"
        className="btn btn-error"
        onClick={confirmResetBoard}
      >
        Reset Board
      </button>
    </div>
  );
}
