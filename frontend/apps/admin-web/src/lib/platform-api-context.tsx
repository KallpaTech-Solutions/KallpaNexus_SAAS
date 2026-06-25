"use client";

import {
  createPlatformApi,
  createPlatformServices,
  type PlatformServices,
} from "@kallpanexus/api-client";
import { getAdminApiClientBaseUrl } from "@kallpanexus/env";
import { getStoredPlatformToken } from "@kallpanexus/shared";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePlatformAuthStore } from "@/lib/platform-auth-store";

const PlatformApiContext = createContext<PlatformServices | null>(null);

function redirectPlatformLoginSesionExpirada(): void {
  usePlatformAuthStore.getState().logout();
  if (typeof window !== "undefined") {
    window.location.replace("/login?sesion=expirada");
  }
}

export function PlatformApiProvider({ children }: { children: ReactNode }) {
  const api = useMemo(() => {
    const client = createPlatformApi({
      baseURL: getAdminApiClientBaseUrl(),
      getToken: () => getStoredPlatformToken(),
      onSessionExpired: redirectPlatformLoginSesionExpirada,
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
