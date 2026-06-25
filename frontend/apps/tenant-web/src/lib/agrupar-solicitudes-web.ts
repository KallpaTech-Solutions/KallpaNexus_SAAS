import type { ReservaListItem } from "@kallpanexus/types";

export type GrupoSolicitudWeb = {
  clave: string;
  grupoId: string | null;
  reservas: ReservaListItem[];
  montoTotal: number;
  montoPagoRegistrado?: number | null;
  holdExpiraEnUtc?: string | null;
  voucherUrl?: string | null;
  medioPago?: string | null;
};

function adelantoWebGrupoPendiente(r: ReservaListItem): number {
  const g = r.montoAdelantoWebGrupoPendiente ?? 0;
  if (g > 0) return g;
  return r.montoPagoWebPendiente ?? 0;
}

/** Pendientes de varios horarios: se gestionan en la tarjeta agrupada, no fila a fila. */
export function reservaPendienteWebOcultaEnTablaPorGrupo(
  r: ReservaListItem,
  grupos: GrupoSolicitudWeb[]
): boolean {
  if (r.origen !== "WebPublica" || r.estado !== "Pendiente") return false;
  const gid = r.grupoSolicitudWebId?.trim();
  if (!gid) return false;
  const g = grupos.find((x) => x.grupoId === gid);
  return (g?.reservas.length ?? 0) > 1;
}

export function agruparSolicitudesWebPendientes(reservas: ReservaListItem[]): GrupoSolicitudWeb[] {
  const pendientes = reservas.filter(
    (r) => r.origen === "WebPublica" && r.estado === "Pendiente"
  );
  const map = new Map<string, ReservaListItem[]>();

  for (const r of pendientes) {
    const key = r.grupoSolicitudWebId?.trim() || r.id;
    const list = map.get(key) ?? [];
    list.push(r);
    map.set(key, list);
  }

  const grupos: GrupoSolicitudWeb[] = [];
  for (const [clave, list] of map) {
    const sorted = [...list].sort(
      (a, b) => new Date(a.horaInicio).getTime() - new Date(b.horaInicio).getTime()
    );
    const conVoucher = sorted.find((x) => x.voucherWebPendiente);
    const conPago = sorted.find((x) => adelantoWebGrupoPendiente(x) > 0);
    const holds = sorted
      .map((x) => x.holdExpiraEnUtc)
      .filter((h): h is string => !!h?.trim());
    const holdMin =
      holds.length > 0
        ? holds.reduce((a, b) => (new Date(a).getTime() < new Date(b).getTime() ? a : b))
        : null;

    const adelantoGrupo =
      sorted.find((x) => (x.montoAdelantoWebGrupoPendiente ?? 0) > 0)
        ?.montoAdelantoWebGrupoPendiente ??
      (conPago ? adelantoWebGrupoPendiente(conPago) : null);

    grupos.push({
      clave,
      grupoId: sorted[0]?.grupoSolicitudWebId ?? null,
      reservas: sorted,
      montoTotal: sorted.reduce((s, x) => s + x.montoTotal, 0),
      montoPagoRegistrado: adelantoGrupo,
      holdExpiraEnUtc: holdMin,
      voucherUrl: conVoucher?.voucherWebPendiente,
      medioPago: conVoucher?.medioPagoWebPendiente ?? sorted[0]?.medioPagoWebPendiente,
    });
  }

  return grupos.sort(
    (a, b) =>
      new Date(a.reservas[0]!.horaInicio).getTime() -
      new Date(b.reservas[0]!.horaInicio).getTime()
  );
}

export function montoAdelantoWebPendienteEnReserva(r: ReservaListItem): number {
  if (r.estado !== "Pendiente") return 0;
  const grupoAdelanto = r.montoAdelantoWebGrupoPendiente ?? 0;
  const grupoTotal = r.montoTotalGrupoWeb ?? 0;
  if (grupoAdelanto > 0 && grupoTotal > 0) {
    return Math.round(grupoAdelanto * (r.montoTotal / grupoTotal) * 100) / 100;
  }
  return r.montoPagoWebPendiente ?? 0;
}
