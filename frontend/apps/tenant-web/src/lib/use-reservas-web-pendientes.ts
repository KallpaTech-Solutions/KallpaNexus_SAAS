"use client";

import { PERMISOS_SPORT, type ReservaListItem } from "@kallpanexus/types";
import { rangoFechasLimaParaApi } from "@kallpanexus/shared";
import { useTenantApi } from "@/lib/api-context";
import { canAccess, usePermisosSession } from "@/lib/auth-store";
import { useOperacionSucursal } from "@/lib/use-operacion-sucursal";
import { useReservaWebPendientesAlcance } from "@/lib/use-reserva-web-alcance";
import { agruparSolicitudesWebPendientes } from "@/lib/agrupar-solicitudes-web";
import { rangoFechasReservasPorDefecto } from "@/components/filtros-reservas-bar";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function apiRangoReservasWebPendientesPorDefecto() {
  const r = rangoFechasReservasPorDefecto();
  return rangoFechasLimaParaApi(r.desde, r.hasta);
}

/** Clave estable: no depende de la sede activa en el header. */
export function useReservasWebPendientesAlcanceKey(): string {
  const { accesoTodas, idsPermitidos } = useOperacionSucursal();
  return useMemo(() => {
    if (accesoTodas) return "todas-sedes";
    if (!idsPermitidos || idsPermitidos.size === 0) return "sin-sede";
    return [...idsPermitidos].sort().join(",");
  }, [accesoTodas, idsPermitidos]);
}

export function reservasWebPendientesQueryKey(
  apiRango: { desde: string; hasta: string },
  alcanceKey: string
) {
  return ["reservas-web-pendientes", apiRango.desde, apiRango.hasta, alcanceKey] as const;
}

/**
 * Pendientes web (todas las sedes visibles). Una sola query compartida en todo el panel.
 */
export function useReservasWebPendientes() {
  const api = useTenantApi();
  const permisos = usePermisosSession();
  const puedeVer = canAccess(permisos, PERMISOS_SPORT.reservasVer);
  const alcanceKey = useReservasWebPendientesAlcanceKey();
  const apiRango = useMemo(() => apiRangoReservasWebPendientesPorDefecto(), []);

  const q = useQuery({
    queryKey: reservasWebPendientesQueryKey(apiRango, alcanceKey),
    queryFn: (): Promise<ReservaListItem[]> =>
      api.reservas.list({
        estado: "Pendiente",
        desde: apiRango.desde,
        hasta: apiRango.hasta,
      }),
    enabled: puedeVer && alcanceKey !== "sin-sede",
    staleTime: 90_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: false,
  });

  const enAlcance = useReservaWebPendientesAlcance();

  const reservas = useMemo(() => {
    const raw = q.data ?? [];
    return raw.filter(
      (r) => r.origen === "WebPublica" && r.estado === "Pendiente" && enAlcance(r.sucursalId)
    );
  }, [q.data, enAlcance]);

  const grupos = useMemo(() => agruparSolicitudesWebPendientes(reservas), [reservas]);

  const gruposPorSucursal = useMemo(() => {
    const counts = new Map<string, number>();
    for (const g of grupos) {
      const sid = g.reservas[0]?.sucursalId;
      if (!sid) continue;
      counts.set(sid, (counts.get(sid) ?? 0) + 1);
    }
    return counts;
  }, [grupos]);

  return {
    isLoading: q.isLoading,
    isFetching: q.isFetching,
    isError: q.isError,
    error: q.error,
    reservas,
    grupos,
    gruposPorSucursal,
    totalReservas: reservas.length,
    totalGrupos: grupos.length,
  };
}

export function useReservasWebPendientesPorSucursal() {
  return useReservasWebPendientes().gruposPorSucursal;
}
