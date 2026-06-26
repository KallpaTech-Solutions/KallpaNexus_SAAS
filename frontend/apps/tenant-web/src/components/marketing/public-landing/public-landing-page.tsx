"use client";

import {
  LandingPlanesSection,
  LandingServiciosContratar,
} from "@/components/marketing/landing-plans-section";
import { LandingStaffBanner } from "@/components/marketing/landing-staff-banner";
import Link from "next/link";
import "./marketing-public.css";
import {
  LANDING_BENEFICIOS,
  LANDING_MODULOS,
  LANDING_PROBLEMAS,
} from "./public-landing-content";
import { PublicLandingFooter } from "./public-landing-footer";
import { PublicLandingHero } from "./public-landing-hero";
import { PublicLandingNav } from "./public-landing-nav";
import { PublicLandingReveal } from "./public-landing-reveal";

export function PublicLandingPage() {
  return (
    <div className="kallpa-public-landing text-slate-900">
      <PublicLandingNav />
      <div className="pt-[72px]">
        <LandingStaffBanner />
      </div>

      <main>
        <PublicLandingHero />

        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <PublicLandingReveal className="mb-12 text-center">
              <h2 className="text-3xl font-bold sm:text-4xl">¿Qué problemas resolvemos?</h2>
              <p className="mt-2 text-slate-500">Digitaliza procesos críticos del dueño del negocio.</p>
            </PublicLandingReveal>
            <div className="grid gap-6 md:grid-cols-3">
              {LANDING_PROBLEMAS.map((x, i) => (
                <PublicLandingReveal key={x.t} delayMs={i * 100}>
                  <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                    <h3 className="font-semibold text-slate-900">{x.t}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">{x.p}</p>
                  </div>
                </PublicLandingReveal>
              ))}
            </div>
          </div>
        </section>

        <section id="modulos" className="bg-slate-50 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <PublicLandingReveal className="mb-12 text-center">
              <h2 className="text-3xl font-bold sm:text-4xl">Módulos especializados</h2>
              <p className="mt-2 text-slate-500">
                Una plataforma, varios verticales. Contratas por módulo, no mezclamos todo en uno.
              </p>
            </PublicLandingReveal>
            <div className="grid gap-8 md:grid-cols-2">
              {LANDING_MODULOS.map((m, i) => (
                <PublicLandingReveal key={m.id} delayMs={i * 80}>
                  <article className="h-full rounded-[18px] bg-white p-8 shadow-[0_10px_25px_rgba(0,0,0,.06)] transition hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xl font-bold">
                        {m.emoji} {m.titulo}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          m.estado === "disponible"
                            ? "bg-green-100 text-green-800"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {m.estado === "disponible" ? "Disponible" : "Próximamente"}
                      </span>
                    </div>
                    <p className="mt-2 text-slate-600">{m.desc}</p>
                    <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-600">
                      {m.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    {m.estado === "disponible" && (
                      <Link
                        href={`/registrar?servicio=${m.id}`}
                        className="mt-5 inline-block text-sm font-semibold text-blue-600 hover:underline"
                      >
                        Contratar {m.titulo} →
                      </Link>
                    )}
                  </article>
                </PublicLandingReveal>
              ))}
            </div>
          </div>
        </section>

        <LandingServiciosContratar />

        <section id="beneficios" className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <PublicLandingReveal className="mb-12 text-center">
              <h2 className="text-3xl font-bold sm:text-4xl">¿Por qué Kallpa Nexus?</h2>
            </PublicLandingReveal>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {LANDING_BENEFICIOS.map((b, i) => (
                <PublicLandingReveal key={b.h} delayMs={i * 70}>
                  <div className="rounded-[18px] bg-slate-50 p-8 text-center transition hover:bg-blue-50/80">
                    <h3 className="text-lg font-bold text-blue-600">{b.h}</h3>
                    <p className="mt-2 text-sm text-slate-600">{b.p}</p>
                  </div>
                </PublicLandingReveal>
              ))}
            </div>
          </div>
        </section>

        <LandingPlanesSection />

        <section id="contacto" className="py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <PublicLandingReveal>
              <div className="rounded-[30px] bg-gradient-to-br from-blue-600 to-blue-800 px-6 py-16 text-center text-white sm:px-12">
                <h2 className="text-3xl font-bold sm:text-4xl">Impulsa tu negocio con Kallpa Nexus</h2>
                <p className="mx-auto mt-4 max-w-2xl text-blue-100">
                  Registra tu complejo con Nexus Sport o contáctanos para una demo guiada.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/registrar?servicio=sport"
                    className="rounded-[10px] bg-white px-8 py-3.5 font-bold text-blue-600 transition hover:bg-blue-50"
                  >
                    Solicitar demo gratuita
                  </Link>
                  <a
                    href="mailto:hola@kallpanexus.com"
                    className="rounded-[10px] border border-white/40 px-8 py-3.5 font-semibold transition hover:bg-white/10"
                  >
                    Contacto
                  </a>
                </div>
              </div>
            </PublicLandingReveal>
          </div>
        </section>
      </main>

      <PublicLandingFooter />
    </div>
  );
}
