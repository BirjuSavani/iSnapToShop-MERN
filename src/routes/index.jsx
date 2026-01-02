import { createBrowserRouter } from "react-router-dom";
import Home from "../pages/Home/Home";
import NotFound from "../pages/NotFound/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/:application_id/:company_id",
    element: <Home />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);
