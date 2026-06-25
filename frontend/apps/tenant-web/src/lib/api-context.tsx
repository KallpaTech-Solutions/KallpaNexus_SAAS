"use client";

import {
  createApiClient,
  createTenantSportApi,
  type TenantSportApi,
} from "@kallpanexus/api-client";
import { getDevTenantSubdomain, getTenantApiClientBaseUrl } from "@kallpanexus/env";
import {
  getStoredTenantSubdomain,
  getStoredTenantToken,
} from "@kallpanexus/shared";
import { createContext, useContext, useMemo, type ReactNode } from "react";

const ApiContext = createContext<TenantSportApi | null>(null);

export function ApiProvider({ children }: { children: ReactNode }) {
  const api = useMemo(() => {
    const client = createApiClient({
      baseURL: getTenantApiClientBaseUrl(),
      getToken: () => getStoredTenantToken(),
      getTenantSubdomain: () => {
        const fromHost = getStoredTenantSubdomain();
        if (fromHost) return fromHost;
        return getDevTenantSubdomain() ?? null;
      },
    });
    return createTenantSportApi(client);
  }, []);

  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useTenantApi(): TenantSportApi {
  const ctx = useContext(ApiContext);
  if (!ctx) {
    throw new Error("useTenantApi debe usarse dentro de ApiProvider");
  }
  return ctx;
}
