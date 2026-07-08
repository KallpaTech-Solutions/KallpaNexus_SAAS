"use client";

import Link from "next/link";
import { LANDING_MODULOS } from "./public-landing-content";
import { PublicLandingReveal } from "./public-landing-reveal";

export function PublicLandingModules() {
  return (
    <section id="modulos" className="relative py-20">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 kallpa-landing-glitch-rail opacity-40" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <PublicLandingReveal className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400">
              Ecosistema
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Módulos Nexus
            </h2>
          </div>
          <Link
            href="/sports"
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            Directorio Sport →
          </Link>
        </PublicLandingReveal>

        <div className="grid gap-3 sm:grid-cols-2">
          {LANDING_MODULOS.map((m, i) => {
            const live = m.estado === "disponible";
            return (
              <PublicLandingReveal key={m.id} delayMs={i * 70}>
                <article
                  className={`group relative overflow-hidden rounded-2xl border p-6 transition duration-300 hover:-translate-y-0.5 ${
                    live
                      ? "border-slate-200 bg-white shadow-sm hover:border-blue-200 hover:shadow-md"
                      : "border-slate-100 bg-slate-50/80"
                  }`}
                >
                  <div className="absolute right-4 top-4 font-mono text-[10px] text-slate-300">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="flex items-start justify-between gap-3 pr-8">
                    <div>
                      <span className="text-2xl" aria-hidden>
                        {m.emoji}
                      </span>
                      <h3 className="mt-2 text-lg font-bold text-slate-900">{m.titulo}</h3>
                      <p className="mt-1 text-sm text-slate-500">{m.tagline}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        live ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {live ? "Live" : "Soon"}
                    </span>
                  </div>
                  {live && (
                    <div className="mt-6 flex flex-wrap gap-2">
                      <Link
                        href={`/registrar?servicio=${m.id}`}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Empezar
                      </Link>
                      <Link
                        href="/demo/sport"
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Demo
                      </Link>
                    </div>
                  )}
                </article>
              </PublicLandingReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
