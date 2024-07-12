import _React, { useEffect, useState, useMemo } from "react";
import { Button, Timeline, Select, ActionIcon, Flex } from "@mantine/core";
import { cloneDeep } from "lodash-es";

import { AppState, HostingProvider } from "../../../types";

import { Branch, Repository } from "./_GitForm.types";
import { BitbucketFetcher } from "./BitbucketForm.fetchers";
// import { GitHubInstallation } from "./BitbucketForm.types";

import { GitForm } from "./_GitForm";
import { TimelineItemTitle } from "../../TimelineItemTitle";
import { BitbucketLogo } from "../../logos/BitbucketLogo";

import { Icon } from "@iconify/react";
import verifiedCheckBold from "@iconify/icons-solar/verified-check-bold";
import closeCircleBroken from "@iconify/icons-solar/close-circle-broken";
import refreshBroken from "@iconify/icons-solar/refresh-broken";
import { fetchersMap } from "../../../utils/fetchers.map";
import { useSnapshot } from "valtio";
import {
  BitbucketBranchValue,
  BitbucketGetBranchesResponse,
  WorkspaceValue,
} from "./BitbucketForm.types";
import { defaultConfig } from "../../../stores/config-valtio";

const bitbucketAppName = import.meta.env.VITE_BITBUCKET_APP_NAME;

const baseAuthCallbackUrl = `${window.location.protocol}//${window.location.host}/auth/callback`;

const bitbucketClientId = import.meta.env.VITE_BITBUCKET_CLIENT_ID;

interface BitbucketFormProps {
  config: AppState;
  updateConfig: (newConfig: AppState) => void;
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
    workspaceId,
    repositoryId,
    repositoryName,
    owner,
    targetBranch,
    provider,
    providerType,
    branchIsValid,
  } =
    configSnapshot.hosting.provider === "bitbucket"
      ? configSnapshot.hosting
      : {
          accessToken: "",
          workspaceId: "",
          repositoryId: "",
          repositoryName: "",
          owner: "",
          targetBranch: "",
          provider: "",
          providerType: "",
          branchIsValid: false,
        };
  const [workspaces, setWorkspaces] = useState<WorkspaceValue[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now());

  const bitbucketMethods = useMemo(() => {
    return new BitbucketFetcher();
  }, [accessToken, owner, repositoryName]);

  function refresh() {
    setRefreshTimestamp(Date.now());
  }

  function clearHosting() {
    if (config.hosting.provider === "bitbucket") {
      config.hosting.accessToken = "";
      config.hosting.workspaceId = "";
      config.hosting.repositoryId = "";
    } else {
      console.error(
        `Wrong hosting provider in bitbucket form: ${configSnapshot.hosting.provider}`
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
        if (accessToken && config.hosting.provider === "bitbucket") {
          const workspacesResponse = await bitbucketMethods.fetchWorkspaces();
          setWorkspaces(workspacesResponse.values);
          if (workspacesResponse.values.length === 1) {
            config.hosting.workspaceId = `${workspacesResponse.values[0].workspace.slug}`;
          }
          if (config.hosting.workspaceId) {
            const repositoriesResponse =
              await bitbucketMethods.fetchRepositories();

            setRepositories(
              repositoriesResponse.values.map((_repository) => ({
                name: _repository.name,
                id: `${_repository.name}`,
                owner: `${_repository.owner}`,
                defaultBranch: `${_repository.mainbranch.name}`,
              }))
            );
            if (repositoriesResponse.values.length === 1) {
              config.hosting.repositoryId = `${repositoriesResponse.values[0].name}`;
              config.hosting.owner = `${repositoriesResponse.values[0].owner.username}`;
              config.hosting.repositoryName = `${repositoriesResponse.values[0].name}`;
              config.hosting.targetBranch = `${repositoriesResponse.values[0].mainbranch.name}`;
            }
          }
        }
      } catch (e: any) {
        // this should probably only be modifying the snapshot, not the full state
        clearHosting();
      }
    }
    fetchData();
  }, [accessToken, workspaceId, refreshTimestamp]);

  useEffect(() => {
    async function getBranches() {
      if (accessToken && repositoryName && owner) {
        const fetchedBranches = await bitbucketMethods
          .fetchBranches()
          .catch(() => [] as BitbucketBranchValue[]);

        console.log({ fetchedBranches });

        // if (
        //   fetchedBranches.length === 0 &&
        //   config.hosting.provider === "bitbucket"
        // ) {
        //   fetchedBranches[0] = {
        //     name:
        //   };
        // }
        if (
          fetchedBranches.length === 1 &&
          config.hosting.provider === "bitbucket"
        ) {
          console.log(
            "Setting targetBranch since we only have one to choose from"
          );
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
            const result = await fetcher
              .getCurrentConfig()
              .catch(() => defaultConfig);
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
          return bitbucketMethods.isBranchValid(branchName);
        }}
        initializeBranch={async (branchName: string) => {
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
              value={workspaceId}
              data={workspaces.map((workspace) => ({
                label: workspace.workspace.name,
                value: `${workspace.workspace.slug}`,
              }))}
              onChange={(value) => {
                if (config.hosting.provider === "bitbucket") {
                  config.hosting.workspaceId = value || "";
                }
              }}
            />

            <ActionIcon
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
