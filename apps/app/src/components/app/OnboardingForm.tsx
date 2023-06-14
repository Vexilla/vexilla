import React from "react";
import { Select, Flex } from "@mantine/core";
import { AppState } from "@vexilla/types";
import { snapshot } from "valtio";
import { EmptyForm } from "./forms/_EmptyForm";
import { GithubForm } from "./forms/GithubForm";
import { HostingProvider } from "@vexilla/hosts";

const formMap = {
  "": EmptyForm,
  github: GithubForm,
  bitbucket: EmptyForm,
  gitlab: EmptyForm,
  gitea: EmptyForm,
  s3: EmptyForm,
  gcloud: EmptyForm,
  azure: EmptyForm,
  firebase: EmptyForm,
};

interface OnboardingFormProps {
  config: AppState;
  // updateConfig: (newConfig: AppState) => void | Promise<void>;
  updateProvider: (newProvider: HostingProvider) => void | Promise<void>;
}

const providerLabels = {
  git: "Git-based",
  direct: "Direct Upload",
};

const providers = [
  { value: "", label: "No Provider Selected", group: " " },
  { value: "github", label: "GitHub", group: providerLabels.git },

  { value: "bitbucket", label: "BitBucket", group: providerLabels.git },

  { value: "s3", label: "AWS S3", group: providerLabels.direct },
  { value: "gcloud", label: "Google Cloud", group: providerLabels.direct },
  { value: "azure", label: "MS Azure", group: providerLabels.direct },
];

export function OnboardingForm({
  config,
  updateProvider,
}: OnboardingFormProps) {
  const configSnapshot = snapshot(config);

  const formComponent = formMap[configSnapshot?.hosting?.provider || ""];

  return (
    <div className="min-h-[300px]">
      <Select
        label="Select a Provider"
        data={providers}
        value={configSnapshot.hosting?.provider || ""}
        onChange={(newProvider: HostingProvider) => {
          updateProvider(newProvider || "");
        }}
      />

      <Flex py={"2rem"} px={"1rem"}>
        {formComponent({
          config,
          updateConfig: () => {
            console.log("update config");
          },
        })}
      </Flex>
    </div>
  );
}
