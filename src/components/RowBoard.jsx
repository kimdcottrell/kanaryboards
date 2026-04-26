import RowSection from "./RowSection.jsx";
import { useBoard } from "./context/useBoard.ts";

export default function RowBoard() {
  const { rows } = useBoard();

  return (
    <div className="space-y-10">
      {rows.map((row) => <RowSection key={row.id} row={row} />)}
    </div>
  );
}
