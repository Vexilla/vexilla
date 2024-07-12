import _React, { PropsWithChildren, useEffect, useState } from "react";
import {
  Timeline,
  Select,
  ActionIcon,
  Flex,
  Switch,
  Box,
  TextInput,
  Text,
  Button,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";

import {
  AppState,
  HostingConfigBitbucket,
  HostingConfigGitBase,
  HostingConfigGitLab,
  HostingConfigGithub,
} from "../../../types";

import { DEFAULT_BRANCH_PREFIX } from "../../../utils/constants";
import { TimelineItemTitle } from "../../TimelineItemTitle";

import { Icon } from "@iconify/react";
import refreshBroken from "@iconify/icons-solar/refresh-broken";
import squareArrowRightUpBroken from "@iconify/icons-solar/square-arrow-right-up-broken";
import type { Branch, Repository } from "./_GitForm.types";

const GITHUB_APP_NAME = import.meta.env.VITE_GITHUB_APP_NAME;

export function GitForm({
  config,
  activeElement,
  children,
  repositories,
  repositoryId,
  targetBranch,
  branches,
  refresh,
  isTargetBranchValid,
  initializeBranch,
}: PropsWithChildren<{
  totalElements: number;
  activeElement: number;
  config: AppState;
  updateConfig: (newConfig: AppState) => void;
  repositories: Repository[];
  repositoryId: string;
  targetBranch?: string;
  branches: Branch[];
  refresh: () => void;
  isTargetBranchValid: (branchName: string) => Promise<boolean>;
  initializeBranch: (repositoryId: string, branchName: string) => Promise<void>;
}>) {
  const hosting = config?.hosting as HostingConfigGitBase;

  const repository = repositories.find(
    (repository) => `${repository.id}` === repositoryId
  );

  const branchOptions =
    branches.length === 0
      ? [
          {
            label: repository?.defaultBranch || "",
            value: repository?.defaultBranch || "",
          },
        ]
      : branches
          .filter((branch) => {
            const prefix = hosting.branchNamePrefix || DEFAULT_BRANCH_PREFIX;
            if (prefix && hosting.providerType === "git") {
              return !branch.name.startsWith(prefix);
            } else {
              return false;
            }
          })
          .map((branch) => ({
            label: branch.name,
            value: branch.name,
          }));

  useEffect(() => {
    async function getBranchValidity() {
      console.log("Getting branch validity", { targetBranch, repositoryId });
      if (targetBranch) {
        const valid = await isTargetBranchValid(targetBranch);
        console.log("useEffect: checking if branch is valid", valid);
        hosting.branchIsValid = valid;
      }
    }

    getBranchValidity();
  }, [targetBranch, repositoryId]);

  console.log("GitForm", { targetBranch, branches });

  return (
    <Box w="100%">
      <Timeline active={activeElement}>
        <Timeline.Item>
          <TimelineItemTitle title="Git-specific Config" />
          <Flex direction="column" gap="0.5rem">
            <Switch
              checked={hosting.shouldCreatePullRequest}
              label="Create pull Request?"
              onChange={(event) => {
                hosting.shouldCreatePullRequest = event.currentTarget.checked;
              }}
            />
            {!!hosting.shouldCreatePullRequest && (
              <TextInput
                label="Branch Name Prefix"
                value={hosting.branchNamePrefix || ""}
                required
                onInput={(event) => {
                  hosting.branchNamePrefix = event.currentTarget.value;
                }}
              />
            )}
          </Flex>
        </Timeline.Item>

        {children}

        <Timeline.Item>
          <TimelineItemTitle
            title="Repository"
            tooltipText="This depends on which repos you installed the Github App into."
          />
          <Flex direction="row" align="center" gap="0.5rem">
            <Select
              value={repositoryId}
              w={"100%"}
              onChange={async (selectedRepositoryId) => {
                if (hosting.provider === "github") {
                  const githubHosting =
                    hosting as unknown as HostingConfigGithub;
                  hosting.repositoryId = `${selectedRepositoryId}`;
                  const repository = repositories.find(
                    (repository) => `${repository.id}` === selectedRepositoryId
                  );
                  githubHosting.owner = repository?.owner || "";
                  githubHosting.repositoryName = repository?.name || "";
                } else if (hosting.provider === "gitlab") {
                  const gitlabHosting =
                    hosting as unknown as HostingConfigGitLab;
                  const repository = repositories.find(
                    (repository) => `${repository.id}` === selectedRepositoryId
                  );

                  gitlabHosting.repositoryId = `${selectedRepositoryId}`;
                  gitlabHosting.owner = repository?.owner || "";
                  gitlabHosting.repositoryName = repository?.name || "";

                  gitlabHosting.targetBranch = repository?.defaultBranch;
                } else if (hosting.provider === "bitbucket") {
                  const bitbucketHosting =
                    hosting as unknown as HostingConfigBitbucket;
                  const repository = repositories.find(
                    (repository) => `${repository.id}` === selectedRepositoryId
                  );

                  console.log("REPOSITORIES", { repositories });
                  console.log({ branches });

                  bitbucketHosting.repositoryId = `${selectedRepositoryId}`;
                  bitbucketHosting.owner = repository?.owner || "";
                  bitbucketHosting.repositoryName = repository?.name || "";

                  bitbucketHosting.targetBranch = repository?.defaultBranch;
                }
              }}
              data={repositories.map((repository) => ({
                label: repository.name,
                value: `${repository.id}`,
              }))}
            />

            <ActionIcon
              variant="subtle"
              title="Edit your installation's repository access"
              onClick={() => {
                window
                  ?.open(
                    `https://github.com/apps/${GITHUB_APP_NAME}/installations/new`,
                    "_blank"
                  )
                  ?.focus();
              }}
            >
              <Icon icon={squareArrowRightUpBroken} width={24} />
            </ActionIcon>
          </Flex>
        </Timeline.Item>
        <Timeline.Item>
          <TimelineItemTitle
            title="Target Branch"
            tooltipText="Choose the branch that you would like to publish changes to."
          />

          <Flex direction="row" align="center" gap="0.5rem">
            <Select
              w="100%"
              value={targetBranch || repository?.defaultBranch}
              onChange={async (selectedBranchName) => {
                if (hosting.provider === "github") {
                  hosting.targetBranch = selectedBranchName || "";
                }
              }}
              data={branchOptions}
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

          {Boolean(hosting.provider) &&
            Boolean(hosting.repositoryId) &&
            Boolean(hosting.targetBranch) &&
            !hosting.branchIsValid && (
              <Flex direction="column" className="bg-red-50 mt-2 rounded p-2">
                <Text fw="bold">This repo or branch is empty.</Text>
                <Text>
                  You can initialize it with a README file by clicking the
                  button below.
                </Text>
                <Button
                  className="mt-2"
                  onClick={async () => {
                    // create commit on repository and target branch with README CONTENTS
                    if (targetBranch) {
                      try {
                        await initializeBranch(repositoryId, targetBranch);
                        notifications.show({
                          type: "success",
                          message: "Branch initialized successfully.",
                        });
                        hosting.branchIsValid = true;
                      } catch (e: any) {
                        notifications.show({
                          type: "error",
                          message: "Error initializing branch.",
                        });
                      }
                    } else {
                    }
                  }}
                >
                  Initialize
                </Button>
              </Flex>
            )}
        </Timeline.Item>
      </Timeline>
    </Box>
  );
}
