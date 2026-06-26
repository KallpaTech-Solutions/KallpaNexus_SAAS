"use client";

import {
  googleMapsComoLlegarUrl,
  googleMapsEmbedFromPin,
  googleMapsPinFromEnlace,
} from "@/lib/google-maps-link";
import { sedeSlugFor, tenantSedeHref } from "@/lib/public-brand";
import { etiquetaTelefonoCliente } from "@kallpanexus/shared";
import { ChevronDown, Loader2, MapPin, Navigation } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Sede = {
  id: string;
  slug?: string;
  nombre: string;
  ciudad?: string | null;
  direccion: string;
  telefono?: string | null;
  telefonoWhatsApp?: string | null;
  enlaceGoogleMaps?: string | null;
  latitud?: number | null;
  longitud?: number | null;
};

type Props = {
  tenantSlug: string;
  sucursales: Sede[];
  sucursalActivaId: string;
  variasSedes: boolean;
};

export function PublicSedesUbicacion({
  tenantSlug,
  sucursales,
  sucursalActivaId,
  variasSedes,
}: Props) {
  const [mapaAbiertoId, setMapaAbiertoId] = useState<string | null>(null);

  if (!sucursales.length) return null;

  return (
    <section id="sedes" className="scroll-mt-24 border-b border-slate-200 bg-white py-10 sm:py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Ubicación</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
          {variasSedes ? "Nuestras sedes" : "Dónde estamos"}
        </h2>
        <p className="mt-2 max-w-xl text-sm text-slate-600">
          {variasSedes
            ? "Cambia de sede para ver canchas y horarios de cada ubicación."
            : "Dirección, mapa e indicaciones para llegar."}
        </p>

        <div
          className={`mt-4 gap-3 ${
            variasSedes && sucursales.length > 1
              ? "grid sm:grid-cols-2"
              : "flex flex-col"
          }`}
        >
          {sucursales.map((s) => {
            const activa = s.id === sucursalActivaId;
            const mapaAbierto = mapaAbiertoId === s.id;
            const href = tenantSedeHref(
              tenantSlug,
              { id: s.id, nombre: s.nombre, slug: s.slug ?? sedeSlugFor(s) },
              "reservar",
              { omitQueryIfOnlySede: !variasSedes }
            );
            const indicaciones = googleMapsComoLlegarUrl({
              enlaceGoogleMaps: s.enlaceGoogleMaps,
              direccion: s.direccion,
              ciudad: s.ciudad,
              latitud: s.latitud,
              longitud: s.longitud,
            });

            return (
              <article
                key={s.id}
                className={`overflow-hidden rounded-xl border ${
                  activa ? "border-emerald-400/80 bg-emerald-50/30" : "border-slate-200 bg-white"
                } shadow-sm`}
              >
                <div className="p-3 sm:p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                          {s.nombre}
                        </h3>
                        {activa && (
                          <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-px text-[10px] font-medium text-emerald-800">
                            Actual
                          </span>
                        )}
                      </div>
                      {s.ciudad && (
                        <p className="truncate text-xs text-slate-500">{s.ciudad}</p>
                      )}
                    </div>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-slate-600">
                    <MapPin className="mr-1 inline h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    {s.direccion}
                  </p>
                  {(s.telefono?.trim() || s.telefonoWhatsApp?.trim()) && (
                    <p className="mt-1 text-xs text-slate-600">
                      {s.telefono?.trim() && (
                        <span>Tel. {etiquetaTelefonoCliente(s.telefono)}</span>
                      )}
                      {s.telefono?.trim() && s.telefonoWhatsApp?.trim() && (
                        <span className="mx-1 text-slate-300">·</span>
                      )}
                      {s.telefonoWhatsApp?.trim() && (
                        <span>WhatsApp {etiquetaTelefonoCliente(s.telefonoWhatsApp)}</span>
                      )}
                    </p>
                  )}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {variasSedes && !activa && (
                      <Link
                        href={href}
                        className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        Ver canchas
                      </Link>
                    )}
                    <button
                      type="button"
                      className="inline-flex items-center gap-0.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      onClick={() => setMapaAbiertoId(mapaAbierto ? null : s.id)}
                    >
                      Mapa
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition ${mapaAbierto ? "rotate-180" : ""}`}
                      />
                    </button>
                    <a
                      href={indicaciones}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      Cómo llegar
                    </a>
                  </div>
                </div>
                {mapaAbierto && (
                  <PublicSedeMapaGoogle sede={s} indicacionesUrl={indicaciones} />
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PublicSedeMapaGoogle({
  sede,
  indicacionesUrl,
}: {
  sede: Sede;
  indicacionesUrl: string;
}) {
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(() => {
    if (sede.latitud != null && sede.longitud != null) {
      return { lat: sede.latitud, lng: sede.longitud };
    }
    const local = googleMapsPinFromEnlace(sede.enlaceGoogleMaps ?? "");
    if (local.lat != null && local.lng != null) {
      return { lat: local.lat, lng: local.lng };
    }
    return null;
  });
  const [cargando, setCargando] = useState(!pin);

  useEffect(() => {
    const link = sede.enlaceGoogleMaps?.trim() ?? "";
    if (!link) {
      setCargando(false);
      return;
    }

    let cancel = false;
    setCargando(true);
    void (async () => {
      try {
        const qs = new URLSearchParams({ url: link });
        const res = await fetch(`/api/google-maps/resolve?${qs}`);
        if (cancel) return;
        if (res.ok) {
          const data = (await res.json()) as { lat?: number | null; lng?: number | null };
          if (data.lat != null && data.lng != null) {
            setPin({ lat: data.lat, lng: data.lng });
            return;
          }
        }
        const local = googleMapsPinFromEnlace(link);
        if (local.lat != null && local.lng != null) {
          setPin({ lat: local.lat, lng: local.lng });
        }
      } finally {
        if (!cancel) setCargando(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [sede.enlaceGoogleMaps, sede.id]);

  const embedSrc = pin ? googleMapsEmbedFromPin(pin.lat, pin.lng) : null;

  return (
    <div className="border-t border-slate-100">
      {cargando && (
        <div className="flex h-44 items-center justify-center gap-2 bg-slate-50 text-xs text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
          Cargando mapa…
        </div>
      )}
      {!cargando && embedSrc && (
        <iframe
          key={embedSrc}
          title={`Mapa — ${sede.nombre}`}
          src={embedSrc}
          className="h-44 w-full sm:h-48"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      )}
      {!cargando && !embedSrc && (
        <div className="flex flex-col items-center gap-2 bg-slate-50 px-3 py-6 text-center">
          <MapPin className="h-8 w-8 text-emerald-600" />
          <p className="max-w-xs text-xs text-slate-600">
            Mapa no disponible aquí. Usa Cómo llegar en Google Maps.
          </p>
          <a
            href={indicacionesUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            <Navigation className="h-3.5 w-3.5" />
            Abrir mapa
          </a>
        </div>
      )}
    </div>
  );
}
