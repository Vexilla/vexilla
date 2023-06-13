import React from "react";
import { Button } from "@mantine/core";
import { AppState } from "@vexilla/types";

import { GithubLogo } from "../../logos/GithubLogo";

import { Icon } from "@iconify/react";
import verifiedCheckBold from "@iconify/icons-solar/verified-check-bold";

const githubAppName = `vexilla-dev`;
// const githubAppName = `vexilla`;

interface S3FormProps {
  config: AppState;
}

const buttonStyling = { backgroundColor: "black", color: "white" };
const disabledButtonStyling = {
  backgroundColor: "black",
  color: "white",
  opacity: 0.6,
};

export function GithubForm({ config }: S3FormProps) {
  return (
    <div>
      <h2>Installation</h2>
      <p>The app must be installed into a repo via the Github marketplace.</p>
      {!config.hosting?.config.installationId && (
        <Button
          style={buttonStyling}
          leftIcon={<GithubLogo />}
          onClick={() => {
            window.location.href = `https://github.com/apps/${githubAppName}/installations/new`;
          }}
        >
          Install
        </Button>
      )}

      {!!config.hosting?.config.installationId && (
        <Button
          variant="outline"
          style={disabledButtonStyling}
          leftIcon={<GithubLogo />}
          rightIcon={<Icon width={20} icon={verifiedCheckBold} color="green" />}
          disabled
        >
          Installed
        </Button>
      )}

      <h2>Login</h2>
      <p>
        You need to login via Github so that the app can make PRs on your
        behalf.
      </p>

      {!config.hosting?.config.accessToken && (
        <Button
          style={buttonStyling}
          leftIcon={<GithubLogo />}
          onClick={() => {
            window.location.href = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${encodeURIComponent(
              `${baseAuthCallbackUrl}/github`
            )}`;
          }}
        >
          Login
        </Button>
      )}

      {!!config.hosting?.config.accessToken && (
        <Button
          style={disabledButtonStyling}
          variant="outline"
          leftIcon={<GithubLogo />}
          rightIcon={<Icon width={20} icon={verifiedCheckBold} color="green" />}
          disabled
        >
          Logged in
        </Button>
      )}
    </div>
  );
}
