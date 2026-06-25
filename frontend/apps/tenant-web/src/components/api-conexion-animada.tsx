"use client";

import { Server } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  /** Toast compacto vs bloque en formulario */
  variante?: "toast" | "inline";
  className?: string;
};

export function ApiConexionAnimada({ variante = "inline", className }: Props) {
  const compacto = variante === "toast";

  return (
    <div
      className={cn(
        "flex items-center gap-3",
        compacto ? "min-w-[14rem]" : "rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label="Conectando con el servidor"
    >
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
        <span
          className="absolute h-9 w-9 rounded-full border border-amber-400/40 api-conexion-ripple"
          aria-hidden
        />
        <span
          className="absolute h-6 w-6 rounded-full bg-amber-500/15 api-conexion-pulse"
          aria-hidden
        />
        <Server
          className={cn("relative h-4 w-4", compacto ? "text-amber-800" : "text-amber-600")}
          aria-hidden
        />
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            "font-semibold",
            compacto ? "text-sm text-amber-950" : "text-sm text-amber-900"
          )}
        >
          Conectando con el servidor
        </p>
        <p className={cn("text-xs", compacto ? "text-amber-900/80" : "text-amber-800/90")}>
          Espera un momento… Si tarda mucho, comuníquese con su proveedor de servicios.
        </p>
        <div className="mt-2 flex gap-1" aria-hidden>
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 api-conexion-dot" />
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 api-conexion-dot [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 api-conexion-dot [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
