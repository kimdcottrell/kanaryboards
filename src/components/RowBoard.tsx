import RowSection from "./RowSection.tsx";
import CondensedColumnBoard from "./CondensedColumnBoard.tsx";
import { useBoardDataState, useColumnFilterState } from "./context/hooks.ts";

export default function RowBoard() {
  const { rows, columns } = useBoardDataState();
  const { selectedColumnIds } = useColumnFilterState();

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
