"use client";

import { AlertTriangle, Info } from "lucide-react";

export type ConfirmacionVariante = "peligro" | "advertencia" | "info";

type Props = {
  abierto: boolean;
  titulo?: string;
  mensaje: string;
  confirmarTexto?: string;
  cancelarTexto?: string;
  variante?: ConfirmacionVariante;
  cargando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
};

const estilos: Record<
  ConfirmacionVariante,
  { icono: typeof AlertTriangle; anillo: string; boton: string }
> = {
  peligro: {
    icono: AlertTriangle,
    anillo: "bg-rose-500/15 text-rose-300 ring-rose-500/40",
    boton: "bg-rose-600 hover:bg-rose-500 text-white",
  },
  advertencia: {
    icono: AlertTriangle,
    anillo: "bg-amber-500/15 text-amber-200 ring-amber-500/40",
    boton: "bg-amber-600 hover:bg-amber-500 text-white",
  },
  info: {
    icono: Info,
    anillo: "bg-sky-500/15 text-sky-200 ring-sky-500/40",
    boton: "bg-emerald-600 hover:bg-emerald-500 text-white",
  },
};

export function ConfirmacionModal({
  abierto,
  titulo = "¿Confirmar?",
  mensaje,
  confirmarTexto = "Confirmar",
  cancelarTexto = "Cancelar",
  variante = "advertencia",
  cargando = false,
  onConfirmar,
  onCancelar,
}: Props) {
  if (!abierto) return null;

  const { icono: Icono, anillo, boton } = estilos[variante];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirmacion-titulo"
      onClick={(e) => {
        if (e.target === e.currentTarget && !cargando) onCancelar();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-900 p-6 shadow-2xl shadow-black/50">
        <div className="flex gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-1 ${anillo}`}
          >
            <Icono className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="confirmacion-titulo" className="text-lg font-semibold text-white">
              {titulo}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{mensaje}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:bg-slate-800/80 disabled:opacity-50"
            disabled={cargando}
            onClick={onCancelar}
          >
            {cancelarTexto}
          </button>
          <button
            type="button"
            className={`rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 ${boton}`}
            disabled={cargando}
            onClick={onConfirmar}
          >
            {cargando ? "Procesando…" : confirmarTexto}
          </button>
        </div>
      </div>
    </div>
  );
}
