import { useEffect, useState, useMemo, useRef } from "react";
import { Button, Timeline, ActionIcon, Flex } from "@mantine/core";

import { AppState } from "../../../types";

import { Branch, Repository } from "./_GitForm.types";
import {
  GitLabFetcher,
  hasGitLabAuthentication,
  hasGitLabRepository,
  gitlabDiscoveryKey,
} from "./GitlabForm.fetchers";
import { selectGitRepository, isGitUnauthorized } from "../../../utils/fetcher";

import { GitForm } from "./_GitForm";
import { TimelineItemTitle } from "../../TimelineItemTitle";
import { GitLabLogo } from "../../logos/GitLabLogo";

import { Icon } from "@iconify/react";
import verifiedCheckBold from "@iconify/icons-solar/verified-check-bold";
import closeCircleBroken from "@iconify/icons-solar/close-circle-broken";
import { useSnapshot } from "valtio";

const baseAuthCallbackUrl = `${window.location.protocol}//${window.location.host}/auth/callback`;

const gitlabClientId = import.meta.env.VITE_GITLAB_CLIENT_ID;

interface GitLabFormProps {
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

export function GitLabForm({ config }: GitLabFormProps) {
  const configSnapshot = useSnapshot(config);
  const { accessToken, repositoryId, targetBranch, branchIsValid } =
    configSnapshot.hosting.provider === "gitlab"
      ? configSnapshot.hosting
      : {
          accessToken: "",
          repositoryId: "",
          targetBranch: "",
          branchIsValid: false,
        };
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now());
  const [repositoryError, setRepositoryError] = useState("");
  const [branchError, setBranchError] = useState("");
  const previousRepositoryKey = useRef("");
  const previousBranchKey = useRef("");

  const gitlabMethods = useMemo(() => {
    return new GitLabFetcher();
  }, []);

  function refresh() {
    setRefreshTimestamp((value) => value + 1);
  }

  function clearHosting() {
    if (config.hosting.provider === "gitlab") {
      config.hosting.accessToken = "";
      selectGitRepository(config.hosting);
    } else {
      console.error(
        `Wrong hosting provider in gitlab form: ${configSnapshot.hosting.provider}`
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

  const discoveryKey = gitlabDiscoveryKey(configSnapshot.hosting);
  const contextKey = gitlabMethods.getReadContextKey(configSnapshot.hosting);
  const repositoryReady = hasGitLabRepository(configSnapshot.hosting);

  useEffect(() => {
    let active = true;
    const isCurrent = () =>
      active && discoveryKey === gitlabDiscoveryKey(config.hosting);
    if (previousRepositoryKey.current !== discoveryKey) {
      setRepositories([]);
      setBranches([]);
      previousRepositoryKey.current = discoveryKey;
    }
    setRepositoryError("");
    async function discoverRepositories() {
      if (!hasGitLabAuthentication(config.hosting)) {
        return;
      }
      const hosting = config.hosting;
      try {
        const response = await gitlabMethods.fetchRepositories();
        if (!isCurrent()) {
          return;
        }
        const available = response.map((repository) => ({
          id: `${repository.id}`,
          name: repository.name,
          path: repository.path || repository.name,
          owner: repository.namespace.full_path || repository.namespace.path,
          defaultBranch: repository.default_branch || "",
        }));
        setRepositories(available);
        const selected = available.find(
          (repository) => repository.id === hosting.repositoryId
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
  }, [config, discoveryKey, refreshTimestamp, gitlabMethods]);

  useEffect(() => {
    let active = true;
    const isCurrent = () =>
      active && contextKey === gitlabMethods.getReadContextKey(config.hosting);
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
        const response = await gitlabMethods.fetchBranches();
        if (isCurrent()) {
          setBranches(
            response.map((branch) => ({ name: branch.name, id: branch.name }))
          );
        }
      } catch (error) {
        if (
          isCurrent() &&
          isGitUnauthorized(error) &&
          config.hosting.provider === "gitlab"
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
  }, [config, contextKey, repositoryReady, refreshTimestamp, gitlabMethods]);

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
        fetcher={gitlabMethods}
        errors={[repositoryError, branchError].filter(Boolean)}
        onRepositoryChange={(id) => {
          if (config.hosting.provider === "gitlab") {
            setBranches([]);
            selectGitRepository(
              config.hosting,
              repositories.find((repository) => repository.id === id)
            );
          }
        }}
        initializeBranch={async (_repositoryId, branchName) => {
          await gitlabMethods.initializeBranch(branchName);
        }}
      >
        <Timeline.Item>
          <TimelineItemTitle
            title="Login"
            tooltipText="You need to login via GitLab so that the app can make PRs on your
          behalf."
          />

          <Flex direction="row" gap="0.5rem" align={"center"}>
            {!accessToken && (
              <Button
                style={buttonStyling}
                leftSection={<GitLabLogo />}
                onClick={() => {
                  window.location.href = `https://gitlab.com/oauth/authorize?client_id=${gitlabClientId}&response_type=code&redirect_uri=${encodeURIComponent(
                    `${baseAuthCallbackUrl}/gitlab?logged_in=true`
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
                  leftSection={<GitLabLogo />}
                  rightSection={
                    <Icon width={20} icon={verifiedCheckBold} color="green" />
                  }
                  disabled
                >
                  Logged in
                </Button>

                <ActionIcon
                  aria-label="Sign out of GitLab"
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
      </GitForm>
    </>
  );
}
