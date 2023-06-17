import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Button,
  Timeline,
  Select,
  ActionIcon,
  Flex,
  Tooltip,
} from "@mantine/core";
import { cloneDeep } from "lodash-es";

import { AppState } from "@vexilla/types";

import { GitHubFetcher } from "./GithubForm.fetchers";
import { Branch, Installation, Repository } from "./GithubForm.types";
import { DEFAULT_BRANCH_PREFIX } from "../../../utils/constants";

import { GithubLogo } from "../../logos/GithubLogo";

import { Icon } from "@iconify/react";
import verifiedCheckBold from "@iconify/icons-solar/verified-check-bold";
import closeCircleBroken from "@iconify/icons-solar/close-circle-broken";
import refreshBroken from "@iconify/icons-solar/refresh-broken";
import squareArrowRightUpBroken from "@iconify/icons-solar/square-arrow-right-up-broken";
import infoCircleBroken from "@iconify/icons-solar/info-circle-broken";
import { CustomTooltip } from "../../CustomTooltip";

const githubAppName = `vexilla-dev`;
// const githubAppName = `vexilla`;

const baseAuthCallbackUrl = `${window.location.protocol}//${window.location.host}/app/auth/callback`;

const githubClientId = import.meta.env.VITE_GITHUB_CLIENT_ID;

interface GithubFormProps {
  config: AppState;
  updateConfig: (newConfig: AppState) => void;
}

const buttonStyling = { backgroundColor: "black", color: "white" };
const disabledButtonStyling = {
  backgroundColor: "black",
  color: "white",
  opacity: 0.6,
};

export function GithubForm({ config, updateConfig }: GithubFormProps) {
  const {
    accessToken,
    installationId,
    repositoryId,
    repositoryName,
    owner,
    targetBranch,
  } =
    config.hosting.provider === "github"
      ? config.hosting.config
      : {
          accessToken: "",
          installationId: "",
          repositoryId: "",
          repositoryName: "",
          owner: "",
          targetBranch: "",
        };
  const [installations, setInstallations] = useState<Installation[]>([]);
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
      config.hosting.config.accessToken = "";
      config.hosting.config.installationId = "";
      config.hosting.config.repositoryId = "";
    } else {
      console.error(
        `Wrong hosting provider in github form: ${config.hosting.provider}`
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
  }

  useEffect(() => {
    async function fetchData() {
      try {
        if (accessToken && config.hosting.provider === "github") {
          const installationsResponse =
            await githubMethods.fetchInstallations();
          setInstallations(installationsResponse.installations);
          if (installations.length === 1) {
            config.hosting.config.installationId = `${installations[0].id}`;
          }
          if (installationId) {
            const repositoriesResponse = await githubMethods.fetchRepositories(
              installationId
            );
            setRepositories(repositoriesResponse.repositories);
            if (repositories.length === 1) {
              config.hosting.config.repositoryId = `${repositories[0].id}`;
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

        setBranches(fetchedBranches);
        if (
          fetchedBranches.length === 1 &&
          config.hosting.provider === "github"
        ) {
          console.log("fetchedBranches", fetchedBranches);
          config.hosting.config.targetBranch = fetchedBranches[0].name;
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

  return (
    <Timeline active={activeElement}>
      <Timeline.Item>
        <Flex direction="row" gap="0.5rem">
          <h4 className="m-0 p-0">Login</h4>
          <CustomTooltip
            tooltipText="You need to login via Github so that the app can make PRs on your
            behalf."
          />
        </Flex>

        <Flex direction="row" gap="0.5rem" align={"center"}>
          {!accessToken && (
            <Button
              style={buttonStyling}
              leftIcon={<GithubLogo />}
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
                leftIcon={<GithubLogo />}
                rightIcon={
                  <Icon width={20} icon={verifiedCheckBold} color="green" />
                }
                disabled
              >
                Logged in
              </Button>

              <ActionIcon
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

      <Timeline.Item title="Installation">
        <p>The app must be installed into a repo via the Github marketplace.</p>
        <Flex direction="row" align="center" gap="0.5rem">
          {!installationId && "No Installation"}
          {!installationId && installations.length === 0 && (
            <Button
              style={buttonStyling}
              leftIcon={<GithubLogo />}
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
              leftIcon={<GithubLogo />}
              rightIcon={
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
            onClick={() => {
              refresh();
            }}
          >
            <Icon icon={refreshBroken} width={24} />
          </ActionIcon>
        </Flex>
      </Timeline.Item>

      <Timeline.Item title="Repository">
        <Select
          value={repositoryId}
          onChange={(selectedRepositoryId) => {
            console.log({ selectedRepositoryId });
            if (config.hosting.provider === "github") {
              config.hosting.config.repositoryId = `${selectedRepositoryId}`;
              const repository = repositories.find(
                (repository) => `${repository.id}` === selectedRepositoryId
              );
              config.hosting.config.owner = repository?.owner.login || "";
              config.hosting.config.repositoryName = repository?.name || "";
            }
          }}
          data={repositories.map((repository) => ({
            label: repository.name,
            value: `${repository.id}`,
          }))}
        />

        <a
          className="flex p-2 text-center w-full items-center justify-center g q"
          href={`https://github.com/apps/${githubAppName}/installations/new`}
          target="_blank"
        >
          Edit your installation's repository access{" "}
          <Icon icon={squareArrowRightUpBroken} />
        </a>
      </Timeline.Item>
      <Timeline.Item title="Target Branch">
        <Select
          value={targetBranch}
          onChange={(selectedBranchName) => {
            if (config.hosting.provider === "github") {
              config.hosting.config.targetBranch = selectedBranchName || "";
            }
          }}
          data={branches
            .filter((branch) => {
              if (config.hosting.provider === "github") {
                return !branch.name.startsWith(
                  config.hosting.config.branchNamePrefix ||
                    DEFAULT_BRANCH_PREFIX
                );
              } else {
                return false;
              }
            })
            .map((branch) => ({
              label: branch.name,
              value: branch.name,
            }))}
        />
      </Timeline.Item>
    </Timeline>
  );
}
