"use client";

import {
  clearPlatformAuth,
  getStoredPlatformSession,
  setStoredPlatformSession,
  type StoredPlatformSession,
} from "@kallpanexus/shared";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

type PlatformAuthState = {
  session: StoredPlatformSession | null;
  setSession: (session: StoredPlatformSession) => void;
  logout: () => void;
  hydrateFromStorage: () => void;
};

export const usePlatformAuthStore = create<PlatformAuthState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => {
        setStoredPlatformSession(session);
        set({ session });
      },
      logout: () => {
        clearPlatformAuth();
        set({ session: null });
      },
      hydrateFromStorage: () => {
        const session = getStoredPlatformSession();
        set({ session });
      },
    }),
    {
      name: "knx-platform-auth-ui",
      partialize: () => ({}),
    }
  )
);

/** Referencia estable (evita bucle useSyncExternalStore en Next 15 / React 19). */
const PERMISOS_VACIOS: string[] = [];

export function usePlatformPermisos(): string[] {
  return usePlatformAuthStore(
    useShallow((s) => s.session?.permisos ?? PERMISOS_VACIOS)
  );
}
