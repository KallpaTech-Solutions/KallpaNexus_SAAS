"use client";

import { PERMISOS_SPORT } from "@kallpanexus/types";
import type { SucursalListItem } from "@kallpanexus/types";
import { getApiErrorMessage } from "@kallpanexus/api-client";
import { useTenantApi } from "@/lib/api-context";
import { canAccess, useAuthStore } from "@/lib/auth-store";
import { useUiFeedback } from "@/components/ui-feedback-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PanelSeccionColapsable } from "@/components/panel-seccion-colapsable";
import { PlanUsoBanner } from "@/components/plan-uso-banner";
import { SucursalEnlaceMaps } from "@/components/sucursal-enlace-maps";
import { esEnlaceGoogleMapsValido } from "@/lib/google-maps-link";
import { useRef, useState, type ReactNode } from "react";

const emptySucursal = {
  nombre: "",
  direccion: "",
  ciudad: "",
  telefono: "",
  telefonoWhatsApp: "",
  activa: true,
  enlaceGoogleMaps: "",
  latitud: null as number | null,
  longitud: null as number | null,
};

export default function SucursalesPage() {
  const api = useTenantApi();
  const { confirmar } = useUiFeedback();
  const qc = useQueryClient();
  const permisos = useAuthStore((s) => s.session?.permisos ?? []);
  const puedeVer = canAccess(permisos, PERMISOS_SPORT.canchasVer);
  const puedeModificar = canAccess(permisos, PERMISOS_SPORT.canchasModificar);

  const { data: sucursales = [], isLoading } = useQuery({
    queryKey: ["sucursales"],
    queryFn: () => api.sucursales.list(),
    enabled: puedeVer,
  });

  const { data: suscripcion } = useQuery({
    queryKey: ["tenant-suscripcion"],
    queryFn: () => api.suscripcion.resumen(),
    enabled: puedeVer,
  });

  const [nueva, setNueva] = useState(emptySucursal);
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState(emptySucursal);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [nuevaAbierta, setNuevaAbierta] = useState(false);

  const crear = useMutation({
    mutationFn: () =>
      api.sucursales.crear({
        ...nueva,
        ciudad: nueva.ciudad.trim() || undefined,
        telefonoWhatsApp: nueva.telefonoWhatsApp || undefined,
        enlaceGoogleMaps: nueva.enlaceGoogleMaps.trim() || undefined,
        latitud: nueva.latitud ?? undefined,
        longitud: nueva.longitud ?? undefined,
      }),
    onSuccess: () => {
      setError(null);
      setNueva(emptySucursal);
      setNuevaAbierta(false);
      qc.invalidateQueries({ queryKey: ["sucursales"] });
      qc.invalidateQueries({ queryKey: ["tenant-suscripcion"] });
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  const guardar = useMutation({
    mutationFn: () => {
      if (!editId) throw new Error("Sin sucursal");
      return api.sucursales.actualizar(editId, {
        nombre: edit.nombre,
        direccion: edit.direccion,
        ciudad: edit.ciudad.trim() || undefined,
        telefono: edit.telefono,
        telefonoWhatsApp: edit.telefonoWhatsApp || undefined,
        activa: edit.activa,
        enlaceGoogleMaps: edit.enlaceGoogleMaps.trim() || undefined,
        latitud: edit.latitud ?? undefined,
        longitud: edit.longitud ?? undefined,
      });
    },
    onSuccess: () => {
      setError(null);
      setEditId(null);
      qc.invalidateQueries({ queryKey: ["sucursales"] });
      qc.invalidateQueries({ queryKey: ["canchas"] });
      qc.invalidateQueries({ queryKey: ["tarifas"] });
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  const eliminar = useMutation({
    mutationFn: (id: string) => api.sucursales.eliminar(id),
    onSuccess: (data: unknown) => {
      const d = data as { mensaje?: string; Mensaje?: string } | undefined;
      setAviso(d?.mensaje ?? d?.Mensaje ?? "Operación completada.");
      setError(null);
      qc.invalidateQueries({ queryKey: ["sucursales"] });
      qc.invalidateQueries({ queryKey: ["canchas"] });
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  function abrirEditar(s: SucursalListItem) {
    setEditId(s.id);
    setEdit({
      nombre: s.nombre,
      direccion: s.direccion,
      ciudad: s.ciudad ?? "",
      telefono: s.telefono,
      telefonoWhatsApp: s.telefonoWhatsApp ?? "",
      activa: s.activa,
      enlaceGoogleMaps: s.enlaceGoogleMaps ?? "",
      latitud: s.latitud ?? null,
      longitud: s.longitud ?? null,
    });
    setError(null);
    setAviso(null);
  }

  if (!puedeVer) {
    return <p className="text-amber-200">Sin permiso sport:canchas:ver</p>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="panel-page-title">Sucursales</h2>
        <p className="panel-page-sub mt-1">
          Cada sucursal es un local (dirección y teléfono). Las canchas y tarifas se
          asocian a una sucursal.
        </p>
      </header>

      <PlanUsoBanner data={suscripcion} variante="sucursales" />

      {error && <p className="text-sm text-red-300">{error}</p>}
      {aviso && (
        <p className="text-sm text-amber-900/90">{aviso}</p>
      )}

      {puedeModificar && (
        <PanelSeccionColapsable
          titulo="Nueva sucursal"
          descripcion="Nombre, teléfono, WhatsApp y dirección del local"
          variante="acento"
          abierto={nuevaAbierta}
          onAlternar={() => setNuevaAbierta((v) => !v)}
        >
          <SucursalFields value={nueva} onChange={setNueva} showActiva={false} />
          <button
            type="button"
            className="mt-3 panel-btn-primary"
            onClick={() => crear.mutate()}
            disabled={
              crear.isPending ||
              !nueva.nombre.trim() ||
              !nueva.direccion.trim() ||
              !nueva.telefono.trim() ||
              !esEnlaceGoogleMapsValido(nueva.enlaceGoogleMaps)
            }
          >
            Crear sucursal
          </button>
        </PanelSeccionColapsable>
      )}

      {editId && puedeModificar && (
        <PanelSeccionColapsable
          titulo="Editar sucursal"
          variante="acento"
          abierto
          onAlternar={() => setEditId(null)}
        >
          <SucursalFields value={edit} onChange={setEdit} showActiva />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="panel-btn-primary"
              onClick={() => guardar.mutate()}
              disabled={
                guardar.isPending ||
                !edit.direccion.trim() ||
                !esEnlaceGoogleMapsValido(edit.enlaceGoogleMaps)
              }
            >
              Guardar cambios
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && <p className="text-slate-500">Cargando…</p>}
        {!isLoading && sucursales.length === 0 && (
          <p className="text-slate-500">No hay sucursales. Crea la primera arriba.</p>
        )}
        {sucursales.map((s) => (
          <article
            key={s.id}
            className="panel-card p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium text-slate-900">{s.nombre}</h3>
              <span
                className={`shrink-0 rounded px-2 py-0.5 text-xs ${
                  s.activa
                    ? "panel-badge-ok"
                    : "bg-slate-200 font-semibold text-slate-700"
                }`}
              >
                {s.activa ? "Activa" : "Inactiva"}
              </span>
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">
                  Ciudad
                </dt>
                <dd className="text-slate-800">{s.ciudad?.trim() || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">
                  Dirección
                </dt>
                <dd className="text-slate-800">{s.direccion || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">
                  Teléfono (llamadas)
                </dt>
                <dd className="text-slate-800">{s.telefono || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">
                  WhatsApp
                </dt>
                <dd className="text-slate-800">{s.telefonoWhatsApp || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">
                  Canchas registradas
                </dt>
                <dd className="font-semibold text-emerald-800">{s.totalCanchas}</dd>
              </div>
            </dl>
            {puedeModificar && (
              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                <button
                  type="button"
                  className="text-sport-green hover:underline"
                  onClick={() => abrirEditar(s)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="text-red-400 hover:underline"
                  onClick={async () => {
                    const msg =
                      s.totalCanchas > 0
                        ? "Si tiene canchas activas, la sucursal se desactivará en lugar de borrarse."
                        : "Se eliminará esta sucursal del sistema.";
                    const ok = await confirmar({
                      titulo: "Eliminar sucursal",
                      mensaje: `${msg} ¿Continuar?`,
                      confirmarTexto: "Continuar",
                      variante: "advertencia",
                    });
                    if (ok) eliminar.mutate(s.id);
                  }}
                >
                  Eliminar
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function SucursalFields({
  value,
  onChange,
  showActiva,
}: {
  value: typeof emptySucursal;
  onChange: (v: typeof emptySucursal) => void;
  showActiva: boolean;
}) {
  const valueRef = useRef(value);
  valueRef.current = value;

  const mergeUbicacion = (patch: Partial<typeof emptySucursal>) => {
    onChange({ ...valueRef.current, ...patch });
  };

  return (
    <div className="mt-3 grid gap-4 sm:grid-cols-2">
      <Campo
        label="Nombre del local"
        hint="Cómo la verá el equipo, ej. SportZa Sede Central."
      >
        <input
          className="w-full panel-input"
          value={value.nombre}
          onChange={(e) => onChange({ ...value, nombre: e.target.value })}
        />
      </Campo>
      <Campo
        label="Teléfono para llamadas"
        hint="Número fijo o móvil que atiende el local."
      >
        <input
          type="tel"
          className="w-full panel-input"
          value={value.telefono}
          onChange={(e) => onChange({ ...value, telefono: e.target.value })}
        />
      </Campo>
      <Campo
        label="WhatsApp"
        hint="Opcional. Para que clientes o el jefe envíen vouchers."
      >
        <input
          type="tel"
          placeholder="Ej. 999 888 777"
          className="w-full panel-input"
          value={value.telefonoWhatsApp}
          onChange={(e) =>
            onChange({ ...value, telefonoWhatsApp: e.target.value })
          }
        />
      </Campo>
      <Campo
        label="Ciudad"
        hint="Ej. Lima, Huánuco. Aparece en la web pública."
      >
        <input
          className="w-full panel-input"
          value={value.ciudad}
          onChange={(e) => onChange({ ...value, ciudad: e.target.value })}
          placeholder="Ej. Lima"
        />
      </Campo>
      <Campo
        label="Dirección"
        hint="Texto que verán los clientes (calle, referencia o nombre del local)."
        className="sm:col-span-2"
      >
        <input
          className="w-full panel-input"
          value={value.direccion}
          onChange={(e) => onChange({ ...value, direccion: e.target.value })}
        />
      </Campo>
      <SucursalEnlaceMaps
        value={{
          direccion: value.direccion,
          ciudad: value.ciudad,
          enlaceGoogleMaps: value.enlaceGoogleMaps,
          latitud: value.latitud,
          longitud: value.longitud,
        }}
        onChange={mergeUbicacion}
      />
      {showActiva && (
        <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-300 sm:col-span-2">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={value.activa}
            onChange={(e) => onChange({ ...value, activa: e.target.checked })}
          />
          <span>
            <span className="font-medium text-slate-900">Sucursal activa</span>
            <span className="block text-xs text-slate-500">
              Si la desactivas, deja de usarse para nuevas canchas; las existentes
              pueden seguir vinculadas.
            </span>
          </span>
        </label>
      )}
    </div>
  );
}

function Campo({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-900">{label}</label>
      <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
