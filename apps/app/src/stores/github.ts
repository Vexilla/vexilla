import { proxy, subscribe } from "valtio";

const GITHUB_KEY = "github";

interface GithubConfig {
  installations: string[];
  repositories: string[];
}

export const githubConfig = proxy<GithubConfig>(
  JSON.parse(localStorage.getItem(GITHUB_KEY) || "false") || {
    installations: [],
    repositories: [],
  }
);

subscribe(githubConfig, () => {
  localStorage.setItem(GITHUB_KEY, JSON.stringify(githubConfig));
});
