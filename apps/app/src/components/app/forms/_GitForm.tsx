import {
  PropsWithChildren,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSnapshot } from "valtio";
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

import { AppState, HostingConfigGitBase } from "../../../types";
import {
  GitFetcher,
  gitLocationKey,
  isGitUnauthorized,
} from "../../../utils/fetcher";
import {
  captureRemoteRead,
  isRemoteReadContextCurrent,
  isRemoteReadCurrent,
  remoteMetadata,
  remoteReadAuthority,
  requestRemoteRead,
} from "../../../stores/config-valtio";

import { DEFAULT_BRANCH_PREFIX } from "../../../utils/constants";
import { TimelineItemTitle } from "../../TimelineItemTitle";

import { Icon } from "@iconify/react";
import refreshBroken from "@iconify/icons-solar/refresh-broken";
import type { Branch, Repository } from "./_GitForm.types";

export function GitForm({
  config,
  activeElement,
  children,
  repositories,
  repositoryId,
  targetBranch,
  branches,
  refresh,
  refreshTimestamp,
  fetcher,
  initializeBranch,
  onRepositoryChange,
  repositoryAction,
  repositoryTooltip,
  errors = [],
}: PropsWithChildren<{
  activeElement: number;
  config: AppState;
  repositories: Repository[];
  repositoryId: string;
  targetBranch?: string;
  branches: Branch[];
  refresh: () => void;
  refreshTimestamp: number;
  fetcher: GitFetcher;
  initializeBranch?: (
    repositoryId: string,
    branchName: string
  ) => Promise<void>;
  onRepositoryChange: (id: string | null) => void;
  repositoryAction?: ReactNode;
  repositoryTooltip?: string;
  errors?: string[];
}>) {
  const hosting = config?.hosting as HostingConfigGitBase;
  const metadata = useSnapshot(remoteMetadata);
  const authority = useSnapshot(remoteReadAuthority);
  const [validationResult, setValidationResult] = useState({
    context: "",
    generation: -1,
    error: "",
  });
  const [initializingContext, setInitializingContext] = useState("");
  const pendingInitialization = useRef<ReturnType<typeof captureRemoteRead>>();

  const repository = repositories.find(
    (repository) => `${repository.id}` === repositoryId
  );

  const branchOptions =
    branches.length === 0
      ? [
          ...new Set(
            [targetBranch, repository?.defaultBranch].filter(
              (name): name is string => Boolean(name)
            )
          ),
        ].map((name) => ({ label: name, value: name }))
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

  const validationContext = fetcher.getReadContextKey(config.hosting);
  const validationReady = fetcher.isRepositoryReady(config.hosting);
  const availabilityCurrent =
    isRemoteReadContextCurrent() &&
    metadata.locationKey === gitLocationKey(config.hosting);
  const initializationRequired =
    fetcher.usesReadPreparation &&
    availabilityCurrent &&
    metadata.status === "initialization-required";
  const initializationPending = fetcher.usesReadPreparation
    ? availabilityCurrent && metadata.status === "initializing"
    : initializingContext === validationContext;
  const validationCurrent =
    validationResult.context === validationContext &&
    validationResult.generation === authority.generation;
  const legacyInitializationRequired =
    !fetcher.usesReadPreparation &&
    validationCurrent &&
    !validationResult.error &&
    !hosting.branchIsValid;

  useEffect(() => {
    let active = true;
    const ticket = captureRemoteRead();
    const key = fetcher.getReadContextKey(config.hosting);
    const isCurrent = () =>
      active &&
      isRemoteReadCurrent(ticket) &&
      key === fetcher.getReadContextKey(config.hosting);
    async function getBranchValidity() {
      // Prepared providers establish branch validity through the shared read
      // owner, including the verification after initialization.
      if (!fetcher.usesReadPreparation && validationReady && targetBranch) {
        setValidationResult({ context: "", generation: -1, error: "" });
        try {
          const valid = await fetcher.isBranchValid(targetBranch);
          if (isCurrent()) {
            hosting.branchIsValid = valid;
            setValidationResult({
              context: key,
              generation: ticket.generation,
              error: "",
            });
          }
        } catch (error) {
          if (
            isCurrent() &&
            isGitUnauthorized(error) &&
            hosting.providerType === "git"
          ) {
            hosting.accessToken = "";
          } else if (isCurrent()) {
            setValidationResult({
              context: key,
              generation: ticket.generation,
              error: "Could not validate this branch. Refresh to try again.",
            });
          }
        }
      }
    }
    void getBranchValidity();
    return () => {
      active = false;
    };
  }, [
    config,
    hosting,
    fetcher,
    targetBranch,
    repositoryId,
    validationReady,
    validationContext,
    refreshTimestamp,
    authority.generation,
  ]);

  return (
    <Box w="100%">
      {errors.map((error) => (
        <Text role="alert" c="red" key={error} mb="sm">
          {error}
        </Text>
      ))}
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
            tooltipText={repositoryTooltip}
          />
          <Flex direction="row" align="center" gap="0.5rem">
            <Select
              aria-label="Repository"
              clearable
              clearButtonProps={{
                "aria-label": "Clear repository selection",
                "aria-hidden": false,
                tabIndex: 0,
              }}
              value={repositoryId || null}
              w={"100%"}
              onChange={onRepositoryChange}
              data={repositories.map((repository) => ({
                label: `${repository.owner}/${repository.name}`,
                value: `${repository.id}`,
              }))}
            />

            {repositoryAction}
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
              aria-label="Target Branch"
              value={targetBranch || repository?.defaultBranch || null}
              onChange={async (selectedBranchName) => {
                if (hosting.providerType === "git") {
                  hosting.branchIsValid = false;
                  hosting.targetBranch = selectedBranchName || "";
                }
              }}
              data={branchOptions}
            />

            <ActionIcon
              aria-label="Refresh repositories and branches"
              variant="subtle"
              disabled={initializationPending}
              onClick={() => {
                refresh();
              }}
            >
              <Icon icon={refreshBroken} width={24} />
            </ActionIcon>
          </Flex>

          {validationCurrent && validationResult.error && (
            <Text role="alert" c="red" mt="sm">
              {validationResult.error}
            </Text>
          )}

          {fetcher.usesReadPreparation &&
            availabilityCurrent &&
            metadata.status === "loading" && (
              <Text role="status" mt="sm">
                Checking the selected repository…
              </Text>
            )}

          {fetcher.usesReadPreparation &&
            availabilityCurrent &&
            authority.initializationError && (
              <Text role="alert" c="red" mt="sm">
                {authority.initializationError}
              </Text>
            )}

          {fetcher.usesReadPreparation &&
            availabilityCurrent &&
            metadata.status === "error" && (
              <Flex direction="column" gap="sm" mt="sm">
                <Text role="alert" c="red">
                  {metadata.readError}
                </Text>
                <Button variant="outline" onClick={refresh}>
                  Retry repository read
                </Button>
              </Flex>
            )}

          {Boolean(hosting.provider) &&
            Boolean(hosting.repositoryId) &&
            Boolean(hosting.targetBranch) &&
            (initializationRequired ||
              initializationPending ||
              legacyInitializationRequired) && (
              <Flex direction="column" className="bg-red-50 mt-2 rounded p-2">
                <Text fw="bold">
                  {fetcher.usesReadPreparation
                    ? "This repository needs initialization."
                    : "This repo or branch is empty."}
                </Text>
                <Text>
                  {initializationPending
                    ? "Initializing the selected branch…"
                    : "You can initialize it with a README file by clicking the button below."}
                </Text>
                <Button
                  className="mt-2"
                  disabled={!initializeBranch || initializationPending}
                  loading={initializationPending}
                  onClick={async () => {
                    if (
                      targetBranch &&
                      initializeBranch &&
                      !initializationPending &&
                      (fetcher.usesReadPreparation ||
                        pendingInitialization.current?.context !==
                          captureRemoteRead().context)
                    ) {
                      if (fetcher.usesReadPreparation) {
                        // The shared operation guards availability and duplicate
                        // writes, then asks the read owner to verify the result.
                        try {
                          await initializeBranch(repositoryId, targetBranch);
                        } catch {
                          // Safe failure feedback belongs to shared read state
                          // and survives the authoritative availability recheck.
                        }
                        return;
                      }
                      const ticket = captureRemoteRead();
                      const key = fetcher.getReadContextKey(config.hosting);
                      pendingInitialization.current = ticket;
                      setInitializingContext(key);
                      try {
                        await initializeBranch(repositoryId, targetBranch);
                        if (
                          !isRemoteReadCurrent(ticket) ||
                          key !== fetcher.getReadContextKey(config.hosting)
                        ) {
                          return;
                        }
                        notifications.show({
                          type: "success",
                          message: "Branch initialized successfully.",
                        });
                        hosting.branchIsValid = true;
                        refresh();
                        requestRemoteRead();
                      } catch {
                        if (isRemoteReadCurrent(ticket)) {
                          notifications.show({
                            type: "error",
                            message: "Error initializing branch.",
                          });
                        }
                      } finally {
                        if (pendingInitialization.current === ticket) {
                          pendingInitialization.current = undefined;
                          setInitializingContext("");
                        }
                      }
                    }
                  }}
                >
                  {initializationPending ? "Initializing…" : "Initialize"}
                </Button>
              </Flex>
            )}
        </Timeline.Item>
      </Timeline>
    </Box>
  );
}
