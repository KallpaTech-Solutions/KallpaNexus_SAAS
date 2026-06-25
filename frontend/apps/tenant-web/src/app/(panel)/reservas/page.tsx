"use client";

import { PERMISOS_SPORT } from "@kallpanexus/types";
import type { ReservaListItem } from "@kallpanexus/types";
import {
  formatDateTime,
  formatMoneyPEN,
  parseApiDateTime,
  splitDateTimeLocalValue,
  toApiDateTimeLocal,
  toReservaFechaHoraFromIso,
  joinDateTimeLocalValue,
  esSinTelefonoCliente,
  soloDigitosTelefono,
  telefonoClienteParaApi,
  telefonoClienteValidoParaGuardar,
  etiquetaTelefonoCliente,
  documentoClienteListoParaBuscar,
  esDniClienteVarios,
  etiquetaFechaHora,
  etiquetaHorario,
  rangoFechasLimaParaApi,
  sufijoCiudadParentesis,
} from "@kallpanexus/shared";
import { useCiudadSucursalActiva } from "@/lib/use-ciudad-sucursal";
import { RegistrarPagoReservaModal } from "@/components/registrar-pago-reserva-modal";
import { WhatsAppClienteLink } from "@/components/whatsapp-cliente-link";
import { ReservaFechaHora } from "@/components/reserva-fecha-hora";
import { getApiErrorMessage } from "@kallpanexus/api-client";
import { useTenantApi } from "@/lib/api-context";
import { canAccess, useAuthStore } from "@/lib/auth-store";
import { useCanchasOperacion } from "@/lib/use-canchas-operacion";
import { AvisoElegirSedeOperacion } from "@/components/aviso-elegir-sede-operacion";
import { useOperacionSucursal } from "@/lib/use-operacion-sucursal";
import { useReservasWebPendientes } from "@/lib/use-reservas-web-pendientes";
import { consultarDniParaFormulario } from "@/lib/consulta-dni";
import { CampoFormulario, inputClass } from "@/components/campo-formulario";
import { useUiFeedback } from "@/components/ui-feedback-provider";
import {
  ConfirmarReservaWebModal,
  horariosTextoReservaListItem,
} from "@/components/confirmar-reserva-web-modal";
import {
  agruparSolicitudesWebPendientes,
  reservaPendienteWebOcultaEnTablaPorGrupo,
} from "@/lib/agrupar-solicitudes-web";
import {
  EstadoReservaBadge,
  ReservaCobroResumen,
} from "@/components/reserva-cobro-ui";
import { PanelSeccionColapsable } from "@/components/panel-seccion-colapsable";
import {
  FiltrosReservasBar,
  rangoFechasReservasPorDefecto,
} from "@/components/filtros-reservas-bar";
import { panel } from "@/lib/panel-light";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

function invalidateReservas(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["reservas"] });
  qc.invalidateQueries({ queryKey: ["reservas-hoy"] });
  qc.invalidateQueries({ queryKey: ["reservas-semana"] });
  qc.invalidateQueries({ queryKey: ["disponibilidad"] });
  qc.invalidateQueries({ queryKey: ["reservas-web-pendientes"] });
}

export default function ReservasPage() {
  const api = useTenantApi();
  const { confirmar } = useUiFeedback();
  const qc = useQueryClient();
  const permisos = useAuthStore((s) => s.session?.permisos ?? []);
  const puedeVer = canAccess(permisos, PERMISOS_SPORT.reservasVer);
  const puedeCrear = canAccess(permisos, PERMISOS_SPORT.reservasCrear);
  const puedeCancelar = canAccess(permisos, PERMISOS_SPORT.reservasCancelar);
  const ciudadSede = useCiudadSucursalActiva();
  const { accesoTodas, sucursalIdParaApi, reservaEnAlcance } = useOperacionSucursal();
  const { totalGrupos: totalGruposWebPendientesGlobal } = useReservasWebPendientes();

  const rangoDefecto = useMemo(() => rangoFechasReservasPorDefecto(), []);
  const [filtroCancha, setFiltroCancha] = useState("");
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroDni, setFiltroDni] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroDesde, setFiltroDesde] = useState(rangoDefecto.desde);
  const [filtroHasta, setFiltroHasta] = useState(rangoDefecto.hasta);

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

  const { data: reservas = [], isLoading } = useQuery({
    queryKey: ["reservas", paramsListado, sucursalIdParaApi],
    queryFn: () => api.reservas.list(paramsListado),
    enabled:
      puedeVer &&
      !!(filtroDesde && filtroHasta && filtroDesde <= filtroHasta) &&
      (accesoTodas || !!sucursalIdParaApi),
  });

  const reservasEnSede = useMemo(
    () => reservas.filter((r) => reservaEnAlcance(r.sucursalId)),
    [reservas, reservaEnAlcance]
  );

  const solicitudesWebPendientes = useMemo(
    () =>
      reservasEnSede.filter(
        (r) => r.origen === "WebPublica" && r.estado === "Pendiente"
      ),
    [reservasEnSede]
  );

  const gruposWebPendientes = useMemo(
    () => agruparSolicitudesWebPendientes(solicitudesWebPendientes),
    [solicitudesWebPendientes]
  );

  const { data: canchas = [] } = useCanchasOperacion(puedeVer);

  const canchasSucursal = useMemo(
    () => canchas.filter((c) => c.estaActiva),
    [canchas]
  );

  const { data: configuracionNegocio } = useQuery({
    queryKey: ["configuracion-negocio"],
    queryFn: () => api.configuracionNegocio.obtener(),
    enabled: puedeVer,
  });

  const [editId, setEditId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [buscandoDni, setBuscandoDni] = useState(false);
  const [clienteDesbloqueado, setClienteDesbloqueado] = useState(false);

  const [form, setForm] = useState({
    canchaId: "",
    dniCliente: "",
    nombreCompletoCliente: "",
    telefonoCliente: "",
    sinTelefonoCliente: false,
    registrarPagoAhora: false,
    medioPagoId: "",
    montoPagoAhora: "",
    horaInicio: "",
    duracionHoras: 1,
    montoCobrado: "",
    montoManual: false,
    estadoCobro: "Pendiente" as "Pendiente" | "Confirmada",
  });

  const [pagoReserva, setPagoReserva] = useState<{
    id: string;
    monto: number;
  } | null>(null);
  const [confirmarWebTarget, setConfirmarWebTarget] = useState<ReservaListItem | null>(
    null
  );
  const [cancelarId, setCancelarId] = useState<string | null>(null);
  const [adelantoDevueltoAlCancelar, setAdelantoDevueltoAlCancelar] = useState(false);
  const [nuevaAbierta, setNuevaAbierta] = useState(false);

  const dniListo = documentoClienteListoParaBuscar(form.dniCliente);

  const cancelacionesPorDni = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of reservasEnSede) {
      if (r.estado === "Cancelada") {
        m.set(r.clienteDni, (m.get(r.clienteDni) ?? 0) + 1);
      }
    }
    return m;
  }, [reservasEnSede]);

  const reservasFiltradas = useMemo(() => {
    const nom = filtroNombre.trim().toLowerCase();
    const dniParcial = filtroDni.replace(/\D/g, "");
    return reservasEnSede.filter((r) => {
      if (nom && !r.clienteNombre.toLowerCase().includes(nom)) return false;
      if (dniParcial.length > 0 && dniParcial.length < 8 && !r.clienteDni.includes(dniParcial)) {
        return false;
      }
      return true;
    });
  }, [reservasEnSede, filtroNombre, filtroDni]);

  const reservasFiltradasTabla = useMemo(
    () =>
      reservasFiltradas.filter(
        (r) => !reservaPendienteWebOcultaEnTablaPorGrupo(r, gruposWebPendientes)
      ),
    [reservasFiltradas, gruposWebPendientes]
  );

  async function buscarDatosDni() {
    if (!dniListo) return;
    setBuscandoDni(true);
    const r = await consultarDniParaFormulario(api, form.dniCliente.trim());
    setBuscandoDni(false);
    if (!r.ok) {
      setFormError(r.mensaje);
      return;
    }
    setFormError(null);
    setClienteDesbloqueado(true);
    setForm((f) => ({
      ...f,
      nombreCompletoCliente: r.data.fullName || f.nombreCompletoCliente,
      telefonoCliente: r.data.telefono ?? f.telefonoCliente,
    }));
  }

  const duracionHorasEntera = Math.max(
    1,
    Math.floor(Number(form.duracionHoras)) || 1
  );

  const puedeCotizar =
    clienteDesbloqueado &&
    !!form.canchaId &&
    !!splitDateTimeLocalValue(form.horaInicio).fecha &&
    duracionHorasEntera >= 1;

  const { data: cotizacion, error: cotizarError, isFetching: cotizando } = useQuery({
    queryKey: [
      "cotizar-reserva",
      form.canchaId,
      form.horaInicio,
      duracionHorasEntera,
    ],
    queryFn: () =>
      api.reservas.cotizar({
        canchaId: form.canchaId,
        horaInicio: toApiDateTimeLocal(form.horaInicio),
        duracionHoras: duracionHorasEntera,
      }),
    enabled: puedeCotizar && !form.montoManual,
  });

  const formularioCompleto =
    clienteDesbloqueado &&
    !!form.canchaId &&
    form.nombreCompletoCliente.trim().length > 0 &&
    telefonoClienteValidoParaGuardar(
      form.telefonoCliente,
      form.sinTelefonoCliente
    ) &&
    !!form.horaInicio &&
    duracionHorasEntera >= 1 &&
    (form.montoManual
      ? form.montoCobrado !== "" && !Number.isNaN(Number(form.montoCobrado))
      : !!cotizacion && !cotizarError);

  const [edit, setEdit] = useState({
    horaInicio: "",
    duracionHoras: 1,
    nombreCompletoCliente: "",
    telefonoCliente: "",
    sinTelefonoCliente: false,
    montoCobrado: "",
    estado: "Pendiente",
  });

  const { data: mediosPago = [] } = useQuery({
    queryKey: ["medios-pago"],
    queryFn: () => api.mediosPago.list(),
    enabled: puedeCrear,
  });
  const mediosActivos = useMemo(
    () => mediosPago.filter((m) => m.activo),
    [mediosPago]
  );

  const crear = useMutation({
    mutationFn: async () => {
      const dniEnvio = esDniClienteVarios(form.dniCliente)
        ? "123"
        : form.dniCliente.replace(/\D/g, "");
      const data = await api.reservas.crear({
        canchaId: form.canchaId,
        dniCliente: dniEnvio,
        nombreCompletoCliente: form.nombreCompletoCliente,
        ...telefonoClienteParaApi(form.telefonoCliente, form.sinTelefonoCliente),
        horaInicio: toApiDateTimeLocal(form.horaInicio),
        duracionHoras: duracionHorasEntera,
        montoTotalCobrado: form.montoManual ? Number(form.montoCobrado) : undefined,
        estado: form.estadoCobro,
      });
      const reservaId =
        (data as { reservaId?: string; ReservaId?: string }).reservaId ??
        (data as { ReservaId?: string }).ReservaId;
      const montoPago = Number(form.montoPagoAhora);
      if (
        form.registrarPagoAhora &&
        reservaId &&
        form.medioPagoId &&
        montoPago > 0
      ) {
        await api.pagosReserva.registrar(reservaId, {
          medioPagoId: form.medioPagoId,
          monto: montoPago,
          registradoSinVoucher: true,
        });
      }
      return data;
    },
    onSuccess: () => {
      setFormError(null);
      setClienteDesbloqueado(false);
      setNuevaAbierta(false);
      setForm({
        canchaId: "",
        dniCliente: "",
        nombreCompletoCliente: "",
        telefonoCliente: "",
        sinTelefonoCliente: false,
        registrarPagoAhora: false,
        medioPagoId: "",
        montoPagoAhora: "",
        horaInicio: "",
        duracionHoras: 1,
        montoCobrado: "",
        montoManual: false,
        estadoCobro: "Pendiente",
      });
      invalidateReservas(qc);
    },
    onError: (err) => setFormError(getApiErrorMessage(err)),
  });

  const guardarEdicion = useMutation({
    mutationFn: () => {
      if (!editId) throw new Error("Sin reserva");
      return api.reservas.actualizar(editId, {
        horaInicio: toApiDateTimeLocal(edit.horaInicio),
        duracionHoras: edit.duracionHoras,
        nombreCompletoCliente: edit.nombreCompletoCliente,
        ...telefonoClienteParaApi(edit.telefonoCliente, edit.sinTelefonoCliente),
        estado: edit.estado,
        montoTotalCobrado: edit.montoCobrado
          ? Number(edit.montoCobrado)
          : undefined,
      });
    },
    onSuccess: () => {
      setFormError(null);
      setEditId(null);
      invalidateReservas(qc);
    },
    onError: (err) => setFormError(getApiErrorMessage(err)),
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
      invalidateReservas(qc);
    },
  });

  const eliminar = useMutation({
    mutationFn: (id: string) => api.reservas.eliminarPermanente(id),
    onSuccess: () => invalidateReservas(qc),
  });

  const confirmarWeb = useMutation({
    mutationFn: (id: string) =>
      api.reservas.confirmarSolicitudWeb(id, { modoCobro: "AceptarRegistrado" }),
    onSuccess: () => {
      setConfirmarWebTarget(null);
      invalidateReservas(qc);
    },
    onError: (e) => setFormError(getApiErrorMessage(e)),
  });

  const rechazarWeb = useMutation({
    mutationFn: (id: string) => api.reservas.rechazarSolicitudWeb(id),
    onSuccess: () => invalidateReservas(qc),
    onError: (e) => setFormError(getApiErrorMessage(e)),
  });

  function abrirEditar(r: ReservaListItem) {
    const { fecha, hora } = toReservaFechaHoraFromIso(r.horaInicio);
    const inicio = joinDateTimeLocalValue(fecha, hora);
    const start = parseApiDateTime(r.horaInicio);
    const end = parseApiDateTime(r.horaFin);
    const dur = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (3600 * 1000))
    );
    setEditId(r.id);
    setEdit({
      horaInicio: inicio,
      duracionHoras: dur,
      nombreCompletoCliente: r.clienteNombre,
      telefonoCliente: esSinTelefonoCliente(r.clienteTelefono)
        ? ""
        : soloDigitosTelefono(r.clienteTelefono),
      sinTelefonoCliente: esSinTelefonoCliente(r.clienteTelefono),
      montoCobrado: String(r.montoTotal),
      estado: r.estado,
    });
    setFormError(null);
    setNuevaAbierta(false);
  }

  if (!puedeVer) {
    return <NoPermiso codigo={PERMISOS_SPORT.reservasVer} />;
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className={panel.heading}>Reservas</h2>
        <p className={panel.subheading}>
          {ciudadSede
            ? `Horario local (${ciudadSede}).`
            : "Horario según la sede activa."}{" "}
          Puedes ajustar el monto cobrado (clientes frecuentes).
        </p>
      </header>

      <AvisoElegirSedeOperacion />

      {puedeCrear && (
        <PanelSeccionColapsable
          titulo="Nueva reserva"
          descripcion="DNI y Buscar → completa datos → crear (despliega para empezar)"
          variante="acento"
          abierto={nuevaAbierta}
          onAlternar={() => setNuevaAbierta((v) => !v)}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <CampoFormulario label="DNI del cliente" className="sm:col-span-2">
              <div className="flex gap-2">
                <input
                  className={inputClass + " min-w-0 flex-1"}
                  value={form.dniCliente}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, dniCliente: e.target.value }));
                    setClienteDesbloqueado(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && dniListo && !buscandoDni) {
                      e.preventDefault();
                      void buscarDatosDni();
                    }
                  }}
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="8 dígitos o 123 (varios)"
                />
                <button
                  type="button"
                  className="h-10 shrink-0 rounded-lg border-2 border-sport-orange px-4 text-sm font-medium text-sport-orange transition enabled:hover:bg-sport-orange/10 disabled:border-white/10 disabled:text-slate-600"
                  disabled={buscandoDni || !dniListo}
                  onClick={() => buscarDatosDni()}
                >
                  {buscandoDni ? "…" : "Buscar"}
                </button>
              </div>
            </CampoFormulario>

            {!clienteDesbloqueado && formError && !editId && (
              <p className="text-sm text-red-300 sm:col-span-2 lg:col-span-4">
                {formError}
                <button
                  type="button"
                  className="mt-2 block text-xs text-sport-green underline"
                  onClick={() => {
                    setClienteDesbloqueado(true);
                    setFormError(null);
                  }}
                >
                  Completar datos manualmente
                </button>
              </p>
            )}

            <CampoFormulario label="Cancha" disabled={!clienteDesbloqueado}>
              <select
                className={inputClass}
                value={form.canchaId}
                onChange={(e) => setForm((f) => ({ ...f, canchaId: e.target.value }))}
              >
                <option value="">Elegir cancha…</option>
                {canchasSucursal.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </CampoFormulario>

            <CampoFormulario label="Nombre" disabled={!clienteDesbloqueado}>
              <input
                className={inputClass}
                value={form.nombreCompletoCliente}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nombreCompletoCliente: e.target.value }))
                }
              />
            </CampoFormulario>

            <CampoFormulario
              label="Celular (WhatsApp)"
              hint="9 dígitos para avisos de pago. En mostrador puedes marcar SN si no hay número."
              disabled={!clienteDesbloqueado}
            >
              <div className="flex flex-col gap-2">
                <input
                  className={inputClass}
                  inputMode="numeric"
                  maxLength={9}
                  placeholder="987654321"
                  value={form.telefonoCliente}
                  disabled={form.sinTelefonoCliente}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      telefonoCliente: soloDigitosTelefono(e.target.value),
                      sinTelefonoCliente: false,
                    }))
                  }
                />
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
                  <input
                    type="checkbox"
                    checked={form.sinTelefonoCliente}
                    disabled={!clienteDesbloqueado}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        sinTelefonoCliente: e.target.checked,
                        telefonoCliente: e.target.checked ? "" : f.telefonoCliente,
                      }))
                    }
                  />
                  Sin celular (SN) — solo personal en mostrador
                </label>
              </div>
            </CampoFormulario>

            <CampoFormulario
              label={etiquetaFechaHora(ciudadSede)}
              className="sm:col-span-2"
              disabled={!clienteDesbloqueado}
            >
              <ReservaFechaHora
                value={form.horaInicio}
                onChange={(horaInicio) => setForm((f) => ({ ...f, horaInicio }))}
              />
            </CampoFormulario>

            <CampoFormulario
              label="Cantidad de horas"
              hint="Duración de la reserva."
              disabled={!clienteDesbloqueado}
            >
              <input
                type="number"
                min={1}
                max={24}
                step={1}
                className={inputClass}
                value={duracionHorasEntera}
                onChange={(e) => {
                  const v = Number.parseInt(e.target.value.replace(/\D/g, ""), 10);
                  setForm((f) => ({
                    ...f,
                    duracionHoras: Number.isFinite(v) && v >= 1 ? v : 1,
                  }));
                }}
              />
            </CampoFormulario>

            <CampoFormulario
              label="Monto a cobrar"
              className="sm:col-span-2"
              disabled={!clienteDesbloqueado}
            >
              <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  className="rounded border-slate-600"
                  checked={form.montoManual}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      montoManual: e.target.checked,
                      montoCobrado: e.target.checked ? f.montoCobrado : "",
                    }))
                  }
                />
                Ingresar monto manualmente (descuento u otro valor)
              </label>
              {form.montoManual ? (
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputClass}
                  value={form.montoCobrado}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, montoCobrado: e.target.value }))
                  }
                  placeholder="0.00"
                />
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                  {cotizando && !cotizarError && (
                    <p className="text-sm text-slate-400">Calculando por tarifas…</p>
                  )}
                  {!cotizando && cotizacion && (
                    <>
                      <p className="text-lg font-semibold text-sport-green-soft">
                        {formatMoneyPEN(cotizacion.montoTotal)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {cotizacion.detalle
                          .map(
                            (d) =>
                              `${String(d.horaLocal).padStart(2, "0")}:00 ${d.tarifaNombre} (${formatMoneyPEN(d.precioPorHora)})`
                          )
                          .join(" · ")}
                      </p>
                    </>
                  )}
                  {!cotizando && cotizarError && puedeCotizar && (
                    <p className="text-sm text-amber-300">
                      {getApiErrorMessage(cotizarError)} Activa «monto manual» o revisa
                      tarifas de la cancha.
                    </p>
                  )}
                  {!puedeCotizar && (
                    <p className="text-sm text-slate-500">
                      Elige cancha, fecha/hora y horas para calcular.
                    </p>
                  )}
                </div>
              )}
            </CampoFormulario>

            <CampoFormulario
              label="Estado del cobro"
              hint="Pendiente = apartado; Confirmada = cobro cubierto o validado."
              disabled={!clienteDesbloqueado}
            >
              <select
                className={inputClass}
                value={form.estadoCobro}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    estadoCobro: e.target.value as "Pendiente" | "Confirmada",
                  }))
                }
              >
                <option value="Pendiente">Pendiente de pago</option>
                <option value="Confirmada">Confirmada / ya pagó</option>
              </select>
            </CampoFormulario>

            {clienteDesbloqueado && (
              <CampoFormulario
                label="Cobro ahora (opcional)"
                className="sm:col-span-2 lg:col-span-4"
                hint="Yape/adelanto o pago en caja al crear. El voucher de clientes web irá en la página pública."
              >
                <label className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                  <input
                    type="checkbox"
                    checked={form.registrarPagoAhora}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        registrarPagoAhora: e.target.checked,
                        medioPagoId:
                          f.medioPagoId ||
                          mediosActivos[0]?.id ||
                          "",
                      }))
                    }
                  />
                  Registrar medio y monto al guardar
                </label>
                {form.registrarPagoAhora && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      className={inputClass}
                      value={form.medioPagoId}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, medioPagoId: e.target.value }))
                      }
                    >
                      <option value="">Medio de pago…</option>
                      {mediosActivos.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className={inputClass}
                      placeholder="Monto (adelanto o total)"
                      value={form.montoPagoAhora}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, montoPagoAhora: e.target.value }))
                      }
                    />
                  </div>
                )}
              </CampoFormulario>
            )}
          </div>

          {clienteDesbloqueado &&
            (cancelacionesPorDni.get(form.dniCliente.replace(/\D/g, "")) ?? 0) >= 2 && (
              <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900">
                Este DNI tiene varias reservas canceladas. Conviene pedir anticipo o
                confirmar antes de apartar la cancha.
              </p>
            )}

          {formError && !editId && clienteDesbloqueado && (
            <p className="mt-2 text-sm text-red-300">{formError}</p>
          )}

          <button
            type="button"
            className={`mt-4 h-10 rounded-lg px-5 text-sm font-semibold transition ${
              formularioCompleto
                ? "bg-sport-green text-sport-navy-deep shadow-[0_0_22px_rgba(16,185,129,0.45)] ring-2 ring-sport-green-soft/80 hover:bg-sport-green-soft"
                : "cursor-not-allowed bg-sport-navy text-slate-500"
            }`}
            onClick={() => crear.mutate()}
            disabled={crear.isPending || !formularioCompleto}
          >
            Crear reserva
          </button>
        </PanelSeccionColapsable>
      )}

      {editId && puedeCrear && (
        <PanelSeccionColapsable
          titulo="Editar reserva"
          descripcion="Cambios de horario, cliente, monto y estado"
          variante="acento"
          abierto
          onAlternar={() => setEditId(null)}
          badge={
            <span className="rounded-md bg-sport-navy px-2 py-0.5 text-[10px] text-sport-orange">
              en edición
            </span>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ReservaFechaHora
              value={edit.horaInicio}
              onChange={(horaInicio) => setEdit((x) => ({ ...x, horaInicio }))}
            />
            <input
              type="number"
              min={1}
              className={panel.input + " text-sm"}
              value={edit.duracionHoras}
              onChange={(e) =>
                setEdit((x) => ({ ...x, duracionHoras: Number(e.target.value) }))
              }
            />
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="Monto cobrado"
              className={panel.input + " text-sm"}
              value={edit.montoCobrado}
              onChange={(e) => setEdit((x) => ({ ...x, montoCobrado: e.target.value }))}
            />
            <input
              className={panel.input + " text-sm"}
              value={edit.nombreCompletoCliente}
              onChange={(e) =>
                setEdit((x) => ({ ...x, nombreCompletoCliente: e.target.value }))
              }
            />
            <div className="flex flex-col gap-1">
              <input
                className={panel.input + " text-sm"}
                inputMode="numeric"
                maxLength={9}
                placeholder="Celular 9 dígitos"
                value={edit.telefonoCliente}
                disabled={edit.sinTelefonoCliente}
                onChange={(e) =>
                  setEdit((x) => ({
                    ...x,
                    telefonoCliente: soloDigitosTelefono(e.target.value),
                    sinTelefonoCliente: false,
                  }))
                }
              />
              <label className="flex items-center gap-2 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={edit.sinTelefonoCliente}
                  onChange={(e) =>
                    setEdit((x) => ({
                      ...x,
                      sinTelefonoCliente: e.target.checked,
                      telefonoCliente: e.target.checked ? "" : x.telefonoCliente,
                    }))
                  }
                />
                SN (mostrador)
              </label>
            </div>
            <select
              className={panel.input + " text-sm"}
              value={edit.estado}
              onChange={(e) => setEdit((x) => ({ ...x, estado: e.target.value }))}
            >
              <option value="Pendiente">Pendiente</option>
              <option value="Confirmada">Confirmada</option>
              <option value="Completada">Completada</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Fecha y hora en punto{sufijoCiudadParentesis(ciudadSede)}. El monto guardado no cambia
            si modificas tarifas del catálogo; solo si lo editas aquí.
          </p>
          {formError && editId && (
            <p className="mt-2 text-sm text-red-300">{formError}</p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded-lg bg-sport-orange px-4 py-2 text-sm font-medium text-slate-900 hover:bg-sport-orange/90"
              onClick={() => guardarEdicion.mutate()}
              disabled={
                guardarEdicion.isPending ||
                !telefonoClienteValidoParaGuardar(
                  edit.telefonoCliente,
                  edit.sinTelefonoCliente
                )
              }
            >
              Guardar cambios
            </button>
            <button
              type="button"
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 hover:border-sport-green/30"
              onClick={() => setEditId(null)}
            >
              Cerrar
            </button>
          </div>
        </PanelSeccionColapsable>
      )}

      {totalGruposWebPendientesGlobal > 0 && (
        <div className="mb-4 rounded-xl border border-violet-200/80 bg-violet-50/80 px-4 py-2 text-sm text-violet-900">
          Tienes {totalGruposWebPendientesGlobal} solicitud
          {totalGruposWebPendientesGlobal === 1 ? "" : "es"} web pendiente
          {totalGruposWebPendientesGlobal === 1 ? "" : "s"} (todas las sedes).{" "}
          <Link href="/reservas-web" className="font-semibold underline">
            Ver en Reservas web
          </Link>
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
        total={reservasEnSede.length}
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
                  No hay reservas con estos filtros.
                </td>
              </tr>
            )}
            {reservasFiltradasTabla.map((r) => (
              <tr key={r.id} className={panel.tableRow}>
                <td className="px-4 py-3 font-medium text-slate-900">{r.nombreCancha}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center">
                    <span>
                      {r.clienteNombre}
                      <span className="block text-xs text-slate-500">
                        {r.clienteDni}
                        {esSinTelefonoCliente(r.clienteTelefono) ? (
                          <span className="ml-2 font-medium text-amber-800">
                            · Falta celular (edite la reserva)
                          </span>
                        ) : (
                          r.clienteTelefono?.trim() && (
                            <span className="ml-2 text-slate-400">
                              · {etiquetaTelefonoCliente(r.clienteTelefono)}
                            </span>
                          )
                        )}
                      </span>
                    </span>
                    <WhatsAppClienteLink
                      reserva={r}
                      configuracion={configuracionNegocio}
                    />
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-800">
                  {formatDateTime(r.horaInicio)} – {formatDateTime(r.horaFin)}
                </td>
                <td className="px-4 py-3">
                  <EstadoReservaBadge reserva={r} />
                  {r.origen === "WebPublica" && r.estado === "Pendiente" && (
                    <span className="mt-0.5 block text-[10px] font-medium text-violet-700">
                      Solicitud web
                      {(r.cantidadProductosWeb ?? 0) > 0 &&
                        ` · ${r.cantidadProductosWeb} producto(s)`}
                    </span>
                  )}
                  {r.estado === "Cancelada" && r.adelantoDevuelto === true && (
                    <span className="mt-0.5 block text-[10px] text-slate-400">
                      Adelanto devuelto
                    </span>
                  )}
                  {(cancelacionesPorDni.get(r.clienteDni) ?? 0) >= 2 &&
                    r.estado !== "Cancelada" && (
                      <span className="mt-0.5 block text-[10px] font-medium text-amber-800">
                        {cancelacionesPorDni.get(r.clienteDni)} cancelaciones previas
                      </span>
                    )}
                </td>
                <td className="px-4 py-3">
                  <div className="min-w-[7.5rem] text-xs">
                    <ReservaCobroResumen reserva={r} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2 text-xs">
                    {r.origen === "WebPublica" &&
                      r.estado === "Pendiente" &&
                      puedeCrear && (
                        <button
                          type="button"
                          className="rounded-md bg-emerald-600 px-2 py-1 font-medium text-white hover:bg-emerald-500"
                          disabled={confirmarWeb.isPending}
                          onClick={() => setConfirmarWebTarget(r)}
                        >
                          Confirmar
                        </button>
                      )}
                    {r.origen === "WebPublica" &&
                      r.estado === "Pendiente" &&
                      puedeCancelar && (
                        <button
                          type="button"
                          className="rounded-md border border-red-400/50 px-2 py-1 text-red-700 hover:bg-red-50"
                          disabled={rechazarWeb.isPending}
                          onClick={async () => {
                            const ok = await confirmar({
                              titulo: "Rechazar solicitud web",
                              mensaje: "El horario quedará libre para otros clientes.",
                              confirmarTexto: "Rechazar",
                              variante: "peligro",
                            });
                            if (ok) rechazarWeb.mutate(r.id);
                          }}
                        >
                          Rechazar
                        </button>
                      )}
                    {puedeCrear && (
                      <button
                        type="button"
                        className="panel-link-cobrar"
                        onClick={() =>
                          setPagoReserva({ id: r.id, monto: r.montoTotal })
                        }
                      >
                        Cobrar
                      </button>
                    )}
                    {puedeCrear && (
                      <button
                        type="button"
                        className="panel-link-edit"
                        onClick={() => abrirEditar(r)}
                      >
                        Editar
                      </button>
                    )}
                    {puedeCancelar && r.estado !== "Cancelada" && (
                      <button
                        type="button"
                        className="panel-link-warn"
                        onClick={() => {
                          setCancelarId(r.id);
                          setAdelantoDevueltoAlCancelar(false);
                        }}
                      >
                        Cancelar
                      </button>
                    )}
                    {puedeCancelar && (
                      <button
                        type="button"
                        className="panel-link-danger"
                        onClick={async () => {
                          const ok = await confirmar({
                            titulo: "Eliminar reserva",
                            mensaje:
                              "Se borrará del sistema de forma permanente. Esta acción no se puede deshacer.",
                            confirmarTexto: "Eliminar",
                            variante: "peligro",
                          });
                          if (ok) eliminar.mutate(r.id);
                        }}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagoReserva && (
        <RegistrarPagoReservaModal
          reservaId={pagoReserva.id}
          montoReserva={pagoReserva.monto}
          onClose={() => setPagoReserva(null)}
        />
      )}

      <ConfirmarReservaWebModal
        open={!!confirmarWebTarget}
        clienteNombre={confirmarWebTarget?.clienteNombre ?? ""}
        montoTotal={confirmarWebTarget?.montoTotal ?? 0}
        montoRegistrado={
          confirmarWebTarget?.montoAdelantoWebGrupoPendiente ??
          confirmarWebTarget?.montoPagoWebPendiente
        }
        medioPago={confirmarWebTarget?.medioPagoWebPendiente}
        voucherUrl={confirmarWebTarget?.voucherWebPendiente}
        horarios={
          confirmarWebTarget
            ? [
                horariosTextoReservaListItem(
                  confirmarWebTarget.horaInicio,
                  confirmarWebTarget.horaFin
                ),
              ]
            : undefined
        }
        confirmando={confirmarWeb.isPending}
        onClose={() => setConfirmarWebTarget(null)}
        onConfirmar={() => {
          if (!confirmarWebTarget) return;
          confirmarWeb.mutate(confirmarWebTarget.id);
        }}
      />

      {cancelarId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-medium text-slate-900">Cancelar reserva</h3>
            <p className="mt-2 text-sm text-slate-400">
              El horario quedará libre. El registro no se borra (sirve para reportes y ver
              quién cancela seguido).
            </p>
            <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                className="mt-0.5 rounded border-slate-600"
                checked={adelantoDevueltoAlCancelar}
                onChange={(e) => setAdelantoDevueltoAlCancelar(e.target.checked)}
              />
              Se devolvió el adelanto / dinero al cliente
            </label>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-500"
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
                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 hover:border-sport-green/30"
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

function NoPermiso({ codigo }: { codigo: string }) {
  return (
    <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900">
      Sin permiso <code>{codigo}</code>
    </p>
  );
}
