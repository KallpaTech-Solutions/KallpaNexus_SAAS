"use client";

import { publicSportApi } from "@/lib/public-api";
import type { PublicProductoWeb, PublicReservaSlot } from "@kallpanexus/types";
import { formatMoneyPEN, soloDigitosTelefono, telefonoClienteValidoParaGuardar } from "@kallpanexus/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarDays, Loader2, MapPin, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function fechaHoyLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Props = {
  slug: string;
  negocioActivo: boolean;
  maxReservasDni: number;
  minutosHold: number;
  sucursales: { id: string; nombre: string }[];
  initialSucursalId?: string;
  initialCanchaId?: string;
  initialFecha?: string;
  initialHoraInicio?: number | null;
  onEnviado?: () => void;
};

export function ReservaWizard({
  slug,
  negocioActivo,
  maxReservasDni,
  minutosHold,
  sucursales,
  initialSucursalId,
  initialCanchaId,
  initialFecha,
  initialHoraInicio,
  onEnviado,
}: Props) {
  const [sucursalId, setSucursalId] = useState(initialSucursalId ?? "");
  const [canchaId, setCanchaId] = useState(initialCanchaId ?? "");
  const [fecha, setFecha] = useState(fechaHoyLocal());
  const [duracionHoras, setDuracionHoras] = useState(1);
  const [horaElegida, setHoraElegida] = useState<number | null>(null);
  const [dni, setDni] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [carrito, setCarrito] = useState<Record<string, number>>({});
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  useEffect(() => {
    if (initialSucursalId) setSucursalId(initialSucursalId);
  }, [initialSucursalId]);

  useEffect(() => {
    if (initialCanchaId) setCanchaId(initialCanchaId);
  }, [initialCanchaId]);

  useEffect(() => {
    if (initialFecha) setFecha(initialFecha);
  }, [initialFecha]);

  useEffect(() => {
    if (initialHoraInicio != null) setHoraElegida(initialHoraInicio);
  }, [initialHoraInicio]);

  useEffect(() => {
    if (!sucursalId && sucursales.length === 1) setSucursalId(sucursales[0]!.id);
  }, [sucursales, sucursalId]);

  const canchasQ = useQuery({
    queryKey: ["public-canchas", slug, sucursalId],
    queryFn: () => publicSportApi.canchas(slug, sucursalId || undefined),
    enabled: negocioActivo && !!sucursalId,
  });

  const productosQ = useQuery({
    queryKey: ["public-productos", slug, sucursalId],
    queryFn: () => publicSportApi.productos(slug, sucursalId),
    enabled: !!sucursalId && !!canchaId,
  });

  const dniConsulta = dni.replace(/\D/g, "").length >= 8 ? dni.replace(/\D/g, "") : undefined;

  const slotsQ = useQuery({
    queryKey: ["public-slots", slug, canchaId, fecha, duracionHoras, dniConsulta],
    queryFn: () =>
      publicSportApi.disponibilidad(slug, canchaId, fecha, dniConsulta, duracionHoras),
    enabled: !!canchaId && !!fecha,
  });

  const slots = slotsQ.data ?? [];
  const productos = productosQ.data ?? [];

  const precioCancha = useMemo(() => {
    if (horaElegida == null) return 0;
    return slots.find((x) => x.horaInicio === horaElegida)?.precio ?? 0;
  }, [slots, horaElegida]);

  const totalProductos = useMemo(() => {
    let t = 0;
    for (const p of productos) {
      const q = carrito[p.id] ?? 0;
      if (q > 0) t += p.precio * q;
    }
    return t;
  }, [productos, carrito]);

  const enviar = useMutation({
    mutationFn: async () => {
      if (!canchaId || horaElegida == null) throw new Error("Elige cancha y horario.");
      const dniNorm = dni.replace(/\D/g, "");
      if (dniNorm.length < 8) throw new Error("Ingresa un DNI válido.");
      if (!nombre.trim()) throw new Error("Ingresa tu nombre.");
      if (!telefonoClienteValidoParaGuardar(telefono, false)) {
        throw new Error("Ingresa un celular de 9 dígitos.");
      }
      const horaInicio = `${fecha}T${String(horaElegida).padStart(2, "0")}:00:00`;
      const lineas = Object.entries(carrito)
        .filter(([, q]) => q > 0)
        .map(([productoId, cantidad]) => ({ productoId, cantidad }));
      return publicSportApi.solicitarReserva(slug, {
        canchaId,
        horaInicio,
        duracionHoras,
        dniCliente: dniNorm,
        nombreCompletoCliente: nombre.trim(),
        telefonoCliente: soloDigitosTelefono(telefono),
        productos: lineas.length ? lineas : undefined,
      });
    },
    onSuccess: () => {
      setErrorEnvio(null);
      onEnviado?.();
    },
    onError: (e) => {
      setErrorEnvio(e instanceof Error ? e.message : "No se pudo enviar la solicitud.");
    },
  });

  if (!negocioActivo) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Las reservas web no están activas para este negocio.
      </p>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Reserva en línea</p>
      <p className="mt-1 text-sm text-slate-500">
        Hasta {maxReservasDni} reservas por DNI al día · retención {minutosHold} min mientras confirman
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
            <MapPin className="h-4 w-4 text-emerald-600" /> Sede
          </label>
          <select
            className={inputClass}
            value={sucursalId}
            onChange={(e) => {
              setSucursalId(e.target.value);
              setCanchaId("");
              setHoraElegida(null);
            }}
          >
            <option value="">Elige sede</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>

        {sucursalId && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Cancha</label>
            <select
              className={inputClass}
              value={canchaId}
              onChange={(e) => {
                setCanchaId(e.target.value);
                setHoraElegida(null);
              }}
            >
              <option value="">Elige cancha</option>
              {(canchasQ.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {canchaId && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <CalendarDays className="h-4 w-4 text-emerald-600" /> Fecha
                </label>
                <input
                  type="date"
                  className={inputClass}
                  value={fecha}
                  onChange={(e) => {
                    setFecha(e.target.value);
                    setHoraElegida(null);
                  }}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Duración</label>
                <select
                  className={inputClass}
                  value={duracionHoras}
                  onChange={(e) => {
                    setDuracionHoras(Number(e.target.value));
                    setHoraElegida(null);
                  }}
                >
                  {[1, 2, 3].map((h) => (
                    <option key={h} value={h}>
                      {h} h
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Horarios disponibles</label>
              {slotsQ.isLoading && (
                <p className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
                </p>
              )}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {slots.map((slot: PublicReservaSlot) => {
                  const sel = horaElegida === slot.horaInicio;
                  const disabled = !slot.reservable;
                  return (
                    <button
                      key={slot.horaInicio}
                      type="button"
                      disabled={disabled}
                      onClick={() => setHoraElegida(slot.horaInicio)}
                      className={`rounded-xl border px-2 py-2.5 text-left text-xs transition ${
                        sel
                          ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/30"
                          : disabled
                            ? "border-slate-100 bg-slate-50 text-slate-400"
                            : "border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50"
                      }`}
                    >
                      <span className="block font-semibold text-slate-800">{slot.horarioTexto}</span>
                      <span className="text-emerald-700">{formatMoneyPEN(slot.precio)}</span>
                      {slot.estadoSlot === "Ocupado" && (
                        <span className="mt-0.5 block text-[10px] text-slate-400">Ocupado</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {canchaId && horaElegida != null && productos.length > 0 && (
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
              <ShoppingBag className="h-4 w-4 text-emerald-600" /> Bebidas y extras
            </label>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {productos.map((p: PublicProductoWeb) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <div>
                    <span className="font-medium text-slate-800">{p.nombre}</span>
                    <span className="ml-2 text-slate-500">{formatMoneyPEN(p.precio)}</span>
                    {p.agotado && <span className="ml-2 text-xs text-red-600">Agotado</span>}
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    disabled={p.agotado}
                    value={carrito[p.id] ?? 0}
                    onChange={(e) =>
                      setCarrito((c) => ({
                        ...c,
                        [p.id]: Math.max(0, parseInt(e.target.value || "0", 10)),
                      }))
                    }
                    className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-center"
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        {canchaId && horaElegida != null && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">DNI</label>
              <input className={inputClass} inputMode="numeric" value={dni} onChange={(e) => setDni(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Celular</label>
              <input
                className={inputClass}
                inputMode="numeric"
                maxLength={9}
                value={telefono}
                onChange={(e) => setTelefono(soloDigitosTelefono(e.target.value))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Nombre completo</label>
              <input className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
          </div>
        )}

        {horaElegida != null && (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
            <p className="text-lg font-bold text-slate-900">
              Total: <span className="text-emerald-700">{formatMoneyPEN(precioCancha + totalProductos)}</span>
            </p>
            <button
              type="button"
              disabled={enviar.isPending}
              onClick={() => enviar.mutate()}
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
            >
              {enviar.isPending ? "Enviando…" : "Confirmar solicitud"}
            </button>
          </div>
        )}

        {errorEnvio && <p className="text-sm text-red-600">{errorEnvio}</p>}
      </div>
    </div>
  );
}
