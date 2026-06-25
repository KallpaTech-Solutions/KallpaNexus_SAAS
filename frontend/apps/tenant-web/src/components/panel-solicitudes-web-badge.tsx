"use client";

import { useReservasWebPendientes } from "@/lib/use-reservas-web-pendientes";
import { useEffect, useState } from "react";

type Props = {
  className?: string;
};

/** Badge de solicitudes web: solo suscribe en cliente (evita bucle SSR + Zustand persist). */
export function PanelSolicitudesWebBadge({ className }: Props) {
  const [cliente, setCliente] = useState(false);
  useEffect(() => setCliente(true), []);
  if (!cliente) return null;
  return <PanelSolicitudesWebBadgeInner className={className} />;
}

function PanelSolicitudesWebBadgeInner({ className }: Props) {
  const { totalGrupos, isLoading } = useReservasWebPendientes();
  if (isLoading || totalGrupos <= 0) return null;
  return (
    <span className={className}>
      {totalGrupos > 9 ? "9+" : totalGrupos}
    </span>
  );
}
