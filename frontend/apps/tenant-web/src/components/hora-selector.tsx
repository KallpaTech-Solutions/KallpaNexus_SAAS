"use client";

import { formatHoraReloj12, formatHoraReloj24 } from "@kallpanexus/shared";
import { useState } from "react";

type FormatoHora = "24" | "12";

type Props = {
  value: number;
  onChange: (hora: number) => void;
  modoFinTarifa?: boolean;
  className?: string;
  /** Una sola fila de altura fija (al lado del input fecha). */
  inline?: boolean;
};

const HORAS_INICIO = Array.from({ length: 24 }, (_, i) => i);
const HORAS_FIN_TARIFA = Array.from({ length: 24 }, (_, i) => i + 1);

export function HoraSelector({
  value,
  onChange,
  modoFinTarifa = false,
  className = "",
  inline = false,
}: Props) {
  const [formato, setFormato] = useState<FormatoHora>("12");

  const opciones = modoFinTarifa ? HORAS_FIN_TARIFA : HORAS_INICIO;
  const horaSegura = Number.isFinite(value) ? value : 12;

  function etiqueta(h: number): string {
    if (modoFinTarifa) {
      const ultimaIncluida = h - 1;
      return formato === "24"
        ? `Hasta ${formatHoraReloj24(ultimaIncluida)}`
        : `Hasta ${formatHoraReloj12(ultimaIncluida)}`;
    }
    return formato === "24" ? formatHoraReloj24(h) : formatHoraReloj12(h);
  }

  const toggle = (
    <div
      className={
        inline
          ? "flex h-full shrink-0 flex-col border-l border-slate-200"
          : "mb-1.5 flex gap-1"
      }
    >
      <button
        type="button"
        onClick={() => setFormato("24")}
        className={
          inline
            ? `flex-1 px-1.5 text-[10px] font-semibold ${formato === "24" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"}`
            : `rounded-md px-2 py-0.5 text-xs font-semibold ${
                formato === "24"
                  ? "bg-emerald-600 text-white ring-1 ring-emerald-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`
        }
      >
        24h
      </button>
      <button
        type="button"
        onClick={() => setFormato("12")}
        className={
          inline
            ? `flex-1 px-1.5 text-[10px] font-semibold ${formato === "12" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"}`
            : `rounded-md px-2 py-0.5 text-xs font-semibold ${
                formato === "12"
                  ? "bg-emerald-600 text-white ring-1 ring-emerald-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`
        }
      >
        12h
      </button>
    </div>
  );

  if (inline) {
    return (
      <div
        className={`flex h-10 min-w-0 overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm ${className}`}
      >
        <select
          className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-slate-900 outline-none"
          value={horaSegura}
          onChange={(e) => onChange(Number(e.target.value))}
        >
          {opciones.map((h) => (
            <option key={h} value={h}>
              {etiqueta(h)}
            </option>
          ))}
        </select>
        {toggle}
      </div>
    );
  }

  return (
    <div className={className}>
      {toggle}
      <select
        className="panel-input h-10 w-full px-2 text-sm"
        value={horaSegura}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {opciones.map((h) => (
          <option key={h} value={h}>
            {etiqueta(h)}
          </option>
        ))}
      </select>
    </div>
  );
}
