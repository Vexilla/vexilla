import { useState } from "react";
import "./App.css";

import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppShell, Navbar, Header, Flex } from "@mantine/core";
import { Home } from "./routes/Home";
import { Environment } from "./routes/Environment";
import { Feature } from "./routes/Feature";
import { Configuration } from "./routes/Configuration";

/*


  {
    path: "/environment/:name",
    name: "Environment",
    component: () =>
      import("../views/Environment.vue"),
    },
    {
      path: "/feature/:name",
      name: "Feature",
      component: () =>
        import( "../views/Feature.vue"),
    },
    {
      path: "/configuration",
      name: "Configuration",
      component: () =>
        import(
           "../views/Configuration.vue"
        ),
    },

*/

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <Home />,
    },

    {
      path: "/environment/:name",
      element: <Environment />,
    },

    {
      path: "/feature/:name",
      element: <Feature />,
    },

    {
      path: "/configuration",
      element: <Configuration />,
    },
  ],
  {
    basename: "/app",
  }
);

function App() {
  return (
    <AppShell
      padding="md"
      navbar={
        <Navbar width={{ base: 300 }} mih={500} p="xs">
          {/* Navbar content */}
        </Navbar>
      }
      header={
        <Header height={60} p="xs">
          <Flex direction="row" align="center" justify="space-between">
            <Flex direction="row" align="center">
              <img
                className="rounded-full bg-slate-600 h-[36px] w-[36px] p-1 mr-2"
                src="img/logo-white.svg"
              />
              <h1 className="m-0 font-display">Vexilla</h1>
            </Flex>
          </Flex>
        </Header>
      }
    >
      <RouterProvider router={router} />
    </AppShell>
  );
}

export default App;
