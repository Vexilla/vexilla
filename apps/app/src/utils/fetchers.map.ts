import { HostingProvider } from "@vexilla/hosts";
import { GitHubFetcher } from "../components/app/forms/GithubForm.fetchers";
import { Fetcher } from "./fetcher";
import { AppState } from "@vexilla/types";

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
};
