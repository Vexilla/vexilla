import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";

import { createBrowserRouter, RouterProvider } from "react-router-dom";

import App from "./App.tsx";

import { Home } from "./routes/Home";
import { Configuration } from "./routes/Configuration";
import { Publish } from "./routes/Publish";
import { NewEnvironment } from "./routes/environments/NewEnvironment.tsx";
import { EditEnvironment } from "./routes/environments/EditEnvironment.tsx";
import { EditFeature } from "./routes/features/EditFeature.tsx";
import { NewFeature } from "./routes/features/NewFeature.tsx";

import "./index.css";

import "@fontsource/atkinson-hyperlegible";

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <App />,
      children: [
        {
          path: "/",
          element: <Home />,
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
          path: "/environments",
          children: [
            {
              path: "new",
              element: <NewEnvironment />,
            },
            {
              path: "edit/:environmentId",
              element: <EditEnvironment />,
            },
          ],
        },
        {
          path: "/features",
          children: [
            {
              path: "new",
              element: <NewFeature />,
            },
            {
              path: "edit/:featureId",
              element: <EditFeature />,
            },
          ],
        },
      ],
    },
  ],
  {
    basename: "/app",
  }
);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider>
      <RouterProvider router={router} />
    </MantineProvider>
  </React.StrictMode>
);
