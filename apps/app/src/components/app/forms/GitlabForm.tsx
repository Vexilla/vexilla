import _React, { useEffect, useState, useMemo } from "react";
import { Button, Timeline, Select, ActionIcon, Flex } from "@mantine/core";
import { cloneDeep } from "lodash-es";

import { AppState, HostingProvider } from "../../../types";

import { Branch, Repository } from "./_GitForm.types";
import { GitLabFetcher } from "./GitlabForm.fetchers";
// import { GitHubInstallation } from "./GitLabForm.types";

import { GitForm } from "./_GitForm";
import { TimelineItemTitle } from "../../TimelineItemTitle";
import { GitLabLogo } from "../../logos/GitLabLogo";

import { Icon } from "@iconify/react";
import verifiedCheckBold from "@iconify/icons-solar/verified-check-bold";
import closeCircleBroken from "@iconify/icons-solar/close-circle-broken";
import refreshBroken from "@iconify/icons-solar/refresh-broken";
import { fetchersMap } from "../../../utils/fetchers.map";
import { useSnapshot } from "valtio";

const gitlabAppName = import.meta.env.VITE_GITLAB_APP_NAME;

const baseAuthCallbackUrl = `${window.location.protocol}//${window.location.host}/auth/callback`;

const gitlabClientId = import.meta.env.VITE_GITLAB_CLIENT_ID;

interface GitLabFormProps {
  config: AppState;
  updateConfig: (newConfig: AppState) => void;
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
  const {
    accessToken,
    installationId,
    repositoryId,
    repositoryName,
    owner,
    targetBranch,
    provider,
    providerType,
    branchIsValid,
  } =
    configSnapshot.hosting.provider === "gitlab"
      ? configSnapshot.hosting
      : {
          accessToken: "",
          installationId: "",
          repositoryId: "",
          repositoryName: "",
          owner: "",
          targetBranch: "",
          provider: "",
          providerType: "",
          branchIsValid: false,
        };
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now());

  const gitlabMethods = useMemo(() => {
    return new GitLabFetcher();
  }, [accessToken, owner, repositoryName]);

  function refresh() {
    setRefreshTimestamp(Date.now());
  }

  function clearHosting() {
    if (config.hosting.provider === "gitlab") {
      config.hosting.accessToken = "";
      config.hosting.installationId = "";
      config.hosting.repositoryId = "";
    } else {
      console.error(
        `Wrong hosting provider in gitlab form: ${configSnapshot.hosting.provider}`
      );
    }

    // until we fix the mutability of config in child forms,
    // this function is not needed
    // updateConfig(config);
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

  useEffect(() => {
    async function fetchData() {
      try {
        if (accessToken && config.hosting.provider === "gitlab") {
          // const installationsResponse =
          //   await gitlabMethods.fetchInstallations();
          // setInstallations(installationsResponse.installations);
          // if (installationsResponse.installations.length === 1) {
          //   config.hosting.installationId = `${installationsResponse.installations[0].id}`;
          // }
          // if (config.hosting.installationId) {
          const repositoriesResponse = await gitlabMethods.fetchRepositories();

          setRepositories(
            repositoriesResponse.map((_repository) => ({
              name: _repository.name,
              id: `${_repository.id}`,
              owner: `${_repository.namespace.path}`,
              defaultBranch: `${_repository.default_branch}`,
            }))
          );
          if (repositoriesResponse.length === 1) {
            config.hosting.repositoryId = `${repositoriesResponse[0].id}`;
            config.hosting.owner = `${repositoriesResponse[0].namespace.path}`;
            config.hosting.repositoryName = `${repositoriesResponse[0].name}`;
            config.hosting.targetBranch = `${repositoriesResponse[0].default_branch}`;
          }
          // }
        }
      } catch (e: any) {
        // this should probably only be modifying the snapshot, not the full state
        clearHosting();
      }
    }
    fetchData();
  }, [accessToken, installationId, refreshTimestamp]);

  useEffect(() => {
    async function getBranches() {
      if (accessToken && repositoryName && owner) {
        const fetchedBranches = await gitlabMethods
          .fetchBranches()
          .catch(() => []);

        // if (
        //   fetchedBranches.length === 0 &&
        //   config.hosting.provider === "gitlab"
        // ) {
        //   fetchedBranches[0] = {
        //     name:
        //   };
        // }
        if (
          fetchedBranches.length === 1 &&
          config.hosting.provider === "gitlab"
        ) {
          config.hosting.targetBranch = fetchedBranches[0].name;
        }

        setBranches(
          fetchedBranches.map((_branch) => ({
            name: _branch.name,
            id: `${_branch.name}`,
          }))
        );
      } else {
        console.log("One of these isn't what it should be", {
          accessToken,
          repositoryName,
          owner,
        });
      }
    }
    getBranches();
  }, [accessToken, owner, repositoryName]);

  useEffect(() => {
    if (provider && providerType && accessToken && owner && repositoryName) {
      async function fetchCurrentConfig() {
        if (configSnapshot.hosting?.providerType === "git") {
          const fetcher =
            fetchersMap[configSnapshot.hosting.provider as HostingProvider]?.();

          if (fetcher) {
            const result = await fetcher.getCurrentConfig();
          } else {
            console.log("no fetcher");
          }
        } else {
          console.log(
            "Initial provider type was not git",
            configSnapshot.hosting?.providerType
          );
        }
      }

      fetchCurrentConfig();
    }
  }, [provider, providerType, accessToken, owner, repositoryName]);

  return (
    <>
      <GitForm
        config={config}
        updateConfig={() => {}}
        activeElement={activeElement}
        totalElements={4}
        branches={branches}
        targetBranch={targetBranch}
        repositories={repositories}
        repositoryId={repositoryId}
        refresh={refresh}
        isTargetBranchValid={async (branchName) => {
          return gitlabMethods.isBranchValid(branchName);
        }}
        initializeBranch={async (branchName: string) => {
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
