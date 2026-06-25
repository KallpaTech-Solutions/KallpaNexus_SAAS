"use client";

import { useOperacionSucursal } from "@/lib/use-operacion-sucursal";
import { MapPin } from "lucide-react";

/** Gerente sin sede en la barra superior: no cargar datos mezclados de todas las sedes. */
export function AvisoElegirSedeOperacion() {
  const { necesitaElegirSede } = useOperacionSucursal();
  if (!necesitaElegirSede) return null;

  return (
    <p className="flex items-start gap-2 rounded-lg border border-sport-orange/30 bg-orange-50 px-4 py-3 text-sm text-slate-800">
      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sport-orange" />
      <span>
        Elige la sede en la barra superior para ver y operar reservas, calendario y reportes de
        ese local.
      </span>
    </p>
  );
}
