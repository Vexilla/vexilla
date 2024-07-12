import { z } from "zod";

export const HostingProviderValidator = z.enum([
  // git providers
  "github",
  "gitlab",
  "bitbucket",
  // direct providers
  "azure",
  "gcloud",
  "firebase",
  "s3",
]);

export const HostingProviderTypeValidator = z.enum(["git", "direct"]);

export const HostingConfigBaseValidator = z.object({
  provider: HostingProviderValidator,
  providerType: HostingProviderTypeValidator,
});

export const HostingConfigGitBaseValidator = HostingConfigBaseValidator.extend({
  accessToken: z.string().min(1),
  repositoryId: z.string().min(1),
  targetBranch: z.string().min(1),
  shouldCreatePullRequest: z.boolean(),
  branchNamePrefix: z.string(),
  branchIsValid: z.literal<boolean>(true),
});

export const HostingConfigGitHubValidator =
  HostingConfigGitBaseValidator.extend({
    provider: z.literal("github"),
    providerType: z.literal("git"),
    installationId: z.string().min(1),
    repositoryName: z.string().min(1),
    owner: z.string().min(1),
  });

export const HostingConfigGitLabValidator =
  HostingConfigGitBaseValidator.extend({
    provider: z.literal("gitlab"),
    providerType: z.literal("git"),
    // installationId: z.string().min(1),
    repositoryName: z.string().min(1),
    owner: z.string().min(1),
  });

export const HostingConfigBitbucketValidator =
  HostingConfigGitBaseValidator.extend({
    provider: z.literal("bitbucket"),
    providerType: z.literal("git"),
    workspaceId: z.string().min(1),
    repositoryName: z.string().min(1),
    owner: z.string().min(1),
  });

export const HostingConfigS3Validator = HostingConfigBaseValidator.extend({
  provider: z.literal("s3"),
  providerType: z.literal("direct"),
  region: z.string().min(1),
  bucketName: z.string().min(1),
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
});

export const HostingConfigGcloudValidator = HostingConfigBaseValidator.extend({
  provider: z.literal("gcloud"),
  providerType: z.literal("direct"),
  bucket: z.string().min(1),
  accessKey: z.string().min(1),
  secretAccessKey: z.string().min(1),
});

export const HostingConfigFirebaseValidator = HostingConfigBaseValidator.extend(
  {
    provider: z.literal("firebase"),
    providerType: z.literal("direct"),
    remoteUrl: z.string().min(1),
    bucketName: z.string().min(1),
    apiKey: z.string().min(1),
  }
);

export const HostingConfigAzureValidator = HostingConfigBaseValidator.extend({
  provider: z.literal("azure"),
  providerType: z.literal("direct"),
  remoteUrl: z.string().min(1),
  storageAccount: z.string().min(1),
  container: z.string().min(1),
  sharedAccessSignature: z.string().min(1),
});

export const HostingConfigValidators: Record<
  z.infer<typeof HostingProviderValidator>,
  z.AnyZodObject
> = {
  github: HostingConfigGitHubValidator,
  gitlab: HostingConfigGitLabValidator,
  bitbucket: HostingConfigBitbucketValidator,
  s3: HostingConfigS3Validator,
  azure: HostingConfigAzureValidator,
  gcloud: HostingConfigGcloudValidator,
  firebase: HostingConfigFirebaseValidator,
};
