"use client";

import { PERMISOS_SPORT } from "@kallpanexus/types";
import type { ReservaListItem } from "@kallpanexus/types";
import {
  formatDateTime,
  esSinTelefonoCliente,
  etiquetaHorario,
  etiquetaTelefonoCliente,
  rangoFechasLimaParaApi,
} from "@kallpanexus/shared";
import { useCiudadSucursalActiva } from "@/lib/use-ciudad-sucursal";
import { WhatsAppClienteLink } from "@/components/whatsapp-cliente-link";
import { getApiErrorMessage } from "@kallpanexus/api-client";
import { useTenantApi } from "@/lib/api-context";
import { canAccess, usePermisosSession } from "@/lib/auth-store";
import { useCanchasOperacion } from "@/lib/use-canchas-operacion";
import { AvisoElegirSedeOperacion } from "@/components/aviso-elegir-sede-operacion";
import { useOperacionSucursal } from "@/lib/use-operacion-sucursal";
import { useReservaWebListadoAlcance } from "@/lib/use-reserva-web-alcance";
import { useUiFeedback } from "@/components/ui-feedback-provider";
import {
  EstadoReservaBadge,
  ReservaCobroResumen,
} from "@/components/reserva-cobro-ui";
import {
  FiltrosReservasBar,
  rangoFechasReservasPorDefecto,
} from "@/components/filtros-reservas-bar";
import {
  agruparSolicitudesWebPendientes,
  reservaPendienteWebOcultaEnTablaPorGrupo,
} from "@/lib/agrupar-solicitudes-web";
import type { GrupoSolicitudWeb } from "@/lib/agrupar-solicitudes-web";
import { SolicitudesWebGrupoCard } from "@/components/solicitudes-web-grupo-card";
import { RegistrarPagoReservaModal } from "@/components/registrar-pago-reserva-modal";
import { panelUploadUrl } from "@/lib/tenant-media-url";
import {
  ConfirmarReservaWebModal,
  horariosTextoReservaListItem,
} from "@/components/confirmar-reserva-web-modal";
import { HoldExpiraCountdown } from "@/components/hold-expira-countdown";
import { panel } from "@/lib/panel-light";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

function invalidateReservasWeb(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["reservas"] });
  qc.invalidateQueries({ queryKey: ["reservas-web"] });
  qc.invalidateQueries({ queryKey: ["reservas-web-pendientes"] });
}

export default function ReservasWebPage() {
  const api = useTenantApi();
  const { confirmar } = useUiFeedback();
  const qc = useQueryClient();
  const permisos = usePermisosSession();
  const puedeVer = canAccess(permisos, PERMISOS_SPORT.reservasVer);
  const puedeConfirmar = canAccess(permisos, PERMISOS_SPORT.reservasCrear);
  const puedeRechazar = canAccess(permisos, PERMISOS_SPORT.reservasCancelar);
  const puedeGestionar = puedeConfirmar;
  const ciudadSede = useCiudadSucursalActiva();
  const { accesoTodas, sucursalIdParaApi, necesitaElegirSede } = useOperacionSucursal();
  const enAlcance = useReservaWebListadoAlcance();

  const rangoDefecto = useMemo(() => rangoFechasReservasPorDefecto(), []);
  const [filtroCancha, setFiltroCancha] = useState("");
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroDni, setFiltroDni] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroDesde, setFiltroDesde] = useState(rangoDefecto.desde);
  const [filtroHasta, setFiltroHasta] = useState(rangoDefecto.hasta);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmarGrupoTarget, setConfirmarGrupoTarget] = useState<GrupoSolicitudWeb | null>(
    null
  );
  const [confirmarFilaTarget, setConfirmarFilaTarget] = useState<ReservaListItem | null>(null);
  const [pagoReserva, setPagoReserva] = useState<{ id: string; monto: number } | null>(null);
  const [cancelarId, setCancelarId] = useState<string | null>(null);
  const [adelantoDevueltoAlCancelar, setAdelantoDevueltoAlCancelar] = useState(false);

  const paramsListado = useMemo(() => {
    const dni = filtroDni.replace(/\D/g, "");
    const rangoValido = filtroDesde && filtroHasta && filtroDesde <= filtroHasta;
    const apiRango = rangoValido
      ? rangoFechasLimaParaApi(filtroDesde, filtroHasta)
      : null;
    return {
      canchaId: filtroCancha || undefined,
      sucursalId: sucursalIdParaApi,
      estado: filtroEstado || undefined,
      dniCliente: dni.length >= 8 ? dni : undefined,
      desde: apiRango?.desde,
      hasta: apiRango?.hasta,
    };
  }, [
    filtroCancha,
    filtroEstado,
    filtroDni,
    filtroDesde,
    filtroHasta,
    sucursalIdParaApi,
  ]);

  const {
    data: reservasRaw = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["reservas-web", paramsListado, sucursalIdParaApi],
    queryFn: () => api.reservas.list(paramsListado),
    enabled:
      puedeVer &&
      !!(filtroDesde && filtroHasta && filtroDesde <= filtroHasta) &&
      (accesoTodas || !!sucursalIdParaApi),
  });

  const reservasWeb = useMemo(
    () =>
      reservasRaw.filter(
        (r) => r.origen === "WebPublica" && enAlcance(r.sucursalId)
      ),
    [reservasRaw, enAlcance]
  );

  const reservasFiltradas = useMemo(() => {
    const nom = filtroNombre.trim().toLowerCase();
    const dniParcial = filtroDni.replace(/\D/g, "");
    return reservasWeb.filter((r) => {
      if (nom && !r.clienteNombre.toLowerCase().includes(nom)) return false;
      if (dniParcial.length > 0 && dniParcial.length < 8 && !r.clienteDni.includes(dniParcial)) {
        return false;
      }
      return true;
    });
  }, [reservasWeb, filtroNombre, filtroDni]);

  const gruposPendientes = useMemo(
    () =>
      agruparSolicitudesWebPendientes(
        reservasWeb.filter((r) => r.estado === "Pendiente")
      ),
    [reservasWeb]
  );

  const reservasFiltradasTabla = useMemo(
    () =>
      reservasFiltradas.filter(
        (r) => !reservaPendienteWebOcultaEnTablaPorGrupo(r, gruposPendientes)
      ),
    [reservasFiltradas, gruposPendientes]
  );

  const { data: canchas = [] } = useCanchasOperacion(puedeVer);

  const { data: configuracionNegocio } = useQuery({
    queryKey: ["configuracion-negocio"],
    queryFn: () => api.configuracionNegocio.obtener(),
    enabled: puedeVer,
  });

  const confirmarGrupo = useMutation({
    mutationFn: async (ids: string[]) => {
      for (let i = 0; i < ids.length; i++) {
        await api.reservas.confirmarSolicitudWeb(ids[i]!, {
          modoCobro: "AceptarRegistrado",
        });
      }
    },
    onSuccess: () => {
      setFormError(null);
      setConfirmarGrupoTarget(null);
      setConfirmarFilaTarget(null);
      invalidateReservasWeb(qc);
    },
    onError: (e) => setFormError(getApiErrorMessage(e)),
  });

  const rechazarGrupo = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await api.reservas.rechazarSolicitudWeb(id);
      }
    },
    onSuccess: () => {
      setFormError(null);
      invalidateReservasWeb(qc);
    },
    onError: (e) => setFormError(getApiErrorMessage(e)),
  });

  const confirmarWeb = useMutation({
    mutationFn: (id: string) =>
      api.reservas.confirmarSolicitudWeb(id, { modoCobro: "AceptarRegistrado" }),
    onSuccess: () => {
      setConfirmarFilaTarget(null);
      invalidateReservasWeb(qc);
    },
    onError: (e) => setFormError(getApiErrorMessage(e)),
  });

  const rechazarWeb = useMutation({
    mutationFn: (id: string) => api.reservas.rechazarSolicitudWeb(id),
    onSuccess: () => invalidateReservasWeb(qc),
    onError: (e) => setFormError(getApiErrorMessage(e)),
  });

  const cancelar = useMutation({
    mutationFn: ({
      id,
      adelantoDevuelto,
    }: {
      id: string;
      adelantoDevuelto: boolean;
    }) => api.reservas.cancelar(id, { adelantoDevuelto }),
    onSuccess: () => {
      setCancelarId(null);
      setAdelantoDevueltoAlCancelar(false);
      invalidateReservasWeb(qc);
    },
    onError: (e) => setFormError(getApiErrorMessage(e)),
  });

  const eliminar = useMutation({
    mutationFn: (id: string) => api.reservas.eliminarPermanente(id),
    onSuccess: () => invalidateReservasWeb(qc),
    onError: (e) => setFormError(getApiErrorMessage(e)),
  });

  if (!puedeVer) {
    return <p className="text-amber-800">Sin permiso para ver reservas web.</p>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="panel-page-title">Reservas web</h1>
        <p className="panel-page-sub mt-1">
          Todas las reservas hechas desde la página pública. Confirma o rechaza las pendientes y
          revisa el voucher de Yape/Plin.
        </p>
      </header>

      {necesitaElegirSede && <AvisoElegirSedeOperacion />}

      {formError && <p className="text-sm text-red-600">{formError}</p>}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>No se pudo cargar: {getApiErrorMessage(error)}</p>
          <p className="mt-1 text-xs">
            Si menciona <code className="rounded bg-red-100 px-1">GrupoSolicitudWebId</code>, ejecuta
            el script{" "}
            <code className="rounded bg-red-100 px-1">
              KallpaNexus.Infrastructure/Scripts/fix-reserva-web-columnas.sql
            </code>{" "}
            en PostgreSQL y reinicia la API.
          </p>
        </div>
      )}

      {gruposPendientes.length > 0 && (
        <div className="space-y-3 rounded-xl border border-violet-300/40 bg-violet-50 px-4 py-3 text-sm text-violet-950">
          <p className="font-medium">
            {gruposPendientes.length} solicitud
            {gruposPendientes.length === 1 ? "" : "es"} pendiente
            {gruposPendientes.length === 1 ? "" : "s"} — confirma o rechaza
          </p>
          <ul className="space-y-2">
            {gruposPendientes.map((g) => (
              <SolicitudesWebGrupoCard
                key={g.clave}
                grupo={g}
                puedeConfirmar={puedeConfirmar}
                puedeRechazar={puedeRechazar}
                confirmando={confirmarGrupo.isPending || rechazarGrupo.isPending}
                onConfirmar={() => setConfirmarGrupoTarget(g)}
                onRechazar={async () => {
                  const ok = await confirmar({
                    titulo: "Rechazar solicitud web",
                    mensaje: "Se liberarán todos los horarios de este grupo.",
                    confirmarTexto: "Rechazar",
                    variante: "peligro",
                  });
                  if (ok) rechazarGrupo.mutate(g.reservas.map((r) => r.id));
                }}
              />
            ))}
          </ul>
        </div>
      )}

      <FiltrosReservasBar
        canchaId={filtroCancha}
        onCanchaId={setFiltroCancha}
        nombre={filtroNombre}
        onNombre={setFiltroNombre}
        dni={filtroDni}
        onDni={setFiltroDni}
        estado={filtroEstado}
        onEstado={setFiltroEstado}
        fechaDesde={filtroDesde}
        onFechaDesde={setFiltroDesde}
        fechaHasta={filtroHasta}
        onFechaHasta={setFiltroHasta}
        canchas={canchas}
        total={reservasWeb.length}
        filtrados={reservasFiltradasTabla.length}
        onLimpiar={() => {
          const d = rangoFechasReservasPorDefecto();
          setFiltroCancha("");
          setFiltroNombre("");
          setFiltroDni("");
          setFiltroEstado("");
          setFiltroDesde(d.desde);
          setFiltroHasta(d.hasta);
        }}
      />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className={panel.tableHead}>
            <tr>
              <th className="px-4 py-3">Cancha</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">{etiquetaHorario(ciudadSede)}</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Cobro</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-slate-500">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading && reservasFiltradasTabla.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No hay reservas web con estos filtros.
                </td>
              </tr>
            )}
            {reservasFiltradasTabla.map((r) => (
              <FilaReservaWeb
                key={r.id}
                reserva={r}
                configuracionNegocio={configuracionNegocio}
                puedeConfirmar={puedeConfirmar}
                puedeRechazar={puedeRechazar}
                puedeGestionar={puedeGestionar}
                confirmando={confirmarWeb.isPending}
                rechazando={rechazarWeb.isPending}
                onConfirmar={() => setConfirmarFilaTarget(r)}
                onRechazar={async () => {
                  const ok = await confirmar({
                    titulo: "Rechazar solicitud web",
                    mensaje: "El horario quedará libre para otros clientes.",
                    confirmarTexto: "Rechazar",
                    variante: "peligro",
                  });
                  if (ok) rechazarWeb.mutate(r.id);
                }}
                onCobrar={() => setPagoReserva({ id: r.id, monto: r.montoTotal })}
                onCancelar={() => {
                  setCancelarId(r.id);
                  setAdelantoDevueltoAlCancelar(false);
                }}
                onEliminar={async () => {
                  const ok = await confirmar({
                    titulo: "Eliminar reserva",
                    mensaje:
                      "Se borrará del sistema de forma permanente. Esta acción no se puede deshacer.",
                    confirmarTexto: "Eliminar",
                    variante: "peligro",
                  });
                  if (ok) eliminar.mutate(r.id);
                }}
              />
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmarReservaWebModal
        open={!!confirmarGrupoTarget}
        clienteNombre={confirmarGrupoTarget?.reservas[0]?.clienteNombre ?? ""}
        montoTotal={confirmarGrupoTarget?.montoTotal ?? 0}
        montoRegistrado={confirmarGrupoTarget?.montoPagoRegistrado}
        medioPago={confirmarGrupoTarget?.medioPago}
        voucherUrl={confirmarGrupoTarget?.voucherUrl}
        horarios={confirmarGrupoTarget?.reservas.map((r) =>
          horariosTextoReservaListItem(r.horaInicio, r.horaFin)
        )}
        confirmando={confirmarGrupo.isPending}
        onClose={() => setConfirmarGrupoTarget(null)}
        onConfirmar={() => {
          if (!confirmarGrupoTarget) return;
          confirmarGrupo.mutate(confirmarGrupoTarget.reservas.map((r) => r.id));
        }}
      />

      <ConfirmarReservaWebModal
        open={!!confirmarFilaTarget}
        clienteNombre={confirmarFilaTarget?.clienteNombre ?? ""}
        montoTotal={confirmarFilaTarget?.montoTotal ?? 0}
        montoRegistrado={
          confirmarFilaTarget?.montoAdelantoWebGrupoPendiente ??
          confirmarFilaTarget?.montoPagoWebPendiente
        }
        medioPago={confirmarFilaTarget?.medioPagoWebPendiente}
        voucherUrl={confirmarFilaTarget?.voucherWebPendiente}
        horarios={
          confirmarFilaTarget
            ? [
                horariosTextoReservaListItem(
                  confirmarFilaTarget.horaInicio,
                  confirmarFilaTarget.horaFin
                ),
              ]
            : undefined
        }
        confirmando={confirmarWeb.isPending}
        onClose={() => setConfirmarFilaTarget(null)}
        onConfirmar={() => {
          if (!confirmarFilaTarget) return;
          confirmarWeb.mutate(confirmarFilaTarget.id);
        }}
      />

      {pagoReserva && (
        <RegistrarPagoReservaModal
          reservaId={pagoReserva.id}
          montoReserva={pagoReserva.monto}
          onClose={() => {
            setPagoReserva(null);
            invalidateReservasWeb(qc);
          }}
        />
      )}

      {cancelarId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-medium text-slate-900">Cancelar reserva</h3>
            <p className="mt-2 text-sm text-slate-600">
              El horario quedará libre. El registro se conserva para reportes.
            </p>
            <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 rounded border-slate-400"
                checked={adelantoDevueltoAlCancelar}
                onChange={(e) => setAdelantoDevueltoAlCancelar(e.target.checked)}
              />
              Se devolvió el adelanto / dinero al cliente
            </label>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
                disabled={cancelar.isPending}
                onClick={() =>
                  cancelar.mutate({
                    id: cancelarId,
                    adelantoDevuelto: adelantoDevueltoAlCancelar,
                  })
                }
              >
                Confirmar cancelación
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setCancelarId(null)}
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilaReservaWeb({
  reserva: r,
  configuracionNegocio,
  puedeConfirmar,
  puedeRechazar,
  puedeGestionar,
  confirmando,
  rechazando,
  onConfirmar,
  onRechazar,
  onCobrar,
  onCancelar,
  onEliminar,
}: {
  reserva: ReservaListItem;
  configuracionNegocio: unknown;
  puedeConfirmar: boolean;
  puedeRechazar: boolean;
  puedeGestionar: boolean;
  confirmando: boolean;
  rechazando: boolean;
  onConfirmar: () => void;
  onRechazar: () => void | Promise<void>;
  onCobrar: () => void;
  onCancelar: () => void;
  onEliminar: () => void | Promise<void>;
}) {
  const voucherUrl = r.voucherWebPendiente?.trim();

  return (
    <tr className={panel.tableRow}>
      <td className="px-4 py-3 font-medium text-slate-900">{r.nombreCancha}</td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center">
          <span>
            {r.clienteNombre}
            <span className="block text-xs text-slate-500">
              {r.clienteDni}
              {!esSinTelefonoCliente(r.clienteTelefono) && r.clienteTelefono?.trim() && (
                <span className="ml-2 text-slate-400">
                  · {etiquetaTelefonoCliente(r.clienteTelefono)}
                </span>
              )}
            </span>
          </span>
          <WhatsAppClienteLink reserva={r} configuracion={configuracionNegocio} />
        </span>
      </td>
      <td className="px-4 py-3 text-slate-800">
        {formatDateTime(r.horaInicio)} – {formatDateTime(r.horaFin)}
      </td>
      <td className="px-4 py-3">
        <EstadoReservaBadge reserva={r} />
        {r.estado === "Pendiente" && (
          <>
            <HoldExpiraCountdown expiraEnUtc={r.holdExpiraEnUtc} className="mt-1" />
            <span className="mt-0.5 block text-[10px] font-medium text-violet-700">
              Espera confirmación
              {(r.cantidadProductosWeb ?? 0) > 0 && ` · ${r.cantidadProductosWeb} producto(s)`}
            </span>
          </>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="min-w-[7.5rem] text-xs">
          <ReservaCobroResumen reserva={r} />
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex min-w-[8rem] flex-wrap gap-2 text-xs">
          {r.estado === "Pendiente" && puedeConfirmar && (
            <button
              type="button"
              className="rounded-md bg-emerald-600 px-2 py-1 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              disabled={confirmando}
              onClick={onConfirmar}
            >
              Confirmar
            </button>
          )}
          {r.estado === "Pendiente" && puedeRechazar && (
            <button
              type="button"
              className="rounded-md border border-red-400/50 px-2 py-1 text-red-700 hover:bg-red-50 disabled:opacity-50"
              disabled={rechazando}
              onClick={() => void onRechazar()}
            >
              Rechazar
            </button>
          )}
          {voucherUrl && (
            <Link
              href={panelUploadUrl(voucherUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-violet-400/60 px-2 py-1 font-medium text-violet-900 hover:bg-violet-50"
            >
              Ver voucher
            </Link>
          )}
          {puedeGestionar && r.estado !== "Cancelada" && (
            <button type="button" className="panel-link-cobrar" onClick={onCobrar}>
              Cobrar
            </button>
          )}
          {puedeGestionar && (
            <Link href="/reservas" className="panel-link-edit">
              Editar
            </Link>
          )}
          {puedeRechazar && r.estado !== "Cancelada" && (
            <button type="button" className="panel-link-warn" onClick={onCancelar}>
              Cancelar
            </button>
          )}
          {puedeRechazar && (
            <button
              type="button"
              className="panel-link-danger"
              onClick={() => void onEliminar()}
            >
              Eliminar
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
