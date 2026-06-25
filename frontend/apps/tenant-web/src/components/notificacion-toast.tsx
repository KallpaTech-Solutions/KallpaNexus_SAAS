"use client";

import { ApiConexionAnimada } from "@/components/api-conexion-animada";
import { CuentaDesactivadaAviso } from "@/components/cuenta-desactivada-aviso";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

export type NotificacionTipo = "exito" | "error" | "info" | "conexion" | "cuenta";

export type NotificacionItem = {
  id: number;
  mensaje: string;
  tipo: NotificacionTipo;
};

const estilos: Record<
  NotificacionTipo,
  { borde: string; fondo: string; texto: string; icono: typeof CheckCircle2 }
> = {
  exito: {
    borde: "border-emerald-400",
    fondo: "bg-emerald-50",
    texto: "text-emerald-900",
    icono: CheckCircle2,
  },
  error: {
    borde: "border-red-400",
    fondo: "bg-red-50",
    texto: "text-red-900",
    icono: XCircle,
  },
  info: {
    borde: "border-sky-400",
    fondo: "bg-sky-50",
    texto: "text-sky-900",
    icono: Info,
  },
  conexion: {
    borde: "border-amber-400",
    fondo: "bg-amber-50",
    texto: "text-amber-900",
    icono: Info,
  },
  cuenta: {
    borde: "border-red-400",
    fondo: "bg-red-50",
    texto: "text-red-900",
    icono: XCircle,
  },
};

type Props = {
  toasts: NotificacionItem[];
  onCerrar: (id: number) => void;
};

export function NotificacionToastStack({ toasts, onCerrar }: Props) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-[80] flex w-full max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const s = estilos[t.tipo];
        const Icono = s.icono;
        if (t.tipo === "conexion") {
          return (
            <div
              key={t.id}
              className={`pointer-events-auto rounded-xl border px-3 py-3 shadow-lg shadow-slate-300/50 ${s.borde} ${s.fondo}`}
            >
              <div className="flex items-start gap-2">
                <ApiConexionAnimada variante="toast" className="flex-1" />
                <button
                  type="button"
                  className="shrink-0 rounded-md p-0.5 text-slate-600 transition hover:bg-slate-200/80 hover:text-slate-900"
                  aria-label="Cerrar notificación"
                  onClick={() => onCerrar(t.id)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        }
        if (t.tipo === "cuenta") {
          return (
            <div
              key={t.id}
              className={`pointer-events-auto max-w-sm rounded-xl border px-2 py-2 shadow-lg shadow-slate-300/50 ${s.borde} ${s.fondo}`}
            >
              <div className="flex items-start gap-1">
                <CuentaDesactivadaAviso mensaje={t.mensaje} compacto className="flex-1 border-0 bg-transparent" />
                <button
                  type="button"
                  className="shrink-0 rounded-md p-0.5 text-slate-600 transition hover:bg-slate-200/80 hover:text-slate-900"
                  aria-label="Cerrar notificación"
                  onClick={() => onCerrar(t.id)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        }
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg shadow-slate-300/50 ${s.borde} ${s.fondo}`}
          >
            <Icono className={`mt-0.5 h-5 w-5 shrink-0 ${s.texto}`} aria-hidden />
            <p className={`flex-1 text-sm font-medium leading-snug ${s.texto}`}>{t.mensaje}</p>
            <button
              type="button"
              className="shrink-0 rounded-md p-0.5 text-slate-600 transition hover:bg-slate-200/80 hover:text-slate-900"
              aria-label="Cerrar notificación"
              onClick={() => onCerrar(t.id)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
