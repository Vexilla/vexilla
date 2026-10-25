import _React, { useEffect, useState } from "react";
import { PageLayout } from "../../components/PageLayout";
import { config } from "../../stores/config-valtio";

import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { HostingProvider } from "../../types";

import {
  createGitHosting,
  hasValue,
  selectGitRepository,
} from "../../utils/fetcher";

const BASE_URL = import.meta.env.VITE_AUTH_BASE_URL;

export function AuthCallback() {
  const { provider } = useParams<{ provider: HostingProvider }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function exchangeCode() {
      try {
        if (
          provider !== "github" &&
          provider !== "gitlab" &&
          provider !== "bitbucket"
        ) {
          throw new Error("Unsupported authentication provider");
        }
        const response = await fetch(`${BASE_URL}/oauth/${provider}`, {
          method: "POST",
          signal: controller.signal,
          body: JSON.stringify({ code: searchParams.get("code") }),
        });

        if (response.status !== 200) {
          throw new Error("Failed to exchange code for token");
        }

        const body = await response.json();
        if (!active) {
          return;
        }

        const accessToken: unknown = body.access_token;
        if (!hasValue(accessToken)) {
          throw new Error("Missing access token");
        }
        const installationId = searchParams.get("installation_id");
        const previous = config.hosting;
        const hosting = createGitHosting(provider);
        if (previous.provider === provider && previous.providerType === "git") {
          Object.assign(hosting, previous);
        }
        hosting.accessToken = accessToken;
        if (hosting.provider === "github" && installationId) {
          if (hosting.installationId !== installationId) {
            selectGitRepository(hosting);
          }
          hosting.installationId = installationId;
        }
        config.hosting = hosting;
        navigate("/?logged_in");
      } catch {
        if (!active) {
          return;
        }
        setError("Unable to sign in. Please retry.");
      }
    }

    void exchangeCode();
    return () => {
      active = false;
      controller.abort();
    };
  }, [provider, searchParams, navigate]);
  return (
    <PageLayout>
      {error ? <div role="alert">{error}</div> : "Signing in…"}
    </PageLayout>
  );
}
