"use client";

import { formatMoneyPEN } from "@kallpanexus/shared";
import axios from "axios";
import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PublicLandingReveal } from "./public-landing-reveal";

type PlanRow = {
  id: string;
  nombre: string;
  precioMensual: number;
  limiteSucursales: number;
  limiteUsuariosStaff: number;
  recomendado?: boolean;
};

function normalizePlan(raw: Record<string, unknown>): PlanRow {
  return {
    id: String(raw.id ?? raw.Id ?? ""),
    nombre: String(raw.nombre ?? raw.Nombre ?? ""),
    precioMensual: Number(raw.precioMensual ?? raw.PrecioMensual ?? 0),
    limiteSucursales: Number(raw.limiteSucursales ?? raw.LimiteSucursales ?? 0),
    limiteUsuariosStaff: Number(raw.limiteUsuariosStaff ?? raw.LimiteUsuariosStaff ?? 0),
    recomendado: Boolean(raw.recomendado ?? raw.Recomendado),
  };
}

function limiteLabel(n: number) {
  return n > 0 ? String(n) : "∞";
}

export function PublicLandingPlans() {
  const q = useQuery({
    queryKey: ["onboarding-planes"],
    queryFn: async () => {
      const { data } = await axios.get<{ planes?: PlanRow[]; Planes?: PlanRow[] }>(
        "/api/onboarding/planes"
      );
      const list = data.planes ?? data.Planes ?? [];
      return list.map((p) => normalizePlan(p as Record<string, unknown>));
    },
  });

  const plans = q.data ?? [];

  return (
    <section id="planes" className="relative overflow-hidden bg-[#f4f6fa] py-20 lg:py-24">
      <div className="pointer-events-none absolute inset-0 kallpa-landing-hero-grid opacity-60" />
      <div className="pointer-events-none absolute -right-40 top-20 h-80 w-80 rounded-full bg-blue-400/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <PublicLandingReveal className="lg:col-span-7">
            <span className="inline-flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
              <span className="h-px w-10 bg-blue-600/40" />
              Precios
            </span>
            <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Escala cuando
              <span className="block text-blue-600">lo necesites.</span>
            </h2>
          </PublicLandingReveal>
          <PublicLandingReveal className="lg:col-span-5" delayMs={80}>
            <p className="text-slate-500">
              Demo gratis con <strong className="font-medium text-slate-700">Nexus Sport</strong>.
              Sin tarjeta para probar.
            </p>
          </PublicLandingReveal>
        </div>

        {q.isLoading && (
          <p className="mt-12 flex items-center gap-2 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando planes…
          </p>
        )}

        <div className="mt-12 grid gap-4 lg:grid-cols-3 lg:gap-0">
          {plans.map((plan, index) => {
            const highlight = plan.recomendado;
            return (
              <PublicLandingReveal key={plan.id} delayMs={index * 90}>
                <article
                  className={`relative flex h-full flex-col border bg-white transition duration-500 ${
                    highlight
                      ? "z-10 border-blue-300 shadow-xl shadow-blue-600/10 lg:-mx-1 lg:scale-[1.03] lg:rounded-2xl"
                      : "border-slate-200/90 lg:first:rounded-l-2xl lg:last:rounded-r-2xl"
                  } rounded-2xl p-8 lg:rounded-none lg:p-9`}
                >
                  {highlight && (
                    <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-md">
                        <Sparkles className="h-3 w-3" />
                        Recomendado
                      </span>
                    </div>
                  )}

                  <div className="border-b border-slate-100 pb-6">
                    <span className="font-mono text-xs text-slate-400">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="mt-2 text-xl font-bold text-slate-900">{plan.nombre}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {plan.precioMensual === 0 ? "Ideal para probar" : "Para operar en serio"}
                    </p>
                  </div>

                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                      {formatMoneyPEN(plan.precioMensual)}
                    </span>
                    <span className="text-sm text-slate-500">/ mes</span>
                  </div>

                  <ul className="mt-6 flex-1 space-y-3 text-sm text-slate-600">
                    <li className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                      Hasta {limiteLabel(plan.limiteSucursales)} negocios
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                      Hasta {limiteLabel(plan.limiteUsuariosStaff)} usuarios staff
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                      Módulo Sport + web pública
                    </li>
                  </ul>

                  <Link
                    href={`/registrar?servicio=sport&plan=${encodeURIComponent(plan.id)}`}
                    className={`group mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition ${
                      highlight
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "border border-slate-200 text-slate-800 hover:border-blue-300 hover:bg-blue-50/50"
                    }`}
                  >
                    {plan.precioMensual === 0 ? "Empezar gratis" : "Contratar"}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </article>
              </PublicLandingReveal>
            );
          })}
        </div>

        {!q.isLoading && plans.length === 0 && (
          <p className="mt-8 text-sm text-amber-800">
            No hay planes activos. Regístrate en demo sin plan o contacta soporte.
          </p>
        )}

        <PublicLandingReveal className="mt-12 flex flex-wrap gap-6 border-t border-slate-200/80 pt-8 text-sm text-slate-500" delayMs={200}>
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 text-blue-600" />
            Reservas web incluidas
          </span>
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 text-blue-600" />
            Panel gerente y cajero
          </span>
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 text-blue-600" />
            Directorio en /sports
          </span>
        </PublicLandingReveal>
      </div>
    </section>
  );
}
