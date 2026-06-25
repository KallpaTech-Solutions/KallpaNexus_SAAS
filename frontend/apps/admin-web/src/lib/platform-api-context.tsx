"use client";

import {
  createPlatformApi,
  createPlatformServices,
  type PlatformServices,
} from "@kallpanexus/api-client";
import { getAdminApiClientBaseUrl } from "@kallpanexus/env";
import { getStoredPlatformToken } from "@kallpanexus/shared";
import { createContext, useContext, useMemo, type ReactNode } from "react";

const PlatformApiContext = createContext<PlatformServices | null>(null);

export function PlatformApiProvider({ children }: { children: ReactNode }) {
  const api = useMemo(() => {
    const client = createPlatformApi({
      baseURL: getAdminApiClientBaseUrl(),
      getToken: () => getStoredPlatformToken(),
    });
    return createPlatformServices(client);
  }, []);

  return (
    <PlatformApiContext.Provider value={api}>{children}</PlatformApiContext.Provider>
  );
}

export function usePlatformApi(): PlatformServices {
  const ctx = useContext(PlatformApiContext);
  if (!ctx) throw new Error("usePlatformApi debe usarse dentro de PlatformApiProvider");
  return ctx;
}
