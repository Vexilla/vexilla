import { GitHubFetcher } from "../components/app/forms/GithubForm.fetchers";
import { HostingProvider, AppState } from "../types";
import { Fetcher } from "./fetcher";

export const fetchersMap: Record<
  HostingProvider,
  (config: AppState) => Fetcher
> = {
  "": () => {
    throw new Error("No fetcher found for empty provider");
  },
  github: (config) => new GitHubFetcher(config),
  s3: () => {
    throw new Error("No fetcher found for S3 provider");
  },
  azure: () => {
    throw new Error("No fetcher found for S3 provider");
  },
  gcloud: () => {
    throw new Error("No fetcher found for S3 provider");
  },
  firebase: () => {
    throw new Error("No fetcher found for S3 provider");
  },
};
