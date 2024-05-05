import _React, { useEffect, useState, useMemo } from "react";
import { Button, Timeline, Select, ActionIcon, Flex } from "@mantine/core";
import { cloneDeep } from "lodash-es";

import { AppState } from "@vexilla/types";

import { Branch, Repository } from "./_GitForm.types";
import { GitHubFetcher } from "./GithubForm.fetchers";
import { GitHubInstallation } from "./GithubForm.types";

import { GitForm } from "./_GitForm";
import { TimelineItemTitle } from "../../TimelineItemTitle";
import { GithubLogo } from "../../logos/GithubLogo";

import { Icon } from "@iconify/react";
import verifiedCheckBold from "@iconify/icons-solar/verified-check-bold";
import closeCircleBroken from "@iconify/icons-solar/close-circle-broken";
import refreshBroken from "@iconify/icons-solar/refresh-broken";
import { fetchersMap } from "../../../utils/fetchers.map";
import { HostingProvider } from "@vexilla/hosts";
import { useSnapshot } from "valtio";

const githubAppName = import.meta.env.VITE_GITHUB_APP_NAME;

const baseAuthCallbackUrl = `${window.location.protocol}//${window.location.host}/auth/callback`;

const githubClientId = import.meta.env.VITE_GITHUB_CLIENT_ID;

interface GithubFormProps {
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

export function GithubForm({ config }: GithubFormProps) {
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
  } =
    configSnapshot.hosting.provider === "github"
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
        };
  const [installations, setInstallations] = useState<GitHubInstallation[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now());

  const githubMethods = useMemo(() => {
    return new GitHubFetcher(cloneDeep(config));
  }, [accessToken, owner, repositoryName]);

  function refresh() {
    setRefreshTimestamp(Date.now());
  }

  function clearHosting() {
    if (config.hosting.provider === "github") {
      config.hosting.accessToken = "";
      config.hosting.installationId = "";
      config.hosting.repositoryId = "";
    } else {
      console.error(
        `Wrong hosting provider in github form: ${configSnapshot.hosting.provider}`
      );
    }

    // until we fix the mutability of config in child forms,
    // this function is not needed
    // updateConfig(config);
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

  useEffect(() => {
    async function fetchData() {
      try {
        if (accessToken && config.hosting.provider === "github") {
          const installationsResponse =
            await githubMethods.fetchInstallations();
          setInstallations(installationsResponse.installations);
          if (installationsResponse.installations.length === 1) {
            config.hosting.installationId = `${installationsResponse.installations[0].id}`;
          }
          if (config.hosting.installationId) {
            const repositoriesResponse = await githubMethods.fetchRepositories(
              config.hosting.installationId
            );
            setRepositories(
              repositoriesResponse.repositories.map((_repository) => ({
                name: _repository.name,
                id: `${_repository.id}`,
                owner: _repository.owner.login,
              }))
            );
            if (repositoriesResponse.repositories.length === 1) {
              config.hosting.repositoryId = `${repositoriesResponse.repositories[0].id}`;
              config.hosting.owner = `${repositoriesResponse.repositories[0].owner.login}`;
              config.hosting.repositoryName = `${repositoriesResponse.repositories[0].name}`;
            }
          }
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
        const fetchedBranches = await githubMethods.fetchBranches();

        setBranches(
          fetchedBranches.map((_branch) => ({
            name: _branch.name,
            id: `${_branch.id}`,
          }))
        );
        if (
          fetchedBranches.length === 1 &&
          config.hosting.provider === "github"
        ) {
          config.hosting.targetBranch = fetchedBranches[0].name;
        }
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
            fetchersMap[configSnapshot.hosting.provider as HostingProvider]?.(
              config
            );

          if (fetcher) {
            const result = await fetcher.getCurrentConfig();
            console.log({ result });
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
            {!!installationId && installations.length > 1 && (
              <Select
                value={installationId}
                data={installations.map((installation) => ({
                  label: installation.html_url,
                  value: `${installation.id}`,
                }))}
              />
            )}

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
