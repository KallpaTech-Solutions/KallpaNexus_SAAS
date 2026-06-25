"use client";

import { useOperacionSucursal } from "@/lib/use-operacion-sucursal";
import { useCallback } from "react";

/** Alcance para listado de reservas web (respeta sede activa del gerente). */
export function useReservaWebListadoAlcance() {
  const { accesoTodas, sucursalIdParaApi, idsPermitidos } = useOperacionSucursal();

  return useCallback(
    (sucursalId: string): boolean => {
      if (idsPermitidos && !idsPermitidos.has(sucursalId)) return false;
      if (!accesoTodas && sucursalIdParaApi && sucursalId !== sucursalIdParaApi) {
        return false;
      }
      return true;
    },
    [idsPermitidos, accesoTodas, sucursalIdParaApi]
  );
}

/** Pendientes web para badge / bandeja: gerente ve todas las sedes. */
export function useReservaWebPendientesAlcance() {
  const { idsPermitidos } = useOperacionSucursal();

  return useCallback(
    (sucursalId: string): boolean => {
      if (idsPermitidos && !idsPermitidos.has(sucursalId)) return false;
      return true;
    },
    [idsPermitidos]
  );
}
