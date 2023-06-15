import { AppState } from "@vexilla/types";

export class Fetcher {
  protected config: AppState;

  constructor(config: AppState) {
    this.config = config;
  }

  publish() {
    throw new Error("publish() not implemented");
  }
}

export class GitFetcher extends Fetcher {
  getRepositories() {
    throw new Error("getRepositories() not implemented");
  }

  getBranches(branch: string) {
    throw new Error("getBranches() not implemented");
  }
}
