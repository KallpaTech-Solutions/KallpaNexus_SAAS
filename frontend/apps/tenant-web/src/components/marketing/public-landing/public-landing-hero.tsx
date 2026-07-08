"use client";

import { PublicLandingGlitchAccent } from "./public-landing-glitch-accent";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { LANDING_MARQUEE } from "./public-landing-content";
import { PublicLandingWaveSphere } from "./public-landing-wave-sphere";
import { useMountReveal } from "./use-in-view-reveal";

export function PublicLandingHero() {
  const ready = useMountReveal();

  return (
    <section
      id="inicio"
      className="relative overflow-hidden bg-[#f8fafc] pb-14 pt-6 sm:pt-8 lg:pb-20 lg:pt-10"
    >
      <div className="pointer-events-none absolute inset-0 kallpa-landing-hero-grid" />
      <PublicLandingGlitchAccent className="opacity-50" />

      {/* Esfera: altura fija desde arriba del hero (no sigue el padding del texto) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[min(80vh,740px)]">
        <div className="absolute right-[-18%] top-0 h-[min(118vw,720px)] w-[min(118vw,720px)] sm:right-[-14%] lg:right-[-6%] lg:h-[min(88vh,820px)] lg:w-[min(88vh,820px)]">
          <PublicLandingWaveSphere className="h-full w-full" />
        </div>
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#f8fafc] via-[#f8fafc]/72 to-[#f8fafc]/5 lg:via-[#f8fafc]/45 lg:to-transparent"
          aria-hidden
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-[min(28vh,220px)] pt-10 sm:px-6 sm:pt-14 lg:pt-[4.25rem] lg:pb-[min(32vh,280px)]">
        <div className="max-w-xl lg:max-w-[46%]">
          <p
            className={`mb-2 font-mono text-xs uppercase tracking-[0.25em] text-blue-600 transition-all duration-700 ${
              ready ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
            }`}
          >
            Plataforma · Perú
          </p>

          <h1
            className={`text-4xl font-extrabold leading-[1.05] tracking-tight text-slate-900 transition-all duration-1000 sm:text-5xl lg:text-[3.35rem] ${
              ready ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            Opera tu negocio.
            <span className="mt-1 block text-blue-600">Vende en la web.</span>
          </h1>

          <p
            className={`mt-4 max-w-md text-lg text-slate-600 transition-all duration-700 delay-100 ${
              ready ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <strong className="font-semibold text-slate-800">Nexus Sport</strong> — reservas,
            cobros y panel. Un SaaS, varios verticales.
          </p>

          <div
            className={`mt-7 flex flex-wrap gap-3 transition-all duration-700 delay-200 ${
              ready ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <Link
              href="/registrar?servicio=sport"
              className="group inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Crear mi negocio
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/demo/sport"
              className="rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-semibold text-slate-800 transition hover:border-blue-200 hover:bg-blue-50/50"
            >
              Ver demo
            </Link>
          </div>
        </div>
      </div>

      <div
        className={`relative z-10 mt-4 overflow-hidden border-y border-slate-200/60 bg-white/60 py-5 backdrop-blur-sm transition-opacity duration-700 delay-300 sm:mt-6 lg:mt-8 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="kallpa-landing-marquee pointer-events-none flex w-max gap-14 whitespace-nowrap px-4">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex gap-14">
              {LANDING_MARQUEE.map((item) => (
                <div key={`${copy}-${item.value}`} className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-blue-600">{item.value}</span>
                  <span className="text-sm text-slate-500">{item.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
