"use client";

import { PERMISOS_SPORT } from "@kallpanexus/types";
import type { ReservaListItem, SlotDisponibilidad } from "@kallpanexus/types";
import {
  documentoClienteListoParaBuscar,
  esDniClienteVarios,
  formatHoraReloj12,
  formatMoneyPEN,
  parseApiDateTime,
  soloDigitosTelefono,
  telefonoClienteParaApi,
  telefonoClienteValidoParaGuardar,
  sufijoCiudadParentesis,
  toApiDateTimeLocal,
} from "@kallpanexus/shared";
import { AvisoElegirSedeOperacion } from "@/components/aviso-elegir-sede-operacion";
import { useCanchasOperacion } from "@/lib/use-canchas-operacion";
import { useOperacionSucursal } from "@/lib/use-operacion-sucursal";
import { useCiudadSucursalActiva } from "@/lib/use-ciudad-sucursal";
import { getApiErrorMessage } from "@kallpanexus/api-client";
import { consultarDniParaFormulario } from "@/lib/consulta-dni";
import { useTenantApi } from "@/lib/api-context";
import { canAccess, useAuthStore } from "@/lib/auth-store";
import { RegistrarPagoReservaModal } from "@/components/registrar-pago-reserva-modal";
import { ReservaDetalleModal } from "@/components/reserva-detalle-modal";
import { useUiFeedback } from "@/components/ui-feedback-provider";
import { cn } from "@/lib/cn";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateInput(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function shiftDateInput(value: string, days: number): string {
  const d = parseDateInput(value);
  d.setDate(d.getDate() + days);
  return toDateInputValue(d);
}

function proximos7Dias(desde: Date) {
  const base = new Date(desde);
  base.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return {
      key: toDateInputValue(d),
      label: d.toLocaleDateString("es-PE", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
      date: d,
    };
  });
}

function weekBounds(days: { date: Date }[]) {
  const desde = new Date(days[0].date);
  desde.setHours(0, 0, 0, 0);
  const hasta = new Date(days[days.length - 1].date);
  hasta.setHours(23, 59, 59, 999);
  return { desde: desde.toISOString(), hasta: hasta.toISOString() };
}

function horaLima(d: Date): number {
  return Number(
    new Intl.DateTimeFormat("en", {
      timeZone: "America/Lima",
      hour: "numeric",
      hour12: false,
    }).format(d)
  );
}

/** Fecha calendario YYYY-MM-DD en zona Lima. */
function hoyLimaDayKey(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
}

/** Inicio del bloque hora:00 (Lima) ya pasó — no se puede reservar. */
function esSlotPasadoLima(dayKey: string, hour: number): boolean {
  const hoy = hoyLimaDayKey();
  if (dayKey < hoy) return true;
  if (dayKey > hoy) return false;
  const [y, mo, da] = dayKey.split("-").map(Number);
  const inicioUtcMs = Date.UTC(y, mo - 1, da, hour + 5, 0, 0);
  return Date.now() >= inicioUtcMs;
}

function mismoDiaLima(iso: string, fecha: Date): boolean {
  const d = parseApiDateTime(iso);
  const key = fecha.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const keyR = d.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  return key === keyR;
}

/** Horas (Lima) que ocupa una reserva en un día del calendario. */
function horasOcupadasReserva(r: ReservaListItem, fecha: Date): number[] {
  if (r.estado === "Cancelada") return [];
  if (!mismoDiaLima(r.horaInicio, fecha)) return [];

  const start = parseApiDateTime(r.horaInicio);
  const end = parseApiDateTime(r.horaFin);
  const hStart = horaLima(start);
  let hEnd = horaLima(end);
  if (end > start && hEnd <= hStart) hEnd += 24;
  const endExclusive = Math.max(hEnd, hStart + 1);
  const out: number[] = [];
  for (let h = hStart; h < endExclusive; h++) out.push(h);
  return out;
}

function reservaEnHora(
  reservas: ReservaListItem[],
  hour: number,
  fecha: Date
): ReservaListItem | null {
  for (const r of reservas) {
    if (r.estado === "Cancelada") continue;
    if (!mismoDiaLima(r.horaInicio, fecha)) continue;

    const start = parseApiDateTime(r.horaInicio);
    const end = parseApiDateTime(r.horaFin);
    const hStart = horaLima(start);
    let hEnd = horaLima(end);
    if (end > start && hEnd <= hStart) hEnd += 24;
    const endExclusive = Math.max(hEnd, hStart + 1);

    if (hour >= hStart && hour < endExclusive) return r;
  }
  return null;
}

type CeldaEstado = "libre" | "ocupado" | "sin-tarifa";

type EstadoPago = "pagado" | "parcial" | "sin-pago";

/** Estado de cobro de la reserva según pagos confirmados. */
function estadoPagoReserva(r: ReservaListItem): EstadoPago {
  const confirmado = r.montoConfirmado ?? 0;
  const pendiente = r.montoPendiente ?? Math.max(0, r.montoTotal - confirmado);
  if (confirmado > 0 && pendiente <= 0.009) return "pagado";
  if (confirmado > 0) return "parcial";
  return "sin-pago";
}

type SlotReserva = {
  dayKey: string;
  hour: number;
  precio: number;
};

export default function CalendarioPage() {
  const api = useTenantApi();
  const qc = useQueryClient();
  const permisos = useAuthStore((s) => s.session?.permisos ?? []);
  const puedeVer = canAccess(permisos, PERMISOS_SPORT.reservasVer);
  const puedeCrear = canAccess(permisos, PERMISOS_SPORT.reservasCrear);
  const { notificar } = useUiFeedback();
  const ciudadSede = useCiudadSucursalActiva();
  const { sucursalIdParaApi } = useOperacionSucursal();

  const [inicioSemana, setInicioSemana] = useState(() =>
    toDateInputValue(new Date())
  );
  const [canchaId, setCanchaId] = useState("");
  const [slotReserva, setSlotReserva] = useState<SlotReserva | null>(null);
  const [pagoModal, setPagoModal] = useState<{
    reservaId: string;
    monto: number;
  } | null>(null);
  const [detalleReserva, setDetalleReserva] = useState<ReservaListItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [buscandoDni, setBuscandoDni] = useState(false);
  const [reservaForm, setReservaForm] = useState({
    dniCliente: "",
    nombreCompletoCliente: "",
    telefonoCliente: "",
    sinTelefonoCliente: false,
    duracionHoras: 1,
    montoCobrado: "",
  });

  const dniListoCalendario = documentoClienteListoParaBuscar(reservaForm.dniCliente);

  async function buscarDniCalendario() {
    if (!dniListoCalendario || buscandoDni) return;
    setBuscandoDni(true);
    const r = await consultarDniParaFormulario(api, reservaForm.dniCliente);
    setBuscandoDni(false);
    if (r.ok) {
      setReservaForm((f) => ({
        ...f,
        nombreCompletoCliente: r.data.fullName || f.nombreCompletoCliente,
        telefonoCliente: r.data.telefono ?? f.telefonoCliente,
      }));
      setFormError(null);
    } else {
      setFormError(r.mensaje);
    }
  }

  const dias = useMemo(
    () => proximos7Dias(parseDateInput(inicioSemana)),
    [inicioSemana]
  );
  const bounds = useMemo(() => weekBounds(dias), [dias]);

  const { data: canchas = [] } = useCanchasOperacion(puedeVer);

  const activas = useMemo(() => canchas.filter((c) => c.estaActiva), [canchas]);

  useEffect(() => {
    if (activas.length === 0) {
      setCanchaId("");
      return;
    }
    if (!activas.some((c) => c.id === canchaId)) {
      setCanchaId(activas[0].id);
    }
  }, [activas, canchaId]);

  const dispQueries = useQueries({
    queries: dias.map((d) => ({
      queryKey: ["disponibilidad", canchaId, d.key],
      queryFn: () => api.canchas.disponibilidad(canchaId, d.key),
      enabled: puedeVer && !!canchaId,
    })),
  });

  const { data: reservasSemana = [] } = useQuery({
    queryKey: ["reservas-semana", canchaId, bounds.desde, bounds.hasta, sucursalIdParaApi],
    queryFn: () =>
      api.reservas.list({
        canchaId,
        sucursalId: sucursalIdParaApi,
        desde: bounds.desde,
        hasta: bounds.hasta,
      }),
    enabled: puedeVer && !!canchaId && !!sucursalIdParaApi,
  });

  const horas = useMemo(() => {
    const set = new Set<number>();
    const first = dispQueries.find((q) => q.data?.length)?.data;
    if (first?.length) {
      first.forEach((s) => set.add(s.horaInicio));
    } else {
      Array.from({ length: 17 }, (_, i) => i + 6).forEach((h) => set.add(h));
    }
    for (const r of reservasSemana) {
      for (const d of dias) {
        horasOcupadasReserva(r, d.date).forEach((h) => set.add(h));
      }
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [dispQueries, reservasSemana, dias]);

  const matriz = useMemo(() => {
    return horas.map((hora) => ({
      hora,
      celdas: dias.map((dia, idx) => {
        const slots = (dispQueries[idx].data ?? []) as SlotDisponibilidad[];
        const slot = slots.find((s) => s.horaInicio === hora);
        const reserva = reservaEnHora(reservasSemana, hora, dia.date);
        const pasado = esSlotPasadoLima(dia.key, hora);
        if (!slot) {
          const estado: CeldaEstado = reserva ? "ocupado" : "sin-tarifa";
          return { estado, slot: null, reserva, dayKey: dia.key, pasado };
        }
        const estado: CeldaEstado = reserva
          ? "ocupado"
          : !slot.estaDisponible
            ? "ocupado"
            : "libre";
        return { estado, slot, reserva, dayKey: dia.key, pasado };
      }),
    }));
  }, [horas, dias, dispQueries, reservasSemana]);

  const crearReserva = useMutation({
    mutationFn: () => {
      if (!slotReserva || !canchaId) throw new Error("Sin horario");
      if (
        !telefonoClienteValidoParaGuardar(
          reservaForm.telefonoCliente,
          reservaForm.sinTelefonoCliente
        )
      ) {
        throw new Error("Ingresa celular (9 dígitos) o marca SN en mostrador.");
      }
      const horaInicio = `${slotReserva.dayKey}T${String(slotReserva.hour).padStart(2, "0")}:00`;
      const dniEnvio = esDniClienteVarios(reservaForm.dniCliente)
        ? "123"
        : reservaForm.dniCliente.replace(/\D/g, "");
      return api.reservas.crear({
        canchaId,
        dniCliente: dniEnvio,
        nombreCompletoCliente: reservaForm.nombreCompletoCliente,
        ...telefonoClienteParaApi(
          reservaForm.telefonoCliente,
          reservaForm.sinTelefonoCliente
        ),
        horaInicio: toApiDateTimeLocal(horaInicio),
        duracionHoras: reservaForm.duracionHoras,
        montoTotalCobrado: reservaForm.montoCobrado
          ? Number(reservaForm.montoCobrado)
          : undefined,
      });
    },
    onSuccess: (data: { reservaId?: string; ReservaId?: string; montoTotal?: number; MontoTotal?: number }) => {
      const reservaId = data.reservaId ?? data.ReservaId;
      const monto = data.montoTotal ?? data.MontoTotal ?? 0;
      setSlotReserva(null);
      setFormError(null);
      qc.invalidateQueries({ queryKey: ["reservas-semana"] });
      qc.invalidateQueries({ queryKey: ["reservas"] });
      qc.invalidateQueries({ queryKey: ["disponibilidad"] });
      if (puedeCrear && reservaId) {
        setPagoModal({ reservaId, monto });
      }
    },
    onError: (e) => setFormError(getApiErrorMessage(e)),
  });

  const loading = dispQueries.some((q) => q.isLoading);
  const canchaSel = activas.find((c) => c.id === canchaId);

  function abrirReserva(dayKey: string, hour: number, precio: number) {
    setSlotReserva({ dayKey, hour, precio });
    setReservaForm((f) => ({
      ...f,
      montoCobrado: String(precio * f.duracionHoras),
    }));
    setFormError(null);
  }

  if (!puedeVer) {
    return (
      <p className="text-amber-200">Necesitas permiso sport:reservas:ver</p>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="panel-page-title">Calendario</h2>
          <p className="panel-page-sub">
            Clic en hora libre para reservar · en ocupado ver detalle y cobrar · flechas
            para cambiar de día
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Día anterior"
              className="panel-btn-secondary p-2"
              onClick={() => setInicioSemana((v) => shiftDateInput(v, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <label className="text-sm text-slate-400">
              <span className="mb-1 block text-xs">Desde</span>
              <input
                type="date"
                className="panel-input"
                value={inicioSemana}
                onChange={(e) => setInicioSemana(e.target.value)}
              />
            </label>
            <button
              type="button"
              title="Día siguiente"
              className="panel-btn-secondary p-2"
              onClick={() => setInicioSemana((v) => shiftDateInput(v, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-1 pb-0.5">
            <button
              type="button"
              className="panel-btn-secondary px-2 py-1 text-xs"
              onClick={() => setInicioSemana((v) => shiftDateInput(v, -7))}
            >
              −7 días
            </button>
            <button
              type="button"
              className="panel-btn-secondary px-2 py-1 text-xs"
              onClick={() => setInicioSemana(toDateInputValue(new Date()))}
            >
              Hoy
            </button>
            <button
              type="button"
              className="panel-btn-secondary px-2 py-1 text-xs"
              onClick={() => setInicioSemana((v) => shiftDateInput(v, 7))}
            >
              +7 días
            </button>
          </div>
          <label className="min-w-[220px] text-sm text-slate-400">
            Cancha
            <select
              className="mt-1 w-full panel-input"
              value={canchaId}
              onChange={(e) => setCanchaId(e.target.value)}
            >
              {activas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} · {c.nombreSucursal}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <AvisoElegirSedeOperacion />

      {canchaSel && (
        <p className="text-sm text-slate-500">
          {canchaSel.nombreSucursal} · {dias[0].label} → {dias[6].label}
        </p>
      )}

      <div className="flex flex-wrap gap-3 text-xs font-medium text-slate-700">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded ring-1 ring-emerald-400 bg-emerald-200" /> Libre (clic
          para reservar)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded ring-1 ring-blue-400 bg-blue-200" /> Reservado · pagado
          completo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded ring-1 ring-amber-400 bg-amber-200" /> Reservado · pago
          parcial
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded ring-1 ring-red-400 bg-red-200" /> Reservado · sin pago
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-slate-300 ring-1 ring-slate-400" /> Sin tarifa
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-slate-100 ring-1 ring-slate-300" /> Pasado
        </span>
      </div>

      {slotReserva && puedeCrear && (
        <section className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-4">
          <h3 className="text-sm font-semibold text-sport-navy">
            Nueva reserva — {slotReserva.dayKey}{" "}
            {formatHoraReloj12(slotReserva.hour)}
            {sufijoCiudadParentesis(ciudadSede)}
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 panel-input"
                value={reservaForm.dniCliente}
                onChange={(e) =>
                  setReservaForm((f) => ({ ...f, dniCliente: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && dniListoCalendario && !buscandoDni) {
                    e.preventDefault();
                    void buscarDniCalendario();
                  }
                }}
                inputMode="numeric"
                maxLength={11}
                placeholder="DNI o 123"
              />
              <button
                type="button"
                className="shrink-0 rounded-lg border-2 border-emerald-600 px-3 py-2 text-xs font-semibold text-emerald-800 transition enabled:hover:bg-emerald-100 disabled:border-slate-300 disabled:text-slate-400"
                disabled={buscandoDni || !dniListoCalendario}
                onClick={() => void buscarDniCalendario()}
              >
                {buscandoDni ? "…" : "Buscar"}
              </button>
            </div>
            <input
              placeholder="Nombre"
              className="panel-input"
              value={reservaForm.nombreCompletoCliente}
              onChange={(e) =>
                setReservaForm((f) => ({
                  ...f,
                  nombreCompletoCliente: e.target.value,
                }))
              }
            />
            <div className="flex flex-col gap-1">
              <input
                placeholder="Celular (9 dígitos)"
                className="panel-input"
                inputMode="numeric"
                maxLength={9}
                value={reservaForm.telefonoCliente}
                disabled={reservaForm.sinTelefonoCliente}
                onChange={(e) =>
                  setReservaForm((f) => ({
                    ...f,
                    telefonoCliente: soloDigitosTelefono(e.target.value),
                    sinTelefonoCliente: false,
                  }))
                }
              />
              <label className="flex items-center gap-1 text-[10px] text-slate-500">
                <input
                  type="checkbox"
                  checked={reservaForm.sinTelefonoCliente}
                  onChange={(e) =>
                    setReservaForm((f) => ({
                      ...f,
                      sinTelefonoCliente: e.target.checked,
                      telefonoCliente: e.target.checked ? "" : f.telefonoCliente,
                    }))
                  }
                />
                SN (mostrador)
              </label>
            </div>
            <input
              type="number"
              min={1}
              title="Duración en horas"
              className="panel-input"
              value={reservaForm.duracionHoras}
              onChange={(e) => {
                const dur = Number(e.target.value) || 1;
                setReservaForm((f) => ({
                  ...f,
                  duracionHoras: dur,
                  montoCobrado: String(slotReserva.precio * dur),
                }));
              }}
            />
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="Monto a cobrar (opcional)"
              className="panel-input sm:col-span-2"
              value={reservaForm.montoCobrado}
              onChange={(e) =>
                setReservaForm((f) => ({ ...f, montoCobrado: e.target.value }))
              }
            />
          </div>
          {formError && <p className="mt-2 text-sm font-medium text-red-700">{formError}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="panel-btn-primary"
              disabled={
                crearReserva.isPending ||
                !telefonoClienteValidoParaGuardar(
                  reservaForm.telefonoCliente,
                  reservaForm.sinTelefonoCliente
                )
              }
              onClick={() => crearReserva.mutate()}
            >
              Crear reserva
            </button>
            <button
              type="button"
              className="panel-btn-secondary"
              onClick={() => setSlotReserva(null)}
            >
              Cancelar
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Tras crear la reserva podrás registrar el cobro (medio, monto y voucher).
          </p>
        </section>
      )}

      {detalleReserva && (
        <ReservaDetalleModal
          reserva={detalleReserva}
          puedeCobrar={puedeCrear}
          onCobrar={() => {
            setPagoModal({
              reservaId: detalleReserva.id,
              monto: detalleReserva.montoTotal,
            });
            setDetalleReserva(null);
          }}
          onClose={() => setDetalleReserva(null)}
        />
      )}

      {pagoModal && (
        <RegistrarPagoReservaModal
          reservaId={pagoModal.reservaId}
          montoReserva={pagoModal.monto}
          titulo="Registrar cobro de la reserva"
          onClose={() => setPagoModal(null)}
        />
      )}

      {!canchaId ? (
        <p className="text-slate-500">Selecciona una cancha.</p>
      ) : loading ? (
        <p className="text-slate-500">Cargando semana…</p>
      ) : (
        <div className="panel-card overflow-x-auto">
          <table className="min-w-[900px] w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-100 px-2 py-2 text-left text-slate-700">
                  Hora
                </th>
                {dias.map((d) => {
                  const diaPasado = d.key < hoyLimaDayKey();
                  return (
                    <th
                      key={d.key}
                      className={cn(
                        "min-w-[100px] border-b border-slate-200 px-1 py-2 text-center font-medium capitalize",
                        diaPasado ? "text-slate-500" : "text-sport-green"
                      )}
                    >
                      {d.label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {matriz.map((fila) => (
                <tr key={fila.hora} className="border-b border-slate-200/80">
                  <td className="sticky left-0 z-10 border-r border-slate-200 bg-white px-2 py-1 font-medium text-slate-600">
                    {String(fila.hora).padStart(2, "0")}:00
                  </td>
                  {fila.celdas.map((celda, colIdx) => {
                    const pago = celda.reserva ? estadoPagoReserva(celda.reserva) : null;
                    const pendienteReserva = celda.reserva
                      ? celda.reserva.montoPendiente ??
                        Math.max(0, celda.reserva.montoTotal - (celda.reserva.montoConfirmado ?? 0))
                      : 0;
                    return (
                    <td key={dias[colIdx].key} className="p-0.5">
                      <button
                        type="button"
                        disabled={
                          !celda.pasado &&
                          ((celda.estado === "libre" &&
                            (!puedeCrear || !celda.slot)) ||
                            (celda.estado === "ocupado" && !celda.reserva) ||
                            celda.estado === "sin-tarifa")
                        }
                        className={cn(
                          "min-h-[52px] w-full rounded-md px-1 py-1 text-left transition",
                          celda.pasado &&
                            celda.reserva &&
                            puedeVer &&
                            "cursor-pointer bg-slate-100 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-sport-orange/30",
                          celda.pasado &&
                            !(celda.reserva && puedeVer) &&
                            "cursor-default bg-slate-50 text-slate-500 ring-1 ring-slate-200",
                          !celda.pasado &&
                            celda.estado === "libre" &&
                            puedeCrear &&
                            "cursor-pointer bg-emerald-100 text-emerald-950 ring-1 ring-emerald-400 hover:bg-emerald-200",
                          !celda.pasado &&
                            celda.estado === "libre" &&
                            !puedeCrear &&
                            "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300",
                          // Reservado · pagado completo → azul
                          !celda.pasado &&
                            celda.estado === "ocupado" &&
                            celda.reserva &&
                            puedeVer &&
                            pago === "pagado" &&
                            "cursor-pointer bg-blue-100 text-blue-950 ring-1 ring-blue-400 hover:bg-blue-200",
                          // Reservado · pago parcial → ámbar
                          !celda.pasado &&
                            celda.estado === "ocupado" &&
                            celda.reserva &&
                            puedeVer &&
                            pago === "parcial" &&
                            "cursor-pointer bg-amber-100 text-amber-950 ring-1 ring-amber-400 hover:bg-amber-200",
                          // Reservado · sin pago → rojo
                          !celda.pasado &&
                            celda.estado === "ocupado" &&
                            celda.reserva &&
                            puedeVer &&
                            pago === "sin-pago" &&
                            "cursor-pointer bg-red-100 text-red-950 ring-1 ring-red-400 hover:bg-red-200",
                          !celda.pasado &&
                            celda.estado === "ocupado" &&
                            (!celda.reserva || !puedeVer) &&
                            "cursor-default bg-red-50 text-red-900 ring-1 ring-red-300",
                          !celda.pasado &&
                            celda.estado === "sin-tarifa" &&
                            "cursor-default bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                        )}
                        title={
                          celda.pasado && celda.reserva
                            ? `Reserva pasada: ${celda.reserva.clienteNombre}`
                            : celda.pasado
                              ? "Horario pasado — no se puede reservar"
                              : celda.estado === "libre" && celda.slot
                                ? `Reservar ${dias[colIdx].key} ${fila.hora}:00`
                                : celda.estado === "ocupado" && celda.reserva
                                  ? `Ver reserva: ${celda.reserva.clienteNombre}`
                                  : celda.reserva?.clienteNombre ?? ""
                        }
                        onClick={() => {
                          if (celda.pasado) {
                            if (celda.reserva && puedeVer) {
                              setSlotReserva(null);
                              setDetalleReserva(celda.reserva);
                              return;
                            }
                            notificar(
                              "Este horario ya pasó. No se puede reservar ni modificar desde el calendario.",
                              "info"
                            );
                            return;
                          }
                          if (
                            celda.estado === "ocupado" &&
                            celda.reserva &&
                            puedeVer
                          ) {
                            setSlotReserva(null);
                            setDetalleReserva(celda.reserva);
                            return;
                          }
                          if (
                            celda.estado === "libre" &&
                            celda.slot &&
                            puedeCrear
                          ) {
                            setDetalleReserva(null);
                            abrirReserva(
                              celda.dayKey,
                              fila.hora,
                              celda.slot.precio
                            );
                          }
                        }}
                      >
                        {celda.estado === "ocupado" && celda.reserva && (
                          <span className="flex flex-col gap-0.5">
                            <span
                              className={cn(
                                "line-clamp-2 text-[11px] font-semibold leading-tight",
                                celda.pasado
                                  ? "text-slate-700"
                                  : pago === "pagado"
                                    ? "text-blue-950"
                                    : pago === "parcial"
                                      ? "text-amber-950"
                                      : "text-red-950"
                              )}
                            >
                              {celda.reserva.clienteNombre}
                            </span>
                            {!celda.pasado && pago === "pagado" && (
                              <span className="text-[9px] font-bold uppercase tracking-wide text-blue-700">
                                ✓ Pagado
                              </span>
                            )}
                            {!celda.pasado && pago === "parcial" && (
                              <span className="text-[9px] font-bold uppercase tracking-wide text-amber-700">
                                Falta {formatMoneyPEN(pendienteReserva)}
                              </span>
                            )}
                            {!celda.pasado && pago === "sin-pago" && (
                              <span className="text-[9px] font-bold uppercase tracking-wide text-red-700">
                                Sin pago
                              </span>
                            )}
                          </span>
                        )}
                        {celda.estado === "ocupado" && !celda.reserva && (
                          <span className="font-medium text-red-800">Ocupado</span>
                        )}
                        {celda.estado === "libre" && celda.slot && (
                          <span
                            className={cn(
                              "font-semibold",
                              celda.pasado && "text-slate-600 line-through decoration-slate-600"
                            )}
                          >
                            {celda.pasado
                              ? "Pasado"
                              : formatMoneyPEN(celda.slot.precio)}
                          </span>
                        )}
                        {celda.pasado &&
                          celda.estado !== "libre" &&
                          !celda.reserva && (
                            <span className="text-[10px] text-slate-600">Pasado</span>
                          )}
                        {celda.estado === "sin-tarifa" && <span>—</span>}
                      </button>
                    </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
