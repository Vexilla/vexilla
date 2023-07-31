import React, { useEffect, useMemo } from "react";
import { Outlet } from "react-router-dom";
import { AppShell, Navbar, Header, Flex, Modal, Box } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useSnapshot } from "valtio";
import { cloneDeep, omit, set as lodashSet } from "lodash-es";
import { Difference } from "microdiff";

import {
  AppState,
  Group,
  PublishedEnvironment,
  PublishedGroup,
} from "@vexilla/types";
import { HostingProvider } from "@vexilla/hosts";

import { nanoid } from "./utils/nanoid";
import { fetchersMap } from "./utils/fetchers.map";
import { config, remoteConfig } from "./stores/config-valtio";

import { GitHubFetcher } from "./components/app/forms/GithubForm.fetchers";

import { CustomList, CustomListItem } from "./components/CustomList";
import { OnboardingForm } from "./components/app/OnboardingForm";
import { Status } from "./components/Status";

import "./App.css";

function App() {
  const configSnapshot = useSnapshot(config);
  const remoteConfigSnapshot = useSnapshot(remoteConfig);

  const [
    hostingConfigModalOpened,
    { open: openHostingConfigModal, close: closeHostingConfigModal },
  ] = useDisclosure();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has("logged_in")) {
      openHostingConfigModal();
    }
  }, []);

  const {
    accessToken,
    repositoryName,
    owner,
    targetBranch,
    shouldCreatePullRequest,
    branchNamePrefix,
  } =
    config.hosting.provider === "github"
      ? config.hosting
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

  console.log({ groups: JSON.parse(JSON.stringify(groups)) });

  useEffect(() => {
    if (!config.hosting?.provider) {
      openHostingConfigModal();
    } else {
      if (config.hosting?.providerType === "git") {
        // show modal for Github repo selection
        if (config.hosting?.provider === "github") {
        } else {
        }
      } else if (config.hosting?.providerType === "direct") {
        console.log("direct provider type");
      } else {
        console.log("empty provider type");
      }
    }
  }, [configSnapshot]);

  useEffect(() => {
    async function fetchCurrentConfig() {
      if (config.hosting?.providerType === "git" && accessToken) {
        const fetcher =
          fetchersMap[config.hosting.provider as HostingProvider]?.(config);

        if (fetcher) {
          try {
            const result = await fetcher.getCurrentConfig();
            remoteConfig.groups = result.groups;
            remoteConfig.hosting = result.hosting;
            remoteConfig.modifiedAt = result.modifiedAt;
          } catch (e: any) {
            console.log("Failed to fetch current config. Invalidating token.");
            config.hosting.accessToken = "";
          }
        }
      } else {
        console.log(
          "Initial provider type was not git",
          config.hosting?.providerType
        );
      }
    }

    fetchCurrentConfig();
  }, [accessToken]);

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

                // this feels redundant
                config.hosting.provider = provider as any;
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
            <Flex direction="column" gap={"1rem"}>
              <Status
                config={config}
                showConfig={() => {
                  openHostingConfigModal();
                }}
                publish={async (changes, approvals) => {
                  // rationalize approvals/changes into current config
                  const newConfig = mergeChanges(config, changes, approvals);

                  if (newConfig.hosting.provider === "github") {
                    const groupFiles = newConfig.groups.map((group) => {
                      const scrubbedGroup: PublishedGroup = {
                        ...group,
                        meta: {
                          version: "v1",
                        },
                        environments: Object.values(group.environments).reduce(
                          (scrubbedEnvironments, environment) => {
                            const scrubbedEnvironment = omit(
                              environment,
                              "defaultEnvironmentFeatureValues"
                            );

                            scrubbedEnvironments[environment.environmentId] =
                              scrubbedEnvironment;

                            return scrubbedEnvironments;
                          },
                          {} as Record<string, PublishedEnvironment>
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
                          groups: newConfig.groups.map((group) => {
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

                    const cleanConfig = cloneDeep(newConfig);
                    if (cleanConfig.hosting.providerType === "git") {
                      cleanConfig.hosting.accessToken = "";
                    } else if (cleanConfig.hosting.providerType === "direct") {
                      cleanConfig.hosting.accessKeyId = "";
                      cleanConfig.hosting.secretAccessKey = "";
                    }

                    await githubMethods.publish(targetBranch, [
                      manifestFile,
                      ...groupFiles,
                      {
                        filePath: "config.json",
                        content: JSON.stringify(cleanConfig, null, 2),
                      },
                    ]);

                    closeHostingConfigModal();
                    // spawn toast
                    // notifications.show({
                    //   message: "PR Created",
                    // });
                  }
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
                    features: {},
                    environments: {},
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
            </Flex>
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
    </>
  );
}

// assumes that the Remote is the old Value and Local is the new Value
function mergeChanges(
  localConfig: AppState,
  changes: Difference[],
  approvals: Record<string, boolean>
) {
  changes.forEach((change) => {
    const changePathString = change.path.join(".");
    const approved = approvals[changePathString];

    if (!approved) {
      switch (change.type) {
        case "CHANGE":
          lodashSet(localConfig, change.path, change.oldValue);
          break;
        case "CREATE":
          lodashSet(localConfig, change.path, undefined);
          break;
        case "REMOVE":
          lodashSet(localConfig, change.path, change.oldValue);
          break;
      }
    }
  });

  return localConfig;
}

export default App;
