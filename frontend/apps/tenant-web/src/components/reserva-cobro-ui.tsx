"use client";

import type { ReservaListItem } from "@kallpanexus/types";
import { formatMoneyPEN } from "@kallpanexus/shared";
import { montoAdelantoWebPendienteEnReserva } from "@/lib/agrupar-solicitudes-web";

export function ReservaCobroResumen({ reserva: r }: { reserva: ReservaListItem }) {
  const confirmado = r.montoConfirmado ?? 0;
  const webPendiente = montoAdelantoWebPendienteEnReserva(r);
  const tieneWebPendiente = webPendiente > 0.009;
  const pendienteBase = r.montoPendiente ?? Math.max(0, r.montoTotal - confirmado);
  const pendiente =
    tieneWebPendiente
      ? Math.max(0, r.montoTotal - confirmado - webPendiente)
      : pendienteBase;
  const excedente = r.montoExcedente ?? Math.max(0, confirmado - r.montoTotal);
  const saldado = pendiente <= 0.009 && excedente <= 0.009;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed shadow-sm">
      <div className="flex justify-between gap-2 text-slate-600">
        <span>Total reserva</span>
        <span className="font-semibold text-slate-900">{formatMoneyPEN(r.montoTotal)}</span>
      </div>
      {webPendiente > 0 && (
        <div className="mt-1 flex justify-between gap-2 text-violet-800">
          <span className="text-left leading-tight">
            Adelanto web
            {r.medioPagoWebPendiente ? ` (${r.medioPagoWebPendiente})` : ""}
            <span className="block text-[10px] font-normal text-violet-600">
              Por confirmar
            </span>
          </span>
          <span className="shrink-0 font-medium">{formatMoneyPEN(webPendiente)}</span>
        </div>
      )}
      <div className="mt-1 flex justify-between gap-2 text-slate-600">
        <span>Cobrado</span>
        <span className="font-medium text-emerald-800">{formatMoneyPEN(confirmado)}</span>
      </div>
      <div className="mt-1 flex justify-between gap-2 border-t border-slate-200 pt-2">
        {excedente > 0.009 ? (
          <>
            <span className="text-slate-600">Excedente</span>
            <span className="font-semibold text-red-700">{formatMoneyPEN(excedente)}</span>
          </>
        ) : (
          <>
            <span className="text-slate-600">Debe</span>
            <span
              className={
                saldado ? "font-semibold text-emerald-800" : "font-semibold text-amber-800"
              }
            >
              {formatMoneyPEN(pendiente)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export function EstadoReservaBadge({ reserva: r }: { reserva: ReservaListItem }) {
  const estado = r.estado;
  const confirmado = r.montoConfirmado ?? 0;
  const pendiente = r.montoPendiente ?? Math.max(0, r.montoTotal - confirmado);
  const excedente = r.montoExcedente ?? Math.max(0, confirmado - r.montoTotal);

  const styles: Record<string, string> = {
    Pendiente: "bg-amber-100 text-amber-900 ring-amber-300",
    Confirmada: "bg-emerald-100 text-emerald-900 ring-emerald-300",
    Cancelada: "bg-red-100 text-red-900 ring-red-300",
    Completada: "bg-slate-200 text-slate-800 ring-slate-300",
    NoAsistio: "bg-orange-100 text-orange-900 ring-orange-300",
    Parcial: "bg-sky-100 text-sky-900 ring-sky-300",
    Excedente: "bg-rose-100 text-rose-900 ring-rose-300",
    SinCobro: "bg-amber-100 text-amber-900 ring-amber-300",
  };

  let key = estado;
  let label = estado;

  if (estado !== "Cancelada" && estado !== "Completada" && estado !== "NoAsistio") {
    if (excedente > 0.009) {
      key = "Excedente";
      label = "Cobró de más";
    } else if (confirmado > 0.009 && pendiente > 0.009) {
      key = "Parcial";
      label = "Cobro parcial";
    } else if (pendiente <= 0.009 && confirmado > 0.009) {
      key = "Confirmada";
      label = "Saldado";
    } else if (estado === "Confirmada" && confirmado <= 0.009) {
      key = "SinCobro";
      label = "Sin cobro";
    } else if (estado === "Pendiente") {
      label = "Pendiente";
    }
  } else if (estado === "Completada") {
    label = "Pagado";
  }

  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${styles[key] ?? styles.Pendiente}`}
    >
      {label}
    </span>
  );
}
