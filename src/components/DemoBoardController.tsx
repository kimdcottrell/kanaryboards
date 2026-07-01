import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { BoardProvider } from "./context/BoardContext.tsx";
import DemoBoardView from "./DemoBoardView.tsx";

const demoRouter = createMemoryRouter(
  [
    { path: "/dashboard", Component: DemoBoardView },
    { path: "/dashboard/task/:taskId", Component: DemoBoardView },
  ],
  { initialEntries: ["/dashboard"] },
);

export default function DemoBoardController() {
  return (
    <BoardProvider boardId="demo" isAuthenticated={false}>
      <RouterProvider router={demoRouter} />
    </BoardProvider>
  );
}
