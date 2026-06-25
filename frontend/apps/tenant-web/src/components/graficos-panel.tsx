"use client";

import { formatMoneyPEN } from "@kallpanexus/shared";

export type BarraGrafico = {
  etiqueta: string;
  valor: number;
  color?: string;
  formato?: "numero" | "dinero";
};

export function GraficoBarrasHorizontales({
  titulo,
  barras,
  vacio = "Sin datos en el período.",
  compacto,
}: {
  titulo: string;
  barras: BarraGrafico[];
  vacio?: string;
  compacto?: boolean;
}) {
  const max = Math.max(...barras.map((b) => b.valor), 1);

  if (barras.length === 0 || barras.every((b) => b.valor <= 0)) {
    return (
      <div
        className={
          compacto
            ? "rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
            : "rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        }
      >
        <h3 className="text-sm font-medium text-slate-300">{titulo}</h3>
        <p className="mt-3 text-xs text-slate-500">{vacio}</p>
      </div>
    );
  }

  return (
    <div
      className={
        compacto
          ? "rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
          : "rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      }
    >
      <h3 className="text-sm font-medium text-sport-navy">{titulo}</h3>
      <ul className={compacto ? "mt-3 space-y-2" : "mt-4 space-y-3"}>
        {barras.map((b) => {
          const pct = Math.max(6, (b.valor / max) * 100);
          const texto =
            b.formato === "dinero" ? formatMoneyPEN(b.valor) : String(b.valor);
          return (
            <li key={b.etiqueta}>
              <div className="mb-1 flex justify-between gap-2 text-xs">
                <span className="truncate text-slate-400">{b.etiqueta}</span>
                <span className="shrink-0 font-medium text-slate-200">{texto}</span>
              </div>
              <div
                className={
                  compacto ? "h-1.5 overflow-hidden rounded-full bg-slate-800" : "h-2 overflow-hidden rounded-full bg-slate-800"
                }
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: b.color ?? "rgb(240 90 40)",
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function GraficoBarrasVerticales({
  titulo,
  barras,
}: {
  titulo: string;
  barras: BarraGrafico[];
}) {
  const max = Math.max(...barras.map((b) => b.valor), 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-medium text-sport-navy">{titulo}</h3>
      <div className="mt-4 flex h-44 items-end justify-center gap-3 sm:gap-5">
        {barras.map((b) => {
          const alturaPct = Math.max(14, (b.valor / max) * 100);
          const texto =
            b.formato === "dinero" ? formatMoneyPEN(b.valor) : b.valor;
          return (
            <div
              key={b.etiqueta}
              className="flex min-w-0 max-w-[5rem] flex-1 flex-col items-center gap-1.5"
            >
              <span className="text-sm font-semibold text-slate-200">{texto}</span>
              <div className="flex h-28 w-full items-end justify-center">
                <div
                  className="w-9 max-w-full rounded-t-md transition-all duration-500 sm:w-10"
                  style={{
                    height: `${alturaPct}%`,
                    backgroundColor: b.color ?? "rgb(240 90 40)",
                  }}
                />
              </div>
              <span className="line-clamp-2 text-center text-[11px] leading-tight text-slate-500">
                {b.etiqueta}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
