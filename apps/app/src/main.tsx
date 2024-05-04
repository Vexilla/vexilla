import _React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";

import { createBrowserRouter, RouterProvider } from "react-router-dom";

import App from "./App.tsx";

import { Home } from "./routes/Home";
import { AuthCallback } from "./routes/auth/AuthCallback";
import { Configuration } from "./routes/Configuration";
import { Publish } from "./routes/Publish";
import { EditEnvironment } from "./routes/environments/EditEnvironment.tsx";
import { EditFeature } from "./routes/features/EditFeature.tsx";
import { EditGroup } from "./routes/groups/EditGroup.tsx";

import "./index.css";

import "@fontsource/atkinson-hyperlegible";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/auth/callback/:provider",
        element: <AuthCallback />,
      },
      {
        path: "/configuration",
        element: <Configuration />,
      },
      {
        path: "/publish",
        element: <Publish />,
      },
      {
        path: "/groups/:groupId",
        element: <EditGroup />,
      },
      {
        path: "/groups/:groupId/environments/:environmentId",
        element: <EditEnvironment />,
      },
      {
        path: "/groups/:groupId/features/:featureId",
        element: <EditFeature />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <MantineProvider>
    <Notifications />
    <RouterProvider router={router} />
  </MantineProvider>
);
