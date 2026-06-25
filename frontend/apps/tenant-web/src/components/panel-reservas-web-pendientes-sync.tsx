"use client";

import { useReservasWebPendientes } from "@/lib/use-reservas-web-pendientes";

/** Monta la query compartida de pendientes web en el shell (deduplicada con badge/header). */
export function PanelReservasWebPendientesSync() {
  useReservasWebPendientes();
  return null;
}
