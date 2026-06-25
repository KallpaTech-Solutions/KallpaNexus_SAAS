"use client";

import { formatMoneyPEN, severidadCuentaRegresiva, textoCuentaRegresivaPlan } from "@kallpanexus/shared";
import type { TenantSuscripcionResumen } from "@kallpanexus/types";
import Link from "next/link";
import { cn } from "@/lib/cn";

type Props = {
  data: TenantSuscripcionResumen | undefined;
  variante?: "sucursales" | "staff" | "general";
  className?: string;
  mostrarLinkPlan?: boolean;
};

function etiquetaEstado(estado: string): string {
  switch (estado) {
    case "Demo":
      return "Modo demo";
    case "Activo":
      return "Suscripción activa";
    case "Suspendido":
      return "Suspendida";
    case "Cancelado":
      return "Cancelada (acceso hasta fin de ciclo)";
    default:
      return estado;
  }
}

export function PlanUsoBanner({
  data,
  variante = "general",
  className,
  mostrarLinkPlan = true,
}: Props) {
  if (!data) return null;

  const { plan, uso, estado } = data;
  const limS = plan.limiteSucursales;
  const limU = plan.limiteUsuariosStaff;
  const sucursalesTexto =
    limS > 0 ? `${uso.sucursales} / ${limS} sucursales` : `${uso.sucursales} sucursales`;
  const staffTexto =
    limU > 0 ? `${uso.usuariosStaff} / ${limU} usuarios staff` : `${uso.usuariosStaff} staff`;

  const cercaLimiteS = limS > 0 && uso.sucursales >= limS;
  const cercaLimiteU = limU > 0 && uso.usuariosStaff >= limU;

  const esDemo = plan.precioMensual <= 0 || data.tipoCiclo === "Demo";
  const cuentaTexto = textoCuentaRegresivaPlan(data.diasRestantesCiclo, esDemo);
  const sev =
    data.diasRestantesCiclo !== undefined
      ? severidadCuentaRegresiva(data.diasRestantesCiclo)
      : "ok";
  const mostrarCuenta =
    cuentaTexto &&
    (estado !== "Cancelado" || data.cancelacionProgramada || data.cicloVencido);

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-xs",
        estado === "Cancelado" || estado === "Suspendido"
          ? data.cicloVencido
            ? "border-red-300 bg-red-50 text-red-900"
            : "border-amber-300 bg-amber-50 text-amber-900"
          : "border-slate-200 bg-slate-100 text-slate-700",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-semibold text-slate-900">Plan: {plan.nombre}</span>
          <span className="mx-2 text-slate-400">·</span>
          <span>{etiquetaEstado(estado)}</span>
          {plan.precioMensual > 0 && (
            <>
              <span className="mx-2 text-slate-400">·</span>
              <span>{formatMoneyPEN(plan.precioMensual)}/mes</span>
            </>
          )}
        </div>
        {mostrarLinkPlan && (
          <Link href="/plan" className="shrink-0 font-semibold text-emerald-700 hover:underline">
            Gestionar plan
          </Link>
        )}
      </div>
      <p className="mt-1.5 text-slate-600">
        {variante === "sucursales" && (
          <span className={cercaLimiteS ? "font-medium text-amber-800" : undefined}>
            {sucursalesTexto}
          </span>
        )}
        {variante === "staff" && (
          <span className={cercaLimiteU ? "font-medium text-amber-800" : undefined}>
            {staffTexto}
          </span>
        )}
        {variante === "general" && (
          <>
            {sucursalesTexto}
            <span className="mx-2">·</span>
            {staffTexto}
          </>
        )}
      </p>
      {mostrarCuenta && (
        <p
          className={cn(
            "mt-2 font-medium",
            sev === "danger" && "text-red-700",
            sev === "warn" && "text-amber-800",
            sev === "ok" && "text-emerald-800"
          )}
        >
          {cuentaTexto}
          {data.proximoPago && (
            <span className="ml-2 font-normal text-slate-500">
              (hasta{" "}
              {new Date(data.proximoPago).toLocaleDateString("es-PE", {
                timeZone: "America/Lima",
              })}
              )
            </span>
          )}
        </p>
      )}
    </div>
  );
}
