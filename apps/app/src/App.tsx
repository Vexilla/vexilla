import { useState } from "react";
import "./App.css";

import { Outlet, Link } from "react-router-dom";

import { AppShell, Navbar, Header, Flex } from "@mantine/core";

function App() {
  return (
    <AppShell
      padding="md"
      navbar={
        <Navbar width={{ base: 300 }} mih={500} p="xs">
          <Link to="configuration">Configuration</Link>
          <Link to="environment/staging">Environments</Link>
          <Link to="feature/foo">Features</Link>
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
      <Outlet />
    </AppShell>
  );
}

export default App;
