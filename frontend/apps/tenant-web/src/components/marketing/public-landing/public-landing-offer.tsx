"use client";

import { Calendar, Globe2, LayoutGrid, Wallet } from "lucide-react";
import { PublicLandingReveal } from "./public-landing-reveal";

const TILES = [
  { icon: Globe2, title: "Reservas web", line: "Horarios y adelanto en línea." },
  { icon: LayoutGrid, title: "Panel staff", line: "Canchas, tarifas y equipo." },
  { icon: Wallet, title: "Cobros", line: "Medios de pago y reportes." },
  { icon: Calendar, title: "Multi-sede", line: "Varios negocios, una cuenta." },
] as const;

export function PublicLandingOffer() {
  return (
    <section id="oferta" className="relative border-y border-slate-100 bg-white py-20">
      <div className="pointer-events-none absolute inset-0 kallpa-landing-grid-fade" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <PublicLandingReveal className="mb-10 max-w-xl">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400">
            Qué brindamos
          </span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Todo para operar y vender online
          </h2>
        </PublicLandingReveal>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TILES.map((tile, i) => (
            <PublicLandingReveal key={tile.title} delayMs={i * 55}>
              <div className="group h-full rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-lg hover:shadow-blue-600/5">
                <span className="font-mono text-[10px] text-slate-300">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <tile.icon className="mt-3 h-5 w-5 text-blue-600" />
                <h3 className="mt-3 font-semibold text-slate-900">{tile.title}</h3>
                <p className="mt-1.5 text-sm text-slate-500">{tile.line}</p>
              </div>
            </PublicLandingReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
