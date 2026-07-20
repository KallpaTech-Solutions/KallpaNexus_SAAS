"use client";

import { PublicSportFooter, PublicSportHeader } from "@/components/public/public-sport-chrome";
import {
  formatCiudadLabel,
  SportsHubFilterSelect,
} from "@/components/public/sports-hub-filter-select";
import { PUBLIC_HERO_IMAGE } from "@/lib/public-brand";
import { SportFunnelEvents } from "@/lib/analytics/sport-reserva-funnel";
import { publicSportApi } from "@/lib/public-api";
import { resolvePublicMediaUrl } from "@/lib/tenant-media-url";
import type { PublicHubSedeCard } from "@kallpanexus/types";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

function ciudadesUnicas(sedes: PublicHubSedeCard[]): string[] {
  const set = new Set<string>();
  for (const s of sedes) {
    const c = s.ciudad?.trim();
    if (c) set.add(c);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

function deportesUnicos(sedes: PublicHubSedeCard[]): string[] {
  const set = new Set<string>();
  for (const s of sedes) {
    for (const t of s.tiposCancha) set.add(t);
  }
  return [...set].sort();
}

function filtrarSedes(
  sedes: PublicHubSedeCard[],
  q: string,
  ciudad: string,
  deporte: string
): PublicHubSedeCard[] {
  let out = sedes;
  const ql = q.trim().toLowerCase();
  if (ql) {
    out = out.filter(
      (s) =>
        s.nombreComercial.toLowerCase().includes(ql) ||
        s.sucursalNombre.toLowerCase().includes(ql) ||
        (s.ciudad?.toLowerCase().includes(ql) ?? false)
    );
  }
  if (ciudad) {
    out = out.filter((s) => (s.ciudad?.trim() ?? "") === ciudad);
  }
  if (deporte) {
    out = out.filter((s) => s.tiposCancha.includes(deporte));
  }
  return out;
}

function etiquetaDeporte(t: string) {
  const map: Record<string, string> = {
    Futbol: "Fútbol",
    Futsal: "Fútbol",
    Voley: "Vóley",
    Tenis: "Tenis",
    Basquet: "Básquet",
  };
  return map[t] ?? t;
}

function SedeCard({ sede }: { sede: PublicHubSedeCard }) {
  const href = sede.urlReserva.includes("?")
    ? sede.urlReserva
    : `${sede.urlReserva}?sede=${encodeURIComponent(sede.sedeSlug ?? "sede")}#reservar`;
  const portada = resolvePublicMediaUrl(sede.slug, sede.imagenHeroUrl, PUBLIC_HERO_IMAGE);
  return (
    <article className="sports-sede-card group overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="relative h-52 overflow-hidden bg-slate-900 sm:h-56 md:h-60">
        <div
          className="sports-sede-card-image absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(to top, rgba(0,0,0,.65), transparent 45%), url(${portada})`,
          }}
        />
        <span className="absolute bottom-3 left-3 rounded-full bg-emerald-500/95 px-2.5 py-0.5 text-xs font-semibold text-white shadow-lg shadow-emerald-900/30">
          {sede.totalCanchas} cancha{sede.totalCanchas === 1 ? "" : "s"}
        </span>
      </div>
      <div className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          {sede.nombreComercial}
        </p>
        <h3 className="mt-1 text-lg font-bold text-slate-900">{sede.sucursalNombre}</h3>
        {sede.ciudad && (
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
            <MapPin className="h-3.5 w-3.5" />
            {sede.ciudad}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {sede.tiposCancha.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-100"
            >
              {etiquetaDeporte(t)}
            </span>
          ))}
        </div>
        <Link
          href={href}
          data-ga-event={SportFunnelEvents.hubSedeClick}
          data-ga-section="sport_hub"
          data-ga-label={`${sede.slug}/${sede.sedeSlug ?? "sede"}`}
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/25 transition hover:from-emerald-500 hover:to-teal-500 hover:shadow-lg"
        >
          Ver detalles y reservar
        </Link>
      </div>
    </article>
  );
}

export default function PublicHubPage() {
  const [busqueda, setBusqueda] = useState("");
  const [qEnvio, setQEnvio] = useState("");
  const [filtroCiudad, setFiltroCiudad] = useState("");
  const [filtroDeporte, setFiltroDeporte] = useState("");

  const hubQ = useQuery({
    queryKey: ["public-hub-sedes", qEnvio],
    queryFn: () => publicSportApi.hubSedes(qEnvio || undefined),
  });

  const sedesRaw = useMemo(() => hubQ.data?.sedes ?? [], [hubQ.data?.sedes]);
  const ciudades = useMemo(() => ciudadesUnicas(sedesRaw), [sedesRaw]);
  const deportes = useMemo(() => deportesUnicos(sedesRaw), [sedesRaw]);

  const sedes = useMemo(
    () => filtrarSedes(sedesRaw, qEnvio, filtroCiudad, filtroDeporte),
    [sedesRaw, qEnvio, filtroCiudad, filtroDeporte]
  );

  const destacadas = useMemo(() => sedes.slice(0, 6), [sedes]);
  const mostrarLista = qEnvio || filtroCiudad || filtroDeporte ? sedes : destacadas;

  return (
    <div className="sports-hub-page min-h-screen">
      <PublicSportHeader solidTopBar />
      <main className="pt-[72px]">
        <section className="sports-hub-hero relative min-h-[400px] bg-slate-950 text-white sm:min-h-[460px] md:min-h-[520px]">
          <div className="sports-hub-hero-glow sports-hub-hero-glow-a" aria-hidden />
          <div className="sports-hub-hero-glow sports-hub-hero-glow-b" aria-hidden />
          <div className="sports-hub-hero-grid" aria-hidden />
          <img
            src={PUBLIC_HERO_IMAGE}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center opacity-40 mix-blend-luminosity"
            fetchPriority="high"
            decoding="async"
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/75 to-emerald-950/40"
            aria-hidden
          />
          <div className="relative mx-auto flex min-h-[400px] max-w-6xl flex-col justify-center px-4 py-14 sm:min-h-[460px] sm:px-6 sm:py-20 md:min-h-[520px] md:py-24">
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-emerald-400">
              <Sparkles className="h-4 w-4" aria-hidden />
              Reservas deportivas
            </p>
            <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
              Tu próxima victoria comienza aquí
            </h1>
            <p className="mt-4 max-w-xl text-lg text-slate-200">
              Encuentra complejos, canchas y horarios disponibles. Reserva en minutos.
            </p>
            {hubQ.data && (
              <div className="mt-6 flex flex-wrap gap-3">
                <span className="sports-hub-stat rounded-full px-4 py-1.5 text-sm font-medium text-white">
                  {hubQ.data.total} sedes activas
                </span>
                {ciudades.length > 0 && (
                  <span
                    className="sports-hub-stat rounded-full px-4 py-1.5 text-sm font-medium text-white"
                    style={{ animationDelay: "0.8s" }}
                  >
                    {ciudades.length} ciudad{ciudades.length === 1 ? "" : "es"}
                  </span>
                )}
              </div>
            )}
            <div className="sports-hub-search mt-8 max-w-xl space-y-2 rounded-2xl p-2">
              <form
                className="flex flex-col gap-2 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  setQEnvio(busqueda.trim());
                }}
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    placeholder="Busca sede o complejo (ej. SportZa, Videna…)"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full rounded-xl border-0 py-3 pl-10 pr-4 text-slate-900 shadow-inner focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-6 py-3 font-semibold text-slate-900 shadow-lg transition hover:from-emerald-300 hover:to-emerald-400"
                >
                  Buscar
                </button>
              </form>
              {(ciudades.length > 0 || deportes.length > 0) && (
                <div className="border-t border-white/15 pt-2">
                  <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-white/70">
                    Filtros
                  </p>
                  <div className="sports-hub-filters-row">
                  {ciudades.length > 0 && (
                    <SportsHubFilterSelect
                      label="Filtrar por ciudad"
                      value={filtroCiudad}
                      onChange={setFiltroCiudad}
                      options={[
                        { value: "", label: "Todas las ciudades" },
                        ...ciudades.map((c) => ({
                          value: c,
                          label: formatCiudadLabel(c),
                        })),
                      ]}
                    />
                  )}
                  {deportes.length > 0 && (
                    <SportsHubFilterSelect
                      label="Filtrar por deporte"
                      value={filtroDeporte}
                      onChange={setFiltroDeporte}
                      options={[
                        { value: "", label: "Todos los deportes" },
                        ...deportes.map((d) => ({
                          value: d,
                          label: etiquetaDeporte(d),
                        })),
                      ]}
                    />
                  )}
                </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="sedes" className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="bg-gradient-to-r from-slate-900 to-emerald-800 bg-clip-text text-2xl font-bold text-transparent">
                Nuestras sedes principales
              </h2>
              <p className="mt-1 text-slate-600">
                Complejos con reserva web activa. Elige una sede para ver canchas y horarios.
              </p>
            </div>
            {hubQ.data && (
              <span className="text-sm text-slate-500">{hubQ.data.total} sede(s) disponibles</span>
            )}
          </div>

          {hubQ.isLoading && (
            <p className="flex items-center justify-center gap-2 py-16 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" /> Cargando sedes…
            </p>
          )}

          {hubQ.isError && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              No pudimos cargar las sedes. Verifica que la API esté en marcha.
            </p>
          )}

          {!hubQ.isLoading && sedes.length === 0 && sedesRaw.length > 0 && (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-slate-600">
              Ninguna sede coincide con los filtros. Prueba otra ciudad o deporte.
            </p>
          )}

          {!hubQ.isLoading && sedesRaw.length === 0 && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-amber-900">
              Aún no hay sedes con reserva web activa. Actívala en Configuración del panel de cada negocio.
            </p>
          )}

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {mostrarLista.map((s) => (
              <SedeCard key={`${s.slug}-${s.sucursalId}`} sede={s} />
            ))}
          </div>

          {!qEnvio && !filtroCiudad && !filtroDeporte && sedes.length > 6 && (
            <p className="mt-8 text-center text-sm text-slate-500">
              Usa el buscador para ver todas las sedes ({sedes.length}).
            </p>
          )}
        </section>

        <section className="sports-hub-cta border-t border-emerald-100 py-14">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
            <h2 className="text-xl font-bold text-slate-900">¿Tienes un complejo deportivo?</h2>
            <p className="mx-auto mt-2 max-w-lg text-slate-600">
              Digitaliza reservas y cobros con Nexus Sport desde la landing comercial.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/registrar?servicio=sport"
                className="inline-block rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:shadow-xl"
              >
                Registrar mi complejo
              </Link>
              <Link
                href="/"
                className="inline-block rounded-xl border border-slate-300 bg-white/80 px-5 py-2.5 text-sm font-medium backdrop-blur-sm transition hover:border-emerald-300 hover:bg-white"
              >
                Conocer Kallpa Nexus
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicSportFooter />
    </div>
  );
}
