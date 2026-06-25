"use client";

import { inputClass } from "@/components/campo-formulario";
import {
  etiquetaRangoFechas,
  fechaHoyLimaInput,
  fechaLimaInputConOffset,
} from "@kallpanexus/shared";
import { useCiudadSucursalActiva } from "@/lib/use-ciudad-sucursal";
import { CalendarRange, Filter, X } from "lucide-react";

type Props = {
  canchaId: string;
  onCanchaId: (v: string) => void;
  nombre: string;
  onNombre: (v: string) => void;
  dni: string;
  onDni: (v: string) => void;
  estado: string;
  onEstado: (v: string) => void;
  fechaDesde: string;
  onFechaDesde: (v: string) => void;
  fechaHasta: string;
  onFechaHasta: (v: string) => void;
  canchas: { id: string; nombre: string; nombreSucursal?: string }[];
  total: number;
  filtrados: number;
  onLimpiar: () => void;
};

export function FiltrosReservasBar({
  canchaId,
  onCanchaId,
  nombre,
  onNombre,
  dni,
  onDni,
  estado,
  onEstado,
  fechaDesde,
  onFechaDesde,
  fechaHasta,
  onFechaHasta,
  canchas,
  total,
  filtrados,
  onLimpiar,
}: Props) {
  const ciudadSede = useCiudadSucursalActiva();
  const hayFiltroExtra = !!(canchaId || nombre.trim() || dni.trim() || estado);

  function presetHoy() {
    const h = fechaHoyLimaInput();
    onFechaDesde(h);
    onFechaHasta(h);
  }

  function presetSemana() {
    onFechaDesde(fechaLimaInputConOffset(-7));
    onFechaHasta(fechaLimaInputConOffset(7));
  }

  function presetMes() {
    onFechaDesde(fechaLimaInputConOffset(-30));
    onFechaHasta(fechaLimaInputConOffset(30));
  }

  const rangoInvalido =
    fechaDesde &&
    fechaHasta &&
    fechaDesde > fechaHasta;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Filter className="h-4 w-4 text-sport-orange" aria-hidden />
          Buscar reservas
        </div>
        <span className="text-xs text-slate-500">
          {filtrados === total
            ? `${total} en el rango`
            : `${filtrados} de ${total} coinciden`}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
          <CalendarRange className="h-3.5 w-3.5 text-sport-green" />
          {etiquetaRangoFechas(ciudadSede)}
        </span>
        <label className="text-xs text-slate-500">
          Desde
          <input
            type="date"
            className={`${inputClass} mt-0.5 w-[9.5rem]`}
            value={fechaDesde}
            onChange={(e) => onFechaDesde(e.target.value)}
          />
        </label>
        <label className="text-xs text-slate-500">
          Hasta
          <input
            type="date"
            className={`${inputClass} mt-0.5 w-[9.5rem]`}
            value={fechaHasta}
            min={fechaDesde || undefined}
            onChange={(e) => onFechaHasta(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-1.5 pb-0.5">
          <button
            type="button"
            className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
            onClick={presetHoy}
          >
            Hoy
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
            onClick={presetSemana}
          >
            ±7 días
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
            onClick={presetMes}
          >
            ±30 días
          </button>
        </div>
        {rangoInvalido && (
          <p className="w-full text-xs text-amber-300">«Desde» no puede ser posterior a «Hasta».</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="block text-xs text-slate-500">
          Cancha
          <select
            className={`${inputClass} mt-1`}
            value={canchaId}
            onChange={(e) => onCanchaId(e.target.value)}
          >
            <option value="">Todas</option>
            {canchas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-slate-500">
          Nombre cliente
          <input
            className={`${inputClass} mt-1`}
            placeholder="Buscar…"
            value={nombre}
            onChange={(e) => onNombre(e.target.value)}
          />
        </label>
        <label className="block text-xs text-slate-500">
          DNI
          <input
            className={`${inputClass} mt-1`}
            placeholder="8 dígitos"
            inputMode="numeric"
            value={dni}
            onChange={(e) => onDni(e.target.value)}
          />
        </label>
        <label className="block text-xs text-slate-500">
          Estado
          <select
            className={`${inputClass} mt-1`}
            value={estado}
            onChange={(e) => onEstado(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Confirmada">Confirmada</option>
            <option value="Completada">Completada</option>
            <option value="Cancelada">Cancelada</option>
            <option value="NoAsistio">No asistió</option>
          </select>
        </label>
        <div className="flex items-end">
          {(hayFiltroExtra || rangoInvalido) && (
            <button
              type="button"
              className="flex h-10 w-full items-center justify-center gap-1 rounded-lg border border-slate-600 text-xs text-slate-300 hover:bg-slate-800"
              onClick={onLimpiar}
            >
              <X className="h-3.5 w-3.5" />
              Restablecer filtros
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function rangoFechasReservasPorDefecto(): { desde: string; hasta: string } {
  return {
    desde: fechaLimaInputConOffset(-30),
    hasta: fechaLimaInputConOffset(14),
  };
}
