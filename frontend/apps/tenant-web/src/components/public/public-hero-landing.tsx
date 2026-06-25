"use client";

import Link from "next/link";

type Props = {
  heroImage: string;
  heroImageFallback?: string;
  heroTitulo: string;
  heroMensaje: string;
  nombreComercial: string;
};

export function PublicHeroLanding({
  heroImage,
  heroImageFallback = "/brand/img/Fondo_1.png",
  heroTitulo,
  heroMensaje,
  nombreComercial,
}: Props) {
  return (
    <section className="relative min-h-[min(52vw,520px)] overflow-hidden bg-slate-950 text-white sm:min-h-[420px] md:min-h-[480px] lg:min-h-[520px]">
      <img
        src={heroImage}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
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
        className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-slate-950/15 md:via-slate-950/65 md:to-transparent"
        aria-hidden
      />
      <div className="relative mx-auto flex min-h-[inherit] w-full max-w-6xl flex-col justify-center px-5 py-12 sm:px-8 sm:py-16 md:px-10 md:py-20 lg:px-12 lg:py-24">
        <div className="max-w-lg text-left lg:max-w-xl">
        <p className="text-sm text-emerald-400">
          <Link href="/t" className="hover:underline">
            Inicio
          </Link>
          <span className="mx-2 text-slate-500">/</span>
          {nombreComercial}
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-[2.75rem]">
          {heroTitulo}
        </h1>
        <p className="mt-3 max-w-lg text-base text-slate-200 sm:text-lg">{heroMensaje}</p>
        <a
          href="#canchas"
          className="mt-8 inline-flex w-fit rounded-xl bg-emerald-500 px-8 py-3.5 text-base font-semibold text-slate-900 shadow-lg hover:bg-emerald-400"
        >
          Reservar ahora
        </a>
        </div>
      </div>
    </section>
  );
}
