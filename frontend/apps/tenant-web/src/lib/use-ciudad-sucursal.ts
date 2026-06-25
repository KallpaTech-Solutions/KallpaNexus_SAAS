"use client";

import { extraerCiudadDesdeDireccion } from "@kallpanexus/shared";
import { useTenantApi } from "@/lib/api-context";
import { useSucursalActivaId } from "@/lib/auth-store";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

/** Ciudad inferida de la dirección de la sucursal activa en el panel. */
export function useCiudadSucursalActiva(): string | null {
  const api = useTenantApi();
  const sucursalActivaId = useSucursalActivaId();

  const { data: sucursales = [] } = useQuery({
    queryKey: ["sucursales"],
    queryFn: () => api.sucursales.list(),
    staleTime: 60_000,
  });

  return useMemo(() => {
    if (!sucursalActivaId) return null;
    const sucursal = sucursales.find((s) => s.id === sucursalActivaId);
    const ciudad = sucursal?.ciudad?.trim();
    if (ciudad) return ciudad;
    if (!sucursal?.direccion) return null;
    return extraerCiudadDesdeDireccion(sucursal.direccion);
  }, [sucursales, sucursalActivaId]);
}
