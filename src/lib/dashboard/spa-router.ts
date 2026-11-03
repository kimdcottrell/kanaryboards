import { createBrowserRouter } from "react-router-dom";
import BoardView from "@components/react/BoardView.tsx";

export const router = createBrowserRouter([
  {
    path: "/dashboard",
    Component: BoardView,
  },
  {
    path: "/dashboard/task/:taskId",
    Component: BoardView,
  },
  {
    path: "/dashboard/row/:rowId",
    Component: BoardView,
  },
]);
