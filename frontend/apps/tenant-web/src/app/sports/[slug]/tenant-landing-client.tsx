"use client";

import { PublicContactoNegocio } from "@/components/public/public-contacto-negocio";
import { PublicSportFooter, PublicSportHeader } from "@/components/public/public-sport-chrome";
import { PublicDisponibilidadCanchas } from "@/components/public/public-disponibilidad-canchas";
import { PublicHeroLanding } from "@/components/public/public-hero-landing";
import { PublicSedesUbicacion } from "@/components/public/public-sedes-ubicacion";
import { fechaHoyInput } from "@/components/public/public-mini-calendario";
import { publicSportApi } from "@/lib/public-api";
import {
  PUBLIC_HERO_IMAGE,
  resolveSedeId,
  sedeSlugFor,
} from "@/lib/public-brand";
import { resolvePublicMediaUrl } from "@/lib/tenant-media-url";
import { formatMoneyPEN } from "@kallpanexus/shared";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";

type Props = { params: Promise<{ slug: string }> };

export function TenantLandingClient({ params }: Props) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const sedeQuery = searchParams.get("sede") ?? "";
  const legacySucursal = searchParams.get("sucursal") ?? "";

  const [canchaReservar, setCanchaReservar] = useState<string | undefined>();
  const [fechaReservar] = useState(fechaHoyInput);
  const [carrito, setCarrito] = useState<Record<string, number>>({});
  const [enviado, setEnviado] = useState(false);

  const negocioQ = useQuery({
    queryKey: ["public-negocio", slug],
    queryFn: () => publicSportApi.negocio(slug),
  });

  const negocio = negocioQ.data;
  const sucursalActiva = useMemo(() => {
    if (!negocio?.sucursales.length) return "";
    return resolveSedeId(negocio.sucursales, sedeQuery, legacySucursal);
  }, [negocio, sedeQuery, legacySucursal]);

  const sucursalSeleccionada = useMemo(
    () => negocio?.sucursales.find((s) => s.id === sucursalActiva),
    [negocio, sucursalActiva]
  );

  useEffect(() => {
    if (!sucursalSeleccionada) return;
    const canon = sedeSlugFor(sucursalSeleccionada);
    const varias = (negocio?.sucursales.length ?? 0) > 1;

    if (legacySucursal) {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const q = varias ? `?sede=${encodeURIComponent(canon)}` : "";
      router.replace(`/sports/${slug}${q}${hash}`, { scroll: false });
      return;
    }

    if (varias && sedeQuery && sedeQuery !== canon) {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      router.replace(`/sports/${slug}?sede=${encodeURIComponent(canon)}${hash}`, { scroll: false });
    }
  }, [legacySucursal, sedeQuery, sucursalSeleccionada, negocio?.sucursales.length, slug, router]);

  const canchasQ = useQuery({
    queryKey: ["public-canchas", slug, sucursalActiva],
    queryFn: () => publicSportApi.canchas(slug, sucursalActiva),
    enabled: !!negocio?.reservaWebActiva && !!sucursalActiva,
  });

  const productosQ = useQuery({
    queryKey: ["public-productos-vitrina", slug, sucursalActiva],
    queryFn: () => publicSportApi.productos(slug, sucursalActiva),
    enabled: !!negocio?.reservaWebActiva && !!sucursalActiva,
  });

  const canchas = canchasQ.data ?? [];
  const productos = productosQ.data ?? [];

  useEffect(() => {
    if (canchaReservar) return;
    if (canchas.length === 1) setCanchaReservar(canchas[0]!.id);
  }, [canchas, canchaReservar]);

  if (negocioQ.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (negocioQ.isError || !negocio) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-red-600">No encontramos el complejo &quot;{slug}&quot;.</p>
        <Link href="/sports" className="mt-4 inline-block text-emerald-700 underline">
          Volver al directorio
        </Link>
      </div>
    );
  }

  if (!negocio.reservaWebActiva) {
    return (
      <>
        <PublicSportHeader tenantNombre={negocio.nombreComercial} tenantSlug={slug} solidTopBar />
        <main className="mx-auto max-w-lg px-4 pb-20 pt-[88px] text-center">
          <h1 className="text-2xl font-bold">{negocio.nombreComercial}</h1>
          <p className="mt-4 text-slate-600">Reservas web no activas.</p>
          <Link href="/sports" className="mt-6 inline-block text-emerald-700 underline">
            Ver otras sedes
          </Link>
        </main>
        <PublicSportFooter />
      </>
    );
  }

  if (enviado) {
    return (
      <>
        <PublicSportHeader tenantNombre={negocio.nombreComercial} tenantSlug={slug} solidTopBar />
        <main className="mx-auto max-w-lg px-4 pb-20 pt-[88px] text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
          <h1 className="mt-4 text-2xl font-bold">Solicitud enviada</h1>
          <p className="mt-3 text-slate-600">
            {negocio.nombreComercial} confirmará tu reserva pronto.
          </p>
          <Link href="/sports" className="mt-8 inline-block rounded-xl bg-emerald-600 px-5 py-2.5 text-white">
            Volver al directorio
          </Link>
        </main>
        <PublicSportFooter />
      </>
    );
  }

  const heroImage = resolvePublicMediaUrl(slug, negocio.imagenHeroUrl, PUBLIC_HERO_IMAGE);
  const heroTitulo =
    negocio.tituloLanding?.trim() ||
    sucursalSeleccionada?.nombre ||
    negocio.nombreComercial;
  const heroMensaje =
    negocio.mensajeLanding?.trim() ||
    "Reserva canchas, elige horarios y agrega bebidas. Confirmación manual del local.";

  return (
    <div className="tenant-reserve-page min-h-screen pt-[72px]">
      <PublicSportHeader
        tenantNombre={sucursalSeleccionada?.nombre ?? negocio.nombreComercial}
        tenantSlug={slug}
        solidTopBar
      />
      <main>
        <PublicHeroLanding
          heroImage={heroImage}
          heroImageFallback={PUBLIC_HERO_IMAGE}
          heroTitulo={heroTitulo}
          heroMensaje={heroMensaje}
          nombreComercial={negocio.nombreComercial}
          sedeNombre={sucursalSeleccionada?.nombre}
        />

        <PublicDisponibilidadCanchas
          slug={slug}
          canchas={canchas}
          loading={canchasQ.isLoading}
          initialCanchaId={canchaReservar}
          initialFecha={fechaReservar}
          productos={productos}
          carrito={carrito}
          onReservaEnviada={() => setEnviado(true)}
        />

        <PublicSedesUbicacion
          tenantSlug={slug}
          sucursales={negocio.sucursales}
          sucursalActivaId={sucursalActiva}
          variasSedes={negocio.sucursales.length > 1}
        />

        {productos.length > 0 && (
          <section id="tienda" className="scroll-mt-24 border-t border-slate-200 bg-white py-12">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
                Extras
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">Tienda</h2>
              <p className="mt-2 max-w-xl text-slate-600">
                Agrega bebidas o artículos a tu reserva; se incluyen en la solicitud al confirmar.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {productos.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-center shadow-sm transition hover:border-emerald-200 hover:shadow-md"
                  >
                    <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-50 text-3xl">
                      🥤
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{p.nombre}</p>
                    <p className="mt-1 text-emerald-700">{formatMoneyPEN(p.precio)}</p>
                    {p.agotado ? (
                      <p className="mt-1 text-xs text-red-600">Agotado</p>
                    ) : (
                      <div className="mt-2 flex items-center justify-center gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                          onClick={() =>
                            setCarrito((c) => ({
                              ...c,
                              [p.id]: Math.max(0, (c[p.id] ?? 0) - 1),
                            }))
                          }
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-medium">
                          {carrito[p.id] ?? 0}
                        </span>
                        <button
                          type="button"
                          className="rounded-lg border border-emerald-500 px-2 py-1 text-sm text-emerald-700"
                          onClick={() =>
                            setCarrito((c) => ({
                              ...c,
                              [p.id]: Math.min(20, (c[p.id] ?? 0) + 1),
                            }))
                          }
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <PublicContactoNegocio
          nombreComercial={negocio.nombreComercial}
          telefonoWhatsAppNegocio={negocio.telefonoWhatsAppNegocio}
          sucursalActiva={sucursalSeleccionada}
          variasSedes={negocio.sucursales.length > 1}
        />
      </main>
      <PublicSportFooter />
    </div>
  );
}
