import {
  GetInstallationRepositoriesResponse,
  GetInstallationsResponse,
} from "./GithubForm.types";

const GITHUB_BASE_URL = `https://api.github.com`;
const commonHeaders = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

export async function fetchInstallations(accessToken: string) {
  const Authorization = `Bearer ${accessToken}`;

  const installationsResponse = await fetch(
    `${GITHUB_BASE_URL}/user/installations`,
    {
      headers: {
        ...commonHeaders,
        Authorization,
      },
    }
  );

  const installationsResponseBody: GetInstallationsResponse =
    await installationsResponse.json();

  if (installationsResponse.status !== 200) {
    console.log("Error fetching installations", installationsResponseBody);
    // config.hosting.config.accessToken = "";
    // updateConfig(config);
    throw new Error("Error fetching installations");
  } else {
    console.log({ installationsResponseBody });
    // setInstallations(installationsResponseBody.installations);
    // if (installationsResponseBody.installations.length === 1) {
    //   config.hosting.config.installationId =
    //     installationsResponseBody.installations[0].id;
    // }
    return installationsResponseBody.installations;
  }
}

export async function fetchRepositories(
  accessToken: string,
  installationId: string
) {
  const Authorization = `Bearer ${accessToken}`;
  const repositoriesResponse = await fetch(
    `${GITHUB_BASE_URL}/user/installations/${installationId}/repositories`,
    {
      headers: {
        ...commonHeaders,
        Authorization,
      },
    }
  );

  const repositoriesResponseBody: GetInstallationRepositoriesResponse =
    await repositoriesResponse.json();

  if (repositoriesResponse.status !== 200) {
    console.log("Repositories Error", repositoriesResponseBody);
    throw new Error("Error fetching repositories");
  } else {
    console.log("Repositories", repositoriesResponseBody.repositories);
    return repositoriesResponseBody.repositories;
    // setRepositories(repositoriesResponseBody.repositories);
  }
}
