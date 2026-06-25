"use client";

import { useAuthStore, useSucursalesSession, useSucursalActivaId } from "@/lib/auth-store";
import { useCallback, useMemo } from "react";

/** Sucursal activa para filtrar listados (API y UI). Gerente: solo si eligió sede; staff: siempre su sede. */
export function useOperacionSucursal() {
  const session = useAuthStore((s) => s.session);
  const sucursalActivaId = useSucursalActivaId();
  const accesoTodas = session?.accesoTodasSucursales ?? false;
  const asignadas = useSucursalesSession();

  const sucursalIdParaApi = useMemo(() => {
    if (accesoTodas) {
      return sucursalActivaId ?? undefined;
    }
    return sucursalActivaId ?? asignadas[0]?.id ?? undefined;
  }, [accesoTodas, sucursalActivaId, asignadas]);

  const idsPermitidos = useMemo(() => {
    if (accesoTodas) return null;
    return new Set(asignadas.map((s) => s.id));
  }, [accesoTodas, asignadas]);

  const reservaEnAlcance = useCallback(
    (sucursalId: string): boolean => {
      if (idsPermitidos && !idsPermitidos.has(sucursalId)) return false;
      if (sucursalIdParaApi && sucursalId !== sucursalIdParaApi) return false;
      return true;
    },
    [idsPermitidos, sucursalIdParaApi]
  );

  const necesitaElegirSede = accesoTodas && !sucursalActivaId;

  return {
    accesoTodas,
    sucursalActivaId,
    sucursalIdParaApi,
    necesitaElegirSede,
    idsPermitidos,
    reservaEnAlcance,
  };
}
