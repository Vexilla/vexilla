import _React, { PropsWithChildren } from "react";
import {
  Timeline,
  Select,
  ActionIcon,
  Flex,
  Switch,
  Box,
  TextInput,
} from "@mantine/core";

import { AppState } from "@vexilla/types";

import { DEFAULT_BRANCH_PREFIX } from "../../../utils/constants";
import { TimelineItemTitle } from "../../TimelineItemTitle";

import { Icon } from "@iconify/react";
import refreshBroken from "@iconify/icons-solar/refresh-broken";
import squareArrowRightUpBroken from "@iconify/icons-solar/square-arrow-right-up-broken";
import { Branch, Repository } from "./_GitForm.types";
import { HostingConfigGitBase } from "@vexilla/hosts";
import { HostingConfigGithub } from "@vexilla/hosts";

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
}: PropsWithChildren<{
  totalElements: number;
  activeElement: number;
  config: AppState;
  updateConfig: (newConfig: AppState) => void;
  repositories: Repository[];
  repositoryId: string;
  targetBranch: string;
  branches: Branch[];
  refresh: () => void;
}>) {
  const hosting = config?.hosting as HostingConfigGitBase;

  return (
    <Box>
      <Timeline active={activeElement + 1}>
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
              onChange={(selectedRepositoryId) => {
                if (hosting.provider === "github") {
                  const githubHosting = hosting as HostingConfigGithub;
                  hosting.repositoryId = `${selectedRepositoryId}`;
                  const repository = repositories.find(
                    (repository) => `${repository.id}` === selectedRepositoryId
                  );
                  githubHosting.owner = repository?.owner || "";
                  githubHosting.repositoryName = repository?.name || "";
                }
              }}
              data={repositories.map((repository) => ({
                label: repository.name,
                value: `${repository.id}`,
              }))}
            />

            <ActionIcon
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
              value={targetBranch}
              onChange={(selectedBranchName) => {
                if (hosting.provider === "github") {
                  hosting.targetBranch = selectedBranchName || "";
                }
              }}
              data={branches
                .filter((branch) => {
                  if (hosting.provider === "github") {
                    return !branch.name.startsWith(
                      hosting.branchNamePrefix || DEFAULT_BRANCH_PREFIX
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

            <ActionIcon
              onClick={() => {
                refresh();
              }}
            >
              <Icon icon={refreshBroken} width={24} />
            </ActionIcon>
          </Flex>
        </Timeline.Item>
      </Timeline>
    </Box>
  );
}
