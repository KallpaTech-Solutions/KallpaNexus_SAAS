import { trackPublicGaEvent } from "@/lib/analytics/track-public-ga-event";

export type SportFunnelParams = {
  tenant_slug?: string;
  sede_slug?: string;
  cancha_id?: string;
  cancha_nombre?: string;
  fecha?: string;
  horas_count?: number;
  total_pen?: number;
  funnel_step?: string;
};

/** Eventos del embudo B2C: directorio → complejo → cancha → reserva enviada. */
export function trackSportFunnel(
  eventName: string,
  params?: SportFunnelParams
): void {
  trackPublicGaEvent(eventName, params);
}

export const SportFunnelEvents = {
  hubView: "sport_hub_view",
  hubSedeClick: "sport_hub_sede_click",
  tenantView: "sport_tenant_view",
  canchaSelect: "sport_cancha_select",
  horariosOpenModal: "sport_reserva_modal_open",
  reservaSubmit: "sport_reserva_submit",
  reservaComplete: "sport_reserva_complete",
  reservaError: "sport_reserva_error",
} as const;
