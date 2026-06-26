"use client";

import { cn } from "@/lib/cn";
import { panel } from "@/lib/panel-light";
import { formatMoneyPEN } from "@kallpanexus/shared";
import { useMemo, useState } from "react";
import {
  DEMO_CALENDARIO_DIAS,
  DEMO_CALENDARIO_SLOTS,
  DEMO_CANCHAS,
  DEMO_EGRESOS,
  DEMO_ESTADO_RESUMEN,
  DEMO_MEDIOS_PAGO,
  DEMO_NEGOCIO,
  DEMO_PRODUCTOS,
  DEMO_RESERVAS,
  DEMO_RESERVAS_WEB,
  DEMO_STAFF,
  DEMO_SUCURSALES,
  DEMO_SUCURSALES_DETALLE,
  DEMO_TARIFAS,
  DEMO_VENTAS,
  DEMO_VOLUMEN_SEMANAL,
  demoKpis,
  type DemoEstadoReserva,
  type DemoPeriodo,
} from "./demo-sport-data";

function PageIntro({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className={panel.heading}>{title}</h1>
      <p className={panel.subheading}>{subtitle}</p>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: DemoEstadoReserva }) {
  const map: Record<DemoEstadoReserva, string> = {
    Pendiente: "bg-amber-100 text-amber-900",
    Confirmada: "bg-emerald-100 text-emerald-900",
    Completada: "bg-slate-100 text-slate-800",
    Cancelada: "bg-red-100 text-red-800",
  };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", map[estado])}>
      {estado}
    </span>
  );
}

export function DemoDashboard({
  periodo,
  onPeriodo,
}: {
  periodo: DemoPeriodo;
  onPeriodo: (p: DemoPeriodo) => void;
}) {
  const k = demoKpis(periodo);
  const maxBar = Math.max(...DEMO_VOLUMEN_SEMANAL.map((d) => d.valor));

  return (
    <div className="space-y-6">
      <PageIntro
        title="Dashboard"
        subtitle="Misma vista que el gerente: resumen del día y del periodo."
      />
      <div className="flex flex-wrap gap-2">
        {(["7d", "30d"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPeriodo(p)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              periodo === p
                ? "bg-sport-green text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-700 hover:border-sport-orange/40"
            )}
          >
            {p === "7d" ? "Últimos 7 días" : "Últimos 30 días"}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { titulo: "Reservas hoy", valor: String(k.reservasHoy), sub: `${k.reservasTotal} en el periodo` },
          { titulo: "Cobrado hoy", valor: formatMoneyPEN(k.cobradoHoy), sub: formatMoneyPEN(k.cobradoPeriodo) },
          { titulo: "Ocupación", valor: `${k.ocupacion}%`, sub: "Promedio sedes" },
          { titulo: "Web pendientes", valor: String(k.pendientesWeb), sub: "Por confirmar" },
        ].map((card) => (
          <div key={card.titulo} className={panel.card + " p-4"}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{card.titulo}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{card.valor}</p>
            <p className="mt-1 text-xs text-slate-500">{card.sub}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={panel.card + " p-5"}>
          <p className="text-sm font-semibold text-slate-800">Volumen semanal (demo)</p>
          <div className="mt-4 flex h-40 items-end justify-between gap-2">
            {DEMO_VOLUMEN_SEMANAL.map((d) => (
              <div key={d.dia} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full max-w-[2rem] rounded-t-md bg-blue-600/80"
                  style={{ height: `${(d.valor / maxBar) * 100}%`, minHeight: 8 }}
                />
                <span className="text-[10px] text-slate-500">{d.dia}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={panel.card + " p-5"}>
          <p className="text-sm font-semibold text-slate-800">Estado de reservas</p>
          <ul className="mt-4 space-y-3">
            {DEMO_ESTADO_RESUMEN.map((e) => (
              <li key={e.estado} className="flex items-center gap-3 text-sm">
                <span className={cn("h-2.5 w-2.5 rounded-full", e.color)} />
                <span className="flex-1">{e.estado}</span>
                <span className="font-semibold">{e.cantidad}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function DemoCalendario() {
  const [cancha, setCancha] = useState<string>(DEMO_CANCHAS[0]?.id ?? "");
  const ocupado = useMemo(
    () =>
      new Set([
        "0-2",
        "1-4",
        "2-5",
        "3-3",
        "4-6",
        "5-2",
        "6-4",
      ]),
    []
  );

  return (
    <div className="space-y-6">
      <PageIntro
        title="Calendario"
        subtitle="Grilla horaria por cancha — igual que en el panel operativo."
      />
      <label className="block max-w-xs text-sm">
        <span className="text-xs font-medium text-slate-600">Cancha</span>
        <select className={cn(panel.input, "mt-1 w-full")} value={cancha} onChange={(e) => setCancha(e.target.value)}>
          {DEMO_CANCHAS.filter((c) => c.activa).map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>
      <div className={panel.tableWrap + " overflow-x-auto"}>
        <table className="min-w-[640px] text-xs">
          <thead className={panel.tableHead}>
            <tr>
              <th className="px-2 py-2">Hora</th>
              {DEMO_CALENDARIO_DIAS.map((d) => (
                <th key={d} className="px-2 py-2">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DEMO_CALENDARIO_SLOTS.map((hora, hi) => (
              <tr key={hora} className={panel.tableRow}>
                <td className="px-2 py-2 font-medium text-slate-600">{hora}</td>
                {DEMO_CALENDARIO_DIAS.map((d, di) => {
                  const key = `${di}-${hi}`;
                  const busy = ocupado.has(key);
                  return (
                    <td key={d} className="p-1">
                      <button
                        type="button"
                        title={busy ? "Ocupado (demo)" : "Disponible — en tu panel crearías reserva"}
                        className={cn(
                          "h-8 w-full rounded-md border text-[10px] transition",
                          busy
                            ? "border-blue-200 bg-blue-100 text-blue-800"
                            : "border-dashed border-slate-200 bg-white text-slate-400 hover:border-sport-green hover:bg-emerald-50"
                        )}
                      >
                        {busy ? "Reserva" : "Libre"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DemoReservasWeb() {
  const [atendidas, setAtendidas] = useState<string[]>([]);
  const pendientes = DEMO_RESERVAS_WEB.filter((r) => !atendidas.includes(r.id));

  return (
    <div className="space-y-6">
      <PageIntro
        title="Reservas web"
        subtitle="Solicitudes desde la landing pública del negocio — confirmar o rechazar."
      />
      {pendientes.length === 0 ? (
        <p className={panel.infoBox}>No hay pendientes en esta demo. Recarga la página para reiniciar.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {pendientes.map((r) => (
            <div key={r.id} className={panel.card + " p-4"}>
              <p className="font-semibold text-slate-900">{r.cliente}</p>
              <p className="text-sm text-slate-600">
                {r.cancha} · {r.fecha} {r.hora}
              </p>
              <p className="mt-2 text-sm">
                Total {formatMoneyPEN(r.monto)}
                {r.adelanto > 0 && (
                  <span className="text-emerald-700"> · Adelanto {formatMoneyPEN(r.adelanto)}</span>
                )}
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  className={panel.btnPrimary}
                  onClick={() => setAtendidas((a) => [...a, r.id])}
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  className={panel.btnSecondary}
                  onClick={() => setAtendidas((a) => [...a, r.id])}
                >
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DemoReservas() {
  const [q, setQ] = useState("");
  const [sucursal, setSucursal] = useState("all");
  const [estado, setEstado] = useState("all");
  const [origen, setOrigen] = useState("all");

  const rows = useMemo(
    () =>
      DEMO_RESERVAS.filter((r) => {
        if (sucursal !== "all" && r.sucursalId !== sucursal) return false;
        if (estado !== "all" && r.estado !== estado) return false;
        if (origen !== "all" && r.origen !== origen) return false;
        if (q.trim()) {
          const ql = q.toLowerCase();
          if (!r.cliente.toLowerCase().includes(ql) && !r.cancha.toLowerCase().includes(ql)) return false;
        }
        return true;
      }),
    [q, sucursal, estado, origen]
  );

  return (
    <div className="space-y-6">
      <PageIntro title="Reservas" subtitle="Listado operativo con filtros por sede, estado y origen." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm sm:col-span-2">
          <span className="text-xs font-medium text-slate-600">Buscar</span>
          <input className={cn(panel.input, "mt-1 w-full")} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="text-xs font-medium text-slate-600">Sede</span>
          <select className={cn(panel.input, "mt-1 w-full")} value={sucursal} onChange={(e) => setSucursal(e.target.value)}>
            <option value="all">Todas</option>
            {DEMO_SUCURSALES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs font-medium text-slate-600">Estado</span>
          <select className={cn(panel.input, "mt-1 w-full")} value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="all">Todos</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Confirmada">Confirmada</option>
            <option value="Completada">Completada</option>
            <option value="Cancelada">Cancelada</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs font-medium text-slate-600">Origen</span>
          <select className={cn(panel.input, "mt-1 w-full")} value={origen} onChange={(e) => setOrigen(e.target.value)}>
            <option value="all">Todos</option>
            <option value="Web">Web</option>
            <option value="Panel">Panel</option>
          </select>
        </label>
      </div>
      <p className={panel.infoBox}>
        {rows.length} reserva(s) · datos de ejemplo
      </p>
      <div className={panel.tableWrap}>
        <table className="min-w-full text-left text-sm">
          <thead className={panel.tableHead}>
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Cancha</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Monto</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={panel.tableRow}>
                <td className="px-4 py-3 font-medium">{r.cliente}</td>
                <td className="px-4 py-3">{r.cancha}</td>
                <td className="px-4 py-3">
                  {r.fecha} {r.hora}
                </td>
                <td className="px-4 py-3">{formatMoneyPEN(r.monto)}</td>
                <td className="px-4 py-3">
                  <EstadoBadge estado={r.estado} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DemoVentas() {
  return (
    <div className="space-y-6">
      <PageIntro title="Ventas" subtitle="POS del complejo: ventas rápidas ligadas a reservas o walk-in." />
      <div className={panel.tableWrap}>
        <table className="min-w-full text-sm">
          <thead className={panel.tableHead}>
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Ítems</th>
              <th className="px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {DEMO_VENTAS.map((v) => (
              <tr key={v.id} className={panel.tableRow}>
                <td className="px-4 py-3">{v.fecha}</td>
                <td className="px-4 py-3">{v.cliente}</td>
                <td className="px-4 py-3">{v.items}</td>
                <td className="px-4 py-3 font-medium">{formatMoneyPEN(v.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DemoInventario() {
  const [bajoStock, setBajoStock] = useState(false);
  const rows = DEMO_PRODUCTOS.filter((p) => !bajoStock || p.stock <= p.min);

  return (
    <div className="space-y-6">
      <PageIntro title="Inventario" subtitle="Productos, stock y alertas de reposición." />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={bajoStock} onChange={(e) => setBajoStock(e.target.checked)} />
        Solo bajo stock mínimo
      </label>
      <div className={panel.tableWrap}>
        <table className="min-w-full text-sm">
          <thead className={panel.tableHead}>
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Mínimo</th>
              <th className="px-4 py-3">Precio</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className={panel.tableRow}>
                <td className="px-4 py-3 font-medium">{p.nombre}</td>
                <td className={cn("px-4 py-3", p.stock <= p.min && "font-semibold text-amber-700")}>{p.stock}</td>
                <td className="px-4 py-3">{p.min}</td>
                <td className="px-4 py-3">{formatMoneyPEN(p.precio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DemoEgresos() {
  return (
    <div className="space-y-6">
      <PageIntro title="Egresos" subtitle="Gastos operativos del negocio." />
      <div className={panel.tableWrap}>
        <table className="min-w-full text-sm">
          <thead className={panel.tableHead}>
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Concepto</th>
              <th className="px-4 py-3">Monto</th>
            </tr>
          </thead>
          <tbody>
            {DEMO_EGRESOS.map((e) => (
              <tr key={e.id} className={panel.tableRow}>
                <td className="px-4 py-3">{e.fecha}</td>
                <td className="px-4 py-3">{e.concepto}</td>
                <td className="px-4 py-3">{formatMoneyPEN(e.monto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DemoCanchas() {
  const [sede, setSede] = useState("all");
  const [soloActivas, setSoloActivas] = useState(false);
  const rows = DEMO_CANCHAS.filter((c) => {
    if (sede !== "all" && c.sucursalId !== sede) return false;
    if (soloActivas && !c.activa) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageIntro title="Canchas" subtitle="Alta de canchas, deporte y tarifa base." />
      <div className="flex flex-wrap gap-4">
        <select className={panel.input} value={sede} onChange={(e) => setSede(e.target.value)}>
          <option value="all">Todas las sedes</option>
          {DEMO_SUCURSALES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={soloActivas} onChange={(e) => setSoloActivas(e.target.checked)} />
          Solo activas
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((c) => (
          <div key={c.id} className={panel.card + " p-4"}>
            <p className="font-semibold">{c.nombre}</p>
            <p className="text-xs text-slate-500">{c.deporte}</p>
            <p className="mt-2 text-lg font-bold text-sport-green">{formatMoneyPEN(c.tarifa)}/h</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DemoSucursales() {
  return (
    <div className="space-y-6">
      <PageIntro title="Sucursales" subtitle="Sedes del tenant: dirección, mapa y WhatsApp en el panel real." />
      <div className="grid gap-4 sm:grid-cols-2">
        {DEMO_SUCURSALES_DETALLE.map((s) => (
          <div key={s.id} className={panel.card + " p-4"}>
            <p className="font-semibold text-slate-900">{s.nombre}</p>
            <p className="mt-1 text-sm text-slate-600">{s.direccion}</p>
            <p className="mt-3 text-xs text-slate-500">{s.canchas} canchas activas</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DemoTarifas() {
  return (
    <div className="space-y-6">
      <PageIntro title="Tarifas" subtitle="Reglas de precio por horario vinculadas a canchas." />
      <div className={panel.tableWrap}>
        <table className="min-w-full text-sm">
          <thead className={panel.tableHead}>
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Canchas</th>
              <th className="px-4 py-3">Precio / h</th>
            </tr>
          </thead>
          <tbody>
            {DEMO_TARIFAS.map((t) => (
              <tr key={t.id} className={panel.tableRow}>
                <td className="px-4 py-3 font-medium">{t.nombre}</td>
                <td className="px-4 py-3">{t.canchas}</td>
                <td className="px-4 py-3">{formatMoneyPEN(t.precio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DemoMediosPago() {
  const [medios, setMedios] = useState(DEMO_MEDIOS_PAGO);

  return (
    <div className="space-y-6">
      <PageIntro title="Medios de pago" subtitle="Activa Yape, Plin, efectivo y transferencia para reservas y caja." />
      <div className="grid gap-3 sm:grid-cols-2">
        {medios.map((m) => (
          <div key={m.id} className={panel.card + " flex items-center justify-between gap-3 p-4"}>
            <div>
              <p className="font-semibold">{m.tipo}</p>
              <p className="text-xs text-slate-500">{m.detalle}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={m.activo}
              onClick={() =>
                setMedios((prev) =>
                  prev.map((x) => (x.id === m.id ? { ...x, activo: !x.activo } : x))
                )
              }
              className={cn(
                "relative h-7 w-12 rounded-full transition",
                m.activo ? "bg-sport-green" : "bg-slate-300"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition",
                  m.activo ? "left-[22px]" : "left-0.5"
                )}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DemoReportes() {
  const [periodo, setPeriodo] = useState("mes");
  return (
    <div className="space-y-6">
      <PageIntro title="Reportes" subtitle="Exportación financiera y resumen por periodo." />
      <div className="flex flex-wrap gap-3">
        <select className={panel.input} value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
          <option value="semana">Esta semana</option>
          <option value="mes">Este mes</option>
          <option value="trimestre">Trimestre</option>
        </select>
        <button type="button" className={panel.btnSecondary}>
          Descargar PDF (demo)
        </button>
      </div>
      <div className={panel.card + " p-6"}>
        <p className="text-sm text-slate-600">
          Periodo seleccionado: <strong>{periodo}</strong> · ingresos demo{" "}
          {formatMoneyPEN(periodo === "semana" ? 1840 : periodo === "mes" ? 6120 : 18400)}
        </p>
      </div>
    </div>
  );
}

export function DemoEquipo() {
  return (
    <div className="space-y-6">
      <PageIntro title="Equipo" subtitle="Staff del tenant: gerente, cajeros y permisos por sucursal." />
      <div className={panel.tableWrap}>
        <table className="min-w-full text-sm">
          <thead className={panel.tableHead}>
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">DNI</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {DEMO_STAFF.map((u) => (
              <tr key={u.id} className={panel.tableRow}>
                <td className="px-4 py-3 font-medium">{u.nombre}</td>
                <td className="px-4 py-3 font-mono text-xs">{u.dni}</td>
                <td className="px-4 py-3">{u.rol}</td>
                <td className="px-4 py-3">{u.activo ? "Activo" : "Inactivo"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DemoPlan() {
  return (
    <div className="space-y-6">
      <PageIntro title="Plan" subtitle="Suscripción SaaS de la empresa pagadora." />
      <div className={panel.cardAccent + " max-w-md p-6"}>
        <p className="text-xs font-semibold uppercase text-sport-orange">Plan actual</p>
        <p className="mt-2 text-xl font-bold text-slate-900">Básico Sport</p>
        <p className="mt-2 text-sm text-slate-600">1 sede · 3 usuarios staff · reservas web incluidas</p>
        <p className="mt-4 text-2xl font-bold text-slate-900">
          {formatMoneyPEN(99)} <span className="text-sm font-normal">/ mes</span>
        </p>
      </div>
    </div>
  );
}

export function DemoConfiguracion() {
  const [web, setWeb] = useState(true);
  const [whatsapp, setWhatsapp] = useState("987654321");

  return (
    <div className="space-y-6">
      <PageIntro
        title="Configuración"
        subtitle={`Marca, reserva web y WhatsApp de ${DEMO_NEGOCIO.marca}.`}
      />
      <div className={panel.card + " max-w-lg space-y-4 p-5"}>
        <label className="flex items-center justify-between gap-4 text-sm">
          <span>Reserva web activa</span>
          <input type="checkbox" checked={web} onChange={(e) => setWeb(e.target.checked)} />
        </label>
        <label className="block text-sm">
          <span className="text-xs font-medium text-slate-600">WhatsApp del negocio</span>
          <input className={cn(panel.input, "mt-1 w-full")} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        </label>
        <p className={panel.infoBox}>En tu tenant real esto sincroniza la landing pública /t/…</p>
      </div>
    </div>
  );
}

export function DemoSectionView({
  seccion,
  periodo,
  onPeriodo,
}: {
  seccion: string;
  periodo: DemoPeriodo;
  onPeriodo: (p: DemoPeriodo) => void;
}) {
  switch (seccion) {
    case "dashboard":
      return <DemoDashboard periodo={periodo} onPeriodo={onPeriodo} />;
    case "calendario":
      return <DemoCalendario />;
    case "reservas-web":
      return <DemoReservasWeb />;
    case "reservas":
      return <DemoReservas />;
    case "ventas":
      return <DemoVentas />;
    case "inventario":
      return <DemoInventario />;
    case "egresos":
      return <DemoEgresos />;
    case "canchas":
      return <DemoCanchas />;
    case "sucursales":
      return <DemoSucursales />;
    case "tarifas":
      return <DemoTarifas />;
    case "medios-pago":
      return <DemoMediosPago />;
    case "reportes":
      return <DemoReportes />;
    case "equipo":
      return <DemoEquipo />;
    case "plan":
      return <DemoPlan />;
    case "configuracion":
      return <DemoConfiguracion />;
    default:
      return <DemoDashboard periodo={periodo} onPeriodo={onPeriodo} />;
  }
}
