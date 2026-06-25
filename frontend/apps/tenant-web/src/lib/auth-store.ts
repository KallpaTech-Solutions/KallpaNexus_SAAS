"use client";

import {
  clearTenantAuth,
  getStoredTenantSession,
  resolverSucursalActivaInicial,
  setStoredTenantSession,
  setStoredTenantSubdomain,
  writeSucursalActivaId,
  type StaffSucursalAcceso,
  type StoredTenantSession,
} from "@kallpanexus/shared";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

type AuthState = {
  session: StoredTenantSession | null;
  subdomain: string | null;
  setSubdomain: (sub: string) => void;
  setSession: (session: StoredTenantSession) => void;
  setSucursalActiva: (sucursalId: string) => void;
  logout: () => void;
  hydrateFromStorage: () => void;
};

function withSucursalActiva(session: StoredTenantSession): StoredTenantSession {
  const sucursales = session.sucursales ?? [];
  if (sucursales.length === 0) return session;
  const sucursalActivaId =
    session.sucursalActivaId ??
    resolverSucursalActivaInicial(sucursales, session.tenantId, session.dni);
  if (sucursalActivaId) {
    writeSucursalActivaId(session.tenantId, session.dni, sucursalActivaId);
  }
  return { ...session, sucursales, sucursalActivaId };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      subdomain: null,
      setSubdomain: (sub) => {
        setStoredTenantSubdomain(sub);
        set({ subdomain: sub.trim().toLowerCase() });
      },
      setSession: (session) => {
        const next = withSucursalActiva(session);
        setStoredTenantSession(next);
        set({ session: next });
      },
      setSucursalActiva: (sucursalId) => {
        set((state) => {
          if (!state.session) return state;
          writeSucursalActivaId(state.session.tenantId, state.session.dni, sucursalId);
          const session = { ...state.session, sucursalActivaId: sucursalId };
          setStoredTenantSession(session);
          return { session };
        });
      },
      logout: () => {
        clearTenantAuth();
        set({ session: null });
      },
      hydrateFromStorage: () => {
        const session = getStoredTenantSession();
        if (session && !session.dni) {
          clearTenantAuth();
          set({ session: null });
          return;
        }
        if (session) {
          const next = withSucursalActiva(session);
          setStoredTenantSession(next);
          set({ session: next });
        } else {
          set({ session: null });
        }
      },
    }),
    {
      name: "knx-tenant-auth-store",
      partialize: (s) => ({ subdomain: s.subdomain }),
    }
  )
);

export function canAccess(permisos: string[], codigo: string): boolean {
  return permisos.includes(codigo);
}

/** Referencia estable para selectores Zustand (evita bucle con useSyncExternalStore en Next 15). */
const PERMISOS_VACIOS: string[] = [];
const SUCURSALES_VACIAS: StaffSucursalAcceso[] = [];

export function usePermisosSession(): string[] {
  return useAuthStore(
    useShallow((s) => s.session?.permisos ?? PERMISOS_VACIOS)
  );
}

export function useSucursalesSession(): StaffSucursalAcceso[] {
  return useAuthStore(
    useShallow((s) => s.session?.sucursales ?? SUCURSALES_VACIAS)
  );
}

export function useSucursalActivaId(): string | null {
  return useAuthStore((s) => s.session?.sucursalActivaId ?? null);
}

export function mapLoginSucursales(
  raw: { id?: string; nombre?: string }[] | undefined
): StaffSucursalAcceso[] {
  return (raw ?? [])
    .filter((s) => s.id && s.nombre)
    .map((s) => ({ id: String(s.id), nombre: String(s.nombre) }));
}
