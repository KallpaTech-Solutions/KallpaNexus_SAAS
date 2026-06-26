"use client";

import Link from "next/link";
import { useMountReveal } from "./use-in-view-reveal";
import { ArrowRight, Play } from "lucide-react";

export function PublicLandingDashboardPreview() {
  const ready = useMountReveal();

  return (
    <div
      className={`relative overflow-hidden rounded-[20px] border border-slate-100 bg-white p-8 shadow-[0_20px_40px_rgba(37,99,235,0.08)] transition-all duration-1000 delay-200 ${
        ready ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
    >
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-100/80 blur-2xl" aria-hidden />
      <p className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">
        <Play className="h-3 w-3" aria-hidden />
        Prototipo interactivo
      </p>
      <h3 className="mt-4 text-lg font-bold text-slate-800">Así se ve Nexus Sport</h3>
      <p className="mt-1 text-sm text-slate-500">
        Entra a la demo: menú lateral, KPIs, filtros de reservas y canchas — sin crear cuenta.
      </p>
      <ul className="mt-4 space-y-2 text-sm text-slate-600">
        <li>· Cambia periodo 7 / 30 días en el tablero</li>
        <li>· Filtra reservas por sede, estado y origen web</li>
        <li>· Explora tarifas de canchas de ejemplo</li>
      </ul>
      <Link
        href="/demo/sport"
        className="mt-6 inline-flex items-center gap-2 rounded-[10px] bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
      >
        Explorar demostración
        <ArrowRight className="h-4 w-4" />
      </Link>
      <p className="mt-4 text-xs text-slate-500">
        ¿Listo para operar de verdad?{" "}
        <Link href="/registrar?servicio=sport" className="font-semibold text-blue-600 hover:underline">
          Registrar
        </Link>
      </p>
    </div>
  );
}
