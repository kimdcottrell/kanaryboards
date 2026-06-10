import { createBrowserRouter } from "react-router-dom";
import BoardView from "@components/BoardView.tsx";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: BoardView,
  },
  {
    path: "/task/:taskId",
    Component: BoardView,
  },
]);
