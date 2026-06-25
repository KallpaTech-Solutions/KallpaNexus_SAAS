"use client";

import { PERMISOS_SPORT } from "@kallpanexus/types";
import type { ProductoListItem, VentaListItem } from "@kallpanexus/types";
import { getApiErrorMessage } from "@kallpanexus/api-client";
import {
  formatMoneyPEN,
  fechaHoyLimaInput,
  fechaLimaInputConOffset,
} from "@kallpanexus/shared";
import { useTenantApi } from "@/lib/api-context";
import { canAccess, useAuthStore } from "@/lib/auth-store";
import { useOperacionSucursal } from "@/lib/use-operacion-sucursal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { AlertTriangle, Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useRouter } from "next/navigation";
import { ConfirmacionModal } from "@/components/confirmacion-modal";

type ItemCarrito = {
  productoId: string;
  productoNombre: string;
  precioUnitario: number;
  cantidad: number;
};

type TabActiva = "nueva" | "historial";

const CATEGORIAS = ["Todos", "Bebida", "Snack", "Accesorio", "Alquiler", "Otro"];

const CATEGORIA_COLOR: Record<string, string> = {
  Bebida:    "bg-sky-100 text-sky-800 ring-sky-300",
  Snack:     "bg-amber-100 text-amber-800 ring-amber-300",
  Accesorio: "bg-violet-100 text-violet-800 ring-violet-300",
  Alquiler:  "bg-emerald-100 text-emerald-800 ring-emerald-300",
  Otro:      "bg-slate-100 text-slate-700 ring-slate-300",
};

function categoriaBadge(cat: string) {
  return CATEGORIA_COLOR[cat] ?? CATEGORIA_COLOR.Otro;
}

function formatFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function StockBadge({ p }: { p: ProductoListItem }) {
  if (!p.controlStock) return null;
  if (p.stockActual === 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-red-300">
        Agotado
      </span>
    );
  if (p.puntoAlerta !== null && p.puntoAlerta !== undefined && p.stockActual <= p.puntoAlerta)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-300">
        <AlertTriangle className="h-3 w-3" />
        {p.stockActual} uds.
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-300">
      {p.stockActual} uds.
    </span>
  );
}

export default function VentasPage() {
  const api      = useTenantApi();
  const qc       = useQueryClient();
  const permisos = useAuthStore((s) => s.session?.permisos ?? []);
  const { sucursalIdParaApi, sucursalActivaId } = useOperacionSucursal();

  const puedeVer   = canAccess(permisos, PERMISOS_SPORT.ventasVer);
  const puedeCrear = canAccess(permisos, PERMISOS_SPORT.ventasCrear);

  const [tab, setTab] = useState<TabActiva>("nueva");

  if (!puedeVer && !puedeCrear) {
    return (
      <div className="p-8 text-slate-500">Sin permisos para acceder al módulo de ventas.</div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Punto de Venta</h1>
        <p className="mt-1 text-sm text-slate-500">Registra ventas y gestiona el catálogo de productos.</p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {(
          [
            { id: "nueva",    label: "Nueva venta", show: puedeCrear },
            { id: "historial",label: "Historial",   show: puedeVer },
          ] as { id: TabActiva; label: string; show: boolean }[]
        )
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                tab === t.id
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              {t.label}
            </button>
          ))}
      </div>

      {tab === "nueva"     && <TabNuevaVenta api={api} qc={qc} sucursalIdParaApi={sucursalIdParaApi} />}
      {tab === "historial" && <TabHistorial  api={api} qc={qc} sucursalIdParaApi={sucursalIdParaApi} />}
    </div>
  );
}

// ─── Tab: Nueva Venta ─────────────────────────────────────────────────────────

function TabNuevaVenta({
  api, qc, sucursalIdParaApi,
}: {
  api: ReturnType<typeof useTenantApi>;
  qc: ReturnType<typeof useQueryClient>;
  sucursalIdParaApi: string | undefined;
}) {
  const router = useRouter();

  const { data: productos = [] } = useQuery({
    queryKey: ["productos-activos", sucursalIdParaApi],
    queryFn: () => api.productos.list(sucursalIdParaApi),
    enabled: !!sucursalIdParaApi,
  });

  const { data: mediosPago = [] } = useQuery({
    queryKey: ["medios-pago"],
    queryFn: () => api.mediosPago.list(),
  });

  const [carrito, setCarrito]        = useState<ItemCarrito[]>([]);
  const [filtroCategoria, setFiltro] = useState("Todos");
  const [busqueda, setBusqueda]      = useState("");
  const [clienteNombre, setCliente]  = useState("");
  const [medioPagoId, setMedioPago]  = useState("");
  const [observaciones, setObs]      = useState("");

  // Pre-seleccionar "Efectivo" cuando cargan los medios de pago
  useEffect(() => {
    if (mediosPago.length > 0 && !medioPagoId) {
      const efectivo = mediosPago.find(
        (m) => m.activo && m.nombre.toLowerCase().includes("efectivo")
      );
      if (efectivo) setMedioPago(efectivo.id);
    }
  }, [mediosPago]);
  const [errorVenta, setErrorVenta]   = useState("");
  const [exito, setExito]             = useState("");
  // Modal: producto agotado
  const [modalAgotado, setModalAgotado] = useState<ProductoListItem | null>(null);

  const productosFiltrados = useMemo(() =>
    productos.filter((p) => {
      const matchCat  = filtroCategoria === "Todos" || p.categoria === filtroCategoria;
      const matchBusq = !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase());
      return matchCat && matchBusq;
    }),
    [productos, filtroCategoria, busqueda]
  );

  const total = useMemo(
    () => carrito.reduce((s, i) => s + i.precioUnitario * i.cantidad, 0),
    [carrito]
  );

  function stockDisponible(productoId: string): number | null {
    const p = productos.find((x) => x.id === productoId);
    if (!p?.controlStock) return null;
    return p.stockActual;
  }

  function agregar(p: ProductoListItem) {
    if (p.controlStock && p.stockActual === 0) {
      setModalAgotado(p);
      return;
    }
    setCarrito((prev) => {
      const existe = prev.find((i) => i.productoId === p.id);
      if (existe) {
        if (p.controlStock && existe.cantidad >= p.stockActual) return prev;
        return prev.map((i) => i.productoId === p.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, { productoId: p.id, productoNombre: p.nombre, precioUnitario: p.precio, cantidad: 1 }];
    });
  }

  function cambiarCantidad(productoId: string, delta: number) {
    const maxStock = stockDisponible(productoId);
    setCarrito((prev) =>
      prev.map((i) => {
        if (i.productoId !== productoId) return i;
        const nueva = Math.max(0, i.cantidad + delta);
        // Si sube y hay límite de stock, no pasar del disponible
        if (delta > 0 && maxStock !== null && nueva > maxStock) return i;
        return { ...i, cantidad: nueva };
      }).filter((i) => i.cantidad > 0)
    );
  }

  const ventaMutation = useMutation({
    mutationFn: () => {
      if (!sucursalIdParaApi) throw new Error("Selecciona una sucursal.");
      if (carrito.length === 0) throw new Error("El carrito está vacío.");
      return api.ventas.crear({
        sucursalId: sucursalIdParaApi,
        clienteNombre: clienteNombre.trim() || undefined,
        medioPagoId: medioPagoId || undefined,
        observaciones: observaciones.trim() || undefined,
        items: carrito.map((i) => ({
          productoId: i.productoId,
          productoNombre: i.productoNombre,
          precioUnitario: i.precioUnitario,
          cantidad: i.cantidad,
        })),
      });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["ventas"] });
      qc.invalidateQueries({ queryKey: ["productos-activos"] });
      setCarrito([]); setCliente(""); setMedioPago(""); setObs("");
      setExito(`Venta registrada — Total: ${formatMoneyPEN(data.montoTotal)}`);
      setErrorVenta("");
      setTimeout(() => setExito(""), 5000);
    },
    onError: (err) => setErrorVenta(getApiErrorMessage(err)),
  });

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Catálogo */}
      <div className="lg:col-span-2 space-y-3">
        <div className="flex flex-wrap gap-2">
          <input
            value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto..." className="panel-input h-8 flex-1 min-w-[160px] text-sm"
          />
          {CATEGORIAS.map((c) => (
            <button key={c} onClick={() => setFiltro(c)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium ring-1 transition",
                filtroCategoria === c
                  ? "bg-blue-600 text-white ring-blue-600"
                  : "bg-white text-slate-600 ring-slate-300 hover:ring-blue-400"
              )}
            >{c}</button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {productosFiltrados.map((p) => {
            const agotado = p.controlStock && p.stockActual === 0;
            return (
              <button key={p.id} onClick={() => agregar(p)}
                className={cn(
                  "relative flex flex-col gap-1 rounded-xl border p-3 text-left transition",
                  agotado
                    ? "border-red-200 bg-red-50 hover:border-red-400 hover:shadow-sm"
                    : "border-slate-200 bg-white hover:border-blue-400 hover:shadow-sm active:scale-[0.98]"
                )}
              >
                <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium ring-1", categoriaBadge(p.categoria))}>
                  {p.categoria}
                </span>
                <span className="text-sm font-semibold text-slate-800 leading-tight">{p.nombre}</span>
                <span className="text-base font-bold text-blue-700">{formatMoneyPEN(p.precio)}</span>
                {p.controlStock && <div className="mt-0.5"><StockBadge p={p} /></div>}
              </button>
            );
          })}
          {productosFiltrados.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-slate-400">No hay productos en esta categoría.</p>
          )}
        </div>
      </div>

      {/* Carrito */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-slate-800">Carrito</h2>
          {carrito.length > 0 && (
            <button onClick={() => setCarrito([])} className="ml-auto rounded p-0.5 text-slate-400 hover:text-red-500">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {carrito.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Agrega productos al carrito.</p>
        ) : (
          <ul className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            {carrito.map((item) => (
              <li key={item.productoId} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-slate-700">{item.productoNombre}</p>
                  <p className="text-xs text-slate-500">{formatMoneyPEN(item.precioUnitario)} c/u</p>
                  {(() => {
                    const max = stockDisponible(item.productoId);
                    if (max === null) return null;
                    if (item.cantidad >= max)
                      return <p className="text-xs font-medium text-red-500">Máx. {max} en stock</p>;
                    return <p className="text-xs text-slate-400">Stock: {max}</p>;
                  })()}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => cambiarCantidad(item.productoId, -1)} className="rounded border border-slate-200 p-0.5 hover:bg-slate-100"><Minus className="h-3 w-3" /></button>
                  <span className="w-6 text-center text-sm font-medium">{item.cantidad}</span>
                  {(() => {
                    const max = stockDisponible(item.productoId);
                    const limitado = max !== null && item.cantidad >= max;
                    return (
                      <button
                        onClick={() => cambiarCantidad(item.productoId, 1)}
                        disabled={limitado}
                        className="rounded border border-slate-200 p-0.5 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        title={limitado ? `Stock máximo: ${max}` : undefined}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    );
                  })()}
                </div>
                <span className="w-16 text-right text-sm font-semibold text-slate-800">
                  {formatMoneyPEN(item.precioUnitario * item.cantidad)}
                </span>
                <button onClick={() => setCarrito((prev) => prev.filter((i) => i.productoId !== item.productoId))} className="text-slate-300 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">Total</span>
          <span className="text-lg font-bold text-blue-700">{formatMoneyPEN(total)}</span>
        </div>

        <input value={clienteNombre} onChange={(e) => setCliente(e.target.value)} placeholder="Cliente (opcional)" className="panel-input text-sm" />
        <select value={medioPagoId} onChange={(e) => setMedioPago(e.target.value)} className="panel-input text-sm">
          <option value="">Medio de pago (opcional)</option>
          {mediosPago.filter((m) => m.activo).map((m) => (
            <option key={m.id} value={m.id}>{m.nombre}</option>
          ))}
        </select>
        <input value={observaciones} onChange={(e) => setObs(e.target.value)} placeholder="Observaciones (opcional)" className="panel-input text-sm" />

        {errorVenta && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{errorVenta}</p>}
        {exito      && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{exito}</p>}

        <button
          onClick={() => ventaMutation.mutate()}
          disabled={ventaMutation.isPending || carrito.length === 0}
          className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {ventaMutation.isPending ? "Registrando..." : "Confirmar venta"}
        </button>
      </div>

      <ConfirmacionModal
        abierto={!!modalAgotado}
        titulo="Producto agotado"
        mensaje={`"${modalAgotado?.nombre}" no tiene stock disponible (0 unidades).\n¿Deseas ir a registrar una compra para reponer el stock?`}
        confirmarTexto="Ir a registrar compra"
        cancelarTexto="Cerrar"
        variante="advertencia"
        onConfirmar={() => { setModalAgotado(null); router.push("/inventario?tab=compras"); }}
        onCancelar={() => setModalAgotado(null)}
      />
    </div>
  );
}

// ─── Tab: Historial ───────────────────────────────────────────────────────────

function TabHistorial({
  api, qc, sucursalIdParaApi,
}: {
  api: ReturnType<typeof useTenantApi>;
  qc: ReturnType<typeof useQueryClient>;
  sucursalIdParaApi: string | undefined;
}) {
  const [desde, setDesde]         = useState(fechaLimaInputConOffset(-7));
  const [hasta, setHasta]         = useState(fechaHoyLimaInput());
  const [confirmarAnular, setConfirmarAnular] = useState<string | null>(null);

  const { data: ventas = [], isLoading } = useQuery({
    queryKey: ["ventas", sucursalIdParaApi, desde, hasta],
    queryFn: () => api.ventas.list({ sucursalId: sucursalIdParaApi, desde, hasta }),
    enabled: !!sucursalIdParaApi,
  });

  const anularMutation = useMutation({
    mutationFn: (id: string) => api.ventas.anular(id),
    onSuccess: () => {
      setConfirmarAnular(null);
      qc.invalidateQueries({ queryKey: ["ventas"] });
      qc.invalidateQueries({ queryKey: ["productos-activos"] });
      qc.invalidateQueries({ queryKey: ["productos-todos"] });
    },
  });

  const totalPeriodo = ventas.reduce((s, v) => s + v.montoTotal, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="panel-input text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="panel-input text-sm" />
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-slate-500">Total del período</p>
          <p className="text-xl font-bold text-blue-700">{formatMoneyPEN(totalPeriodo)}</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : ventas.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">No hay ventas en el período seleccionado.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-3 py-2 text-left">Ítems</th>
                <th className="px-3 py-2 text-left">Medio</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ventas.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                    {formatFechaHora(v.fechaHora)}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{v.clienteNombre ?? <span className="text-slate-400">—</span>}</td>
                  <td className="px-3 py-2">
                    <ul className="space-y-0.5">
                      {v.items.map((i) => (
                        <li key={i.id} className="flex items-center gap-2 text-sm">
                          <span className="text-slate-700 font-medium">{i.productoNombre}</span>
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                            ×{i.cantidad}
                          </span>
                          <span className="text-slate-400 text-xs">{formatMoneyPEN(i.precioUnitario)} c/u</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{v.medioPagoNombre ?? <span className="text-slate-400">—</span>}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-800">{formatMoneyPEN(v.montoTotal)}</td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => setConfirmarAnular(v.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Anular
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmacionModal
        abierto={!!confirmarAnular}
        titulo="Anular venta"
        mensaje="¿Anular esta venta? El stock de los productos se repondrá automáticamente."
        confirmarTexto="Sí, anular"
        variante="peligro"
        cargando={anularMutation.isPending}
        onConfirmar={() => { if (confirmarAnular) anularMutation.mutate(confirmarAnular); }}
        onCancelar={() => setConfirmarAnular(null)}
      />
    </div>
  );
}

