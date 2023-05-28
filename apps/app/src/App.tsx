import { Outlet } from "react-router-dom";
import { AppShell, Navbar, Header, Flex } from "@mantine/core";
import { useSnapshot } from "valtio";

import { Group } from "@vexilla/types";

import { nanoid } from "./utils/nanoid";
import { config } from "./stores/config-valtio";

import { CustomList, CustomListItem } from "./components/CustomList";

import "./App.css";

function App() {
  useSnapshot(config);

  const groups = config.groups;

  return (
    <AppShell
      padding="md"
      navbar={
        <Navbar width={{ base: 300 }} mih={500} p="xs">
          <CustomList<Group>
            title="Feature Groups"
            itemType="Group"
            items={groups}
            getKey={(group) => group.groupId}
            onAdd={() => {
              groups.push({
                name: `Group ${groups.length + 1}`,
                groupId: nanoid(),
                featuresSettings: {},
                features: [],
                environments: [],
              });
            }}
            listItem={(group) => (
              <CustomListItem
                name={group.name}
                itemType="Group"
                linkPath={`/groups/${group.groupId}`}
                onDelete={() => {
                  const newGroups = groups.filter(
                    (_group) => _group.groupId !== group.groupId
                  );
                  config.groups = newGroups;
                }}
              />
            )}
            tooltipText={
              "Groups are shipped as individual JSON files. This allows you to only fetch what you need on specific pages/routes/apps."
            }
          />
        </Navbar>
      }
      header={
        <Header height={60} p="xs">
          <Flex direction="row" align="center" justify="space-between">
            <Flex direction="row" align="center">
              <img
                className="rounded-full bg-slate-600 h-[36px] w-[36px] p-1 mr-2"
                src="/img/logo-white.svg"
              />
              <h1 className="m-0 font-display text-4xl">Vexilla</h1>
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
