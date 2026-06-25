"use client";

import {
  aplicarPlantillaWhatsApp,
  etiquetaTelefonoCliente,
  formatDateTime,
  formatMoneyPEN,
  puedeAbrirWhatsAppCliente,
  urlWhatsAppCliente,
} from "@kallpanexus/shared";
import type { ConfiguracionNegocio } from "@kallpanexus/types";
import type { ReservaListItem } from "@kallpanexus/types";
import { MessageCircle } from "lucide-react";

type Props = {
  reserva: ReservaListItem;
  configuracion: ConfiguracionNegocio | undefined;
};

export function WhatsAppClienteLink({ reserva, configuracion }: Props) {
  if (!puedeAbrirWhatsAppCliente(reserva.clienteTelefono)) {
    return null;
  }

  const plantilla =
    configuracion?.mensajeWhatsAppReserva?.trim() ||
    "Hola {{nombre}}, le escribimos de {{negocio}} por su reserva en {{cancha}} el {{fecha}} ({{hora}}). Monto: {{monto}}.";

  const mensaje = aplicarPlantillaWhatsApp(plantilla, {
    nombre: reserva.clienteNombre,
    dni: reserva.clienteDni,
    cancha: reserva.nombreCancha,
    fecha: formatDateTime(reserva.horaInicio).split(",")[0]?.trim() ?? "",
    hora: `${formatDateTime(reserva.horaInicio)} – ${formatDateTime(reserva.horaFin)}`,
    monto: formatMoneyPEN(reserva.montoTotal),
    negocio: configuracion?.nombreComercial?.trim() || "nuestro negocio",
  });

  const href = urlWhatsAppCliente(reserva.clienteTelefono, mensaje);
  const tooltip = etiquetaTelefonoCliente(reserva.clienteTelefono);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={tooltip}
      aria-label={`WhatsApp al ${tooltip}`}
      className="ml-1.5 inline-flex shrink-0 rounded p-0.5 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
    >
      <MessageCircle className="h-4 w-4" />
    </a>
  );
}
