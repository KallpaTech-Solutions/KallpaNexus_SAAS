"use client";

import type { ReservaListItem } from "@kallpanexus/types";
import {
  esSinTelefonoCliente,
  etiquetaHorario,
  etiquetaTelefonoCliente,
  formatDateTime,
} from "@kallpanexus/shared";
import { useCiudadSucursalActiva } from "@/lib/use-ciudad-sucursal";
import {
  EstadoReservaBadge,
  ReservaCobroResumen,
} from "@/components/reserva-cobro-ui";
import Link from "next/link";

type Props = {
  reserva: ReservaListItem;
  puedeCobrar: boolean;
  onCobrar: () => void;
  onClose: () => void;
};

export function ReservaDetalleModal({
  reserva: r,
  puedeCobrar,
  onCobrar,
  onClose,
}: Props) {
  const ciudadSede = useCiudadSucursalActiva();
  const debe =
    r.montoPendiente ?? Math.max(0, r.montoTotal - (r.montoConfirmado ?? 0));
  const puedeRegistrarCobro =
    puedeCobrar && r.estado !== "Cancelada" && r.estado !== "Completada";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-medium text-white">Detalle de reserva</h3>
          <EstadoReservaBadge reserva={r} />
        </div>

        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Cliente</dt>
            <dd className="mt-0.5 font-medium text-slate-100">{r.clienteNombre}</dd>
            <dd className="text-slate-400">
              DNI {r.clienteDni}
              {esSinTelefonoCliente(r.clienteTelefono) ? (
                <span className="ml-2 text-amber-400/90">· Sin celular</span>
              ) : (
                r.clienteTelefono?.trim() && (
                  <span className="ml-2">· {etiquetaTelefonoCliente(r.clienteTelefono)}</span>
                )
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Cancha</dt>
            <dd className="mt-0.5 text-slate-200">{r.nombreCancha}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">
              {etiquetaHorario(ciudadSede)}
            </dt>
            <dd className="mt-0.5 text-slate-200">
              {formatDateTime(r.horaInicio)} – {formatDateTime(r.horaFin)}
            </dd>
          </div>
        </dl>

        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Cobro</p>
          <ReservaCobroResumen reserva={r} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {puedeRegistrarCobro && (
            <button
              type="button"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
              onClick={onCobrar}
            >
              {debe > 0.009 ? "Cobrar saldo" : "Ver / ajustar cobros"}
            </button>
          )}
          <Link
            href="/reservas"
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            onClick={onClose}
          >
            Ir a reservas
          </Link>
          <button
            type="button"
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>

        {debe > 0.009 && puedeRegistrarCobro && (
          <p className="mt-3 text-xs text-slate-500">
            Pendiente por cobrar: se abrirá el registro de pago (medio, monto, voucher).
          </p>
        )}
      </div>
    </div>
  );
}
