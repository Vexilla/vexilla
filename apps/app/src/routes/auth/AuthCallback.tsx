import _React, { useEffect, useState } from "react";
import { PageLayout } from "../../components/PageLayout";
import { config } from "../../stores/config-valtio";

import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { HostingProvider, HostingConfig } from "../../types";

const BASE_URL = import.meta.env.VITE_AUTH_BASE_URL;

export function AuthCallback() {
  let { provider } = useParams<{ provider: HostingProvider }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function exchangeCode() {
      try {
        if (!provider) {
          return;
        }
        setIsFetching(true);
        const response = await fetch(`${BASE_URL}/oauth/${provider}`, {
          method: "POST",
          body: JSON.stringify({ code: searchParams.get("code") }),
        });

        if (response.status !== 200) {
          throw new Error("Failed to exchange code for token");
        }

        const body = await response.json();

        const accessToken = body.access_token as string;
        const installationId = searchParams.get("installation_id") || undefined;

        const newHostingConfig = {
          provider,
          providerType: "git",
          accessToken,
          installationId,
        } as HostingConfig;

        if (!config.hosting) {
          config.hosting = newHostingConfig;
        } else if (config.hosting.provider !== provider) {
          config.hosting.provider = provider;
          config.hosting = newHostingConfig;
        } else if (config.hosting.provider === "github") {
          config.hosting.accessToken = accessToken;
          if (installationId) {
            config.hosting.installationId = installationId;
          }
        }
        navigate("/?logged_in");
      } catch (e: any) {
        console.log({ e });
        setError(e?.message || "error");
      } finally {
        setIsFetching(false);
      }
    }

    exchangeCode();
  }, [searchParams]);
  return (
    <PageLayout>
      {!error && !isFetching && "Auth Callback"}

      {!!error && !isFetching && "Error"}

      {!error && !isFetching && "Success"}
    </PageLayout>
  );
}
