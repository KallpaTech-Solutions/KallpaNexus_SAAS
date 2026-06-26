"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PublicLandingDashboardPreview } from "./public-landing-dashboard-preview";
import { LANDING_HERO_WORDS, LANDING_MARQUEE } from "./public-landing-content";
import { useMountReveal } from "./use-in-view-reveal";

export function PublicLandingHero() {
  const ready = useMountReveal();
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setWordIndex((prev) => (prev + 1) % LANDING_HERO_WORDS.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, []);

  const word = LANDING_HERO_WORDS[wordIndex];

  return (
    <section
      id="inicio"
      className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-white pb-28 pt-28 lg:pb-32 lg:pt-32"
    >
      <div className="pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full bg-blue-400/25 blur-3xl kallpa-landing-orb" />
      <div className="pointer-events-none absolute -left-16 bottom-10 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl kallpa-landing-orb-alt" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
        <div>
          <p
            className={`mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-all duration-700 ${
              ready ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
            }`}
          >
            <span className="h-px w-8 bg-blue-300" />
            Plataforma SaaS para negocios en Perú
          </p>

          <h1
            className={`text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 transition-all duration-1000 sm:text-5xl lg:text-[3.25rem] ${
              ready ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            Gestiona tu negocio con módulos especializados{" "}
            <span className="text-blue-600">Kallpa Nexus</span>
          </h1>

          <p
            className={`mt-5 text-lg leading-relaxed text-slate-500 transition-all duration-700 delay-100 ${
              ready ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            No es un producto genérico: elige{" "}
            <strong className="font-semibold text-slate-700">Nexus Sport</strong> para canchas (ya
            disponible) o suma Stay, Care y Gear cuando estén listos. Una cuenta empresa, tenants por
            negocio, panel operativo por sede.
          </p>

          <p
            className={`mt-4 text-base text-slate-600 transition-all duration-700 delay-150 ${
              ready ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            Todo lo que necesitas para{" "}
            <span className="font-semibold text-blue-600">
              {word.split("").map((char, i) => (
                <span
                  key={`${wordIndex}-${i}-${char}`}
                  className="inline-block kallpa-landing-char-in"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  {char}
                </span>
              ))}
            </span>{" "}
            con una sola plataforma.
          </p>

          <div
            className={`mt-8 flex flex-wrap gap-3 transition-all duration-700 delay-200 ${
              ready ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <Link
              href="/demo/sport"
              className="group inline-flex items-center gap-2 rounded-[10px] bg-blue-600 px-7 py-3.5 font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-blue-700"
            >
              Explorar demostración
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/registrar?servicio=sport"
              className="rounded-[10px] border-2 border-blue-600 px-7 py-3.5 font-semibold text-blue-600 transition hover:bg-blue-50"
            >
              Registrar
            </Link>
            <Link
              href="/login"
              className="rounded-[10px] px-4 py-3.5 text-sm font-medium text-slate-600 transition hover:text-blue-600"
            >
              Ya tengo cuenta →
            </Link>
          </div>
        </div>

        <PublicLandingDashboardPreview />
      </div>

      <div
        className={`pointer-events-none mt-16 overflow-hidden border-y border-slate-100/80 bg-white/50 py-6 transition-opacity duration-700 delay-300 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="kallpa-landing-marquee flex w-max gap-16 whitespace-nowrap px-4">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex gap-16">
              {LANDING_MARQUEE.map((item) => (
                <div key={`${copy}-${item.value}`} className="flex items-baseline gap-3">
                  <span className="text-2xl font-bold text-blue-600 sm:text-3xl">{item.value}</span>
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
