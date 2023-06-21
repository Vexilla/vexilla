import React, { useEffect, useMemo } from "react";
import { Outlet } from "react-router-dom";
import {
  AppShell,
  Navbar,
  Header,
  Flex,
  Modal,
  Box,
  Button,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useSnapshot } from "valtio";
import { cloneDeep, omit } from "lodash-es";

import { Group, PublishedGroup } from "@vexilla/types";

import { nanoid } from "./utils/nanoid";
import { config } from "./stores/config-valtio";

import { GitHubFetcher } from "./components/app/forms/GithubForm.fetchers";

import { CustomList, CustomListItem } from "./components/CustomList";
import { OnboardingForm } from "./components/app/OnboardingForm";
import { Status } from "./components/Status";

import "./App.css";

function App() {
  useSnapshot(config);

  const [
    hostingConfigModalOpened,
    { open: openHostingConfigModal, close: closeHostingConfigModal },
  ] = useDisclosure();

  const {
    accessToken,
    repositoryName,
    owner,
    targetBranch,
    shouldCreatePullRequest,
    branchNamePrefix,
  } =
    config.hosting.provider === "github"
      ? config.hosting.config
      : {
          accessToken: "",
          repositoryName: "",
          owner: "",
          targetBranch: "",
          shouldCreatePullRequest: true,
          branchNamePrefix: "",
        };

  const groups = config.groups;

  const githubMethods = useMemo(() => {
    return new GitHubFetcher(cloneDeep(config));
  }, [accessToken, owner, repositoryName]);

  useEffect(() => {
    if (!config.hosting?.provider) {
      console.log("No hosting config");
      openHostingConfigModal();
    } else {
      if (config.hosting.config?.providerType === "git") {
        // show modal for Github repo selection
        if (config.hosting.config?.provider === "github") {
        } else {
        }
      } else if (config.hosting.config?.providerType === "direct") {
        console.log("direct provider type");
      } else {
        console.log("empty provider type");
      }
    }
  }, [config]);

  return (
    <>
      <Modal
        opened={hostingConfigModalOpened}
        closeOnClickOutside={!!config.hosting?.provider}
        closeOnEscape={!!config.hosting?.provider}
        withCloseButton={!!config.hosting?.provider}
        onClose={() => {
          closeHostingConfigModal();
        }}
      >
        <Box>
          <OnboardingForm
            config={config}
            updateProvider={({ provider, providerType }) => {
              if (config.hosting) {
                config.hosting.provider = provider;
                config.hosting.providerType = providerType;
              }
            }}
          />
        </Box>
      </Modal>
      <AppShell
        padding="md"
        navbar={
          <Navbar width={{ base: 300 }} mih={500} p="xs">
            <Status
              config={config}
              showConfig={() => {
                openHostingConfigModal();
              }}
            />
            <CustomList<Group>
              title="Feature Groups"
              itemType="Group"
              items={groups}
              getKey={(group) => group.groupId}
              onAdd={() => {
                groups.push({
                  name: `Group ${groups.length + 1}`,
                  groupId: nanoid(),
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
              <Button
                onClick={async () => {
                  if (config.hosting.provider === "github") {
                    const groupFiles = config.groups.map((group) => {
                      const scrubbedGroup: PublishedGroup = {
                        ...group,
                        meta: {
                          version: "v1",
                        },
                        environments: group.environments.map((environment) =>
                          omit(environment, "defaultEnvironmentFeatureValues")
                        ),
                      };

                      return {
                        filePath: `${group.groupId}.json`,
                        content: JSON.stringify(scrubbedGroup, null, 2),
                      };
                    });

                    const manifestFile = {
                      filePath: "manifest.json",
                      content: JSON.stringify(
                        {
                          version: "v1",
                          groups: config.groups.map((group) => {
                            return {
                              name: group.name,
                              groupId: group.groupId,
                            };
                          }),
                        },
                        null,
                        2
                      ),
                    };

                    const cleanConfig = cloneDeep(config);
                    if (cleanConfig.hosting.config.providerType === "git") {
                      cleanConfig.hosting.config.accessToken = "";
                    } else if (
                      cleanConfig.hosting.config.providerType === "direct"
                    ) {
                      cleanConfig.hosting.config.accessKeyId = "";
                      cleanConfig.hosting.config.secretAccessKey = "";
                    }

                    await githubMethods.publish(targetBranch, [
                      manifestFile,
                      ...groupFiles,
                      {
                        filePath: "config.json",
                        content: JSON.stringify(cleanConfig),
                      },
                    ]);
                  }
                }}
              >
                Publish
              </Button>
            </Flex>
          </Header>
        }
      >
        <Outlet />
      </AppShell>
    </>
  );
}

export default App;
