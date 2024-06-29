import { GitHubFetcher } from "../components/app/forms/GithubForm.fetchers";
import { GitLabFetcher } from "../components/app/forms/GitlabForm.fetchers";
import { HostingProvider, AppState } from "../types";
import { Fetcher } from "./fetcher";

export const fetchersMap: Record<HostingProvider, () => Fetcher> = {
  "": () => {
    throw new Error("No fetcher found for empty provider");
  },
  github: () => new GitHubFetcher(),
  gitlab: () => new GitLabFetcher(),
  s3: () => {
    throw new Error("No fetcher found for S3 provider");
  },
  azure: () => {
    throw new Error("No fetcher found for Azure provider");
  },
  gcloud: () => {
    throw new Error("No fetcher found for GCP provider");
  },
  firebase: () => {
    throw new Error("No fetcher found for Firebase provider");
  },
};
