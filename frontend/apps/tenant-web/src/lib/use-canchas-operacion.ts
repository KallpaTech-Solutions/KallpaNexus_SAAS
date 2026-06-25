"use client";

import { useTenantApi } from "@/lib/api-context";
import { useOperacionSucursal } from "@/lib/use-operacion-sucursal";
import { useQuery } from "@tanstack/react-query";

/** Canchas visibles según sede activa y alcance del staff (alineado con API). */
export function useCanchasOperacion(enabled = true) {
  const api = useTenantApi();
  const { sucursalIdParaApi } = useOperacionSucursal();

  return useQuery({
    queryKey: ["canchas", sucursalIdParaApi ?? "sin-sede"],
    queryFn: () => api.canchas.list({ sucursalId: sucursalIdParaApi! }),
    enabled: enabled && !!sucursalIdParaApi,
    staleTime: 30_000,
  });
}
