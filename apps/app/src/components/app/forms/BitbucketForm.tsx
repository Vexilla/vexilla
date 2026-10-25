import { useEffect, useState, useMemo, useRef } from "react";
import { Button, Timeline, Select, ActionIcon, Flex } from "@mantine/core";

import { AppState } from "../../../types";

import { Branch, Repository } from "./_GitForm.types";
import {
  BitbucketFetcher,
  hasBitbucketAuthentication,
  hasBitbucketRepository,
  bitbucketDiscoveryKey,
  canDiscoverBitbucketRepositories,
} from "./BitbucketForm.fetchers";
import { selectGitRepository, isGitUnauthorized } from "../../../utils/fetcher";

import { GitForm } from "./_GitForm";
import { TimelineItemTitle } from "../../TimelineItemTitle";
import { BitbucketLogo } from "../../logos/BitbucketLogo";

import { Icon } from "@iconify/react";
import verifiedCheckBold from "@iconify/icons-solar/verified-check-bold";
import closeCircleBroken from "@iconify/icons-solar/close-circle-broken";
import refreshBroken from "@iconify/icons-solar/refresh-broken";
import { useSnapshot } from "valtio";
import { WorkspaceValue } from "./BitbucketForm.types";

const bitbucketClientId = import.meta.env.VITE_BITBUCKET_CLIENT_ID;

interface BitbucketFormProps {
  config: AppState;
}

const buttonStyling = {
  backgroundColor: "#0C66E4",
  color: "white",
  width: "100%",
  maxWidth: "calc(100% - 28px - 0.25rem)",
};
const disabledButtonStyling = {
  backgroundColor: "#0C66E4",
  color: "white",
  opacity: 0.6,
  width: "100%",
  maxWidth: "calc(100% - 28px - 0.25rem)",
};

export function BitbucketForm({ config }: BitbucketFormProps) {
  const configSnapshot = useSnapshot(config);
  const {
    accessToken,
    repositoryId,
    targetBranch,
    branchIsValid,
    workspaceId,
  } =
    configSnapshot.hosting.provider === "bitbucket"
      ? configSnapshot.hosting
      : {
          accessToken: "",
          repositoryId: "",
          targetBranch: "",
          branchIsValid: false,
          workspaceId: "",
        };
  const [workspaces, setWorkspaces] = useState<WorkspaceValue[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now());
  const [workspaceError, setWorkspaceError] = useState("");
  const [repositoryError, setRepositoryError] = useState("");
  const [branchError, setBranchError] = useState("");
  const previousWorkspaceKey = useRef("");
  const previousRepositoryKey = useRef("");
  const previousBranchKey = useRef("");

  const bitbucketMethods = useMemo(() => {
    return new BitbucketFetcher();
  }, []);

  function refresh() {
    setRefreshTimestamp((value) => value + 1);
  }

  function clearHosting() {
    if (config.hosting.provider === "bitbucket") {
      config.hosting.accessToken = "";
      config.hosting.workspaceId = "";
      selectGitRepository(config.hosting);
    } else {
      console.error(
        `Wrong hosting provider in bitbucket form: ${configSnapshot.hosting.provider}`
      );
    }
  }

  let activeElement = 0;
  if (!accessToken) {
    activeElement = 0;
  } else if (!repositoryId) {
    activeElement = 1;
  } else if (!targetBranch) {
    activeElement = 2;
  } else if (!branchIsValid) {
    activeElement = 2;
  } else {
    activeElement = 3;
  }

  const discoveryKey = bitbucketDiscoveryKey(configSnapshot.hosting);
  const contextKey = bitbucketMethods.getReadContextKey(configSnapshot.hosting);
  const repositoryReady = hasBitbucketRepository(configSnapshot.hosting);

  useEffect(() => {
    let active = true;
    const isCurrent = () =>
      active && discoveryKey === bitbucketDiscoveryKey(config.hosting);
    if (previousWorkspaceKey.current !== discoveryKey) {
      setWorkspaces([]);
      previousWorkspaceKey.current = discoveryKey;
    }
    setWorkspaceError("");
    async function discoverWorkspaces() {
      if (!hasBitbucketAuthentication(config.hosting)) {
        return;
      }
      try {
        const response = await bitbucketMethods.fetchWorkspaces();
        if (!isCurrent() || config.hosting.provider !== "bitbucket") {
          return;
        }
        setWorkspaces(response.values);
        if (!config.hosting.workspaceId && response.values.length === 1) {
          selectGitRepository(config.hosting);
          config.hosting.workspaceId = response.values[0].workspace.slug;
        }
      } catch (error) {
        if (
          isCurrent() &&
          isGitUnauthorized(error) &&
          config.hosting.provider === "bitbucket"
        ) {
          config.hosting.accessToken = "";
        } else if (isCurrent()) {
          setWorkspaceError("Could not load workspaces. Refresh to try again.");
        }
      }
    }
    void discoverWorkspaces();
    return () => {
      active = false;
    };
  }, [config, discoveryKey, refreshTimestamp, bitbucketMethods]);

  useEffect(() => {
    let active = true;
    const isCurrent = () =>
      active && discoveryKey === bitbucketDiscoveryKey(config.hosting);
    if (previousRepositoryKey.current !== discoveryKey) {
      setRepositories([]);
      setBranches([]);
      previousRepositoryKey.current = discoveryKey;
    }
    setRepositoryError("");
    async function discoverRepositories() {
      if (
        !hasBitbucketAuthentication(config.hosting) ||
        !canDiscoverBitbucketRepositories(config.hosting)
      ) {
        return;
      }
      const hosting = config.hosting;
      try {
        const response = await bitbucketMethods.fetchRepositories();
        if (!isCurrent()) {
          return;
        }
        const available = response.values.map((repository) => ({
          id: repository.slug || repository.name,
          name: repository.name,
          path: repository.slug || repository.name,
          legacyIds: [repository.name],
          owner: hosting.workspaceId,
          defaultBranch: repository.mainbranch?.name || "",
        }));
        setRepositories(available);
        const selected = available.find(
          (repository) =>
            repository.id === hosting.repositoryId ||
            repository.legacyIds.includes(hosting.repositoryId)
        );
        selectGitRepository(
          hosting,
          selected || (available.length === 1 ? available[0] : undefined)
        );
      } catch (error) {
        if (isCurrent() && isGitUnauthorized(error)) {
          hosting.accessToken = "";
        } else if (isCurrent()) {
          setRepositoryError(
            "Could not load repositories. Refresh to try again."
          );
        }
      }
    }
    void discoverRepositories();
    return () => {
      active = false;
    };
  }, [config, discoveryKey, refreshTimestamp, bitbucketMethods]);

  useEffect(() => {
    let active = true;
    const isCurrent = () =>
      active &&
      contextKey === bitbucketMethods.getReadContextKey(config.hosting);
    if (previousBranchKey.current !== contextKey) {
      setBranches([]);
      previousBranchKey.current = contextKey;
    }
    setBranchError("");
    async function getBranches() {
      if (!repositoryReady) {
        return;
      }
      try {
        const response = await bitbucketMethods.fetchBranches();
        if (isCurrent()) {
          setBranches(
            response.map((branch) => ({ name: branch.name, id: branch.name }))
          );
        }
      } catch (error) {
        if (
          isCurrent() &&
          isGitUnauthorized(error) &&
          config.hosting.provider === "bitbucket"
        ) {
          config.hosting.accessToken = "";
        } else if (isCurrent()) {
          setBranchError("Could not load branches. Refresh to try again.");
        }
      }
    }
    void getBranches();
    return () => {
      active = false;
    };
  }, [config, contextKey, repositoryReady, refreshTimestamp, bitbucketMethods]);

  return (
    <>
      <GitForm
        config={config}
        activeElement={activeElement}
        branches={branches}
        targetBranch={targetBranch}
        repositories={repositories}
        repositoryId={repositoryId}
        refresh={refresh}
        refreshTimestamp={refreshTimestamp}
        fetcher={bitbucketMethods}
        errors={[workspaceError, repositoryError, branchError].filter(Boolean)}
        onRepositoryChange={(id) => {
          if (config.hosting.provider === "bitbucket") {
            setBranches([]);
            selectGitRepository(
              config.hosting,
              repositories.find((repository) => repository.id === id)
            );
          }
        }}
        initializeBranch={async (_repositoryId, branchName) => {
          await bitbucketMethods.initializeBranch(branchName);
        }}
      >
        <Timeline.Item>
          <TimelineItemTitle
            title="Login"
            tooltipText="You need to login via Bitbucket so that the app can make PRs on your
          behalf."
          />

          <Flex direction="row" gap="0.5rem" align={"center"}>
            {!accessToken && (
              <Button
                style={buttonStyling}
                leftSection={<BitbucketLogo />}
                onClick={() => {
                  window.location.href = `https://bitbucket.com/site/oauth2/authorize?client_id=${bitbucketClientId}&response_type=code`;
                }}
              >
                Login
              </Button>
            )}

            {!!accessToken && (
              <>
                <Button
                  style={disabledButtonStyling}
                  variant="outline"
                  leftSection={<BitbucketLogo />}
                  rightSection={
                    <Icon width={20} icon={verifiedCheckBold} color="green" />
                  }
                  disabled
                >
                  Logged in
                </Button>

                <ActionIcon
                  aria-label="Sign out of Bitbucket"
                  variant="subtle"
                  onClick={() => {
                    clearHosting();
                  }}
                >
                  <Icon icon={closeCircleBroken} width={24} />
                </ActionIcon>
              </>
            )}
          </Flex>
        </Timeline.Item>

        <Timeline.Item>
          <TimelineItemTitle
            title="Workspace"
            tooltipText="The workspace for the repository is required."
          />
          <Flex direction="row" align="center" gap="0.5rem">
            <Select
              w={"100%"}
              aria-label="Workspace"
              value={workspaceId || null}
              data={workspaces.map((workspace) => ({
                label: workspace.workspace.name,
                value: `${workspace.workspace.slug}`,
              }))}
              onChange={(value) => {
                if (config.hosting.provider === "bitbucket") {
                  setRepositories([]);
                  setBranches([]);
                  selectGitRepository(config.hosting);
                  config.hosting.workspaceId = value || "";
                }
              }}
            />

            <ActionIcon
              aria-label="Refresh workspaces"
              variant="subtle"
              onClick={() => {
                refresh();
              }}
            >
              <Icon icon={refreshBroken} width={24} />
            </ActionIcon>
          </Flex>
        </Timeline.Item>
      </GitForm>
    </>
  );
}
