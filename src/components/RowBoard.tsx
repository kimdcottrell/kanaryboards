import RowSection from "./RowSection.tsx";
import CondensedColumnBoard from "./CondensedColumnBoard.tsx";
import CreateRowSection from "./config/board/CreateRowSection.tsx";
import { useBoardDataState, useColumnFilterState } from "./context/hooks.ts";

export default function RowBoard() {
  const { rows, columns } = useBoardDataState();
  const { selectedColumnIds } = useColumnFilterState();

  // No projects yet -> prompt the user to create their first row inline.
  if (rows.length === 0) {
    return (
      <div className="z-1 relative h-screen flex flex-col items-center justify-center">
        <div className="z-2 absolute w-full top-0 left-0 min-h-screen h-full pink-purple-gradient">
        </div>
        <div className="z-3 relative w-11/12 max-w-5xl space-y-6">
          <h1 className="text-5xl text-base-content text-center font-roboto-slab">
            Your dashboard is empty.
          </h1>
          <p className="text-xl text-base-content text-center">
            Create your first project to get started.
          </p>

          <CreateRowSection />
        </div>
      </div>
    );
  }

  const selectedColumns = columns.filter((c) =>
    selectedColumnIds.includes(c.id)
  );

  // Exactly one column selected -> pivot: a single column-titled section where
  // each project row becomes a horizontal column.
  if (selectedColumns.length === 1) {
    return <CondensedColumnBoard column={selectedColumns[0]} rows={rows} />;
  }

  // 0 selected (all columns) or >=2 selected (filtered normal layout).
  return (
    <>
      {rows.map((row) => <RowSection key={row.id} row={row} />)}
    </>
  );
}
