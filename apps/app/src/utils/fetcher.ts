import { AppState } from "@vexilla/types";

export class Fetcher {
  protected config: AppState;

  constructor(config: AppState) {
    this.config = config;
  }

  async publish(
    _branchName: string,
    _files: {
      content: string;
      filePath: string;
    }[]
  ) {
    throw new Error("publish() not implemented");
  }

  async getCurrentConfig(): Promise<AppState> {
    throw new Error("getCurrentConfig() not implemented");
  }
}

export class GitFetcher extends Fetcher {
  async getRepositories() {
    throw new Error("getRepositories() not implemented");
  }

  async getBranches(_branch: string) {
    throw new Error("getBranches() not implemented");
  }
}
