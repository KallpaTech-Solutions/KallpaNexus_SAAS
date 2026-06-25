"use client";

import { getApiErrorMessage } from "@kallpanexus/api-client";
import { PERMISOS_SPORT, type ReporteFinanciero } from "@kallpanexus/types";
import {
  fechaHoyLimaInput,
  fechaLimaInputConOffset,
  formatMoneyPEN,
  rangoFechasLimaParaApi,
} from "@kallpanexus/shared";
import { useTenantApi } from "@/lib/api-context";
import { AvisoElegirSedeOperacion } from "@/components/aviso-elegir-sede-operacion";
import { canAccess, useAuthStore } from "@/lib/auth-store";
import { useOperacionSucursal } from "@/lib/use-operacion-sucursal";
import { rangoFechasReservasPorDefecto } from "@/components/filtros-reservas-bar";
import { descargarReporteFinancieroPdf } from "@/lib/export-reporte-pdf";
import { descargarReporteModuloPdf, type PdfKpi, type PdfSeccion } from "@/lib/export-reporte-modulo-pdf";
import { useCiudadSucursalActiva } from "@/lib/use-ciudad-sucursal";
import { useUiFeedback } from "@/components/ui-feedback-provider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GraficoBarrasHorizontales } from "@/components/graficos-panel";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { panel } from "@/lib/panel-light";
import { SPORT_CHART_COLORS } from "@/lib/sport-chart-colors";
import {
  BarChart3,
  CalendarDays,
  Eye,
  FileDown,
  Package,
  Save,
  ShoppingCart,
  TrendingDown,
} from "lucide-react";

type TipoReporte = "general" | "reservas" | "ventas" | "egresos" | "inventario";

function etiquetaNegocioPdf(
  session: ReturnType<typeof useAuthStore.getState>["session"],
  subdomain: string | null
) {
  const marca =
    subdomain && subdomain.charAt(0).toUpperCase() + subdomain.slice(1).replace(/-/g, " ");
  return session ? [session.rol, marca].filter(Boolean).join(" · ") : marca;
}

export default function ReportesPage() {
  const api = useTenantApi();
  const qc = useQueryClient();
  const { notificar, confirmar } = useUiFeedback();
  const session = useAuthStore((s) => s.session);
  const subdomain = useAuthStore((s) => s.subdomain);
  const permisos = session?.permisos ?? [];
  const puedeVer = canAccess(permisos, PERMISOS_SPORT.reportesFinancieros);
  const puedeEliminar = canAccess(permisos, PERMISOS_SPORT.reportesEliminar);
  const puedeVentas = canAccess(permisos, PERMISOS_SPORT.ventasVer);
  const puedeEgresos = canAccess(permisos, PERMISOS_SPORT.egresosVer);
  const puedeInventario =
    canAccess(permisos, PERMISOS_SPORT.comprasVer) ||
    canAccess(permisos, PERMISOS_SPORT.ventasProductosGestionar);
  const { sucursalIdParaApi, sucursalActivaId } = useOperacionSucursal();
  const ciudadSede = useCiudadSucursalActiva();

  const rangoDefecto = useMemo(() => rangoFechasReservasPorDefecto(), []);
  const [tipo, setTipo] = useState<TipoReporte>("general");
  const [desdeInput, setDesdeInput] = useState(rangoDefecto.desde);
  const [hastaInput, setHastaInput] = useState(rangoDefecto.hasta);
  const [aplicado, setAplicado] = useState({ desde: rangoDefecto.desde, hasta: rangoDefecto.hasta });
  const [exportando, setExportando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [eliminandoCodigo, setEliminandoCodigo] = useState<string | null>(null);

  const sucursalNombre = useMemo(() => {
    if (!sucursalActivaId) return undefined;
    return session?.sucursales?.find((s) => s.id === sucursalActivaId)?.nombre;
  }, [session?.sucursales, sucursalActivaId]);

  const negocio = etiquetaNegocioPdf(session, subdomain) ?? undefined;

  const paramsApi = useMemo(() => {
    const rango = rangoFechasLimaParaApi(aplicado.desde, aplicado.hasta);
    return { ...rango, sucursalId: sucursalIdParaApi };
  }, [aplicado.desde, aplicado.hasta, sucursalIdParaApi]);

  // ── Datos ──────────────────────────────────────────────────────────────────

  const { data: finanzas, isLoading, error, isFetching } = useQuery({
    queryKey: ["reporte-financiero", aplicado.desde, aplicado.hasta, sucursalIdParaApi ?? "sin-sede"],
    queryFn: () => api.reportes.financieros(paramsApi),
    enabled: puedeVer && aplicado.desde <= aplicado.hasta && !!sucursalIdParaApi,
  });

  const { data: ventas = [] } = useQuery({
    queryKey: ["ventas-reporte", aplicado.desde, aplicado.hasta, sucursalIdParaApi],
    queryFn: () => {
      const rango = rangoFechasLimaParaApi(aplicado.desde, aplicado.hasta);
      return api.ventas.list({ ...rango, sucursalId: sucursalIdParaApi });
    },
    enabled: puedeVentas && aplicado.desde <= aplicado.hasta && !!sucursalIdParaApi,
  });

  const { data: egresos = [] } = useQuery({
    queryKey: ["egresos-reporte", aplicado.desde, aplicado.hasta, sucursalIdParaApi],
    queryFn: () => {
      const rango = rangoFechasLimaParaApi(aplicado.desde, aplicado.hasta);
      return api.egresos.list({ ...rango, sucursalId: sucursalIdParaApi });
    },
    enabled: puedeEgresos && aplicado.desde <= aplicado.hasta && !!sucursalIdParaApi,
  });

  const { data: resumenEgresos } = useQuery({
    queryKey: ["egresos-resumen-reporte", aplicado.desde, aplicado.hasta, sucursalIdParaApi],
    queryFn: () => {
      const rango = rangoFechasLimaParaApi(aplicado.desde, aplicado.hasta);
      return api.egresos.resumen({ ...rango, sucursalId: sucursalIdParaApi });
    },
    enabled: puedeEgresos && aplicado.desde <= aplicado.hasta && !!sucursalIdParaApi,
  });

  const { data: productos = [] } = useQuery({
    queryKey: ["productos-reporte", sucursalIdParaApi],
    queryFn: () => api.productos.listTodos(sucursalIdParaApi),
    enabled: puedeInventario && !!sucursalIdParaApi,
  });

  const { data: archivados = [] } = useQuery({
    queryKey: ["reportes-archivados"],
    queryFn: () => api.reportes.listarArchivados(15),
    enabled: puedeVer,
  });

  // ── Agregados ──────────────────────────────────────────────────────────────

  const totalVentas = ventas.reduce((s, v) => s + v.montoTotal, 0);
  const totalEgresos = resumenEgresos?.totalGeneral ?? egresos.reduce((s, e) => s + e.monto, 0);

  const ventasPorMedio = useMemo(() => {
    const map = new Map<string, { cantidad: number; monto: number }>();
    for (const v of ventas) {
      const k = v.medioPagoNombre ?? "Sin especificar";
      const cur = map.get(k) ?? { cantidad: 0, monto: 0 };
      cur.cantidad += 1;
      cur.monto += v.montoTotal;
      map.set(k, cur);
    }
    return [...map.entries()]
      .map(([medio, x]) => ({ medio, ...x }))
      .sort((a, b) => b.monto - a.monto);
  }, [ventas]);

  const topProductos = useMemo(() => {
    const map = new Map<string, { cantidad: number; monto: number }>();
    for (const v of ventas) {
      for (const i of v.items) {
        const cur = map.get(i.productoNombre) ?? { cantidad: 0, monto: 0 };
        cur.cantidad += i.cantidad;
        cur.monto += i.subtotal;
        map.set(i.productoNombre, cur);
      }
    }
    return [...map.entries()]
      .map(([nombre, x]) => ({ nombre, ...x }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 10);
  }, [ventas]);

  const inv = useMemo(() => {
    const conControl = productos.filter((p) => p.controlStock);
    const agotados = conControl.filter((p) => p.stockActual === 0);
    const enAlerta = conControl.filter(
      (p) => p.puntoAlerta != null && p.stockActual > 0 && p.stockActual <= p.puntoAlerta
    );
    const valorizado = conControl.reduce((s, p) => s + p.stockActual * p.precio, 0);
    return { conControl, agotados, enAlerta, valorizado };
  }, [productos]);

  const cobradoReservas = finanzas?.totalCobradoConfirmado ?? 0;
  const ingresosTotales = cobradoReservas + totalVentas;
  const balance = ingresosTotales - totalEgresos;

  // ── Exportadores PDF ───────────────────────────────────────────────────────

  type Salida = "descargar" | "abrir";

  async function exportarFinancieroPdf(
    payload: ReporteFinanciero,
    opts?: {
      codigoOficial?: string;
      generadoEnUtc?: string;
      desde?: string;
      hasta?: string;
      sucursalNombre?: string;
      ciudad?: string | null;
      salida?: Salida;
    }
  ) {
    setExportando(true);
    try {
      await descargarReporteFinancieroPdf(payload, {
        desde: opts?.desde ?? aplicado.desde,
        hasta: opts?.hasta ?? aplicado.hasta,
        sucursalNombre: opts?.sucursalNombre ?? sucursalNombre,
        ciudad: opts?.ciudad ?? ciudadSede ?? undefined,
        negocio,
        codigoOficial: opts?.codigoOficial ?? null,
        generadoEnUtc: opts?.generadoEnUtc ?? null,
        salida: opts?.salida ?? "descargar",
      });
    } finally {
      setExportando(false);
    }
  }

  async function exportarModuloPdf(args: {
    titulo: string;
    kpis: PdfKpi[];
    secciones: PdfSeccion[];
    nombreArchivo: string;
    sinPeriodo?: boolean;
    salida?: Salida;
    codigoOficial?: string | null;
    generadoEnUtc?: string | null;
    desde?: string;
    hasta?: string;
    sucursalNombre?: string;
    ciudad?: string | null;
  }) {
    setExportando(true);
    try {
      await descargarReporteModuloPdf({
        titulo: args.titulo,
        desde: args.sinPeriodo ? undefined : args.desde ?? aplicado.desde,
        hasta: args.sinPeriodo ? undefined : args.hasta ?? aplicado.hasta,
        sucursalNombre: args.sucursalNombre ?? sucursalNombre,
        ciudad: args.ciudad ?? ciudadSede ?? undefined,
        negocio,
        kpis: args.kpis,
        secciones: args.secciones,
        nombreArchivo: args.nombreArchivo,
        codigoOficial: args.codigoOficial ?? null,
        generadoEnUtc: args.generadoEnUtc ?? null,
        salida: args.salida ?? "descargar",
      });
    } catch (e) {
      notificar(getApiErrorMessage(e) || "No se pudo generar el PDF.", "error");
    } finally {
      setExportando(false);
    }
  }

  /** Construye KPIs y secciones del reporte general a partir de un snapshot. */
  function argsGeneralDesdeDatos(datos: ReporteFinanciero): { kpis: PdfKpi[]; secciones: PdfSeccion[] } {
    const totV = datos.ventas?.total ?? 0;
    const totE = datos.egresos?.total ?? 0;
    const cobrado = datos.totalCobradoConfirmado;
    const ingresos = cobrado + totV;
    const bal = ingresos - totE;

    const secciones: PdfSeccion[] = [
      {
        titulo: "Desglose de ingresos y gastos",
        columnas: [
          { titulo: "Concepto" },
          { titulo: "Detalle", ancho: 60 },
          { titulo: "Monto", ancho: 35, alineacion: "right" },
        ],
        filas: [
          ["Cobros de reservas", `${datos.pagosConfirmados} pagos confirmados`, formatMoneyPEN(cobrado)],
          ["Ventas de productos", `${datos.ventas?.cantidad ?? 0} transacciones`, formatMoneyPEN(totV)],
          ...(datos.egresos?.porCategoria ?? []).map((c) => [
            `Gasto · ${c.categoria}`,
            `${c.cantidad} registro(s)`,
            `- ${formatMoneyPEN(c.total)}`,
          ]),
        ],
        filaTotal: ["Balance del período", "", formatMoneyPEN(bal)],
      },
    ];

    if (datos.porMedio.length > 0) {
      secciones.push({
        titulo: "Cobros de reservas por medio de pago",
        columnas: [
          { titulo: "Medio" },
          { titulo: "Operaciones", ancho: 40, alineacion: "center" },
          { titulo: "Monto", ancho: 40, alineacion: "right" },
        ],
        filas: datos.porMedio.map((m) => [m.medio, String(m.cantidad), formatMoneyPEN(m.monto)]),
      });
    }

    if (datos.ventas && datos.ventas.topProductos.length > 0) {
      secciones.push({
        titulo: "Productos más vendidos",
        columnas: [
          { titulo: "Producto" },
          { titulo: "Unidades", ancho: 40, alineacion: "center" },
          { titulo: "Monto", ancho: 40, alineacion: "right" },
        ],
        filas: datos.ventas.topProductos.map((p) => [p.nombre, String(p.cantidad), formatMoneyPEN(p.monto)]),
      });
    }

    if (datos.inventario && datos.inventario.productos.length > 0) {
      secciones.push({
        titulo: "Inventario (al momento de generar)",
        columnas: [
          { titulo: "Producto" },
          { titulo: "Categoría", ancho: 30 },
          { titulo: "Stock", ancho: 22, alineacion: "center" },
          { titulo: "Estado", ancho: 26, alineacion: "center" },
          { titulo: "Valorizado", ancho: 30, alineacion: "right" },
        ],
        filas: datos.inventario.productos.map((p) => [
          p.nombre,
          p.categoria,
          String(p.stock),
          p.stock === 0 ? "AGOTADO" : p.puntoAlerta != null && p.stock <= p.puntoAlerta ? "ALERTA" : "OK",
          formatMoneyPEN(p.stock * p.precio),
        ]),
        filaTotal: ["Total", "", "", "", formatMoneyPEN(datos.inventario.valorizado)],
      });
    }

    return {
      kpis: [
        { label: "Ingresos totales", value: formatMoneyPEN(ingresos), tone: "green" },
        { label: "Gastos totales", value: formatMoneyPEN(totE), tone: "red" },
        { label: bal >= 0 ? "Balance (ganancia)" : "Balance (pérdida)", value: formatMoneyPEN(bal), tone: bal >= 0 ? "green" : "red" },
        { label: "Cobrado reservas", value: formatMoneyPEN(cobrado), tone: "navy" },
        { label: "Ventas de productos", value: formatMoneyPEN(totV), tone: "orange" },
        { label: "Reservas activas", value: String(datos.reservasActivas), tone: "navy" },
      ],
      secciones,
    };
  }

  /** Snapshot del reporte general construido con los datos en vivo de la pantalla. */
  function datosGeneralVivo(): ReporteFinanciero | null {
    if (!finanzas) return null;
    return {
      ...finanzas,
      ventas: {
        total: totalVentas,
        cantidad: ventas.length,
        porMedio: ventasPorMedio,
        topProductos: topProductos.map((p) => ({ nombre: p.nombre, cantidad: p.cantidad, monto: p.monto })),
      },
      egresos: {
        total: totalEgresos,
        cantidad: egresos.length,
        porCategoria: resumenEgresos?.porCategoria ?? [],
      },
      inventario: {
        conControl: inv.conControl.length,
        agotados: inv.agotados.length,
        enAlerta: inv.enAlerta.length,
        valorizado: inv.valorizado,
        productos: inv.conControl.map((p) => ({
          nombre: p.nombre,
          categoria: p.categoria,
          stock: p.stockActual,
          puntoAlerta: p.puntoAlerta,
          precio: p.precio,
        })),
      },
    };
  }

  function exportarGeneralPdf(salida: Salida) {
    const datos = datosGeneralVivo();
    if (!datos) return;
    const slug = `${aplicado.desde}_${aplicado.hasta}`.replace(/[^\d-]/g, "");
    const { kpis, secciones } = argsGeneralDesdeDatos(datos);
    void exportarModuloPdf({
      titulo: "Reporte general",
      nombreArchivo: `reporte-general-${slug}`,
      kpis,
      secciones,
      salida,
    });
  }

  async function guardarYExportarGeneral() {
    if (!finanzas || !sucursalIdParaApi) return;
    setGuardando(true);
    try {
      const rango = rangoFechasLimaParaApi(aplicado.desde, aplicado.hasta);
      const res = await api.reportes.archivarFinanciero(
        { ...rango, sucursalId: sucursalIdParaApi },
        { sucursalNombre, ciudad: ciudadSede ?? undefined, generadoPorNombre: session?.nombreCompleto }
      );
      await qc.invalidateQueries({ queryKey: ["reportes-archivados"] });
      notificar(`Reporte general archivado · código ${res.codigo}`, "exito");
      const { kpis, secciones } = argsGeneralDesdeDatos(res.datos);
      const slug = `${aplicado.desde}_${aplicado.hasta}`.replace(/[^\d-]/g, "");
      await exportarModuloPdf({
        titulo: "Reporte general",
        nombreArchivo: `reporte-general-${res.codigo}-${slug}`,
        kpis,
        secciones,
        codigoOficial: res.codigo,
        generadoEnUtc: res.generadoEnUtc,
      });
    } catch (e) {
      notificar(getApiErrorMessage(e) || "No se pudo archivar el reporte.", "error");
    } finally {
      setGuardando(false);
    }
  }

  /** Exporta (ver o descargar) un reporte archivado: general si tiene extras, financiero si es antiguo. */
  async function exportarArchivado(codigo: string, salida: Salida) {
    try {
      const snap = await api.reportes.obtenerArchivado(codigo);
      const desde = snap.datos.desdeUtc.slice(0, 10);
      const hasta = snap.datos.hastaUtc.slice(0, 10);
      if (snap.datos.ventas || snap.datos.egresos || snap.datos.inventario) {
        const { kpis, secciones } = argsGeneralDesdeDatos(snap.datos);
        await exportarModuloPdf({
          titulo: "Reporte general",
          nombreArchivo: `reporte-general-${snap.codigo}`,
          kpis,
          secciones,
          codigoOficial: snap.codigo,
          generadoEnUtc: snap.generadoEnUtc,
          desde,
          hasta,
          sucursalNombre: snap.sucursalNombre ?? undefined,
          ciudad: snap.ciudad,
          salida,
        });
      } else {
        await exportarFinancieroPdf(snap.datos, {
          codigoOficial: snap.codigo,
          generadoEnUtc: snap.generadoEnUtc,
          desde,
          hasta,
          sucursalNombre: snap.sucursalNombre ?? undefined,
          ciudad: snap.ciudad,
          salida,
        });
      }
    } catch (e) {
      notificar(getApiErrorMessage(e) || "No se pudo generar el reporte.", "error");
    }
  }

  function exportarVentasPdf(salida: Salida) {
    const slug = `${aplicado.desde}_${aplicado.hasta}`.replace(/[^\d-]/g, "");
    void exportarModuloPdf({
      titulo: "Reporte de ventas",
      nombreArchivo: `reporte-ventas-${slug}`,
      salida,
      kpis: [
        { label: "Total vendido", value: formatMoneyPEN(totalVentas), tone: "green" },
        { label: "Transacciones", value: String(ventas.length), tone: "navy" },
        { label: "Ticket promedio", value: formatMoneyPEN(totalVentas / (ventas.length || 1)), tone: "orange" },
      ],
      secciones: [
        {
          titulo: "Ventas por medio de pago",
          columnas: [
            { titulo: "Medio" },
            { titulo: "Transacciones", ancho: 40, alineacion: "center" },
            { titulo: "Monto", ancho: 40, alineacion: "right" },
          ],
          filas: ventasPorMedio.map((m) => [m.medio, String(m.cantidad), formatMoneyPEN(m.monto)]),
          filaTotal: ["Total", String(ventas.length), formatMoneyPEN(totalVentas)],
        },
        {
          titulo: "Productos más vendidos",
          columnas: [
            { titulo: "Producto" },
            { titulo: "Unidades", ancho: 40, alineacion: "center" },
            { titulo: "Monto", ancho: 40, alineacion: "right" },
          ],
          filas: topProductos.map((p) => [p.nombre, String(p.cantidad), formatMoneyPEN(p.monto)]),
        },
      ],
    });
  }

  function exportarEgresosPdf(salida: Salida) {
    const slug = `${aplicado.desde}_${aplicado.hasta}`.replace(/[^\d-]/g, "");
    void exportarModuloPdf({
      titulo: "Reporte de egresos",
      nombreArchivo: `reporte-egresos-${slug}`,
      salida,
      kpis: [
        { label: "Total gastos", value: formatMoneyPEN(totalEgresos), tone: "red" },
        { label: "Registros", value: String(egresos.length), tone: "navy" },
        {
          label: "Categoría principal",
          value: resumenEgresos?.porCategoria[0]?.categoria ?? "—",
          tone: "orange",
        },
      ],
      secciones: [
        {
          titulo: "Gastos por categoría",
          columnas: [
            { titulo: "Categoría" },
            { titulo: "Registros", ancho: 40, alineacion: "center" },
            { titulo: "Total", ancho: 40, alineacion: "right" },
          ],
          filas: (resumenEgresos?.porCategoria ?? []).map((c) => [
            c.categoria, String(c.cantidad), formatMoneyPEN(c.total),
          ]),
          filaTotal: ["Total", String(egresos.length), formatMoneyPEN(totalEgresos)],
        },
        {
          titulo: "Detalle de gastos",
          columnas: [
            { titulo: "Fecha", ancho: 30 },
            { titulo: "Categoría", ancho: 32 },
            { titulo: "Descripción" },
            { titulo: "Monto", ancho: 30, alineacion: "right" },
          ],
          filas: egresos.map((e) => [
            new Date(e.fechaHora).toLocaleDateString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "2-digit" }),
            e.categoria,
            e.descripcion,
            formatMoneyPEN(e.monto),
          ]),
        },
      ],
    });
  }

  function exportarInventarioPdf(salida: Salida) {
    void exportarModuloPdf({
      titulo: "Reporte de inventario",
      nombreArchivo: `reporte-inventario-${fechaHoyLimaInput()}`,
      sinPeriodo: true,
      salida,
      kpis: [
        { label: "Productos con control", value: String(inv.conControl.length), tone: "navy" },
        { label: "Agotados", value: String(inv.agotados.length), tone: "red" },
        { label: "En alerta", value: String(inv.enAlerta.length), tone: "orange" },
        { label: "Valor del stock (precio venta)", value: formatMoneyPEN(inv.valorizado), tone: "green" },
      ],
      secciones: [
        {
          titulo: "Estado del stock",
          columnas: [
            { titulo: "Producto" },
            { titulo: "Categoría", ancho: 30 },
            { titulo: "Stock", ancho: 22, alineacion: "center" },
            { titulo: "Alerta ≤", ancho: 22, alineacion: "center" },
            { titulo: "Estado", ancho: 26, alineacion: "center" },
            { titulo: "Valorizado", ancho: 30, alineacion: "right" },
          ],
          filas: inv.conControl.map((p) => [
            p.nombre,
            p.categoria,
            String(p.stockActual),
            p.puntoAlerta != null ? String(p.puntoAlerta) : "—",
            p.stockActual === 0
              ? "AGOTADO"
              : p.puntoAlerta != null && p.stockActual <= p.puntoAlerta
                ? "ALERTA"
                : "OK",
            formatMoneyPEN(p.stockActual * p.precio),
          ]),
          filaTotal: ["Total", "", "", "", "", formatMoneyPEN(inv.valorizado)],
        },
      ],
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!puedeVer) {
    return (
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900">
        Sin permiso <code>{PERMISOS_SPORT.reportesFinancieros}</code>
      </p>
    );
  }

  const tiposReporte: { id: TipoReporte; label: string; desc: string; icon: typeof BarChart3; show: boolean }[] = [
    { id: "general",    label: "General",    desc: "Ingresos, gastos y balance",   icon: BarChart3,    show: true },
    { id: "reservas",   label: "Reservas",   desc: "Financiero de reservas",       icon: CalendarDays, show: true },
    { id: "ventas",     label: "Ventas",     desc: "Punto de venta",               icon: ShoppingCart, show: puedeVentas },
    { id: "egresos",    label: "Egresos",    desc: "Gastos por categoría",         icon: TrendingDown, show: puedeEgresos },
    { id: "inventario", label: "Inventario", desc: "Stock y valorización",         icon: Package,      show: puedeInventario },
  ];

  const botonesVerDescargar = (exportar: (salida: Salida) => void) => (
    <>
      <button
        type="button"
        disabled={exportando || !sucursalIdParaApi}
        onClick={() => exportar("abrir")}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm hover:border-sport-orange/40 disabled:opacity-50"
      >
        <Eye className="h-4 w-4" />
        Ver PDF
      </button>
      <button
        type="button"
        disabled={exportando || !sucursalIdParaApi}
        onClick={() => exportar("descargar")}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.98] transition disabled:opacity-50"
      >
        <FileDown className="h-4 w-4" />
        {exportando ? "Generando…" : "Descargar PDF"}
      </button>
    </>
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className={panel.heading}>Reportes</h2>
          <p className={panel.subheading}>
            Elige el tipo de reporte, revisa la vista previa y descarga el PDF.
          </p>
          {sucursalNombre && (
            <p className="mt-1 text-xs text-sport-green-soft">Sucursal: {sucursalNombre}</p>
          )}
        </div>
        {/* Acciones según tipo */}
        <div className="flex flex-wrap gap-2">
          {tipo === "general" && finanzas && (
            <>
              {botonesVerDescargar(exportarGeneralPdf)}
              <button
                type="button"
                disabled={exportando || guardando || !sucursalIdParaApi}
                onClick={() => void guardarYExportarGeneral()}
                className="inline-flex items-center gap-2 rounded-lg bg-sport-orange px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sport-orange/90 active:scale-[0.98] transition disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {guardando ? "Guardando…" : "Guardar reporte y PDF"}
              </button>
            </>
          )}
          {tipo === "reservas" && finanzas &&
            botonesVerDescargar((salida) => void exportarFinancieroPdf(finanzas, { salida }))}
          {tipo === "ventas" && botonesVerDescargar(exportarVentasPdf)}
          {tipo === "egresos" && botonesVerDescargar(exportarEgresosPdf)}
          {tipo === "inventario" && botonesVerDescargar(exportarInventarioPdf)}
        </div>
      </header>

      <AvisoElegirSedeOperacion />

      {/* ── Menú de tipos de reporte ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {tiposReporte.filter((t) => t.show).map((t) => {
          const Icono = t.icon;
          const activo = tipo === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTipo(t.id)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition",
                activo
                  ? "border-sport-orange bg-orange-50 shadow-sm ring-1 ring-sport-orange/30"
                  : "border-slate-200 bg-white hover:border-sport-orange/40 hover:shadow-sm"
              )}
            >
              <Icono className={cn("h-5 w-5", activo ? "text-sport-orange" : "text-slate-400")} />
              <span className={cn("text-sm font-semibold", activo ? "text-slate-900" : "text-slate-700")}>
                {t.label}
              </span>
              <span className="text-[11px] leading-tight text-slate-500">{t.desc}</span>
            </button>
          );
        })}
      </div>

      {/* ── Filtros de fecha (no aplica a inventario) ── */}
      {tipo !== "inventario" && (
        <div className={panel.card + " flex flex-wrap items-end gap-3 p-4"}>
          <label className="text-sm text-slate-400">
            <span className="mb-1 block text-xs">Desde</span>
            <input
              type="date"
              className={panel.input}
              value={desdeInput}
              onChange={(e) => setDesdeInput(e.target.value)}
            />
          </label>
          <label className="text-sm text-slate-400">
            <span className="mb-1 block text-xs">Hasta</span>
            <input
              type="date"
              className={panel.input}
              value={hastaInput}
              onChange={(e) => setHastaInput(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="rounded-lg bg-sport-orange px-4 py-2 text-sm font-medium text-slate-900 hover:bg-sport-orange/90"
            onClick={() => {
              let d = desdeInput;
              let h = hastaInput;
              if (d > h) [d, h] = [h, d];
              setAplicado({ desde: d, hasta: h });
            }}
          >
            Aplicar
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-300 hover:border-sport-green/30"
            onClick={() => {
              const hoy = fechaHoyLimaInput();
              setDesdeInput(fechaLimaInputConOffset(-6));
              setHastaInput(hoy);
              setAplicado({ desde: fechaLimaInputConOffset(-6), hasta: hoy });
            }}
          >
            Últimos 7 días
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-300 hover:border-sport-green/30"
            onClick={() => {
              const hoy = fechaHoyLimaInput();
              setDesdeInput(hoy);
              setHastaInput(hoy);
              setAplicado({ desde: hoy, hasta: hoy });
            }}
          >
            Solo hoy
          </button>
          {isFetching && !isLoading && (
            <span className="text-xs text-slate-500">Actualizando…</span>
          )}
          <p className="w-full text-xs text-slate-500">
            Mostrando: {aplicado.desde} → {aplicado.hasta}
            {sucursalNombre ? ` · ${sucursalNombre}` : ""}
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{getApiErrorMessage(error)}</p>}
      {isLoading && tipo !== "inventario" && <p className="text-slate-500">Cargando reporte…</p>}

      {/* ════════ VISTA PREVIA: GENERAL ════════ */}
      {tipo === "general" && finanzas && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Tarjeta label="Ingresos totales" valor={formatMoneyPEN(ingresosTotales)} destacado />
            <Tarjeta label="Gastos totales" valor={formatMoneyPEN(totalEgresos)} color="red" />
            <Tarjeta
              label={balance >= 0 ? "Balance (ganancia)" : "Balance (pérdida)"}
              valor={formatMoneyPEN(balance)}
              destacado={balance >= 0}
              color={balance < 0 ? "red" : undefined}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Tarjeta label="Cobrado reservas" valor={formatMoneyPEN(cobradoReservas)} />
            <Tarjeta label="Ventas de productos" valor={formatMoneyPEN(totalVentas)} color="blue" />
            <Tarjeta label="Reservas activas" valor={String(finanzas.reservasActivas)} />
          </div>

          <GraficoBarrasHorizontales
            titulo="Composición del período"
            barras={[
              { etiqueta: "Reservas", valor: cobradoReservas, formato: "dinero" as const, color: SPORT_CHART_COLORS[0] },
              { etiqueta: "Ventas", valor: totalVentas, formato: "dinero" as const, color: SPORT_CHART_COLORS[1] },
              { etiqueta: "Gastos", valor: totalEgresos, formato: "dinero" as const, color: SPORT_CHART_COLORS[2] },
            ]}
          />

          {resumenEgresos && resumenEgresos.porCategoria.length > 0 && (
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <h3 className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-sport-navy">
                Gastos por categoría
              </h3>
              <table className="w-full text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="px-4 py-2">Categoría</th>
                    <th className="px-4 py-2">Registros</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenEgresos.porCategoria.map((c) => (
                    <tr key={c.categoria} className="border-t border-slate-100">
                      <td className="px-4 py-2 text-slate-900">{c.categoria}</td>
                      <td className="px-4 py-2 text-slate-500">{c.cantidad}</td>
                      <td className="px-4 py-2 text-right font-medium text-red-600">
                        {formatMoneyPEN(c.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}

      {/* ════════ VISTA PREVIA: RESERVAS (financiero) ════════ */}
      {tipo === "reservas" && finanzas && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tarjeta label="Reservas activas" valor={String(finanzas.reservasActivas)} />
            <Tarjeta label="Monto reservas" valor={formatMoneyPEN(finanzas.totalMontoReservas)} />
            <Tarjeta
              label="Cobrado (confirmado)"
              valor={formatMoneyPEN(finanzas.totalCobradoConfirmado)}
              destacado
            />
            <Tarjeta label="Pendiente estimado" valor={formatMoneyPEN(finanzas.pendienteCobroEstimado)} />
          </div>

          <p className="text-xs text-slate-500">
            {finanzas.pagosConfirmados} pagos en {finanzas.reservasConAlMenosUnPago} reservas con al
            menos un cobro registrado.
          </p>

          <GraficoBarrasHorizontales
            titulo="Ingresos por medio de pago (reservas)"
            barras={(finanzas.porMedio ?? []).map((row, i) => ({
              etiqueta: row.medio,
              valor: row.monto,
              formato: "dinero" as const,
              color: SPORT_CHART_COLORS[i % SPORT_CHART_COLORS.length],
            }))}
          />

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <h3 className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-sport-navy">
              Detalle por medio de pago
            </h3>
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="px-4 py-2">Medio</th>
                  <th className="px-4 py-2">Operaciones</th>
                  <th className="px-4 py-2">Monto</th>
                </tr>
              </thead>
              <tbody>
                {(finanzas.porMedio ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-slate-500">
                      Sin pagos confirmados en el período.
                    </td>
                  </tr>
                ) : (
                  finanzas.porMedio.map((row) => (
                    <tr key={row.medio} className="border-t border-slate-100">
                      <td className="px-4 py-2 text-slate-900">{row.medio}</td>
                      <td className="px-4 py-2 text-slate-500">{row.cantidad}</td>
                      <td className="px-4 py-2 font-medium text-sport-green-soft">
                        {formatMoneyPEN(row.monto)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </>
      )}

      {/* ════════ VISTA PREVIA: VENTAS ════════ */}
      {tipo === "ventas" && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Tarjeta label="Total vendido" valor={formatMoneyPEN(totalVentas)} destacado />
            <Tarjeta label="Transacciones" valor={String(ventas.length)} color="blue" />
            <Tarjeta
              label="Ticket promedio"
              valor={formatMoneyPEN(totalVentas / (ventas.length || 1))}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <h3 className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-sport-navy">
                Ventas por medio de pago
              </h3>
              <table className="w-full text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="px-4 py-2">Medio</th>
                    <th className="px-4 py-2 text-center">Transacciones</th>
                    <th className="px-4 py-2 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasPorMedio.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-4 text-slate-500">Sin ventas en el período.</td></tr>
                  ) : (
                    ventasPorMedio.map((m) => (
                      <tr key={m.medio} className="border-t border-slate-100">
                        <td className="px-4 py-2 text-slate-900">{m.medio}</td>
                        <td className="px-4 py-2 text-center text-slate-500">{m.cantidad}</td>
                        <td className="px-4 py-2 text-right font-medium text-emerald-700">
                          {formatMoneyPEN(m.monto)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <h3 className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-sport-navy">
                Productos más vendidos
              </h3>
              <table className="w-full text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="px-4 py-2">Producto</th>
                    <th className="px-4 py-2 text-center">Unidades</th>
                    <th className="px-4 py-2 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {topProductos.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-4 text-slate-500">Sin ventas en el período.</td></tr>
                  ) : (
                    topProductos.map((p) => (
                      <tr key={p.nombre} className="border-t border-slate-100">
                        <td className="px-4 py-2 text-slate-900">{p.nombre}</td>
                        <td className="px-4 py-2 text-center text-slate-500">{p.cantidad}</td>
                        <td className="px-4 py-2 text-right font-medium text-emerald-700">
                          {formatMoneyPEN(p.monto)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          </div>
        </>
      )}

      {/* ════════ VISTA PREVIA: EGRESOS ════════ */}
      {tipo === "egresos" && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Tarjeta label="Total gastos" valor={formatMoneyPEN(totalEgresos)} color="red" />
            <Tarjeta label="Registros" valor={String(egresos.length)} />
            <Tarjeta
              label="Categoría principal"
              valor={resumenEgresos?.porCategoria[0]?.categoria ?? "—"}
            />
          </div>

          {resumenEgresos && resumenEgresos.porCategoria.length > 0 && (
            <GraficoBarrasHorizontales
              titulo="Gastos por categoría"
              barras={resumenEgresos.porCategoria.map((c, i) => ({
                etiqueta: c.categoria,
                valor: c.total,
                formato: "dinero" as const,
                color: SPORT_CHART_COLORS[i % SPORT_CHART_COLORS.length],
              }))}
            />
          )}

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <h3 className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-sport-navy">
              Detalle de gastos
            </h3>
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="px-4 py-2">Fecha</th>
                  <th className="px-4 py-2">Categoría</th>
                  <th className="px-4 py-2">Descripción</th>
                  <th className="px-4 py-2 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {egresos.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-4 text-slate-500">Sin gastos en el período.</td></tr>
                ) : (
                  egresos.map((e) => (
                    <tr key={e.id} className="border-t border-slate-100">
                      <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                        {new Date(e.fechaHora).toLocaleDateString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "2-digit" })}
                      </td>
                      <td className="px-4 py-2 text-slate-700">{e.categoria}</td>
                      <td className="px-4 py-2 text-slate-900">{e.descripcion}</td>
                      <td className="px-4 py-2 text-right font-medium text-red-600">
                        {formatMoneyPEN(e.monto)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </>
      )}

      {/* ════════ VISTA PREVIA: INVENTARIO ════════ */}
      {tipo === "inventario" && (
        <>
          <p className="text-xs text-slate-500">
            Estado actual del stock (no depende del rango de fechas).
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tarjeta label="Con control de stock" valor={String(inv.conControl.length)} color="blue" />
            <Tarjeta label="Agotados" valor={String(inv.agotados.length)} color="red" />
            <Tarjeta label="En alerta" valor={String(inv.enAlerta.length)} />
            <Tarjeta label="Valor del stock" valor={formatMoneyPEN(inv.valorizado)} destacado />
          </div>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <h3 className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-sport-navy">
              Estado del stock por producto
            </h3>
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="px-4 py-2">Producto</th>
                  <th className="px-4 py-2">Categoría</th>
                  <th className="px-4 py-2 text-center">Stock</th>
                  <th className="px-4 py-2 text-center">Alerta ≤</th>
                  <th className="px-4 py-2 text-center">Estado</th>
                  <th className="px-4 py-2 text-right">Valorizado</th>
                </tr>
              </thead>
              <tbody>
                {inv.conControl.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-slate-500">
                      Ningún producto tiene control de stock activo.
                    </td>
                  </tr>
                ) : (
                  inv.conControl.map((p) => {
                    const estado = p.stockActual === 0
                      ? { txt: "Agotado", cls: "bg-red-100 text-red-700 ring-red-300" }
                      : p.puntoAlerta != null && p.stockActual <= p.puntoAlerta
                        ? { txt: "Alerta", cls: "bg-amber-100 text-amber-700 ring-amber-300" }
                        : { txt: "OK", cls: "bg-emerald-100 text-emerald-700 ring-emerald-300" };
                    return (
                      <tr key={p.id} className="border-t border-slate-100">
                        <td className="px-4 py-2 text-slate-900">{p.nombre}</td>
                        <td className="px-4 py-2 text-slate-500">{p.categoria}</td>
                        <td className="px-4 py-2 text-center font-semibold text-slate-800">{p.stockActual}</td>
                        <td className="px-4 py-2 text-center text-slate-500">{p.puntoAlerta ?? "—"}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-semibold ring-1", estado.cls)}>
                            {estado.txt}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-slate-800">
                          {formatMoneyPEN(p.stockActual * p.precio)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </section>
        </>
      )}

      {/* ── Reportes archivados (solo financiero tiene código) ── */}
      <section className={panel.card + " p-4"}>
        <h3 className="text-sm font-medium text-slate-900">Reportes guardados (con código)</h3>
        <p className="mt-1 text-xs text-slate-500">
          Los reportes generales archivados con «Guardar reporte y PDF» incluyen reservas, ventas,
          egresos e inventario, y tienen código único en el servidor. Las descargas de vista previa
          no se almacenan.
        </p>
        {archivados.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Aún no hay reportes archivados.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {archivados.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <div>
                  <span className="font-mono text-sport-orange">{a.codigo}</span>
                  <span className="ml-2 text-slate-400">
                    {a.sucursalNombre ?? "Sede"} ·{" "}
                    {new Date(a.generadoEnUtc).toLocaleString("es-PE", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs text-sport-navy hover:underline"
                    disabled={exportando || !!eliminandoCodigo}
                    onClick={() => void exportarArchivado(a.codigo, "abrir")}
                  >
                    <Eye className="h-3.5 w-3.5" /> Ver
                  </button>
                  <button
                    type="button"
                    className="text-xs text-sport-green hover:underline"
                    disabled={exportando || !!eliminandoCodigo}
                    onClick={() => void exportarArchivado(a.codigo, "descargar")}
                  >
                    Descargar PDF
                  </button>
                  {puedeEliminar && (
                    <button
                      type="button"
                      className="text-xs text-red-400 hover:underline disabled:opacity-50"
                      disabled={exportando || eliminandoCodigo === a.codigo}
                      onClick={async () => {
                        const ok = await confirmar({
                          titulo: "Eliminar reporte archivado",
                          mensaje: `Se borrará del servidor el reporte ${a.codigo}. El PDF que tengas descargado no se elimina. ¿Continuar?`,
                          confirmarTexto: "Eliminar",
                          variante: "peligro",
                        });
                        if (!ok) return;
                        setEliminandoCodigo(a.codigo);
                        try {
                          await api.reportes.eliminarArchivado(a.codigo);
                          await qc.invalidateQueries({ queryKey: ["reportes-archivados"] });
                          notificar(`Reporte ${a.codigo} eliminado.`, "exito");
                        } catch (e) {
                          notificar(
                            getApiErrorMessage(e) || "No se pudo eliminar el reporte.",
                            "error"
                          );
                        } finally {
                          setEliminandoCodigo(null);
                        }
                      }}
                    >
                      {eliminandoCodigo === a.codigo ? "Eliminando…" : "Eliminar"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Tarjeta({
  label,
  valor,
  destacado,
  color,
}: {
  label: string;
  valor: string;
  destacado?: boolean;
  color?: "blue" | "red";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 shadow-sm shadow-black/15",
        destacado
          ? "border-sport-green/35 bg-gradient-to-br from-emerald-50 to-white"
          : color === "blue"
          ? "border-blue-200 bg-white"
          : color === "red"
          ? "border-red-200 bg-white"
          : "border-slate-200 bg-white"
      )}
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={cn(
          "mt-1 text-xl font-semibold",
          destacado
            ? "text-sport-green"
            : color === "blue"
            ? "text-blue-800"
            : color === "red"
            ? "text-red-700"
            : "text-slate-900"
        )}
      >
        {valor}
      </p>
    </div>
  );
}
