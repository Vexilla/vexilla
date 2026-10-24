import { useEffect, useState, useMemo, useRef } from "react";
import { Button, Timeline, Select, ActionIcon, Flex } from "@mantine/core";

import { AppState } from "../../../types";

import { Branch, Repository } from "./_GitForm.types";

import { GitHubInstallation } from "./GithubForm.types";

import { GitForm } from "./_GitForm";
import { TimelineItemTitle } from "../../TimelineItemTitle";
import { GithubLogo } from "../../logos/GithubLogo";

import { Icon } from "@iconify/react";
import verifiedCheckBold from "@iconify/icons-solar/verified-check-bold";
import closeCircleBroken from "@iconify/icons-solar/close-circle-broken";
import squareArrowRightUpBroken from "@iconify/icons-solar/square-arrow-right-up-broken";
import refreshBroken from "@iconify/icons-solar/refresh-broken";
import {
  GitHubFetcher,
  canDiscoverGitHubRepositories,
  hasGitHubAuthentication,
  hasGitHubRepository,
  githubContextKey,
  githubDiscoveryKey,
  selectGitHubRepository,
} from "./GithubForm.fetchers";
import { isGitUnauthorized } from "../../../utils/fetcher";
import {
  isRemoteReadContextCurrent,
  remoteMetadata,
  remoteReadAuthority,
  requestRemoteRead,
} from "../../../stores/config-valtio";
import { initializeGitBranch } from "../../../utils/config-polling";
import { useSnapshot } from "valtio";

const githubAppName = import.meta.env.VITE_GITHUB_APP_NAME;

const baseAuthCallbackUrl = `${window.location.protocol}//${window.location.host}/auth/callback`;

const githubClientId = import.meta.env.VITE_GITHUB_CLIENT_ID;

interface GithubFormProps {
  config: AppState;
}

const buttonStyling = {
  backgroundColor: "black",
  color: "white",
  width: "100%",
  maxWidth: "calc(100% - 28px - 0.25rem)",
};
const disabledButtonStyling = {
  backgroundColor: "black",
  color: "white",
  opacity: 0.6,
  width: "100%",
  maxWidth: "calc(100% - 28px - 0.25rem)",
};

export function GithubForm({ config }: GithubFormProps) {
  const configSnapshot = useSnapshot(config);
  const readGeneration = useSnapshot(remoteReadAuthority).generation;
  const readStatus = useSnapshot(remoteMetadata).status;
  const initializationPending =
    readStatus === "initializing" && isRemoteReadContextCurrent();
  const { accessToken, installationId, repositoryId, targetBranch } =
    configSnapshot.hosting.provider === "github"
      ? configSnapshot.hosting
      : {
          accessToken: "",
          installationId: "",
          repositoryId: "",
          targetBranch: "",
        };
  const [installations, setInstallations] = useState<GitHubInstallation[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now());
  const [installationError, setInstallationError] = useState("");
  const [repositoryError, setRepositoryError] = useState("");
  const [branchError, setBranchError] = useState("");
  const previousInstallationKey = useRef("");
  const previousRepositoryKey = useRef("");
  const previousBranchKey = useRef("");

  const githubMethods = useMemo(() => {
    return new GitHubFetcher();
  }, []);

  function refresh() {
    requestRemoteRead();
    setRefreshTimestamp((value) => value + 1);
  }

  function clearHosting() {
    if (config.hosting.provider === "github") {
      config.hosting.accessToken = "";
      config.hosting.installationId = "";
      selectGitHubRepository(config.hosting);
    } else {
      console.error(
        `Wrong hosting provider in github form: ${configSnapshot.hosting.provider}`
      );
    }
  }

  let activeElement = 0;
  if (!accessToken) {
    activeElement = 0;
  } else if (!installationId) {
    activeElement = 1;
  } else if (!repositoryId) {
    activeElement = 2;
  } else {
    activeElement = 3;
  }

  const discoveryKey = githubDiscoveryKey(configSnapshot.hosting);
  const contextKey = githubContextKey(configSnapshot.hosting);
  const repositoryReady = hasGitHubRepository(configSnapshot.hosting);

  useEffect(() => {
    let active = true;
    const generation = remoteReadAuthority.generation;
    const isCurrent = () =>
      active &&
      generation === remoteReadAuthority.generation &&
      discoveryKey === githubDiscoveryKey(config.hosting);
    if (previousInstallationKey.current !== discoveryKey) {
      setInstallations([]);
      previousInstallationKey.current = discoveryKey;
    }
    setInstallationError("");
    async function discoverInstallations() {
      if (initializationPending || !hasGitHubAuthentication(config.hosting)) {
        return;
      }
      try {
        const response = await githubMethods.fetchInstallations();
        if (!isCurrent() || config.hosting.provider !== "github") {
          return;
        }
        setInstallations(response.installations);
        const hosting = config.hosting;
        const selected = response.installations.find(
          (installation) => `${installation.id}` === hosting.installationId
        );
        const nextId = selected
          ? `${selected.id}`
          : response.installations.length === 1
          ? `${response.installations[0].id}`
          : "";
        if (nextId !== config.hosting.installationId) {
          selectGitHubRepository(config.hosting);
          config.hosting.installationId = nextId;
        }
      } catch (error) {
        if (
          isCurrent() &&
          isGitUnauthorized(error) &&
          config.hosting.provider === "github"
        ) {
          config.hosting.accessToken = "";
        } else if (isCurrent()) {
          setInstallationError(
            "Could not load installations. Refresh to try again."
          );
        }
      }
    }
    void discoverInstallations();
    return () => {
      active = false;
    };
  }, [
    config,
    discoveryKey,
    refreshTimestamp,
    githubMethods,
    readGeneration,
    initializationPending,
  ]);

  useEffect(() => {
    let active = true;
    const generation = remoteReadAuthority.generation;
    const isCurrent = () =>
      active &&
      generation === remoteReadAuthority.generation &&
      discoveryKey === githubDiscoveryKey(config.hosting);
    if (previousRepositoryKey.current !== discoveryKey) {
      setRepositories([]);
      setBranches([]);
      previousRepositoryKey.current = discoveryKey;
    }
    setRepositoryError("");
    async function discoverRepositories() {
      if (
        initializationPending ||
        !canDiscoverGitHubRepositories(config.hosting) ||
        config.hosting.provider !== "github"
      ) {
        return;
      }
      try {
        const response = await githubMethods.fetchRepositories(
          config.hosting.installationId
        );
        if (!isCurrent() || config.hosting.provider !== "github") {
          return;
        }
        const available = response.repositories.map((repository) => ({
          id: `${repository.id}`,
          name: repository.name,
          path: repository.name,
          owner: repository.owner.login,
          defaultBranch: repository.default_branch,
        }));
        setRepositories(available);
        const hosting = config.hosting;
        const selected = available.find(
          (repository) => repository.id === hosting.repositoryId
        );
        selectGitHubRepository(
          config.hosting,
          selected || (available.length === 1 ? available[0] : undefined)
        );
      } catch (error) {
        if (
          isCurrent() &&
          isGitUnauthorized(error) &&
          config.hosting.provider === "github"
        ) {
          config.hosting.accessToken = "";
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
  }, [
    config,
    discoveryKey,
    refreshTimestamp,
    githubMethods,
    readGeneration,
    initializationPending,
  ]);

  useEffect(() => {
    let active = true;
    const generation = remoteReadAuthority.generation;
    const isCurrent = () =>
      active &&
      generation === remoteReadAuthority.generation &&
      contextKey === githubContextKey(config.hosting);
    if (previousBranchKey.current !== contextKey) {
      setBranches([]);
      previousBranchKey.current = contextKey;
    }
    setBranchError("");
    async function getBranches() {
      if (
        !repositoryReady ||
        (readStatus !== "ready" &&
          readStatus !== "absent" &&
          readStatus !== "error")
      ) {
        return;
      }
      try {
        const fetched = await githubMethods.fetchBranches();
        if (isCurrent()) {
          setBranches(
            fetched.map((branch) => ({ name: branch.name, id: `${branch.id}` }))
          );
        }
      } catch (error) {
        if (
          isCurrent() &&
          isGitUnauthorized(error) &&
          config.hosting.provider === "github"
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
  }, [
    config,
    contextKey,
    repositoryReady,
    refreshTimestamp,
    githubMethods,
    readGeneration,
    readStatus,
  ]);

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
        fetcher={githubMethods}
        errors={[installationError, repositoryError, branchError].filter(
          Boolean
        )}
        initializeBranch={async (_repositoryId, branchName) => {
          await initializeGitBranch(githubMethods, branchName);
        }}
        repositoryTooltip="This depends on which repos you installed the GitHub App into."
        repositoryAction={
          <ActionIcon
            aria-label="Edit installation repository access"
            variant="subtle"
            title="Edit your installation's repository access"
            onClick={() => {
              window
                .open(
                  `https://github.com/apps/${githubAppName}/installations/new`,
                  "_blank"
                )
                ?.focus();
            }}
          >
            <Icon icon={squareArrowRightUpBroken} width={24} />
          </ActionIcon>
        }
        onRepositoryChange={(id) => {
          if (config.hosting.provider === "github") {
            setBranches([]);
            selectGitHubRepository(
              config.hosting,
              repositories.find((repository) => repository.id === id)
            );
          }
        }}
      >
        <Timeline.Item>
          <TimelineItemTitle
            title="Login"
            tooltipText="You need to login via Github so that the app can make PRs on your
          behalf."
          />

          <Flex direction="row" gap="0.5rem" align={"center"}>
            {!accessToken && (
              <Button
                style={buttonStyling}
                leftSection={<GithubLogo />}
                onClick={() => {
                  window.location.href = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${encodeURIComponent(
                    `${baseAuthCallbackUrl}/github?logged_in=true`
                  )}`;
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
                  leftSection={<GithubLogo />}
                  rightSection={
                    <Icon width={20} icon={verifiedCheckBold} color="green" />
                  }
                  disabled
                >
                  Logged in
                </Button>

                <ActionIcon
                  aria-label="Sign out of GitHub"
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
            title="Installation"
            tooltipText="The app must be installed into a repo via the Github marketplace."
          />
          <Flex direction="row" align="center" gap="0.5rem">
            {(!installationId || installations.length === 0) && (
              <Button
                style={buttonStyling}
                leftSection={<GithubLogo />}
                onClick={() => {
                  window.location.href = `https://github.com/apps/${githubAppName}/installations/new`;
                }}
              >
                Install
              </Button>
            )}

            {!!installationId && installations.length === 1 && (
              <Button
                variant="outline"
                style={disabledButtonStyling}
                leftSection={<GithubLogo />}
                rightSection={
                  <Icon width={20} icon={verifiedCheckBold} color="green" />
                }
                disabled
              >
                Installed
              </Button>
            )}
            {installations.length > 1 && (
              <Select
                aria-label="Installation"
                value={installationId || null}
                onChange={(id) => {
                  if (config.hosting.provider === "github") {
                    setRepositories([]);
                    setBranches([]);
                    selectGitHubRepository(config.hosting);
                    config.hosting.installationId = id || "";
                  }
                }}
                data={installations.map((installation) => ({
                  label: installation.html_url,
                  value: `${installation.id}`,
                }))}
              />
            )}

            <ActionIcon
              aria-label="Refresh installations"
              variant="subtle"
              disabled={initializationPending}
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
