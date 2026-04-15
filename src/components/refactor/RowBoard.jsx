import RowSection from "./RowSection";

export default function RowBoard({ board }) {
  console.log("[DEBUG] RowBoard rendered - rows:", board.rows.length);
  const { rows } = board;

  return (
    <div class="space-y-10">
      {rows.map((row) => <RowSection key={row.id} row={row} board={board} />)}
    </div>
  );
}
