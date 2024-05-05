import _React, { useState } from "react";
import { Select, Flex } from "@mantine/core";
import { AppState } from "@vexilla/types";
import { useSnapshot } from "valtio";
import { EmptyForm } from "./forms/_EmptyForm";
import { GithubForm } from "./forms/GithubForm";
import { HostingProvider, HostingProviderType } from "@vexilla/hosts";
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

const selectableProviders: {
  group: string;
  items: {
    value: string;
    label: string;
    providerType: HostingProviderType;
  }[];
}[] = [
  {
    group: "",
    items: [{ value: "", label: "No Provider Selected", providerType: "" }],
  },
  {
    group: providerLabels.git,
    items: [
      {
        value: "github",
        label: "GitHub",
        providerType: "git",
      },

      // { value: "bitbucket", label: "BitBucket", providerType: "git" },
    ],
  },

  {
    group: providerLabels.direct,
    items: [
      {
        value: "s3",
        label: "AWS S3",
        providerType: "direct",
      },
      // { value: "gcloud", label: "Google Cloud",       providerType: "direct", },
      // { value: "azure", label: "MS Azure", providerType: "direct",},
    ],
  },
];

export function OnboardingForm({
  config,
  updateProvider,
}: OnboardingFormProps) {
  const configSnapshot = useSnapshot(config);
  const [_providerType, setProviderType] = useState(
    configSnapshot?.hosting?.providerType
  );

  const FormComponent = formMap[configSnapshot?.hosting?.provider || ""];

  return (
    <div className="min-h-[300px]">
      <Select
        label="Select a Provider"
        data={selectableProviders}
        value={configSnapshot.hosting?.provider || ""}
        onChange={(newProviderValue) => {
          const newProvider = (newProviderValue || "") as HostingProvider;

          const newProviderGroup = selectableProviders.find((providerGroup) => {
            return Boolean(
              providerGroup.items.find((provider) => {
                if (provider.value === newProvider) {
                  return true;
                }
                return false;
              })
            );
          });

          const newProviderType =
            newProviderGroup?.items.find((provider) => {
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
