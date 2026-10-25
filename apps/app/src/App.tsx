import _React, { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useSearchParams } from "react-router-dom";
import { AppShell, Flex, Modal, Box, Text, Button } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useSnapshot } from "valtio";
import { set as lodashSet } from "lodash-es";
import { Difference } from "microdiff";

import { Group, ContractIssue } from "@vexilla/publishing";

import { nanoid } from "./utils/nanoid";
import { fetchersMap } from "./utils/fetchers.map";
import { config, remoteConfig, remoteMetadata } from "./stores/config-valtio";

import { CustomList, CustomListItem } from "./components/CustomList";
import { OnboardingForm } from "./components/app/OnboardingForm";
import { Status } from "./components/Status";

import "./App.css";
import { notifications } from "@mantine/notifications";
import { HostingProvider, AppState } from "./types";

import { publishApprovedChanges } from "./utils/publication";

function App() {
  const [publicationIssues, setPublicationIssues] = useState<ContractIssue[]>(
    []
  );
  const configSnapshot = useSnapshot(config);
  useSnapshot(remoteConfig);
  useSnapshot(remoteMetadata);
  const [searchParams, setSearchParams] = useSearchParams();

  const [
    hostingConfigModalOpened,
    { open: openHostingConfigModal, close: closeHostingConfigModal },
  ] = useDisclosure();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has("logged_in")) {
      openHostingConfigModal();
    }
  }, [searchParams]);

  const { accessToken, repositoryName, owner } =
    config.hosting.providerType === "git"
      ? config.hosting
      : {
          accessToken: "",
          repositoryName: "",
          owner: "",
        };

  const groups = config.groups;

  const gitMethods = useMemo(() => {
    if (config.hosting.provider) {
      const fetchers = fetchersMap[config.hosting.provider]();
      return fetchers;
    }
  }, [accessToken, owner, repositoryName, configSnapshot]);

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
          fetchersMap[config.hosting.provider as HostingProvider]?.();

        if (fetcher) {
          try {
            const result = await fetcher.getCurrentConfig();
            remoteConfig.groups = result.groups;
            remoteConfig.hosting = result.hosting;
            remoteConfig.modifiedAt = result.modifiedAt;
            remoteMetadata.remoteModifiedAt = result.modifiedAt;
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

    const interval = setInterval(() => {
      fetchCurrentConfig();
    }, 30000);

    fetchCurrentConfig();

    return () => {
      clearInterval(interval);
    };
  }, [accessToken]);

  return (
    <>
      <Modal
        opened={publicationIssues.length > 0}
        onClose={() => setPublicationIssues([])}
        title="Repair settings before publishing"
        size="lg"
      >
        <Text mb="md">
          No files were published. Edit the fields below and retry publication.
        </Text>
        {publicationIssues.map((issue, index) => {
          const group = config.groups.find((g) => g.groupId === issue.groupId);
          const feature = group?.features[issue.featureId || ""];
          const environment = group?.environments[issue.environmentId || ""];
          const route = feature
            ? `/groups/${encodeURIComponent(
                group!.groupId
              )}/features/${encodeURIComponent(issue.featureId!)}#${
                environment
                  ? encodeURIComponent(`environment-${issue.environmentId}`)
                  : "group-defaults"
              }`
            : group && environment
            ? `/groups/${encodeURIComponent(
                group.groupId
              )}/environments/${encodeURIComponent(issue.environmentId!)}`
            : group
            ? `/groups/${encodeURIComponent(group.groupId)}`
            : "/";
          return (
            <Box key={index} mb="lg">
              <Text fw={600}>
                {group?.name || issue.groupId || "Manifest"}
                {feature ? ` / ${feature.name}` : ""}
                {environment ? ` / ${environment.name}` : ""}
              </Text>
              <Text size="sm">{issue.path}</Text>
              <Text>
                Expected: {issue.expected}. {issue.repair}
              </Text>
              <Button
                component={Link}
                to={route}
                onClick={() => setPublicationIssues([])}
                mt="xs"
              >
                Edit affected settings
              </Button>
            </Box>
          );
        })}
      </Modal>
      <Modal
        opened={hostingConfigModalOpened}
        closeOnClickOutside={!!config.hosting?.provider}
        closeOnEscape={!!config.hosting?.provider}
        withCloseButton={!!config.hosting?.provider}
        onClose={() => {
          setSearchParams({});
          closeHostingConfigModal();
        }}
      >
        <Box>
          <OnboardingForm
            config={config}
            updateProvider={({ provider, providerType }) => {
              Object.assign(config.hosting, { provider, providerType });
            }}
          />
        </Box>
      </Modal>
      <AppShell
        padding="md"
        navbar={{
          width: 300,
          breakpoint: "sm",
        }}
        header={{
          height: 60,
        }}
      >
        <AppShell.Header p="xs">
          <Flex direction="row" align="center" justify="space-between">
            <Flex direction="row" align="center">
              <img
                className="h-[36px] w-[36px] mr-2"
                src="/img/vexilla-logo.png"
              />
              <h1 className="m-0 font-display text-4xl">Vexilla</h1>
            </Flex>
          </Flex>
        </AppShell.Header>

        <AppShell.Navbar mih={500} p="xs" className="appshell-navbar">
          <Flex direction="column" gap={"1rem"}>
            <Status
              config={config}
              showConfig={() => {
                openHostingConfigModal();
              }}
              updateLocal={() => {}}
              mergeRemoteConfig={async (changes, approvals) => {
                mergeRemoteChanges(config, changes, approvals);

                remoteMetadata.remoteMergedAt = Date.now();
              }}
              publish={async (changes, approvals) => {
                if (config.hosting.providerType === "git" && gitMethods) {
                  const result = await publishApprovedChanges(
                    config,
                    changes,
                    approvals,
                    (files, branch) => gitMethods.publish(branch || "", files)
                  );
                  if (!result.success) {
                    setPublicationIssues(result.issues);
                  } else {
                    setPublicationIssues([]);
                    notifications.show({ message: "PR Created" });
                  }
                }
              }}
            />
            <CustomList<Group>
              title="Feature Groups"
              itemType="Group"
              items={groups}
              getKey={(group) => group.groupId}
              showCount={true}
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
        </AppShell.Navbar>

        <AppShell.Main>
          <Outlet />
        </AppShell.Main>
      </AppShell>
    </>
  );
}

function mergeRemoteChanges(
  localConfig: AppState,
  changes: Difference[],
  approvals: Record<string, boolean>
) {
  changes.forEach((change) => {
    const changePathString = change.path.join(".");
    const approved = approvals[changePathString];

    if (approved) {
      switch (change.type) {
        case "CHANGE":
          lodashSet(localConfig, change.path, change.value);
          break;
        case "CREATE":
          lodashSet(localConfig, change.path, change.value);
          break;
        case "REMOVE":
          lodashSet(localConfig, change.path, undefined);
          break;
      }
    }
  });

  return localConfig;
}

export default App;
