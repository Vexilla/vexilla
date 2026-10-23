import _React, { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useSearchParams } from "react-router-dom";
import { AppShell, Flex, Modal, Box, Text, Button } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useSnapshot } from "valtio";
import { cloneDeep, set as lodashSet, unset as lodashUnset } from "lodash-es";
import { Difference } from "microdiff";

import { Group, ContractIssue } from "@vexilla/types";

import { nanoid } from "./utils/nanoid";
import { fetchersMap } from "./utils/fetchers.map";
import {
  config,
  remoteConfig,
  remoteMetadata,
  invalidateRemoteMetadata,
  isRemoteBaselineReady,
  configReadRefresh,
  requestRemoteRead,
} from "./stores/config-valtio";

import { CustomList, CustomListItem } from "./components/CustomList";
import { OnboardingForm } from "./components/app/OnboardingForm";
import { Status } from "./components/Status";

import "./App.css";
import { notifications } from "@mantine/notifications";
import { AppState, HostingConfig } from "./types";

import { startConfigPolling } from "./utils/config-polling";
import {
  createGitHosting,
  gitLocationKey,
  gitErrorMessage,
} from "./utils/fetcher";

import {
  PublicationDestinationError,
  publishApprovedChanges,
} from "./utils/publication";

function App() {
  const [publicationIssues, setPublicationIssues] = useState<ContractIssue[]>(
    []
  );
  const remoteRefreshRevision = useSnapshot(configReadRefresh).revision;
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
  }, [searchParams, openHostingConfigModal]);

  const groups = config.groups;
  const provider = configSnapshot.hosting.provider;
  const providerType = configSnapshot.hosting.providerType;
  const gitMethods = useMemo(() => {
    return providerType === "git" && provider
      ? fetchersMap[provider]()
      : undefined;
  }, [provider, providerType]);

  useEffect(() => {
    if (!provider) {
      openHostingConfigModal();
    }
  }, [provider, openHostingConfigModal]);

  const readContextKey =
    gitMethods?.getReadContextKey(configSnapshot.hosting) || "";
  const locationKey = gitLocationKey(configSnapshot.hosting);
  useEffect(() => {
    if (remoteMetadata.locationKey !== locationKey) {
      invalidateRemoteMetadata(locationKey);
    }
    return gitMethods ? startConfigPolling(gitMethods) : undefined;
  }, [gitMethods, readContextKey, locationKey, remoteRefreshRevision]);

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
              if (provider === config.hosting.provider) {
                return;
              }
              config.hosting =
                provider === "github" ||
                provider === "gitlab" ||
                provider === "bitbucket"
                  ? createGitHosting(provider)
                  : ({ provider, providerType } as HostingConfig);
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
              retryRemoteRead={requestRemoteRead}
              mergeRemoteConfig={async (changes, approvals) => {
                if (!isRemoteBaselineReady()) {
                  throw new Error(
                    "Read the current repository before merging changes."
                  );
                }
                mergeRemoteChanges(config, changes, approvals);

                remoteMetadata.remoteMergedAt = Date.now();
              }}
              publish={async (changes, approvals) => {
                if (
                  !gitMethods ||
                  !isRemoteBaselineReady() ||
                  readContextKey !==
                    gitMethods.getReadContextKey(config.hosting)
                ) {
                  throw new Error(
                    "Read the current repository before publishing."
                  );
                }
                try {
                  const shouldCreatePullRequest =
                    config.hosting.providerType === "git" &&
                    config.hosting.shouldCreatePullRequest;
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
                    notifications.show({
                      message: shouldCreatePullRequest
                        ? "Pull request created"
                        : "Changes published",
                    });
                    requestRemoteRead();
                  }
                } catch (error) {
                  notifications.show({
                    color: "red",
                    message:
                      error instanceof PublicationDestinationError
                        ? error.message
                        : gitErrorMessage(error),
                  });
                  requestRemoteRead();
                  throw error;
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
          lodashSet(localConfig, change.path, cloneDeep(change.value));
          break;
        case "CREATE":
          lodashSet(localConfig, change.path, cloneDeep(change.value));
          break;
        case "REMOVE":
          lodashUnset(localConfig, change.path);
          break;
      }
    }
  });

  return localConfig;
}

export default App;
