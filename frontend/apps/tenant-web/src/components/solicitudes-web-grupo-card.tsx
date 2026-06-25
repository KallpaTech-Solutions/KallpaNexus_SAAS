"use client";

import type { GrupoSolicitudWeb } from "@/lib/agrupar-solicitudes-web";
import { panelUploadUrl } from "@/lib/tenant-media-url";
import { HoldExpiraCountdown } from "@/components/hold-expira-countdown";
import { formatDateTime, formatMoneyPEN } from "@kallpanexus/shared";
import Link from "next/link";

type Props = {
  grupo: GrupoSolicitudWeb;
  puedeConfirmar: boolean;
  puedeRechazar: boolean;
  confirmando: boolean;
  onConfirmar: () => void;
  onRechazar: () => void;
};

export function SolicitudesWebGrupoCard({
  grupo,
  puedeConfirmar,
  puedeRechazar,
  confirmando,
  onConfirmar,
  onRechazar,
}: Props) {
  const r0 = grupo.reservas[0]!;
  const horas = grupo.reservas.map(
    (r) => `${formatDateTime(r.horaInicio)} – ${formatDateTime(r.horaFin)}`
  );

  return (
    <li className="rounded-xl border border-violet-200/80 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{r0.clienteNombre}</p>
          <p className="text-xs text-slate-500">
            {r0.nombreCancha}
            {grupo.reservas.length > 1 && (
              <span className="ml-1 font-medium text-violet-800">
                · {grupo.reservas.length} horarios
              </span>
            )}
          </p>
          <div className="mt-1.5">
            <HoldExpiraCountdown expiraEnUtc={grupo.holdExpiraEnUtc} />
          </div>
          <ul className="mt-1.5 space-y-0.5 text-xs text-slate-600">
            {horas.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          <p className="mt-2 text-sm font-medium text-emerald-800">
            Total: {formatMoneyPEN(grupo.montoTotal)}
            {(grupo.montoPagoRegistrado ?? 0) > 0 && (
              <span className="ml-2 text-slate-700">
                · Pago registrado: {formatMoneyPEN(grupo.montoPagoRegistrado!)}
              </span>
            )}
            {grupo.medioPago && (
              <span className="ml-2 text-violet-800">· {grupo.medioPago}</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {grupo.voucherUrl && (
            <Link
              href={panelUploadUrl(grupo.voucherUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-violet-400 px-2 py-1 text-xs font-medium text-violet-900 hover:bg-violet-50"
            >
              Ver voucher
            </Link>
          )}
          {puedeConfirmar && (
            <button
              type="button"
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              disabled={confirmando}
              onClick={onConfirmar}
            >
              Confirmar {grupo.reservas.length > 1 ? "todas" : ""}
            </button>
          )}
          {puedeRechazar && (
            <button
              type="button"
              className="rounded-md border border-red-400/60 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              disabled={confirmando}
              onClick={onRechazar}
            >
              Rechazar
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
