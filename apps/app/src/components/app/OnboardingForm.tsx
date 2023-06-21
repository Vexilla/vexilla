import React, { useState } from "react";
import { Select, Flex, Switch } from "@mantine/core";
import { AppState } from "@vexilla/types";
import { snapshot, useSnapshot } from "valtio";
import { EmptyForm } from "./forms/_EmptyForm";
import { GithubForm } from "./forms/GithubForm";
import { Hosting, HostingProvider, HostingProviderType } from "@vexilla/hosts";
import { omit } from "lodash-es";

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
  updateProvider: (newProviderData: {
    provider: HostingProvider;
    providerType: HostingProviderType;
  }) => void | Promise<void>;
}

const providerLabels = {
  git: "Git-based",
  direct: "Direct Upload",
};

const providers: {
  value: string;
  label: string;
  group?: string;
  providerType: HostingProviderType;
}[] = [
  { value: "", label: "No Provider Selected", group: " ", providerType: "" },
  {
    value: "github",
    label: "GitHub",
    group: providerLabels.git,
    providerType: "git",
  },

  // { value: "bitbucket", label: "BitBucket", group: providerLabels.git },

  {
    value: "s3",
    label: "AWS S3",
    group: providerLabels.direct,
    providerType: "direct",
  },
  // { value: "gcloud", label: "Google Cloud", group: providerLabels.direct },
  // { value: "azure", label: "MS Azure", group: providerLabels.direct },
];

const selectableProviders = providers.map((provider) =>
  omit(provider, "providerType")
);

export function OnboardingForm({
  config,
  updateProvider,
}: OnboardingFormProps) {
  const configSnapshot = useSnapshot(config);
  const [providerType, setProviderType] = useState(
    configSnapshot?.hosting?.provider
  );

  const FormComponent = formMap[configSnapshot?.hosting?.provider || ""];

  return (
    <div className="min-h-[300px]">
      <Select
        label="Select a Provider"
        data={selectableProviders}
        value={configSnapshot.hosting?.provider || ""}
        onChange={(newProvider: HostingProvider) => {
          const newProviderType =
            providers.find((provider) => {
              if (provider.value === newProvider) {
                return true;
              }
              return false;
            })?.providerType || "";

          setProviderType(newProviderType);
          updateProvider({
            provider: newProvider || "",
            providerType: newProviderType,
          });
        }}
      />
      <Flex py={"2rem"} px={"1rem"}>
        <FormComponent
          config={config}
          updateConfig={() => {
            console.log("update config");
          }}
        />
      </Flex>
    </div>
  );
}
