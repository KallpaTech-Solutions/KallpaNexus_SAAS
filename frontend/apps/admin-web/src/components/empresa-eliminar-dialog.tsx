"use client";

import { platformUi } from "@/lib/platform-ui";
import { cn } from "@/lib/cn";
import type { PlatformEmpresaEliminacionConteos, PlatformEmpresaResumenEliminacion } from "@kallpanexus/api-client";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useId, useState } from "react";

function num(c: PlatformEmpresaEliminacionConteos | undefined, camel: keyof PlatformEmpresaEliminacionConteos): number {
  if (!c) return 0;
  const rec = c as Record<string, unknown>;
  const pascal = String(camel).charAt(0).toUpperCase() + String(camel).slice(1);
  const v = rec[camel as string] ?? rec[pascal];
  return typeof v === "number" ? v : 0;
}

function filasConteo(c: PlatformEmpresaEliminacionConteos | undefined) {
  const items = [
    { label: "Negocios (tenants)", n: num(c, "tenants") },
    { label: "Sucursales", n: num(c, "sucursales") },
    { label: "Canchas", n: num(c, "canchas") },
    { label: "Tarifas", n: num(c, "tarifas") },
    { label: "Reservas", n: num(c, "reservas") },
    { label: "Ventas", n: num(c, "ventas") },
    { label: "Productos / inventario", n: num(c, "productos") },
    { label: "Usuarios staff", n: num(c, "usuariosStaff") },
    { label: "Clientes del negocio", n: num(c, "clientes") },
    { label: "Medios de pago", n: num(c, "mediosPago") },
    { label: "Egresos", n: num(c, "egresos") },
    { label: "Reportes archivados", n: num(c, "reportesArchivados") },
  ];
  return items.filter((i) => i.n > 0);
}

type Props = {
  open: boolean;
  busy?: boolean;
  nombreComercialConfirm: string;
  resumen: PlatformEmpresaResumenEliminacion | null;
  resumenLoading?: boolean;
  resumenError?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function EmpresaEliminarDialog({
  open,
  busy,
  nombreComercialConfirm,
  resumen,
  resumenLoading,
  resumenError,
  onCancel,
  onConfirm,
}: Props) {
  const titleId = useId();
  const [textoConfirmacion, setTextoConfirmacion] = useState("");
  const [acepta, setAcepta] = useState(false);

  useEffect(() => {
    if (!open) {
      setTextoConfirmacion("");
      setAcepta(false);
    }
  }, [open]);

  if (!open) return null;

  const totales = resumen?.totales ?? resumen?.Totales;
  const filas = filasConteo(totales);
  const tenants = resumen?.tenants ?? resumen?.Tenants ?? [];
  const requiereCancel =
    resumen?.requiereCancelacionPrevia ?? resumen?.RequiereCancelacionPrevia ?? false;
  const aviso = resumen?.aviso ?? resumen?.Aviso;
  const nombreEsperado = nombreComercialConfirm.trim();
  const textoOk = !nombreEsperado || textoConfirmacion.trim() === nombreEsperado;
  const puedeConfirmar = acepta && textoOk && !resumenLoading && !resumenError && resumen;

  return (
    <div
      className={platformUi.modalOverlay}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div
        className={cn(platformUi.modal, "max-w-lg platform-modal-legacy-padding max-h-[90vh] overflow-y-auto")}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-600"
            aria-hidden
          >
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-semibold text-[var(--p-text)]">
              Eliminar empresa y todos sus datos
            </h2>
            <p className={`mt-2 text-sm leading-relaxed ${platformUi.textBody}`}>
              Esta acción es permanente. Revisa qué se borrará antes de continuar.
            </p>
          </div>
        </div>

        {resumenLoading && (
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando inventario de datos…
          </p>
        )}

        {resumenError && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {resumenError}
          </p>
        )}

        {resumen && !resumenLoading && (
          <div className="mt-4 space-y-3">
            {requiereCancel && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                La empresa está activa o suspendida: al confirmar se <strong>cancelará</strong> y luego se
                eliminarán todos los datos listados.
              </p>
            )}

            {filas.length === 0 ? (
              <p className="text-sm text-slate-600">No hay registros operativos; solo se eliminará la ficha de empresa y tenants.</p>
            ) : (
              <ul className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm">
                {filas.map((f) => (
                  <li key={f.label} className="flex justify-between gap-4 border-b border-slate-200/80 py-1.5 last:border-0">
                    <span className="text-slate-700">{f.label}</span>
                    <span className="font-semibold tabular-nums text-slate-900">{f.n}</span>
                  </li>
                ))}
              </ul>
            )}

            {tenants.length > 0 && (
              <div className="text-xs text-slate-500">
                <p className="font-medium text-slate-600">Negocios afectados:</p>
                <ul className="mt-1 list-inside list-disc">
                  {tenants.map((t) => (
                    <li key={t.id ?? t.Id}>
                      {(t.subdomain ?? t.Subdomain) || "—"} —{" "}
                      {(t.nombreComercialNegocio ?? t.NombreComercialNegocio) || "Sin nombre"}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aviso && <p className="text-xs leading-relaxed text-slate-500">{aviso}</p>}
          </div>
        )}

        <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={acepta}
            disabled={busy || resumenLoading}
            onChange={(e) => setAcepta(e.target.checked)}
          />
          <span className="text-slate-700">
            Acepto eliminar permanentemente la empresa y <strong>todos</strong> los datos operativos listados.
          </span>
        </label>

        {nombreEsperado && (
          <label className="mt-3 block text-sm">
            <span className={platformUi.formLabel}>
              Escribe el nombre comercial de facturación: <strong>{nombreEsperado}</strong>
            </span>
            <input
              className={`${platformUi.input} mt-1`}
              value={textoConfirmacion}
              disabled={busy}
              autoComplete="off"
              onChange={(e) => setTextoConfirmacion(e.target.value)}
            />
          </label>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className={platformUi.btnSecondary} disabled={busy} onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy || !puedeConfirmar}
            onClick={onConfirm}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Eliminar todo
          </button>
        </div>
      </div>
    </div>
  );
}
