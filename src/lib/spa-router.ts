import { createBrowserRouter } from "react-router-dom";
import BoardView from "@components/BoardView.tsx";

export const router = createBrowserRouter([
  {
    path: "/dashboard",
    Component: BoardView,
  },
  {
    path: "/dashboard/task/:taskId",
    Component: BoardView,
  },
]);
