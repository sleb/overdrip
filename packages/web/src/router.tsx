import { createBrowserRouter } from "react-router-dom";
import Layout from "./components/layout";
import { ProtectedRoute } from "./lib/auth-utils";
import Dashboard from "./pages/dashboard";
import Login from "./pages/login";
import NotFound from "./pages/not-found";
import RegisterDevice from "./pages/register-device";

export const routes = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "/",
            element: <Dashboard />,
          },
          {
            path: "register",
            element: <RegisterDevice />,
          },
        ],
      },
    ],
  },
  {
    path: "login",
    element: <Login />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);
