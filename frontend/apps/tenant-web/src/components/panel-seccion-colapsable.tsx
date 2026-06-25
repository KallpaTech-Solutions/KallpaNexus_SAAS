"use client";

import { cn } from "@/lib/cn";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  titulo: string;
  descripcion?: string;
  abierto: boolean;
  onAlternar: () => void;
  children: ReactNode;
  variante?: "default" | "acento";
  badge?: ReactNode;
  className?: string;
};

export function PanelSeccionColapsable({
  titulo,
  descripcion,
  abierto,
  onAlternar,
  children,
  variante = "default",
  badge,
  className,
}: Props) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border",
        variante === "acento"
          ? "border-sport-orange/25 bg-orange-50/80"
          : "border-slate-200 bg-white",
        className
      )}
    >
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50"
        onClick={onAlternar}
        aria-expanded={abierto}
      >
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 transition",
            abierto
              ? "rotate-0 bg-emerald-100 text-emerald-800 ring-emerald-400"
              : "bg-slate-100 text-slate-600 ring-slate-200"
          )}
        >
          <ChevronDown
            className={cn("h-5 w-5 transition-transform duration-200", abierto && "rotate-180")}
            aria-hidden
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "text-sm font-semibold",
                variante === "acento" ? "text-orange-800" : "text-slate-900"
              )}
            >
              {titulo}
            </span>
            {badge}
          </span>
          {descripcion && (
            <span className="mt-0.5 block text-xs text-slate-600">{descripcion}</span>
          )}
        </span>
      </button>
      {abierto && <div className="border-t border-slate-100 px-4 pb-4 pt-3">{children}</div>}
    </section>
  );
}
