"use client";

import { PERMISOS_SPORT } from "@kallpanexus/types";
import type { ProductoListItem } from "@kallpanexus/types";
import { getApiErrorMessage } from "@kallpanexus/api-client";
import { formatMoneyPEN, fechaHoyLimaInput, fechaLimaInputConOffset } from "@kallpanexus/shared";
import { useTenantApi } from "@/lib/api-context";
import { canAccess, useAuthStore } from "@/lib/auth-store";
import { useOperacionSucursal } from "@/lib/use-operacion-sucursal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { AlertTriangle, Package, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/cn";
import { useSearchParams } from "next/navigation";
import { ConfirmacionModal } from "@/components/confirmacion-modal";

const CATEGORIA_COLOR: Record<string, string> = {
  Bebida:    "bg-sky-100 text-sky-800 ring-sky-300",
  Snack:     "bg-amber-100 text-amber-800 ring-amber-300",
  Accesorio: "bg-violet-100 text-violet-800 ring-violet-300",
  Alquiler:  "bg-emerald-100 text-emerald-800 ring-emerald-300",
  Otro:      "bg-slate-100 text-slate-700 ring-slate-300",
};
function categoriaBadge(cat: string) { return CATEGORIA_COLOR[cat] ?? CATEGORIA_COLOR.Otro; }

function StockBadge({ p }: { p: ProductoListItem }) {
  if (!p.controlStock) return <span className="text-xs text-slate-400">Sin control</span>;
  if (p.stockActual === 0)
    return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-red-300">Agotado</span>;
  if (p.puntoAlerta !== null && p.puntoAlerta !== undefined && p.stockActual <= p.puntoAlerta)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-300">
        <AlertTriangle className="h-3 w-3" />{p.stockActual} uds.
      </span>
    );
  return <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-300">{p.stockActual} uds.</span>;
}

function formatFechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function InventarioPage() {
  const api      = useTenantApi();
  const qc       = useQueryClient();
  const permisos = useAuthStore((s) => s.session?.permisos ?? []);
  const { sucursalIdParaApi, sucursalActivaId } = useOperacionSucursal();

  const puedeComprasVer   = canAccess(permisos, PERMISOS_SPORT.comprasVer);
  const puedeComprasCrear = canAccess(permisos, PERMISOS_SPORT.comprasCrear);
  const puedeProductos    = canAccess(permisos, PERMISOS_SPORT.ventasProductosGestionar);

  type TabId = "inventario" | "compras" | "catalogo";
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabId>(() => {
    const t = searchParams.get("tab");
    if (t === "compras" || t === "catalogo" || t === "inventario") return t;
    return "inventario";
  });

  // Actualizar tab si cambia el searchParam (navegación desde dashboard)
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "compras" || t === "catalogo" || t === "inventario") setTab(t);
  }, [searchParams]);

  if (!puedeComprasVer && !puedeProductos) {
    return <div className="p-8 text-slate-500">Sin permisos para ver el inventario.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Inventario</h1>
        <p className="mt-1 text-sm text-slate-500">Controla el stock de productos, registra compras y gestiona el catálogo.</p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {([
          { id: "inventario", label: "Estado del stock",   show: true },
          { id: "compras",    label: "Compras / Entradas", show: puedeComprasVer },
          { id: "catalogo",   label: "Catálogo",           show: puedeProductos },
        ] as { id: TabId; label: string; show: boolean }[])
          .filter((t) => t.show)
          .map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                tab === t.id ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >{t.label}</button>
          ))}
      </div>

      {tab === "inventario" && <TabInventario api={api} qc={qc} sucursalIdParaApi={sucursalIdParaApi} puedeProductos={puedeProductos} />}
      {tab === "compras"    && <TabCompras    api={api} qc={qc} sucursalIdParaApi={sucursalIdParaApi} puedeCrear={puedeComprasCrear} />}
      {tab === "catalogo"   && <TabCatalogo   api={api} qc={qc} sucursalIdParaApi={sucursalIdParaApi} sucursalActualId={sucursalActivaId ?? undefined} />}
    </div>
  );
}

// ─── Tab: Estado del stock ────────────────────────────────────────────────────

function TabInventario({
  api, qc, sucursalIdParaApi, puedeProductos,
}: {
  api: ReturnType<typeof useTenantApi>;
  qc: ReturnType<typeof useQueryClient>;
  sucursalIdParaApi: string | undefined;
  puedeProductos: boolean;
}) {
  const { data: productos = [], isLoading } = useQuery({
    queryKey: ["productos-todos", sucursalIdParaApi],
    queryFn: () => api.productos.listTodos(sucursalIdParaApi),
    enabled: !!sucursalIdParaApi,
  });

  const conControl     = productos.filter((p) => p.controlStock);
  const agotados       = conControl.filter((p) => p.stockActual === 0);
  const enAlerta       = conControl.filter((p) => p.puntoAlerta !== null && p.puntoAlerta !== undefined && p.stockActual > 0 && p.stockActual <= p.puntoAlerta);
  const sinProblemas   = conControl.filter((p) => p.stockActual > 0 && (p.puntoAlerta === null || p.puntoAlerta === undefined || p.stockActual > p.puntoAlerta));
  const sinControl     = productos.filter((p) => !p.controlStock);

  if (isLoading) return <p className="text-sm text-slate-500">Cargando inventario...</p>;

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Con control", valor: conControl.length, cls: "bg-blue-50 border-blue-200 text-blue-700" },
          { label: "Agotados",    valor: agotados.length,   cls: "bg-red-50 border-red-200 text-red-700" },
          { label: "En alerta",   valor: enAlerta.length,   cls: "bg-amber-50 border-amber-200 text-amber-700" },
          { label: "Stock OK",    valor: sinProblemas.length,cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
        ].map((c) => (
          <div key={c.label} className={cn("rounded-xl border p-3 text-center", c.cls)}>
            <p className="text-2xl font-bold">{c.valor}</p>
            <p className="text-xs mt-0.5 opacity-80">{c.label}</p>
          </div>
        ))}
      </div>

      {conControl.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
          <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Ningún producto tiene control de stock activo.</p>
          {puedeProductos && <p className="text-xs text-slate-400 mt-1">Actívalo desde Ventas → Catálogo.</p>}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Producto</th>
                <th className="px-3 py-2 text-left">Categoría</th>
                <th className="px-3 py-2 text-center">Stock actual</th>
                <th className="px-3 py-2 text-center">Punto de alerta</th>
                <th className="px-3 py-2 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {conControl
                .sort((a, b) => {
                  const ord = (p: ProductoListItem) => p.stockActual === 0 ? 0 : (p.puntoAlerta && p.stockActual <= p.puntoAlerta) ? 1 : 2;
                  return ord(a) - ord(b);
                })
                .map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-800">{p.nombre}</td>
                    <td className="px-3 py-2">
                      <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs ring-1", categoriaBadge(p.categoria))}>{p.categoria}</span>
                    </td>
                    <td className="px-3 py-2 text-center text-lg font-bold text-slate-700">{p.stockActual}</td>
                    <td className="px-3 py-2 text-center text-slate-600">{p.puntoAlerta ?? <span className="text-slate-400">—</span>}</td>
                    <td className="px-3 py-2 text-center"><StockBadge p={p} /></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {sinControl.length > 0 && (
        <details className="rounded-xl border border-slate-200 bg-slate-50">
          <summary className="cursor-pointer px-4 py-3 text-sm text-slate-500 select-none">
            {sinControl.length} producto(s) sin control de stock
          </summary>
          <div className="px-4 pb-3">
            <ul className="text-sm text-slate-600 space-y-1">
              {sinControl.map((p) => <li key={p.id}>• {p.nombre} <span className="text-slate-400">({p.categoria})</span></li>)}
            </ul>
          </div>
        </details>
      )}
    </div>
  );
}

// ─── Tab: Compras ─────────────────────────────────────────────────────────────

function TabCompras({
  api, qc, sucursalIdParaApi, puedeCrear,
}: {
  api: ReturnType<typeof useTenantApi>;
  qc: ReturnType<typeof useQueryClient>;
  sucursalIdParaApi: string | undefined;
  puedeCrear: boolean;
}) {
  const [desde, setDesde]               = useState(fechaLimaInputConOffset(-30));
  const [hasta, setHasta]               = useState(fechaHoyLimaInput());
  const [showForm, setShowForm]         = useState(false);
  const [productoId, setProductoId]     = useState("");
  const [proveedor, setProveedor]       = useState("");
  const [modoCaja, setModoCaja]         = useState(false);
  const [cantidad, setCantidad]         = useState("");
  const [numCajas, setNumCajas]         = useState("");
  const [unidPorCaja, setUnidPorCaja]   = useState("");
  const [unidSueltas, setUnidSueltas]   = useState("");
  // Modo costo: "unitario" = ingresa precio por unidad, "lote" = ingresa precio total
  const [modoCosto, setModoCosto]       = useState<"unitario" | "lote">("unitario");
  const [costoInput, setCostoInput]     = useState("");
  const [obs, setObs]                   = useState("");
  const [errorMsg, setErrorMsg]         = useState("");

  const cantidadTotal = useMemo(() => {
    if (!modoCaja) { const n = parseInt(cantidad); return isNaN(n) ? 0 : n; }
    return (parseInt(numCajas) || 0) * (parseInt(unidPorCaja) || 0) + (parseInt(unidSueltas) || 0);
  }, [modoCaja, cantidad, numCajas, unidPorCaja, unidSueltas]);

  // Cálculo derivado de costos
  const costoIngresado = parseFloat(costoInput) || 0;
  const costoUnitCalc  = modoCosto === "unitario"
    ? costoIngresado
    : (cantidadTotal > 0 ? costoIngresado / cantidadTotal : 0);
  const costoLoteCalc  = modoCosto === "lote"
    ? costoIngresado
    : costoIngresado * cantidadTotal;

  const { data: productos = [] } = useQuery({
    queryKey: ["productos-todos", sucursalIdParaApi],
    queryFn: () => api.productos.listTodos(sucursalIdParaApi),
    enabled: !!sucursalIdParaApi,
  });
  const productosConControl = productos.filter((p) => p.controlStock && p.activo);

  const { data: compras = [], isLoading } = useQuery({
    queryKey: ["compras", sucursalIdParaApi, desde, hasta],
    queryFn: () => api.compras.list({ sucursalId: sucursalIdParaApi, desde, hasta }),
    enabled: !!sucursalIdParaApi,
  });

  const totalPeriodo = compras.reduce((s, c) => s + c.costoTotal, 0);

  function resetForm() {
    setProductoId(""); setProveedor(""); setCantidad("");
    setNumCajas(""); setUnidPorCaja(""); setUnidSueltas("");
    setCostoInput(""); setObs(""); setErrorMsg("");
  }

  const registrarMutation = useMutation({
    mutationFn: () => {
      if (!productoId) throw new Error("Selecciona un producto.");
      if (cantidadTotal <= 0) throw new Error("La cantidad total debe ser mayor a 0.");
      if (costoIngresado < 0) throw new Error("El costo no puede ser negativo.");
      return api.compras.registrar({
        productoId,
        proveedor: proveedor.trim() || undefined,
        cantidad: cantidadTotal,
        costoUnitario: costoUnitCalc,
        observaciones: obs.trim() || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compras"] });
      qc.invalidateQueries({ queryKey: ["productos-todos"] });
      qc.invalidateQueries({ queryKey: ["productos-activos"] });
      setShowForm(false); resetForm();
    },
    onError: (err) => {
      if (err instanceof Error && !(err as any).isAxiosError) setErrorMsg(err.message);
      else setErrorMsg(getApiErrorMessage(err));
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Desde</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="panel-input text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Hasta</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="panel-input text-sm" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-slate-500">Costo total período</p>
            <p className="text-xl font-bold text-slate-800">{formatMoneyPEN(totalPeriodo)}</p>
          </div>
          {puedeCrear && (
            <button onClick={() => { setShowForm((v) => !v); resetForm(); }} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              {showForm ? "Cancelar" : "+ Registrar entrada"}
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-emerald-800 flex items-center gap-2 text-base">
            <ShoppingBag className="h-4 w-4" /> Registrar entrada de stock
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Producto */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Producto *</label>
              <select value={productoId} onChange={(e) => setProductoId(e.target.value)} className="panel-input text-sm">
                <option value="">Seleccionar...</option>
                {productosConControl.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre} — stock actual: {p.stockActual}</option>
                ))}
              </select>
              {productosConControl.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">Activa "control de stock" en Inventario → Catálogo.</p>
              )}
            </div>
            {/* Proveedor */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Proveedor</label>
              <input value={proveedor} onChange={(e) => setProveedor(e.target.value)} placeholder="Nombre del proveedor (opcional)" className="panel-input text-sm" />
            </div>

            {/* ── Cantidad ── */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-600">Cantidad *</label>
                <button type="button"
                  onClick={() => { setModoCaja((v) => !v); setCantidad(""); setNumCajas(""); setUnidPorCaja(""); setUnidSueltas(""); }}
                  className="text-xs font-semibold text-emerald-700 hover:underline"
                >
                  {modoCaja ? "← Cantidad directa" : "📦 Ingresar por cajas"}
                </button>
              </div>
              {!modoCaja ? (
                <input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(e.target.value)}
                  placeholder="Ej: 24 unidades" className="panel-input text-sm w-full" />
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">N° cajas</label>
                      <input type="number" min={0} value={numCajas} onChange={(e) => setNumCajas(e.target.value)} placeholder="0" className="panel-input text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Uds. / caja</label>
                      <input type="number" min={0} value={unidPorCaja} onChange={(e) => setUnidPorCaja(e.target.value)} placeholder="0" className="panel-input text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Uds. sueltas</label>
                      <input type="number" min={0} value={unidSueltas} onChange={(e) => setUnidSueltas(e.target.value)} placeholder="0" className="panel-input text-sm" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm">
                    <span className="text-emerald-700">({numCajas||"0"} × {unidPorCaja||"0"}) + {unidSueltas||"0"} sueltas</span>
                    <span className="ml-auto font-bold text-emerald-800">= {cantidadTotal} uds.</span>
                  </div>
                </div>
              )}
            </div>

            {/* ── Costo ── */}
            <div className="sm:col-span-2">
              {/* Toggle modo costo */}
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit mb-3">
                <button type="button"
                  onClick={() => { setModoCosto("unitario"); setCostoInput(""); }}
                  className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                    modoCosto === "unitario" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Por unidad
                </button>
                <button type="button"
                  onClick={() => { setModoCosto("lote"); setCostoInput(""); }}
                  className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                    modoCosto === "lote" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Por lote / total
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {modoCosto === "unitario" ? "Costo por unidad (S/)" : "Costo total del lote (S/)"}
                  </label>
                  <input type="number" min={0} step="0.01" value={costoInput}
                    onChange={(e) => setCostoInput(e.target.value)}
                    placeholder={modoCosto === "unitario" ? "Ej: 2.50 / unidad" : "Ej: 120.00 por todo el lote"}
                    className="panel-input text-sm"
                  />
                </div>

                {/* Resumen de costos calculados */}
                {costoIngresado > 0 && cantidadTotal > 0 && (
                  <div className="flex flex-col justify-center rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">Resumen de costo</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Por unidad</span>
                      <span className="font-semibold text-slate-800">{formatMoneyPEN(costoUnitCalc)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Total lote ({cantidadTotal} uds.)</span>
                      <span className="font-bold text-blue-700">{formatMoneyPEN(costoLoteCalc)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Observaciones */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Observaciones</label>
              <input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" className="panel-input text-sm" />
            </div>
          </div>
          {errorMsg && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">{errorMsg}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => { setShowForm(false); resetForm(); }} className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button onClick={() => registrarMutation.mutate()} disabled={registrarMutation.isPending}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
              {registrarMutation.isPending ? "Guardando..." : "Registrar entrada"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : compras.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">No hay compras en el período.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Producto</th>
                <th className="px-3 py-2 text-left">Proveedor</th>
                <th className="px-3 py-2 text-center">Cant.</th>
                <th className="px-3 py-2 text-right">C/U</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-left">Registró</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {compras.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{formatFechaHora(c.fechaHora)}</td>
                  <td className="px-3 py-2 font-medium text-slate-800">{c.productoNombre}</td>
                  <td className="px-3 py-2 text-slate-600">{c.proveedor ?? <span className="text-slate-400">—</span>}</td>
                  <td className="px-3 py-2 text-center font-bold text-emerald-700">+{c.cantidad}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{formatMoneyPEN(c.costoUnitario)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-800">{formatMoneyPEN(c.costoTotal)}</td>
                  <td className="px-3 py-2 text-slate-500 text-xs">{c.registradoPorNombre ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Catálogo de Productos ───────────────────────────────────────────────

const CATEGORIAS_CAT = ["Todos", "Bebida", "Snack", "Accesorio", "Alquiler", "Otro"];
const CAT_COLOR: Record<string, string> = {
  Bebida: "bg-sky-100 text-sky-800 ring-sky-300", Snack: "bg-amber-100 text-amber-800 ring-amber-300",
  Accesorio: "bg-violet-100 text-violet-800 ring-violet-300", Alquiler: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  Otro: "bg-slate-100 text-slate-700 ring-slate-300",
};
function catBadge(cat: string) { return CAT_COLOR[cat] ?? CAT_COLOR.Otro; }

function TabCatalogo({
  api, qc, sucursalIdParaApi, sucursalActualId,
}: {
  api: ReturnType<typeof useTenantApi>;
  qc: ReturnType<typeof useQueryClient>;
  sucursalIdParaApi: string | undefined;
  sucursalActualId: string | undefined;
}) {
  const { data: productos = [], isLoading } = useQuery({
    queryKey: ["productos-todos", sucursalIdParaApi],
    queryFn: () => api.productos.listTodos(sucursalIdParaApi),
    enabled: !!sucursalIdParaApi,
  });

  type FormProducto = {
    nombre: string; descripcion: string; categoria: string; precio: string;
    controlStock: boolean; stockInicial: string; puntoAlerta: string; visibleEnWeb: boolean;
  };
  const formVacio: FormProducto = { nombre: "", descripcion: "", categoria: "Otro", precio: "", controlStock: false, stockInicial: "", puntoAlerta: "", visibleEnWeb: false };

  const [editando, setEditando]         = useState<ProductoListItem | null>(null);
  const [showNuevo, setShowNuevo]       = useState(false);
  const [form, setForm]                 = useState<FormProducto>(formVacio);
  const [errorMsg, setErrorMsg]         = useState("");
  const [confirmarDesactivar, setConfirmarDesactivar] = useState<ProductoListItem | null>(null);

  function abrirEditar(p: ProductoListItem) {
    setEditando(p); setShowNuevo(false);
    setForm({
      nombre: p.nombre, descripcion: p.descripcion ?? "", categoria: p.categoria,
      precio: String(p.precio), controlStock: p.controlStock,
      stockInicial: String(p.stockActual),
      puntoAlerta: p.puntoAlerta !== null && p.puntoAlerta !== undefined ? String(p.puntoAlerta) : "",
      visibleEnWeb: p.visibleEnWeb ?? false,
    });
    setErrorMsg("");
  }

  const crearMutation = useMutation({
    mutationFn: () => {
      if (!sucursalActualId) throw new Error("Selecciona una sucursal.");
      if (!form.nombre.trim()) throw new Error("El nombre es obligatorio.");
      const precio = parseFloat(form.precio);
      if (isNaN(precio) || precio < 0) throw new Error("Precio inválido.");
      return api.productos.crear({
        sucursalId: sucursalActualId, nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || undefined, categoria: form.categoria,
        precio, controlStock: form.controlStock,
        stockInicial: form.controlStock && form.stockInicial ? parseInt(form.stockInicial) : undefined,
        puntoAlerta: form.controlStock && form.puntoAlerta ? parseInt(form.puntoAlerta) : undefined,
        visibleEnWeb: form.visibleEnWeb,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["productos-todos"] }); qc.invalidateQueries({ queryKey: ["productos-activos"] }); setShowNuevo(false); setForm(formVacio); setErrorMsg(""); },
    onError: (err) => {
      if (err instanceof Error && !(err as any).isAxiosError) setErrorMsg(err.message);
      else setErrorMsg(getApiErrorMessage(err));
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: () => {
      if (!editando) return Promise.resolve(null);
      if (!form.nombre.trim()) throw new Error("El nombre es obligatorio.");
      const precio = parseFloat(form.precio);
      if (isNaN(precio) || precio < 0) throw new Error("Precio inválido.");
      const pa = form.controlStock && form.puntoAlerta ? parseInt(form.puntoAlerta) : -1;
      return api.productos.actualizar(editando.id, {
        nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || undefined,
        categoria: form.categoria, precio, controlStock: form.controlStock,
        stockActual: form.controlStock ? parseInt(form.stockInicial || "0") : undefined,
        puntoAlerta: pa,
        visibleEnWeb: form.visibleEnWeb,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["productos-todos"] }); qc.invalidateQueries({ queryKey: ["productos-activos"] }); setEditando(null); setErrorMsg(""); },
    onError: (err) => {
      if (err instanceof Error && !(err as any).isAxiosError) setErrorMsg(err.message);
      else setErrorMsg(getApiErrorMessage(err));
    },
  });

  const desactivarMutation = useMutation({
    mutationFn: (id: string) => api.productos.eliminar(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["productos-todos"] }); qc.invalidateQueries({ queryKey: ["productos-activos"] }); },
  });

  const formUI = (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <h3 className="font-semibold text-slate-800">{editando ? "Editar producto" : "Nuevo producto"}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
          <input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} className="panel-input text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Categoría</label>
          <select value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))} className="panel-input text-sm">
            {CATEGORIAS_CAT.filter((c) => c !== "Todos").map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Precio venta (S/) *</label>
          <input type="number" min={0} step="0.01" value={form.precio} onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))} className="panel-input text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
          <input value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} placeholder="Opcional" className="panel-input text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.visibleEnWeb} onChange={(e) => setForm((f) => ({ ...f, visibleEnWeb: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-emerald-600" />
            <span className="text-sm font-medium text-slate-700">Mostrar en reserva web (bebidas / extras)</span>
          </label>
        </div>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.controlStock} onChange={(e) => setForm((f) => ({ ...f, controlStock: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
            <span className="text-sm font-medium text-slate-700">Controlar stock</span>
          </label>
        </div>
        {form.controlStock && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{editando ? "Stock actual" : "Stock inicial"}</label>
              <input type="number" min={0} value={form.stockInicial} onChange={(e) => setForm((f) => ({ ...f, stockInicial: e.target.value }))} placeholder="0" className="panel-input text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Punto de alerta <span className="text-slate-400">(alertar cuando ≤)</span></label>
              <input type="number" min={0} value={form.puntoAlerta} onChange={(e) => setForm((f) => ({ ...f, puntoAlerta: e.target.value }))} placeholder="Ej: 5" className="panel-input text-sm" />
            </div>
          </>
        )}
      </div>
      {errorMsg && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{errorMsg}</p>}
      <div className="flex gap-2 justify-end">
        <button onClick={() => { setEditando(null); setShowNuevo(false); setErrorMsg(""); }} className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
        <button onClick={() => editando ? actualizarMutation.mutate() : crearMutation.mutate()} disabled={crearMutation.isPending || actualizarMutation.isPending} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          {crearMutation.isPending || actualizarMutation.isPending ? "Guardando..." : editando ? "Guardar cambios" : "Crear producto"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{productos.length} productos registrados</p>
        {!showNuevo && !editando && (
          <button onClick={() => { setShowNuevo(true); setForm(formVacio); setErrorMsg(""); }} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            + Nuevo producto
          </button>
        )}
      </div>

      {(showNuevo || editando) && formUI}

      {isLoading ? <p className="text-sm text-slate-500">Cargando...</p> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Nombre</th>
                <th className="px-3 py-2 text-left">Cat.</th>
                <th className="px-3 py-2 text-right">Precio</th>
                <th className="px-3 py-2 text-center">Stock</th>
                <th className="px-3 py-2 text-center">Estado</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productos.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-800">
                    {p.nombre}
                    {p.descripcion && <span className="ml-1 text-xs text-slate-400">— {p.descripcion}</span>}
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs ring-1", catBadge(p.categoria))}>{p.categoria}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-700">{formatMoneyPEN(p.precio)}</td>
                  <td className="px-3 py-2 text-center"><StockBadge p={p} /></td>
                  <td className="px-3 py-2 text-center">
                    {p.activo
                      ? <span className="panel-badge-ok">Activo</span>
                      : <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Inactivo</span>}
                  </td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <button onClick={() => abrirEditar(p)} className="panel-link-edit text-xs">Editar</button>
                    {p.activo && (
                      <button onClick={() => setConfirmarDesactivar(p)} className="panel-link-warn text-xs">
                        Desactivar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmacionModal
        abierto={!!confirmarDesactivar}
        titulo="Desactivar producto"
        mensaje={`¿Desactivar "${confirmarDesactivar?.nombre}"? Ya no aparecerá en el punto de venta.`}
        confirmarTexto="Sí, desactivar"
        variante="advertencia"
        cargando={desactivarMutation.isPending}
        onConfirmar={() => {
          if (confirmarDesactivar) desactivarMutation.mutate(confirmarDesactivar.id);
          setConfirmarDesactivar(null);
        }}
        onCancelar={() => setConfirmarDesactivar(null)}
      />
    </div>
  );
}
