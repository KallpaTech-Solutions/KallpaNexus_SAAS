import {
  fechaHoyLimaInput,
  fechaLimaInputConOffset,
  rangoFechasLimaParaApi,
} from "@kallpanexus/shared";

export type DashboardPeriodo = "hoy" | "7dias" | "semana" | "mes";

export const DASHBOARD_PERIODOS: { id: DashboardPeriodo; label: string }[] = [
  { id: "hoy", label: "Hoy" },
  { id: "7dias", label: "Últimos 7 días" },
  { id: "semana", label: "Esta semana" },
  { id: "mes", label: "Este mes" },
];

function diasDesdeLunesLima(): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    weekday: "short",
  }).format(new Date());
  const map: Record<string, number> = {
    Sun: 6,
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
  };
  return map[wd] ?? 0;
}

/** Rango inclusive en calendario Lima (inputs type=date). */
export function rangoInputDashboardPeriodo(periodo: DashboardPeriodo): {
  desde: string;
  hasta: string;
} {
  const hasta = fechaHoyLimaInput();
  switch (periodo) {
    case "hoy":
      return { desde: hasta, hasta };
    case "7dias":
      return { desde: fechaLimaInputConOffset(-6), hasta };
    case "semana":
      return { desde: fechaLimaInputConOffset(-diasDesdeLunesLima()), hasta };
    case "mes": {
      const [y, m] = hasta.split("-");
      return { desde: `${y}-${m}-01`, hasta };
    }
  }
}

export function rangoApiDashboardPeriodo(periodo: DashboardPeriodo) {
  const { desde, hasta } = rangoInputDashboardPeriodo(periodo);
  return rangoFechasLimaParaApi(desde, hasta);
}

export function etiquetaPeriodoDashboard(periodo: DashboardPeriodo): string {
  switch (periodo) {
    case "hoy":
      return "hoy";
    case "7dias":
      return "últimos 7 días";
    case "semana":
      return "esta semana";
    case "mes":
      return "este mes";
  }
}

export function tituloAgendaDashboard(periodo: DashboardPeriodo): string {
  return periodo === "hoy" ? "Agenda de hoy" : `Agenda (${etiquetaPeriodoDashboard(periodo)})`;
}

export function tituloEstadoDashboard(periodo: DashboardPeriodo): string {
  return periodo === "hoy"
    ? "Por estado (hoy)"
    : `Por estado (${etiquetaPeriodoDashboard(periodo)})`;
}
