"use client";

import { UserX } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  mensaje: string;
  className?: string;
  compacto?: boolean;
};

export function CuentaDesactivadaAviso({ mensaje, className, compacto }: Props) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10",
        compacto ? "px-3 py-2.5" : "px-4 py-3",
        className
      )}
      role="alert"
    >
      <UserX className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" aria-hidden />
      <div className="min-w-0">
        <p className="text-sm font-medium text-rose-100">Cuenta o acceso desactivado</p>
        <p className="mt-1 text-xs leading-relaxed text-rose-200/85">{mensaje}</p>
        <p className="mt-2 text-xs text-rose-200/60">
          Comuníquese con su proveedor de servicios para reactivar el acceso.
        </p>
      </div>
    </div>
  );
}
