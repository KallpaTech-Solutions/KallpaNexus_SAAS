"use client";

import { publicSportApi } from "@/lib/public-api";
import { PUBLIC_CANCHA_IMAGE } from "@/lib/public-brand";
import { resolvePublicMediaUrl } from "@/lib/tenant-media-url";
import type { PublicProductoWeb, PublicReservaSlot } from "@kallpanexus/types";
import { formatMoneyPEN, documentoClienteListoParaBuscar } from "@kallpanexus/shared";
import { etiquetaEstadoReservaPublica } from "@/lib/public-reserva-estado";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PublicMiniCalendario, fechaHoyInput } from "./public-mini-calendario";
import { PublicReservaModal } from "./public-reserva-modal";

type Cancha = {
  id: string;
  nombre: string;
  sucursalId: string;
  nombreSucursal: string;
  telefonoWhatsAppSucursal?: string | null;
  tipoCancha: string;
  tieneIluminacion: boolean;
  imagenWebUrl?: string | null;
};

type Props = {
  slug: string;
  canchas: Cancha[];
  loading?: boolean;
  initialCanchaId?: string;
  initialFecha?: string;
  productos?: PublicProductoWeb[];
  carrito?: Record<string, number>;
  onReservaEnviada?: () => void;
};

function slotsVisibles(slots: PublicReservaSlot[]) {
  return slots.filter(
    (s) => s.estadoSlot !== "Pasado" && s.estadoSlot !== "SinTarifa"
  );
}

export function PublicDisponibilidadCanchas({
  slug,
  canchas,
  loading,
  initialCanchaId,
  initialFecha,
  productos = [],
  carrito = {},
  onReservaEnviada,
}: Props) {
  const [fecha, setFecha] = useState(initialFecha ?? fechaHoyInput);
  const [canchaId, setCanchaId] = useState(initialCanchaId ?? "");
  const [duracionHoras] = useState(1);
  const [horasSel, setHorasSel] = useState<number[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [dniInput, setDniInput] = useState("");
  const [dniConsulta, setDniConsulta] = useState<string | undefined>(undefined);

  function aplicarConsultaDni() {
    const norm = dniInput.replace(/\D/g, "");
    if (norm.length < 8) return;
    setDniConsulta(norm);
  }

  useEffect(() => {
    if (initialCanchaId) setCanchaId(initialCanchaId);
  }, [initialCanchaId]);

  useEffect(() => {
    if (initialFecha) setFecha(initialFecha);
  }, [initialFecha]);

  useEffect(() => {
    if (!canchaId && canchas.length === 1) setCanchaId(canchas[0]!.id);
  }, [canchas, canchaId]);

  useEffect(() => {
    setHorasSel([]);
  }, [canchaId, fecha]);

  const slotsQ = useQuery({
    queryKey: ["public-slots-vitrina", slug, canchaId, fecha, duracionHoras, dniConsulta],
    queryFn: () =>
      publicSportApi.disponibilidad(slug, canchaId, fecha, dniConsulta, duracionHoras),
    enabled: !!canchaId && !!fecha,
  });

  const slots = slotsQ.data ?? [];
  const visibles = useMemo(() => slotsVisibles(slots), [slots]);
  const libres = visibles.filter((s) => s.reservable);
  const misReservasDia = useMemo(
    () => visibles.filter((s) => s.estadoSlot === "ReservadoATuNombre"),
    [visibles]
  );

  const canchaActiva = canchas.find((c) => c.id === canchaId);

  function toggleHora(hora: number, reservable: boolean) {
    if (!reservable) return;
    setHorasSel((prev) =>
      prev.includes(hora) ? prev.filter((h) => h !== hora) : [...prev, hora]
    );
  }

  function abrirModal() {
    if (horasSel.length === 0) return;
    setModalAbierto(true);
  }

  return (
    <section id="canchas" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h2 className="text-2xl font-bold text-slate-900">Disponibilidad de canchas</h2>
      <p className="mt-1 text-slate-600">
        Elige fecha, marca horarios disponibles y confirma con tu pago.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,240px)_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Fecha</p>
          <PublicMiniCalendario
            className="mt-3"
            value={fecha}
            onChange={(ymd) => setFecha(ymd)}
          />
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-800">
              Verificar mi reserva
            </p>
            <p className="mt-1 text-[11px] leading-snug text-slate-500">
              Ingresa tu DNI y pulsa Enter o Buscar. Verás el estado de tus horarios; los demás
              siguen como ocupados sin nombre.
            </p>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={8}
                placeholder="DNI"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={dniInput}
                onChange={(e) => setDniInput(e.target.value.replace(/\D/g, "").slice(0, 8))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    aplicarConsultaDni();
                  }
                }}
              />
              <button
                type="button"
                className="shrink-0 rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-600 disabled:opacity-50"
                disabled={!documentoClienteListoParaBuscar(dniInput)}
                onClick={aplicarConsultaDni}
              >
                Buscar
              </button>
            </div>
            {dniConsulta && slotsQ.isFetching && (
              <p className="mt-2 text-xs text-slate-500">Consultando…</p>
            )}
            {dniConsulta && !slotsQ.isFetching && misReservasDia.length === 0 && (
              <p className="mt-2 text-xs text-slate-500">
                No hay reservas tuyas en esta cancha para el {fecha}.
              </p>
            )}
            {misReservasDia.length > 0 && (
              <ul className="mt-2 space-y-1.5 text-xs">
                {misReservasDia.map((s) => (
                  <li
                    key={s.horaInicio}
                    className="rounded-lg border border-violet-200/80 bg-violet-50/80 px-2.5 py-2"
                  >
                    <span className="font-semibold text-slate-900">{s.horarioTexto}</span>
                    {s.clienteNombre && (
                      <span className="mt-0.5 block truncate text-slate-700">{s.clienteNombre}</span>
                    )}
                    <span className="mt-0.5 block font-medium text-violet-900">
                      {etiquetaEstadoReservaPublica(s.reservaEstado, s.holdExpiraEnUtc)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-3">
          {loading && (
            <p className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando canchas…
            </p>
          )}
          {!loading && canchas.length === 0 && (
            <p className="text-slate-500">No hay canchas activas en esta sede.</p>
          )}
          {canchas.map((c) => {
            const sel = c.id === canchaId;
            return (
              <article
                key={c.id}
                className={`flex flex-col gap-3 overflow-hidden rounded-2xl border bg-white shadow-sm sm:flex-row sm:items-stretch ${
                  sel ? "border-emerald-400 ring-1 ring-emerald-400/30" : "border-slate-200"
                }`}
              >
                <div className="relative h-28 w-full shrink-0 bg-slate-100 sm:h-auto sm:w-36">
                  <img
                    src={resolvePublicMediaUrl(slug, c.imagenWebUrl, PUBLIC_CANCHA_IMAGE)}
                    alt=""
                    className="h-full w-full object-cover object-center"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.src.includes(PUBLIC_CANCHA_IMAGE)) {
                        img.src = PUBLIC_CANCHA_IMAGE;
                      }
                    }}
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center p-4 pt-0 sm:pt-4">
                  <h3 className="font-bold text-slate-900">{c.nombre}</h3>
                  <p className="text-sm text-slate-500">{c.nombreSucursal}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {c.tipoCancha.replace(/_/g, " ")}
                    {c.tieneIluminacion ? " · Iluminación" : ""}
                  </p>
                  {sel && slotsQ.isFetching && (
                    <p className="mt-2 text-xs text-slate-500">Consultando horarios…</p>
                  )}
                  {sel && !slotsQ.isFetching && (
                    <p className="mt-2 text-xs font-medium text-emerald-700">
                      {libres.length === 0
                        ? "Sin cupos libres para esta fecha"
                        : libres.length === 1
                          ? "1 cupo libre"
                          : `${libres.length} cupos libres`}
                    </p>
                  )}
                </div>
                <div className="flex flex-col justify-center gap-2 p-4 pt-0 sm:w-40 sm:pt-4">
                  <button
                    type="button"
                    className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                      sel
                        ? "border border-slate-200 bg-slate-50 text-slate-700"
                        : "border border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-50"
                    }`}
                    onClick={() => setCanchaId(c.id)}
                  >
                    {sel ? "Seleccionada" : "Ver horarios"}
                  </button>
                </div>
              </article>
            );
          })}

          {canchaId && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">Horarios del día</p>
              {slotsQ.isLoading && (
                <p className="mt-2 text-sm text-slate-500">Cargando…</p>
              )}
              {!slotsQ.isLoading && visibles.length === 0 && slots.length > 0 && (
                <p className="mt-2 text-sm text-slate-500">
                  Para esta fecha ya no quedan horarios futuros con tarifa (el resto es pasado o sin
                  tarifa).
                </p>
              )}
              {!slotsQ.isLoading && visibles.length === 0 && slots.length === 0 && (
                <p className="mt-2 text-sm text-slate-500">
                  No hay horarios alquilables para esta fecha.
                </p>
              )}
              {!slotsQ.isLoading && visibles.length > 0 && libres.length === 0 && (
                <p className="mt-2 text-sm text-amber-800">Todos los horarios visibles están ocupados.</p>
              )}
              <div className="mt-3 flex max-h-52 flex-wrap gap-2 overflow-y-auto">
                {visibles.map((slot: PublicReservaSlot) => {
                  const elegido = horasSel.includes(slot.horaInicio);
                  const esMio = slot.estadoSlot === "ReservadoATuNombre";
                  const ocupado = !slot.reservable;
                  return (
                    <button
                      key={slot.horaInicio}
                      type="button"
                      disabled={ocupado}
                      onClick={() => toggleHora(slot.horaInicio, slot.reservable)}
                      className={`min-w-[9rem] rounded-lg border px-2.5 py-2 text-left text-xs transition ${
                        esMio
                          ? "cursor-default border-violet-300 bg-violet-50 text-slate-800"
                          : ocupado
                            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                            : elegido
                              ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/30"
                              : "border-emerald-200 bg-white text-slate-800 hover:border-emerald-500"
                      }`}
                    >
                      <span className="block font-semibold">{slot.horarioTexto}</span>
                      <span className={ocupado && !esMio ? "text-slate-400" : "text-emerald-700"}>
                        {formatMoneyPEN(slot.precio)}
                      </span>
                      {slot.reservable && !elegido && (
                        <span className="mt-0.5 block text-[10px] font-medium text-emerald-600">
                          Disponible
                        </span>
                      )}
                      {esMio && (
                        <>
                          {slot.clienteNombre && (
                            <span className="mt-0.5 block truncate text-[10px] font-semibold text-violet-900">
                              {slot.clienteNombre}
                            </span>
                          )}
                          <span className="mt-0.5 block text-[10px] font-medium text-violet-800">
                            {etiquetaEstadoReservaPublica(slot.reservaEstado, slot.holdExpiraEnUtc)}
                          </span>
                        </>
                      )}
                      {ocupado && !esMio && (
                        <span className="mt-0.5 block text-[10px] font-medium text-slate-500">
                          Ocupado
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={horasSel.length === 0}
                onClick={abrirModal}
                className="mt-4 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 sm:max-w-xs"
              >
                {horasSel.length === 0
                  ? "Elige uno o más horarios"
                  : `Reservar (${horasSel.length} horario${horasSel.length === 1 ? "" : "s"})`}
              </button>
            </div>
          )}
        </div>
      </div>

      {canchaActiva && (
        <PublicReservaModal
          slug={slug}
          open={modalAbierto}
          onClose={() => setModalAbierto(false)}
          canchaId={canchaId}
          canchaNombre={canchaActiva.nombre}
          sucursalId={canchaActiva.sucursalId}
          fecha={fecha}
          horasSeleccionadas={horasSel}
          slots={visibles}
          productos={productos}
          carrito={carrito}
          onEnviado={(opts) => {
            setModalAbierto(false);
            setHorasSel([]);
            void slotsQ.refetch();
            if (opts?.whatsAppUrl && typeof window !== "undefined") {
              window.location.href = opts.whatsAppUrl;
              return;
            }
            onReservaEnviada?.();
          }}
        />
      )}
    </section>
  );
}
