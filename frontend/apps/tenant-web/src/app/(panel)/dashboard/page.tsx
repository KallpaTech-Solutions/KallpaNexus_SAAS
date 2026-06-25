"use client";

import { PERMISOS_SPORT, type ReservaListItem } from "@kallpanexus/types";
import {
  formatMoneyPEN,
  parseApiDateTime,
  textoResumenHoy,
} from "@kallpanexus/shared";
import { useTenantApi } from "@/lib/api-context";
import { cn } from "@/lib/cn";
import { panel } from "@/lib/panel-light";
import { AvisoElegirSedeOperacion } from "@/components/aviso-elegir-sede-operacion";
import { canAccess, useAuthStore } from "@/lib/auth-store";
import { useCiudadSucursalActiva } from "@/lib/use-ciudad-sucursal";
import { useOperacionSucursal } from "@/lib/use-operacion-sucursal";
import { GraficoBarrasHorizontales } from "@/components/graficos-panel";
import {
  DASHBOARD_PERIODOS,
  etiquetaPeriodoDashboard,
  rangoApiDashboardPeriodo,
  rangoInputDashboardPeriodo,
  tituloAgendaDashboard,
  tituloEstadoDashboard,
  type DashboardPeriodo,
} from "@/lib/dashboard-periodo";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarDays, ChevronRight, ShoppingCart, TrendingDown, Users } from "lucide-react";

const ESTADO_ORDEN = ["Pendiente", "Confirmada", "Completada", "Cancelada", "NoAsistio"] as const;

const ESTADO_ESTILO: Record<
  string,
  { etiqueta: string; punto: string; borde: string; fondo: string; texto: string }
> = {
  Pendiente: {
    etiqueta: "Pendiente",
    punto: "bg-amber-600",
    borde: "border-amber-300",
    fondo: "bg-amber-50",
    texto: "text-amber-950",
  },
  Confirmada: {
    etiqueta: "Confirmada",
    punto: "bg-emerald-600",
    borde: "border-emerald-300",
    fondo: "bg-emerald-50",
    texto: "text-emerald-950",
  },
  Completada: {
    etiqueta: "Completada",
    punto: "bg-slate-600",
    borde: "border-slate-300",
    fondo: "bg-slate-100",
    texto: "text-slate-900",
  },
  Cancelada: {
    etiqueta: "Cancelada",
    punto: "bg-red-600",
    borde: "border-red-300",
    fondo: "bg-red-50",
    texto: "text-red-950",
  },
  NoAsistio: {
    etiqueta: "No asistió",
    punto: "bg-orange-600",
    borde: "border-orange-300",
    fondo: "bg-orange-50",
    texto: "text-orange-950",
  },
};

function horaLima(iso: string): string {
  return parseApiDateTime(iso).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Lima",
  });
}

function rangoHorario(r: ReservaListItem): string {
  return `${horaLima(r.horaInicio)} – ${horaLima(r.horaFin)}`;
}

export default function DashboardPage() {
  const api = useTenantApi();
  const session = useAuthStore((s) => s.session);
  const permisos = session?.permisos ?? [];

  const puedeVerReservas = canAccess(permisos, PERMISOS_SPORT.reservasVer);
  const puedeReportes    = canAccess(permisos, PERMISOS_SPORT.reportesFinancieros);
  const puedeVentas      = canAccess(permisos, PERMISOS_SPORT.ventasVer);
  const puedeEgresos     = canAccess(permisos, PERMISOS_SPORT.egresosVer);
  const { sucursalIdParaApi } = useOperacionSucursal();
  const ciudadSede = useCiudadSucursalActiva();
  const [periodo, setPeriodo] = useState<DashboardPeriodo>("hoy");

  const rangoInput = useMemo(() => rangoInputDashboardPeriodo(periodo), [periodo]);
  const rangoApi = useMemo(() => rangoApiDashboardPeriodo(periodo), [periodo]);
  const etiquetaPeriodo = etiquetaPeriodoDashboard(periodo);

  const { data: reservas = [], isLoading } = useQuery({
    queryKey: [
      "reservas-hoy",
      periodo,
      rangoApi.desde,
      rangoApi.hasta,
      sucursalIdParaApi,
    ],
    queryFn: () =>
      api.reservas.list({
        desde: rangoApi.desde,
        hasta: rangoApi.hasta,
        sucursalId: sucursalIdParaApi,
      }),
    enabled: puedeVerReservas && !!sucursalIdParaApi,
  });

  const { data: ventasPeriodo = [] } = useQuery({
    queryKey: ["ventas-hoy", periodo, rangoApi.desde, rangoApi.hasta, sucursalIdParaApi],
    queryFn: () =>
      api.ventas.list({
        desde: rangoApi.desde,
        hasta: rangoApi.hasta,
        sucursalId: sucursalIdParaApi,
      }),
    enabled: puedeVentas && !!sucursalIdParaApi,
  });

  const { data: egresosPeriodo = [] } = useQuery({
    queryKey: ["egresos-hoy", periodo, rangoApi.desde, rangoApi.hasta, sucursalIdParaApi],
    queryFn: () =>
      api.egresos.list({
        desde: rangoApi.desde,
        hasta: rangoApi.hasta,
        sucursalId: sucursalIdParaApi,
      }),
    enabled: puedeEgresos && !!sucursalIdParaApi,
  });

  // Inventario con alertas
  const { data: productosStock = [] } = useQuery({
    queryKey: ["productos-todos", sucursalIdParaApi],
    queryFn: () => api.productos.listTodos(sucursalIdParaApi),
    enabled: puedeVentas && !!sucursalIdParaApi,
  });

  const { data: reportePeriodo } = useQuery({
    queryKey: [
      "reporte-financiero",
      "dashboard",
      periodo,
      rangoApi.desde,
      rangoApi.hasta,
      sucursalIdParaApi ?? "sin-sede",
    ],
    queryFn: () =>
      api.reportes.financieros({
        ...rangoApi,
        sucursalId: sucursalIdParaApi,
      }),
    enabled: puedeReportes && !!sucursalIdParaApi,
  });

  const stats = useMemo(() => {
    const activas = reservas.filter((r) => r.estado !== "Cancelada");
    const ingresosReserva = activas.reduce((a, r) => a + r.montoTotal, 0);
    const cobrado = activas.reduce((a, r) => a + (r.montoConfirmado ?? 0), 0);
    const pendiente = activas.reduce(
      (a, r) =>
        a + (r.montoPendiente ?? Math.max(0, r.montoTotal - (r.montoConfirmado ?? 0))),
      0
    );
    const porEstado = new Map<string, number>();
    for (const r of reservas) {
      porEstado.set(r.estado, (porEstado.get(r.estado) ?? 0) + 1);
    }
    return { activas, ingresosReserva, cobrado, pendiente, porEstado };
  }, [reservas]);

  const agendaHoy = useMemo(() => {
    return [...reservas]
      .filter((r) => r.estado !== "Cancelada")
      .sort(
        (a, b) =>
          parseApiDateTime(a.horaInicio).getTime() - parseApiDateTime(b.horaInicio).getTime()
      );
  }, [reservas]);

  const chipsEstado = useMemo(() => {
    return ESTADO_ORDEN.filter((e) => (stats.porEstado.get(e) ?? 0) > 0).map((e) => ({
      clave: e,
      cantidad: stats.porEstado.get(e) ?? 0,
      estilo: ESTADO_ESTILO[e] ?? ESTADO_ESTILO.Pendiente,
    }));
  }, [stats.porEstado]);

  const barrasMedios = useMemo(
    () =>
      (reportePeriodo?.porMedio ?? []).map((m, i) => ({
        etiqueta: m.medio,
        valor: m.monto,
        formato: "dinero" as const,
        color: ["rgb(240 90 40)", "rgb(16 185 129)", "rgb(52 73 94)", "rgb(110 231 183)"][
          i % 4
        ],
      })),
    [reportePeriodo]
  );

  const ocupadas = new Set(stats.activas.map((r) => r.canchaId)).size;

  const totalVentasPeriodo = ventasPeriodo.reduce((s, v) => s + v.montoTotal, 0);
  const totalEgresosPeriodo = egresosPeriodo.reduce((s, e) => s + e.monto, 0);
  const productosAgotados = productosStock.filter((p) => p.controlStock && p.stockActual === 0);
  const productosAlerta   = productosStock.filter(
    (p) => p.controlStock && p.stockActual > 0 && p.puntoAlerta !== null && p.puntoAlerta !== undefined && p.stockActual <= p.puntoAlerta
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className={panel.heading}>Dashboard</h2>
          <p className={panel.subheading}>
            {session?.nombreCompleto
              ? `Hola, ${session.nombreCompleto.split(" ")[0]} · `
              : ""}
            {periodo === "hoy"
              ? `${textoResumenHoy(ciudadSede)}.`
              : `Resumen ${etiquetaPeriodo}${ciudadSede ? ` · ${ciudadSede}` : ""} (${rangoInput.desde === rangoInput.hasta ? rangoInput.desde : `${rangoInput.desde} → ${rangoInput.hasta}`}).`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/calendario"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:border-sport-orange/40 hover:text-sport-orange"
          >
            <CalendarDays className="h-4 w-4" />
            Calendario
          </Link>
          <Link
            href="/reservas"
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
          >
            <Users className="h-4 w-4" />
            Reservas
          </Link>
          {puedeReportes && (
            <Link
              href="/reportes"
              className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-sport-orange"
            >
              Reportes
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      <AvisoElegirSedeOperacion />

      {puedeVerReservas && (
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Período del dashboard"
        >
          {DASHBOARD_PERIODOS.map((p) => {
            const activo = periodo === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={activo}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                  activo
                    ? "border-emerald-500 bg-emerald-50 text-emerald-950 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                )}
                onClick={() => setPeriodo(p.id)}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      )}

      {!puedeVerReservas ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900">
          Tu rol no tiene permiso <code>sport:reservas:ver</code>.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title={`Reservas (${etiquetaPeriodo})`}
              value={isLoading ? "…" : String(reservas.length)}
              sub={`${stats.activas.length} activas`}
              href="/reservas"
            />
            <KpiCard
              title={`Cobrado reservas (${etiquetaPeriodo})`}
              value={isLoading ? "…" : formatMoneyPEN(stats.cobrado)}
              destacado
              href="/reservas"
            />
            {puedeVentas && (
              <KpiCard
                title={`Ventas (${etiquetaPeriodo})`}
                value={formatMoneyPEN(totalVentasPeriodo)}
                sub={`${ventasPeriodo.length} transacción(es)`}
                color="blue"
                href="/ventas"
              />
            )}
            {puedeEgresos && (
              <KpiCard
                title={`Gastos (${etiquetaPeriodo})`}
                value={formatMoneyPEN(totalEgresosPeriodo)}
                sub={`${egresosPeriodo.length} registro(s)`}
                color="red"
                href="/egresos"
              />
            )}
            {!puedeVentas && (
              <KpiCard
                title={`Monto reservas (${etiquetaPeriodo})`}
                value={isLoading ? "…" : formatMoneyPEN(stats.ingresosReserva)}
                href="/reservas"
              />
            )}
            {!puedeEgresos && (
              <KpiCard
                title="Pendiente por cobrar"
                value={isLoading ? "…" : formatMoneyPEN(stats.pendiente)}
                sub={`${ocupadas} cancha(s) con turno`}
                href="/reservas"
              />
            )}
          </div>

          {/* Alertas de stock */}
          {puedeVentas && (productosAgotados.length > 0 || productosAlerta.length > 0) && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  Alertas de inventario
                </h3>
                <Link href="/ventas" className="text-xs font-medium text-amber-700 hover:underline">
                  Ver inventario →
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {productosAgotados.map((p) => (
                  <Link
                    key={p.id}
                    href="/inventario?tab=compras"
                    title="Haz clic para registrar una compra y reponer stock"
                    className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-300 hover:bg-red-200 transition cursor-pointer"
                  >
                    🔴 {p.nombre} — AGOTADO
                  </Link>
                ))}
                {productosAlerta.map((p) => (
                  <Link
                    key={p.id}
                    href="/inventario?tab=compras"
                    title="Stock bajo — haz clic para registrar una compra"
                    className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-300 hover:bg-amber-200 transition cursor-pointer"
                  >
                    🟡 {p.nombre} — {p.stockActual} uds.
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <section className="lg:col-span-2">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <h3 className="text-sm font-medium text-slate-900">
                  {tituloAgendaDashboard(periodo)}
                </h3>
                <Link href="/reservas" className="text-xs font-semibold text-emerald-700 hover:underline">
                  Ver todas
                </Link>
              </div>
              <div className="mt-3 space-y-2">
                {isLoading && (
                  <p className="text-sm text-slate-500">Cargando turnos…</p>
                )}
                {!isLoading && agendaHoy.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
                    <p className="text-sm text-slate-600">
                      {periodo === "hoy"
                        ? "No hay turnos activos para hoy."
                        : "No hay turnos activos en este período."}
                    </p>
                    <Link
                      href="/reservas"
                      className="mt-2 inline-block text-sm text-sport-orange hover:underline"
                    >
                      Crear reserva
                    </Link>
                  </div>
                )}
                {agendaHoy.slice(0, 10).map((r) => (
                  <AgendaFila key={r.id} reserva={r} />
                ))}
                {agendaHoy.length > 10 && (
                  <p className="pt-1 text-center text-xs text-slate-500">
                    +{agendaHoy.length - 10} más en reservas
                  </p>
                )}
              </div>
            </section>

            <aside className="space-y-4">
              <div className={panel.card + " p-4"}>
                <h3 className="text-sm font-medium text-slate-800">
                  {tituloEstadoDashboard(periodo)}
                </h3>
                {chipsEstado.length === 0 ? (
                  <p className="mt-3 text-xs text-slate-500">
                    {periodo === "hoy"
                      ? "Sin reservas registradas hoy."
                      : "Sin reservas en este período."}
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {chipsEstado.map(({ clave, cantidad, estilo }) => (
                      <li
                        key={clave}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${estilo.borde} ${estilo.fondo}`}
                      >
                        <span
                          className={`flex items-center gap-2 text-sm font-medium ${estilo.texto}`}
                        >
                          <span className={`h-2.5 w-2.5 rounded-full ${estilo.punto}`} />
                          {estilo.etiqueta}
                        </span>
                        <span className="text-lg font-semibold tabular-nums text-slate-900">
                          {cantidad}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {reservas.length > 0 && (
                  <p className="mt-3 text-[11px] text-slate-500">
                    Total del período:{" "}
                    <span className="font-semibold text-slate-800">{reservas.length}</span>
                  </p>
                )}
              </div>

              {puedeReportes && reportePeriodo && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Finanzas ({etiquetaPeriodo})
                  </p>
                  <p className="mt-1 text-xl font-semibold text-emerald-800">
                    {formatMoneyPEN(reportePeriodo.totalCobradoConfirmado)}
                  </p>
                  <p className="text-xs text-slate-500">
                    cobrado confirmado (pagos registrados en el panel)
                  </p>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-slate-500">Reservas</dt>
                      <dd className="font-semibold text-slate-900">
                        {reportePeriodo.reservasActivas}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Monto reservas</dt>
                      <dd className="font-semibold text-slate-900">
                        {formatMoneyPEN(reportePeriodo.totalMontoReservas)}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-slate-500">Pendiente est.</dt>
                      <dd className="font-semibold text-slate-900">
                        {formatMoneyPEN(reportePeriodo.pendienteCobroEstimado)}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </aside>
          </div>

          {puedeReportes && (
            <GraficoBarrasHorizontales
              titulo={`Cobros por medio de pago (${etiquetaPeriodo})`}
              barras={barrasMedios}
              vacio={`Sin pagos confirmados ${etiquetaPeriodo}.`}
            />
          )}

          {/* Accesos rápidos ventas/egresos */}
          {(puedeVentas || puedeEgresos) && (
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              {puedeVentas && (
                <Link
                  href="/ventas"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-800 hover:bg-blue-100"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Punto de Venta
                </Link>
              )}
              {puedeEgresos && (
                <Link
                  href="/ventas"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
                >
                  <TrendingDown className="h-4 w-4" />
                  Registrar gasto
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AgendaFila({ reserva: r }: { reserva: ReservaListItem }) {
  const estilo = ESTADO_ESTILO[r.estado] ?? ESTADO_ESTILO.Pendiente;
  const pendiente =
    r.montoPendiente ?? Math.max(0, r.montoTotal - (r.montoConfirmado ?? 0));

  return (
    <article className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:flex-nowrap">
      <div className="min-w-[5.5rem] shrink-0 text-center sm:text-left">
        <p className="text-sm font-semibold tabular-nums text-sport-orange">
          {horaLima(r.horaInicio)}
        </p>
        <p className="text-[10px] text-slate-500">{horaLima(r.horaFin)}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-900">{r.clienteNombre}</p>
        <p className="truncate text-xs text-slate-500">
          {r.nombreCancha} · {rangoHorario(r)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 sm:ml-auto">
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${estilo.borde} ${estilo.fondo} ${estilo.texto}`}
        >
          {estilo.etiqueta}
        </span>
        <span className="text-sm font-medium text-slate-900">{formatMoneyPEN(r.montoTotal)}</span>
        {pendiente > 0.009 && (
          <span className="text-[10px] font-medium text-amber-800">
            falta {formatMoneyPEN(pendiente)}
          </span>
        )}
      </div>
    </article>
  );
}

function KpiCard({
  title,
  value,
  sub,
  destacado,
  color,
  href,
}: {
  title: string;
  value: string;
  sub?: string;
  destacado?: boolean;
  color?: "blue" | "red";
  href?: string;
}) {
  const inner = (
    <>
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{title}</p>
      <p className={cn(
          "mt-1.5 text-xl font-semibold sm:text-2xl",
          destacado
            ? "text-emerald-800"
            : color === "blue"
            ? "text-blue-800"
            : color === "red"
            ? "text-red-700"
            : "text-slate-900"
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
      {href && <p className="mt-2 text-[10px] text-slate-400">Ver detalle →</p>}
    </>
  );

  const baseClass = cn(
    "rounded-xl border bg-gradient-to-br p-4 shadow-sm transition",
    destacado
      ? "border-sport-green/35 from-emerald-50 to-white"
      : color === "blue"
      ? "border-blue-200 from-blue-50 to-white"
      : color === "red"
      ? "border-red-200 from-red-50 to-white"
      : "border-slate-200 from-white to-slate-50",
    href && "cursor-pointer hover:shadow-md hover:scale-[1.01]"
  );

  if (href) {
    return (
      <Link href={href} className={baseClass}>
        {inner}
      </Link>
    );
  }

  return <div className={baseClass}>{inner}</div>;
}
