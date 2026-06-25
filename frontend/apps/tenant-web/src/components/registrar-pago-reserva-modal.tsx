"use client";

import type { PagoReservaListItem } from "@kallpanexus/types";
import { formatMoneyPEN } from "@kallpanexus/shared";
import { getApiErrorMessage } from "@kallpanexus/api-client";
import { useTenantApi } from "@/lib/api-context";
import { useUiFeedback } from "@/components/ui-feedback-provider";
import { CampoFormulario, inputClass } from "@/components/campo-formulario";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

type Props = {
  reservaId: string;
  montoReserva: number;
  titulo?: string;
  onClose: () => void;
};

export function RegistrarPagoReservaModal({
  reservaId,
  montoReserva,
  titulo = "Registrar cobro",
  onClose,
}: Props) {
  const api = useTenantApi();
  const { confirmar, notificar } = useUiFeedback();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: pagos = [], isLoading: cargandoPagos } = useQuery({
    queryKey: ["pagos-reserva", reservaId],
    queryFn: () => api.pagosReserva.listar(reservaId),
  });

  const { data: medios = [] } = useQuery({
    queryKey: ["medios-pago"],
    queryFn: () => api.mediosPago.list(),
  });

  const mediosActivos = useMemo(() => medios.filter((m) => m.activo), [medios]);

  const totalPagado = useMemo(
    () =>
      pagos
        .filter((p) => p.estado === "Confirmado")
        .reduce((s, p) => s + p.monto, 0),
    [pagos]
  );

  const pendiente = Math.max(0, montoReserva - totalPagado);
  const excedente = Math.max(0, totalPagado - montoReserva);

  const [form, setForm] = useState({
    medioPagoId: "",
    monto: "",
    codigoOperacion: "",
    voucherUrl: "",
    sinVoucher: false,
  });

  useEffect(() => {
    if (!form.medioPagoId && mediosActivos.length > 0) {
      setForm((f) => ({
        ...f,
        medioPagoId: mediosActivos[0].id,
      }));
    }
  }, [mediosActivos, form.medioPagoId]);

  useEffect(() => {
    if (pendiente > 0.009) {
      setForm((f) => ({ ...f, monto: String(Math.round(pendiente * 100) / 100) }));
    }
  }, [pendiente, reservaId]);

  const medioSel = mediosActivos.find((m) => m.id === form.medioPagoId);

  const puedeRegistrarMas = pendiente > 0.009;

  const registrar = useMutation({
    mutationFn: () =>
      api.pagosReserva.registrar(reservaId, {
        medioPagoId: form.medioPagoId,
        monto: Number(form.monto),
        codigoOperacion: form.codigoOperacion || undefined,
        voucherUrl: form.voucherUrl || undefined,
        registradoSinVoucher: form.sinVoucher,
      }),
    onSuccess: async (data: { pendiente?: number }) => {
      setError(null);
      notificar("Pago registrado correctamente.", "exito");
      setForm((f) => ({ ...f, codigoOperacion: "", voucherUrl: "", sinVoucher: false }));
      await qc.invalidateQueries({ queryKey: ["pagos-reserva", reservaId] });
      await qc.invalidateQueries({ queryKey: ["reservas"] });
      await qc.invalidateQueries({ queryKey: ["reservas-semana"] });
      await qc.invalidateQueries({ queryKey: ["disponibilidad"] });
      const queda =
        typeof data?.pendiente === "number" ? data.pendiente : pendiente - Number(form.monto);
      if (queda <= 0.009 && excedente <= 0.009) {
        onClose();
      }
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  const anular = useMutation({
    mutationFn: (pagoId: string) => api.pagosReserva.anular(reservaId, pagoId),
    onSuccess: async () => {
      setError(null);
      notificar("Cobro anulado. Ya no cuenta en caja ni reportes.", "exito");
      await qc.invalidateQueries({ queryKey: ["pagos-reserva", reservaId] });
      await qc.invalidateQueries({ queryKey: ["reservas"] });
      await qc.invalidateQueries({ queryKey: ["reservas-semana"] });
      await qc.invalidateQueries({ queryKey: ["reportes-financieros"] });
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl">
        <h3 className="text-lg font-medium text-white">{titulo}</h3>
        <p className="mt-1 text-xs text-slate-400">
          Monto reserva {formatMoneyPEN(montoReserva)} · Confirmado{" "}
          {formatMoneyPEN(totalPagado)}
          {excedente > 0.009 ? (
            <>
              {" "}
              · <span className="text-rose-300">Excedente {formatMoneyPEN(excedente)}</span>
            </>
          ) : (
            <> · Pendiente {formatMoneyPEN(pendiente)}</>
          )}
        </p>

        {excedente > 0.009 && (
          <p className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
            Hay cobros por encima del total de la reserva. Anula el movimiento erróneo (o ajusta el
            total en Editar). El vuelto al cliente es en caja; no se registra como pago negativo.
          </p>
        )}

        {cargandoPagos ? (
          <p className="mt-4 text-sm text-slate-500">Cargando pagos…</p>
        ) : pagos.length > 0 ? (
          <ul className="mt-3 space-y-1 rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-300">
            {pagos.map((p) => (
              <PagoLinea
                key={p.id}
                pago={p}
                puedeAnular={p.estado === "Confirmado"}
                anulando={anular.isPending}
                onAnular={async () => {
                  const ok = await confirmar({
                    titulo: "Anular cobro",
                    mensaje: `Este movimiento de ${formatMoneyPEN(p.monto)} dejará de contar en caja y en reportes. ¿Continuar?`,
                    confirmarTexto: "Anular cobro",
                    cancelarTexto: "Volver",
                    variante: "peligro",
                  });
                  if (ok) anular.mutate(p.id);
                }}
              />
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-slate-500">Aún no hay cobros registrados.</p>
        )}

        {!puedeRegistrarMas && excedente <= 0.009 && totalPagado > 0.009 && (
          <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            Cobro completo. Puedes anular un cobro si te equivocaste.
          </p>
        )}

        {puedeRegistrarMas && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <CampoFormulario label="Medio de pago" className="sm:col-span-2">
              <select
                className={inputClass}
                value={form.medioPagoId}
                onChange={(e) => setForm((f) => ({ ...f, medioPagoId: e.target.value }))}
              >
                {mediosActivos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </CampoFormulario>
            <CampoFormulario label="Monto" hint={`Máximo pendiente: ${formatMoneyPEN(pendiente)}`}>
              <input
                type="number"
                min={0}
                max={pendiente}
                step="0.01"
                className={inputClass}
                value={form.monto}
                onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
              />
            </CampoFormulario>
            <CampoFormulario label="Código de operación">
              <input
                className={inputClass}
                value={form.codigoOperacion}
                onChange={(e) => setForm((f) => ({ ...f, codigoOperacion: e.target.value }))}
                placeholder="Opcional"
              />
            </CampoFormulario>
            <CampoFormulario label="URL del voucher" className="sm:col-span-2">
              <input
                className={inputClass}
                value={form.voucherUrl}
                onChange={(e) => setForm((f) => ({ ...f, voucherUrl: e.target.value }))}
                placeholder="https://…"
              />
            </CampoFormulario>
            {medioSel?.permiteSinVoucherPresencial && (
              <label className="flex items-center gap-2 text-xs text-slate-400 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.sinVoucher}
                  onChange={(e) => setForm((f) => ({ ...f, sinVoucher: e.target.checked }))}
                />
                Cobro presencial sin comprobante (permitido por este medio)
              </label>
            )}
          </div>
        )}

        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          {puedeRegistrarMas && (
            <button
              type="button"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
              disabled={
                registrar.isPending ||
                !form.medioPagoId ||
                !form.monto ||
                Number(form.monto) <= 0 ||
                Number(form.monto) > pendiente + 0.01
              }
              onClick={() => registrar.mutate()}
            >
              {registrar.isPending ? "Guardando…" : "Registrar pago"}
            </button>
          )}
          <button
            type="button"
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function PagoLinea({
  pago,
  puedeAnular,
  anulando,
  onAnular,
}: {
  pago: PagoReservaListItem;
  puedeAnular: boolean;
  anulando: boolean;
  onAnular: () => void;
}) {
  const anulado = pago.estado === "Rechazado";
  return (
    <li
      className={`flex justify-between gap-2 ${anulado ? "opacity-50 line-through" : ""}`}
    >
      <span className="min-w-0 flex-1">
        {pago.medioPagoNombre} · {anulado ? "Anulado" : pago.estado}
        {pago.codigoOperacion && (
          <span className="text-slate-500"> · {pago.codigoOperacion}</span>
        )}
        {pago.registradoSinVoucher && (
          <span className="text-amber-400/80"> · sin voucher</span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span className={anulado ? "text-slate-500" : "text-emerald-300"}>
          {formatMoneyPEN(pago.monto)}
        </span>
        {puedeAnular && (
          <button
            type="button"
            className="text-rose-400 hover:underline disabled:opacity-40"
            disabled={anulando}
            onClick={onAnular}
          >
            Anular
          </button>
        )}
      </span>
    </li>
  );
}
