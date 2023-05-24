import { Outlet, Link, NavLink } from "react-router-dom";
import {
  AppShell,
  Navbar,
  Header,
  Flex,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { useAtom } from "jotai";

import { Group } from "@vexilla/types";

import { CustomList, CustomListItem } from "./components/CustomList";

import { groupsStore } from "./stores/config";

import "./App.css";
import { nanoid } from "./utils/nanoid";

function App() {
  const [groups, setGroups] = useAtom(groupsStore);

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
              const newGroups: Group[] = [
                ...groups,
                {
                  name: `Group ${groups.length}`,
                  groupId: nanoid(),
                  featuresSettings: {},
                  features: [],
                  environments: [],
                },
              ];
              setGroups(newGroups);
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
                  setGroups(newGroups);
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
