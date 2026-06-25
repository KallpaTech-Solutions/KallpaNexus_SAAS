"use client";

import { panelUploadUrl } from "@/lib/tenant-media-url";
import { formatDateTime, formatMoneyPEN } from "@kallpanexus/shared";

type Props = {
  open: boolean;
  clienteNombre: string;
  montoTotal: number;
  montoRegistrado?: number | null;
  medioPago?: string | null;
  voucherUrl?: string | null;
  /** Varios horarios en una sola solicitud */
  horarios?: string[];
  onClose: () => void;
  onConfirmar: () => void;
  confirmando: boolean;
};

export function ConfirmarReservaWebModal({
  open,
  clienteNombre,
  montoTotal,
  montoRegistrado,
  medioPago,
  voucherUrl,
  horarios,
  onClose,
  onConfirmar,
  confirmando,
}: Props) {
  if (!open) return null;

  const registrado =
    montoRegistrado != null && montoRegistrado > 0 ? montoRegistrado : null;
  const restanteEnCancha =
    registrado != null ? Math.max(0, montoTotal - registrado) : montoTotal;
  const voucherHref =
    voucherUrl?.trim() ? panelUploadUrl(voucherUrl.trim()) : null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4">
      <div
        className="w-full max-w-md rounded-2xl border border-slate-300/70 bg-gradient-to-b from-slate-100 to-slate-200/95 p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
      >
        <h2 className="text-lg font-bold text-slate-900">Confirmar reserva web</h2>
        <p className="mt-1 text-sm text-slate-600">{clienteNombre}</p>

        {horarios && horarios.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-xs text-slate-600">
            {horarios.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        )}

        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-slate-600">Total reserva</dt>
            <dd className="font-semibold text-emerald-800">{formatMoneyPEN(montoTotal)}</dd>
          </div>
          {registrado != null ? (
            <>
              <div className="flex justify-between gap-2 text-violet-900">
                <dt>Pago enviado por el cliente</dt>
                <dd className="font-semibold">{formatMoneyPEN(registrado)}</dd>
              </div>
              {medioPago && (
                <div className="flex justify-between gap-2 text-slate-600">
                  <dt>Medio</dt>
                  <dd>{medioPago}</dd>
                </div>
              )}
              <div className="flex justify-between gap-2 border-t border-slate-300/60 pt-2">
                <dt className="text-slate-600">Resta en cancha</dt>
                <dd className="font-semibold text-amber-900">
                  {formatMoneyPEN(restanteEnCancha)}
                </dd>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-500">Sin adelanto online — cobras el total en el local.</p>
          )}
        </dl>

        {voucherHref && (
          <a
            href={voucherHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-xs font-semibold text-violet-800 underline hover:text-violet-600"
          >
            Ver comprobante del cliente
          </a>
        )}

        <p className="mt-4 text-xs text-slate-500">
          Al confirmar se acepta el voucher tal como lo envió el cliente y la reserva queda activa.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
            disabled={confirmando}
            onClick={onConfirmar}
          >
            {confirmando ? "Confirmando…" : "Confirmar reserva"}
          </button>
          <button
            type="button"
            className="rounded-xl border border-slate-400/60 px-4 py-2.5 text-sm text-slate-700 hover:bg-white/60"
            onClick={onClose}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Solo se usa AceptarRegistrado en la API; conservado para mutaciones existentes. */
export type ModoCobroConfirmacionWeb = "AceptarRegistrado";

export function horariosTextoReservaListItem(
  horaInicio: string,
  horaFin: string
): string {
  return `${formatDateTime(horaInicio)} – ${formatDateTime(horaFin)}`;
}
