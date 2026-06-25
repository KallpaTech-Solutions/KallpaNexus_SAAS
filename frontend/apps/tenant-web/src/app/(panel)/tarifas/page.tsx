"use client";

import { PERMISOS_SPORT } from "@kallpanexus/types";
import {
  etiquetaFranjaHoraria,
  extraerCiudadDesdeDireccion,
  formatMoneyPEN,
  hintHoraFranja,
  sufijoCiudadParentesis,
} from "@kallpanexus/shared";
import { AvisoElegirSedeOperacion } from "@/components/aviso-elegir-sede-operacion";
import { useCiudadSucursalActiva } from "@/lib/use-ciudad-sucursal";
import { useCanchasOperacion } from "@/lib/use-canchas-operacion";
import { useOperacionSucursal } from "@/lib/use-operacion-sucursal";
import { getApiErrorMessage } from "@kallpanexus/api-client";
import { useTenantApi } from "@/lib/api-context";
import { canAccess, useAuthStore } from "@/lib/auth-store";
import { useUiFeedback } from "@/components/ui-feedback-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HoraSelector } from "@/components/hora-selector";
import { formatHoraReloj24 } from "@kallpanexus/shared";
import { PanelSeccionColapsable } from "@/components/panel-seccion-colapsable";
import { useEffect, useState, type ReactNode } from "react";

const emptyTarifa = {
  sucursalId: "",
  nombre: "",
  horaInicio: 7,
  horaFin: 18,
  aplicaLunesAViernes: true,
  aplicaFinDeSemana: true,
  precioPorHora: 60,
};

export default function TarifasPage() {
  const api = useTenantApi();
  const { confirmar } = useUiFeedback();
  const qc = useQueryClient();
  const permisos = useAuthStore((s) => s.session?.permisos ?? []);
  const puedeVer = canAccess(permisos, PERMISOS_SPORT.canchasVer);
  const puedeModificar = canAccess(permisos, PERMISOS_SPORT.canchasModificar);
  const ciudadSede = useCiudadSucursalActiva();
  const { sucursalIdParaApi } = useOperacionSucursal();

  const { data: tarifas = [], isLoading } = useQuery({
    queryKey: ["tarifas", sucursalIdParaApi],
    queryFn: () => api.tarifas.list(sucursalIdParaApi),
    enabled: puedeVer && !!sucursalIdParaApi,
  });

  const { data: sucursales = [] } = useQuery({
    queryKey: ["sucursales"],
    queryFn: () => api.sucursales.list(),
    enabled: puedeModificar,
  });

  const { data: canchas = [] } = useCanchasOperacion(puedeModificar);

  const [nueva, setNueva] = useState(emptyTarifa);
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState(emptyTarifa);
  const [asignarCanchaId, setAsignarCanchaId] = useState("");
  const [asignarTarifaId, setAsignarTarifaId] = useState("");
  const [reemplazarTarifasCancha, setReemplazarTarifasCancha] = useState(false);
  const [asignarOkMsg, setAsignarOkMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [nuevaAbierta, setNuevaAbierta] = useState(false);
  const [asignarAbierta, setAsignarAbierta] = useState(false);

  useEffect(() => {
    const sede = sucursalIdParaApi ?? sucursales[0]?.id;
    if (sede && !nueva.sucursalId && !editId) {
      setNueva((n) => ({ ...n, sucursalId: sede }));
    }
  }, [sucursales, nueva.sucursalId, editId, sucursalIdParaApi]);

  function validarTarifa(t: typeof emptyTarifa): string | null {
    if (!t.sucursalId) return "Selecciona una sucursal.";
    if (!t.nombre.trim()) return "Escribe el nombre de la tarifa.";
    if (t.horaInicio >= t.horaFin) return "La hora de fin debe ser mayor que la de inicio.";
    if (!t.aplicaLunesAViernes && !t.aplicaFinDeSemana) {
      return "Marca al menos un tipo de día (L–V o fin de semana).";
    }
    if (Number.isNaN(t.precioPorHora) || t.precioPorHora < 0) {
      return "Precio por hora inválido.";
    }
    return null;
  }

  const crear = useMutation({
    mutationFn: () => {
      const v = validarTarifa(nueva);
      if (v) throw new Error(v);
      return api.tarifas.crear({
        ...nueva,
        nombre: nueva.nombre.trim(),
        precioPorHora: Number(nueva.precioPorHora),
      });
    },
    onSuccess: () => {
      setError(null);
      setOkMsg(
        "Tarifa creada. Asígnala a cada cancha en la sección «Asignar tarifa a cancha» para que aparezca en el calendario."
      );
      setNueva({ ...emptyTarifa, sucursalId: sucursales[0]?.id ?? "" });
      setNuevaAbierta(false);
      qc.invalidateQueries({ queryKey: ["tarifas"] });
    },
    onError: (e) =>
      setError(e instanceof Error && e.message ? e.message : getApiErrorMessage(e)),
  });

  const guardar = useMutation({
    mutationFn: () => {
      if (!editId) throw new Error("Sin tarifa");
      return api.tarifas.actualizar(editId, {
        nombre: edit.nombre,
        horaInicio: edit.horaInicio,
        horaFin: edit.horaFin,
        aplicaLunesAViernes: edit.aplicaLunesAViernes,
        aplicaFinDeSemana: edit.aplicaFinDeSemana,
        precioPorHora: edit.precioPorHora,
      });
    },
    onSuccess: () => {
      setEditId(null);
      setError(null);
      qc.invalidateQueries({ queryKey: ["tarifas"] });
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  const eliminar = useMutation({
    mutationFn: (id: string) => api.tarifas.eliminar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tarifas"] }),
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  const asignar = useMutation({
    mutationFn: () =>
      api.tarifas.asignarCancha(asignarCanchaId, asignarTarifaId, {
        reemplazarTodasEnCancha: reemplazarTarifasCancha,
      }),
    onSuccess: (data) => {
      setError(null);
      const msg =
        (data?.mensaje ?? data?.Mensaje) ||
        "Tarifa asignada correctamente a la cancha.";
      setAsignarOkMsg(msg);
      qc.invalidateQueries({ queryKey: ["tarifas"] });
      qc.invalidateQueries({ queryKey: ["disponibilidad"] });
    },
    onError: (e) => {
      setAsignarOkMsg(null);
      setError(getApiErrorMessage(e));
    },
  });

  if (!puedeVer) {
    return <p className="text-amber-200">Sin permiso sport:canchas:ver</p>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="panel-page-title">Tarifas</h2>
        <p className="panel-page-sub">
          Catálogo por sucursal y asignación a canchas.
        </p>
      </header>

      <AvisoElegirSedeOperacion />

      {puedeModificar && (
        <>
          <PanelSeccionColapsable
            titulo="Nueva tarifa"
            descripcion="Horario, días y precio por hora en una sucursal"
            variante="acento"
            abierto={nuevaAbierta}
            onAlternar={() => setNuevaAbierta((v) => !v)}
          >
            <TarifaFields value={nueva} onChange={setNueva} sucursales={sucursales} />
            <button
              type="button"
              className="mt-3 panel-btn-primary"
              onClick={() => {
                setOkMsg(null);
                crear.mutate();
              }}
              disabled={crear.isPending}
            >
              Crear tarifa
            </button>
            {okMsg && <p className="mt-2 text-sm text-emerald-300">{okMsg}</p>}
          </PanelSeccionColapsable>

          <PanelSeccionColapsable
            titulo="Asignar tarifa a cancha"
            descripcion="Varias tarifas por cancha; el calendario elige la del horario"
            abierto={asignarAbierta}
            onAlternar={() => setAsignarAbierta((v) => !v)}
          >
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <span className="block text-xs font-medium text-slate-400">Cancha</span>
                <select
                  className="mt-1 panel-input"
                  value={asignarCanchaId}
                  onChange={(e) => setAsignarCanchaId(e.target.value)}
                >
                  <option value="">Elegir cancha…</option>
                  {canchas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} · {c.nombreSucursal}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-400">
                  Tarifa del catálogo
                </span>
                <select
                  className="mt-1 panel-input"
                  value={asignarTarifaId}
                  onChange={(e) => setAsignarTarifaId(e.target.value)}
                >
                  <option value="">Elegir tarifa…</option>
                  {tarifas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre} — {formatMoneyPEN(t.precioPorHora)}/h
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  className="rounded border-slate-600"
                  checked={reemplazarTarifasCancha}
                  onChange={(e) => setReemplazarTarifasCancha(e.target.checked)}
                />
                Reemplazar tarifas ya asignadas en esta cancha
              </label>
              <button
                type="button"
                className="panel-btn-primary"
                onClick={() => {
                  setAsignarOkMsg(null);
                  asignar.mutate();
                }}
                disabled={!asignarCanchaId || !asignarTarifaId || asignar.isPending}
              >
                {asignar.isPending ? "Asignando…" : "Asignar"}
              </button>
            </div>
            {asignarOkMsg && (
              <div
                className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3"
                role="status"
              >
                <span className="text-lg leading-none text-emerald-400" aria-hidden>
                  ✓
                </span>
                <div>
                  <p className="text-sm font-medium text-emerald-200">Listo</p>
                  <p className="text-sm text-emerald-100/90">{asignarOkMsg}</p>
                </div>
              </div>
            )}
          </PanelSeccionColapsable>
        </>
      )}

      {editId && puedeModificar && (
        <PanelSeccionColapsable
          titulo="Editar tarifa"
          variante="acento"
          abierto
          onAlternar={() => setEditId(null)}
        >
          <TarifaFields
            value={edit}
            onChange={setEdit}
            sucursales={sucursales}
            lockSucursal
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="panel-btn-primary"
              onClick={() => guardar.mutate()}
              disabled={guardar.isPending}
            >
              Guardar
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300"
              onClick={() => setEditId(null)}
            >
              Cerrar
            </button>
          </div>
        </PanelSeccionColapsable>
      )}

      {error && <p className="text-sm text-red-300">{error}</p>}

      <div className="panel-card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="panel-table-head">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">{etiquetaFranjaHoraria(ciudadSede)}</th>
              <th className="px-4 py-3">Precio por hora (S/)</th>
              <th className="px-4 py-3">Días</th>
              <th className="px-4 py-3">Canchas</th>
              {puedeModificar && <th className="px-4 py-3" />}
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
            {tarifas.map((t) => (
              <tr key={t.id} className="panel-table-row">
                <td className="px-4 py-3 text-slate-900">
                  {t.nombre}
                  {!t.activa && (
                    <span className="ml-2 text-xs text-amber-400">(inactiva)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {formatHoraTarifa(t.horaInicio)} – {formatHoraTarifa(t.horaFin)}
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Desde las {t.horaInicio}:00 hasta las {t.horaFin}:00
                  </span>
                </td>
                <td className="px-4 py-3">{formatMoneyPEN(t.precioPorHora)}</td>
                <td className="px-4 py-3 text-slate-400">
                  {t.aplicaLunesAViernes && "L–V "}
                  {t.aplicaFinDeSemana && "S–D"}
                </td>
                <td className="px-4 py-3">{t.canchasAsignadas}</td>
                {puedeModificar && (
                  <td className="px-4 py-3 text-right text-xs">
                    <button
                      type="button"
                      className="text-sport-green hover:underline"
                      onClick={() => {
                        setEditId(t.id);
                        setEdit({
                          sucursalId: t.sucursalId,
                          nombre: t.nombre,
                          horaInicio: t.horaInicio,
                          horaFin: t.horaFin,
                          aplicaLunesAViernes: t.aplicaLunesAViernes,
                          aplicaFinDeSemana: t.aplicaFinDeSemana,
                          precioPorHora: t.precioPorHora,
                        });
                      }}
                    >
                      Editar
                    </button>
                    <span className="mx-1 text-slate-600">|</span>
                    <button
                      type="button"
                      className="text-red-400 hover:underline"
                      onClick={async () => {
                        const ok = await confirmar({
                          titulo: "Eliminar tarifa",
                          mensaje: "Se quitará esta tarifa del catálogo. ¿Continuar?",
                          confirmarTexto: "Eliminar",
                          variante: "peligro",
                        });
                        if (ok) eliminar.mutate(t.id);
                      }}
                    >
                      Eliminar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatHoraTarifa(h: number): string {
  return formatHoraReloj24(h);
}

function TarifaFields({
  value,
  onChange,
  sucursales,
  lockSucursal,
}: {
  value: typeof emptyTarifa;
  onChange: (v: typeof emptyTarifa) => void;
  sucursales: { id: string; nombre: string; direccion?: string }[];
  lockSucursal?: boolean;
}) {
  const ciudadTarifa = (() => {
    const s = sucursales.find((x) => x.id === value.sucursalId);
    if (!s?.direccion) return null;
    return extraerCiudadDesdeDireccion(s.direccion);
  })();

  const rango =
    value.horaInicio < value.horaFin
      ? `${formatHoraTarifa(value.horaInicio)} – antes de ${formatHoraTarifa(value.horaFin)}${sufijoCiudadParentesis(ciudadTarifa)}`
      : "La hora fin debe ser mayor que la hora inicio";

  return (
    <div className="mt-3 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CampoTarifa
          label="Sucursal"
          hint="Local donde aplica esta tarifa en el catálogo."
        >
          <select
            className="w-full panel-input disabled:opacity-50"
            value={value.sucursalId}
            disabled={lockSucursal}
            onChange={(e) => onChange({ ...value, sucursalId: e.target.value })}
          >
            <option value="">Elegir sucursal…</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </CampoTarifa>

        <CampoTarifa
          label="Nombre de la tarifa"
          hint="Ej. Diurna, Nocturna, Fin de semana."
        >
          <input
            className="w-full panel-input"
            value={value.nombre}
            onChange={(e) => onChange({ ...value, nombre: e.target.value })}
          />
        </CampoTarifa>

        <CampoTarifa
          label="Precio por hora (soles)"
          hint="Monto que se cobra por cada hora reservada en esta franja."
        >
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
              S/
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              className="panel-input w-full py-2 pl-9 pr-3"
              value={value.precioPorHora}
              onChange={(e) =>
                onChange({ ...value, precioPorHora: Number(e.target.value) })
              }
            />
          </div>
        </CampoTarifa>

        <CampoTarifa label="Hora de inicio" hint={hintHoraFranja(ciudadTarifa)}>
          <HoraSelector
            value={value.horaInicio}
            onChange={(horaInicio) => onChange({ ...value, horaInicio })}
          />
        </CampoTarifa>

        <CampoTarifa
          label="Hora de fin"
          hint="Primera hora que ya no entra en esta tarifa."
        >
          <HoraSelector
            modoFinTarifa
            value={value.horaFin}
            onChange={(horaFin) => onChange({ ...value, horaFin })}
          />
        </CampoTarifa>
      </div>

      <p className="panel-info">
        <span className="font-semibold text-slate-800">Resumen de horario: </span>
        {rango}
      </p>

      <fieldset className="panel-card p-3">
        <legend className="px-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          Días en que aplica
        </legend>
        <div className="mt-2 flex flex-wrap gap-6">
          <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={value.aplicaLunesAViernes}
              onChange={(e) =>
                onChange({ ...value, aplicaLunesAViernes: e.target.checked })
              }
            />
            <span>
              <span className="font-medium text-slate-900">Lunes a viernes</span>
              <span className="block text-xs text-slate-500">
                Incluye reservas de lunes a viernes en esta franja.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={value.aplicaFinDeSemana}
              onChange={(e) =>
                onChange({ ...value, aplicaFinDeSemana: e.target.checked })
              }
            />
            <span>
              <span className="font-medium text-slate-900">Sábado y domingo</span>
              <span className="block text-xs text-slate-500">
                Incluye reservas de fin de semana en esta franja.
              </span>
            </span>
          </label>
        </div>
      </fieldset>
    </div>
  );
}

function CampoTarifa({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-900">{label}</label>
      <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
