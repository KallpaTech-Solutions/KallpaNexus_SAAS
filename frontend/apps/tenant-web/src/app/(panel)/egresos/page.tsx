"use client";

import { PERMISOS_SPORT } from "@kallpanexus/types";
import { getApiErrorMessage } from "@kallpanexus/api-client";
import axios from "axios";
import { formatMoneyPEN, fechaHoyLimaInput, fechaLimaInputConOffset } from "@kallpanexus/shared";
import { useTenantApi } from "@/lib/api-context";
import { canAccess, useAuthStore } from "@/lib/auth-store";
import { useOperacionSucursal } from "@/lib/use-operacion-sucursal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { TrendingDown } from "lucide-react";
import { ConfirmacionModal } from "@/components/confirmacion-modal";

const CATEGORIAS_EGRESO = ["Servicios", "Mantenimiento", "Personal", "Limpieza", "Compras", "Otro"];

function formatFechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function EgresosPage() {
  const api      = useTenantApi();
  const qc       = useQueryClient();
  const permisos = useAuthStore((s) => s.session?.permisos ?? []);
  const { sucursalIdParaApi, sucursalActivaId } = useOperacionSucursal();

  const puedeVer      = canAccess(permisos, PERMISOS_SPORT.egresosVer);
  const puedeCrear    = canAccess(permisos, PERMISOS_SPORT.egresosCrear);
  const puedeEliminar = canAccess(permisos, PERMISOS_SPORT.egresosEliminar);

  const [desde, setDesde]           = useState(fechaLimaInputConOffset(-30));
  const [hasta, setHasta]           = useState(fechaHoyLimaInput());
  const [filtroCat, setFiltroCat]   = useState("");
  const [showForm, setShowForm]     = useState(false);
  const [categoria, setCategoria]   = useState("Servicios");
  const [descripcion, setDesc]      = useState("");
  const [monto, setMonto]           = useState("");
  const [medioPagoId, setMedioPago] = useState("");
  const [obs, setObs]               = useState("");
  const [errorMsg, setErrorMsg]     = useState("");
  const [confirmarEliminar, setConfirmarEliminar] = useState<string | null>(null);

  const { data: mediosPago = [] } = useQuery({
    queryKey: ["medios-pago"],
    queryFn: () => api.mediosPago.list(),
  });

  const { data: egresos = [], isLoading } = useQuery({
    queryKey: ["egresos", sucursalIdParaApi, desde, hasta, filtroCat],
    queryFn: () => api.egresos.list({ sucursalId: sucursalIdParaApi, desde, hasta, categoria: filtroCat || undefined }),
    enabled: puedeVer && !!sucursalIdParaApi,
  });

  const { data: resumen } = useQuery({
    queryKey: ["egresos-resumen", sucursalIdParaApi, desde, hasta],
    queryFn: () => api.egresos.resumen({ sucursalId: sucursalIdParaApi, desde, hasta }),
    enabled: puedeVer && !!sucursalIdParaApi,
  });

  const registrarMutation = useMutation({
    mutationFn: () => {
      if (!sucursalActivaId) throw new Error("Selecciona una sucursal primero.");
      if (!descripcion.trim()) throw new Error("La descripción es obligatoria.");
      const m = parseFloat(monto);
      if (isNaN(m) || m <= 0) throw new Error("El monto debe ser mayor a 0.");
      return api.egresos.registrar({
        sucursalId: sucursalActivaId,
        categoria, descripcion: descripcion.trim(), monto: m,
        medioPagoId: medioPagoId || undefined,
        observaciones: obs.trim() || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["egresos"] });
      qc.invalidateQueries({ queryKey: ["egresos-resumen"] });
      qc.invalidateQueries({ queryKey: ["egresos-hoy"] });
      setShowForm(false); setCategoria("Servicios"); setDesc(""); setMonto(""); setMedioPago(""); setObs(""); setErrorMsg("");
    },
    onError: (err) => {
      if (err instanceof Error && !axios.isAxiosError(err)) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg(getApiErrorMessage(err));
      }
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: (id: string) => api.egresos.eliminar(id),
    onSuccess: () => {
      setConfirmarEliminar(null);
      qc.invalidateQueries({ queryKey: ["egresos"] });
      qc.invalidateQueries({ queryKey: ["egresos-resumen"] });
    },
  });

  if (!puedeVer && !puedeCrear) {
    return <div className="p-8 text-slate-500">Sin permisos para ver los egresos.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Egresos / Gastos</h1>
        <p className="mt-1 text-sm text-slate-500">Registra los gastos operativos del negocio: servicios, mantenimiento, personal y más.</p>
      </div>

      {/* Filtros + acciones */}
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
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Categoría</label>
            <select value={filtroCat} onChange={(e) => setFiltroCat(e.target.value)} className="panel-input text-sm">
              <option value="">Todas</option>
              {CATEGORIAS_EGRESO.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-slate-500">Total gastos período</p>
            <p className="text-2xl font-bold text-red-600">{formatMoneyPEN(resumen?.totalGeneral ?? 0)}</p>
          </div>
          {puedeCrear && (
            <button onClick={() => setShowForm((v) => !v)} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
              {showForm ? "Cancelar" : "+ Registrar gasto"}
            </button>
          )}
        </div>
      </div>

      {/* Resumen por categoría */}
      {resumen && resumen.porCategoria.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {resumen.porCategoria.map((cat) => (
            <button
              key={cat.categoria}
              onClick={() => setFiltroCat(filtroCat === cat.categoria ? "" : cat.categoria)}
              className={`rounded-xl border p-3 text-center transition hover:border-red-300 ${filtroCat === cat.categoria ? "border-red-400 bg-red-100" : "border-slate-200 bg-white"}`}
            >
              <p className="text-xs text-slate-500">{cat.categoria}</p>
              <p className="text-sm font-bold text-red-600">{formatMoneyPEN(cat.total)}</p>
              <p className="text-xs text-slate-400">{cat.cantidad} reg.</p>
            </button>
          ))}
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
          <h3 className="font-semibold text-red-800 flex items-center gap-2">
            <TrendingDown className="h-4 w-4" /> Registrar gasto
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Categoría</label>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="panel-input text-sm">
                {CATEGORIAS_EGRESO.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Descripción *</label>
              <input value={descripcion} onChange={(e) => setDesc(e.target.value)} placeholder="Ej: Factura agua Mayo" className="panel-input text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Monto (S/) *</label>
              <input type="number" min={0} step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" className="panel-input text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Medio de pago</label>
              <select value={medioPagoId} onChange={(e) => setMedioPago(e.target.value)} className="panel-input text-sm">
                <option value="">Sin especificar</option>
                {mediosPago.filter((m) => m.activo).map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Observaciones</label>
              <input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" className="panel-input text-sm" />
            </div>
          </div>
          {errorMsg && <p className="rounded-lg bg-red-100 px-3 py-2 text-xs text-red-700">{errorMsg}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button onClick={() => registrarMutation.mutate()} disabled={registrarMutation.isPending} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {registrarMutation.isPending ? "Guardando..." : "Registrar gasto"}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : egresos.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">No hay gastos en el período seleccionado.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Categoría</th>
                <th className="px-3 py-2 text-left">Descripción</th>
                <th className="px-3 py-2 text-left">Medio</th>
                <th className="px-3 py-2 text-left">Registró</th>
                <th className="px-3 py-2 text-right">Monto</th>
                {puedeEliminar && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {egresos.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{formatFechaHora(e.fechaHora)}</td>
                  <td className="px-3 py-2">
                    <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">
                      {e.categoria}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{e.descripcion}</td>
                  <td className="px-3 py-2 text-slate-600">{e.medioPagoNombre ?? <span className="text-slate-400">—</span>}</td>
                  <td className="px-3 py-2 text-slate-500 text-xs">{e.registradoPorNombre ?? "—"}</td>
                  <td className="px-3 py-2 text-right font-bold text-red-600">{formatMoneyPEN(e.monto)}</td>
                  {puedeEliminar && (
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => setConfirmarEliminar(e.id)}
                        className="panel-link-warn text-xs"
                      >Eliminar</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmacionModal
        abierto={!!confirmarEliminar}
        titulo="Eliminar gasto"
        mensaje="¿Eliminar este registro de gasto? Esta acción no se puede deshacer."
        confirmarTexto="Sí, eliminar"
        variante="peligro"
        cargando={eliminarMutation.isPending}
        onConfirmar={() => { if (confirmarEliminar) eliminarMutation.mutate(confirmarEliminar); }}
        onCancelar={() => setConfirmarEliminar(null)}
      />
    </div>
  );
}
