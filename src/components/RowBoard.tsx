import RowSection from "./RowSection.tsx";
import { useBoardDataState } from "./context/hooks.ts";

export default function RowBoard() {
  const { rows } = useBoardDataState();

  return (
    <div className="space-y-10">
      {rows.map((row) => <RowSection key={row.id} row={row} />)}
    </div>
  );
}
