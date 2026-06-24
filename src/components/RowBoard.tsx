import RowSection from "./RowSection.tsx";
import { useBoardDataState } from "./context/hooks.ts";

export default function RowBoard() {
  const { rows } = useBoardDataState();

  return (
    <>
      {rows.map((row) => <RowSection key={row.id} row={row} />)}
    </>
  );
}
