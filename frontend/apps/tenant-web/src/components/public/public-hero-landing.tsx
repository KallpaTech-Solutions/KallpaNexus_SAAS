"use client";

import Link from "next/link";

type Props = {
  heroImage: string;
  heroImageFallback?: string;
  heroTitulo: string;
  heroMensaje: string;
  nombreComercial: string;
  sedeNombre?: string | null;
};

export function PublicHeroLanding({
  heroImage,
  heroImageFallback = "/brand/img/Fondo_1.png",
  heroTitulo,
  heroMensaje,
  nombreComercial,
  sedeNombre,
}: Props) {
  return (
    <section className="tenant-reserve-hero relative min-h-[min(48vw,400px)] overflow-hidden bg-slate-950 text-white sm:min-h-[340px] md:min-h-[380px]">
      <div className="sports-hub-hero-glow sports-hub-hero-glow-a opacity-60" aria-hidden />
      <div className="sports-hub-hero-grid opacity-25" aria-hidden />
      <img
        src={heroImage}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center opacity-50"
        fetchPriority="high"
        decoding="async"
        onError={(e) => {
          const img = e.currentTarget;
          if (!img.src.includes(heroImageFallback)) {
            img.src = heroImageFallback;
          }
        }}
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-emerald-950/30"
        aria-hidden
      />
      <div className="relative mx-auto flex min-h-[inherit] w-full max-w-6xl flex-col justify-center px-5 py-10 sm:px-8 sm:py-12 md:px-10">
        <div className="max-w-xl text-left">
          <p className="text-sm text-slate-300">
            <Link href="/sports" className="font-medium text-emerald-400 transition hover:text-emerald-300">
              Nexus Sports
            </Link>
            <span className="mx-2 text-slate-600">·</span>
            <span className="text-slate-100">{nombreComercial}</span>
            {sedeNombre ? (
              <>
                <span className="mx-2 text-slate-600">·</span>
                <span className="text-white">{sedeNombre}</span>
              </>
            ) : null}
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">{heroTitulo}</h1>
          <p className="mt-3 max-w-lg text-base leading-relaxed text-slate-200">{heroMensaje}</p>
          <a
            href="#reservar"
            className="mt-7 inline-flex rounded-xl bg-emerald-500 px-7 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-400"
          >
            Ir a reservar
          </a>
        </div>
      </div>
    </section>
  );
}
