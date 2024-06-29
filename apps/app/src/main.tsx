import _React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";

import { H } from "highlight.run";
import { ErrorBoundary } from "@highlight-run/react";

import App from "./App.tsx";

import { Home } from "./routes/Home";
import { AuthCallback } from "./routes/auth/AuthCallback";
import { Configuration } from "./routes/Configuration";
import { Publish } from "./routes/Publish";
import { EditEnvironment } from "./routes/environments/EditEnvironment.tsx";
import { EditFeature } from "./routes/features/EditFeature.tsx";
import { EditGroup } from "./routes/groups/EditGroup.tsx";

import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "./index.css";

import "@fontsource/atkinson-hyperlegible";

// H.init("kgryv6nd", {
//   serviceName: "vexilla-app",
//   tracingOrigins: true,
//   networkRecording: {
//     enabled: true,
//     recordHeadersAndBody: true,
//     urlBlocklist: ["http://localhost:5173"],
//   },
// });

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
  <ErrorBoundary>
    <MantineProvider>
      <Notifications />
      <RouterProvider router={router} />
    </MantineProvider>
  </ErrorBoundary>
);
