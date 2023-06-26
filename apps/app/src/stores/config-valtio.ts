import { AppState } from "@vexilla/types";
import { proxy, subscribe } from "valtio";
import { derive } from "valtio/utils";
import { z } from "zod";
import microdiff from "microdiff";
import { HostingConfigValidators } from "../utils/validators";

const CONFIG_KEY = "config";

export const config = proxy<AppState>(
  JSON.parse(localStorage.getItem(CONFIG_KEY) || "false") || {
    modifiedAt: 0,
    groups: [],
    hosting: {
      provider: "",
      config: {
        provider: "",
        providerType: "",
      },
    },
  }
);

subscribe(config, () => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
});

export const previousConfig = proxy<AppState>({
  modifiedAt: 0,
  groups: [],
  hosting: {
    provider: "",
    providerType: "",
  },
});

// export const HostingConfigValidators: Record<
//   z.infer<typeof HostingProviderValidator>,
//   z.AnyZodObject
// > = {
//   github: HostingConfigGithubValidator,
//   s3: HostingConfigS3Validator,
//   azure: HostingConfigAzureValidator,
//   gcloud: HostingConfigGcloudValidator,
//   firebase: HostingConfigFirebaseValidator,
// };

export const validation = derive({
  result: (get) => {
    const currentConfig = get(config);
    const provider = currentConfig.hosting.provider;

    if (provider !== "") {
      const validator = HostingConfigValidators[provider];
      const result = validator.safeParse(currentConfig.hosting);
      console.log({ result });
      return result;
    } else {
      return {
        success: false,
        error: new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            path: ["provider"],
            message: "Empty provider is invalid",
          },
        ]),
      };
    }
  },
});

export const differences = derive({
  result: (get) => {
    const currentConfig = get(config);
    const currentPreviousConfig = get(previousConfig);

    return microdiff(currentConfig, currentPreviousConfig);
  },
});
