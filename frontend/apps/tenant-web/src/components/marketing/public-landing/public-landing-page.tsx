"use client";

import { PublicLandingPlans } from "./public-landing-plans";
import { LandingStaffBanner } from "@/components/marketing/landing-staff-banner";
import Link from "next/link";
import "./marketing-public.css";
import { PublicLandingFooter } from "./public-landing-footer";
import { PublicLandingHero } from "./public-landing-hero";
import { PublicLandingModules } from "./public-landing-modules";
import { PublicLandingNav } from "./public-landing-nav";
import { PublicLandingOffer } from "./public-landing-offer";
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
        <PublicLandingOffer />
        <PublicLandingModules />

        <PublicLandingPlans />

        <section id="contacto" className="py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <PublicLandingReveal>
              <div className="relative overflow-hidden rounded-3xl bg-slate-900 px-6 py-14 text-center text-white sm:px-12">
                <div className="pointer-events-none absolute inset-0 opacity-40 kallpa-landing-cta-grid" />
                <h2 className="relative text-2xl font-bold sm:text-3xl">
                  Listo para tu complejo deportivo
                </h2>
                <p className="relative mx-auto mt-3 max-w-md text-slate-300">
                  Demo gratuita · web pública · panel gerente
                </p>
                <div className="relative mt-8 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/registrar?servicio=sport"
                    className="rounded-xl bg-blue-500 px-8 py-3.5 font-bold text-white transition hover:bg-blue-400"
                  >
                    Registrar
                  </Link>
                  <Link
                    href="/sports"
                    className="rounded-xl border border-white/25 px-8 py-3.5 font-semibold transition hover:bg-white/10"
                  >
                    Directorio Sport
                  </Link>
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
