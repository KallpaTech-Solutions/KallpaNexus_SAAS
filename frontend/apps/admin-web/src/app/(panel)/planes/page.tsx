"use client";

import { usePlatformApi } from "@/lib/platform-api-context";
import { usePlatformPermisos } from "@/lib/platform-auth-store";
import { platformUi } from "@/lib/platform-ui";
import { formatMoneyPEN, hasPlatformPermission } from "@kallpanexus/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil } from "lucide-react";
import { useState } from "react";

function planRow(p: Record<string, unknown>) {
  return {
    id: String(p.id ?? p.Id ?? ""),
    nombre: String(p.nombre ?? p.Nombre ?? ""),
    precio: Number(p.precioMensual ?? p.PrecioMensual ?? 0),
    limiteTenants: Number(p.limiteSucursales ?? p.LimiteSucursales ?? 0),
    limiteStaff: Number(p.limiteUsuariosStaff ?? p.LimiteUsuariosStaff ?? 0),
    activo: Boolean(p.activo ?? p.Activo ?? true),
    sport: Boolean(p.soportaModuloSport ?? p.SoportaModuloSport ?? true),
    stay: Boolean(p.soportaModuloStay ?? p.SoportaModuloStay ?? false),
    care: Boolean(p.soportaModuloCare ?? p.SoportaModuloCare ?? false),
    fidelizacion: Boolean(p.soportaFidelizacionPuntos ?? p.SoportaFidelizacionPuntos ?? false),
    diasDemo: p.diasDuracionDemo ?? p.DiasDuracionDemo ?? null,
    esDemo: Number(p.precioMensual ?? p.PrecioMensual ?? 0) <= 0,
  };
}

type EditState = {
  id: string;
  nombre: string;
  precio: string;
  limiteTenants: string;
  limiteStaff: string;
  activo: boolean;
  sport: boolean;
  stay: boolean;
  care: boolean;
  fidelizacion: boolean;
  diasDemo: string;
};

export default function PlatformPlanesPage() {
  const api = usePlatformApi();
  const permisos = usePlatformPermisos();
  const puedeEditar = hasPlatformPermission(permisos, "platform:planes:gestionar");
  const qc = useQueryClient();
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saveError, setSaveError] = useState("");

  const q = useQuery({
    queryKey: ["platform-planes-all"],
    queryFn: () => api.planes.list({ soloActivos: false }),
  });

  const saveMut = useMutation({
    mutationFn: (payload: EditState) =>
      api.planes.actualizar(payload.id, {
        nombre: payload.nombre.trim(),
        precioMensual: Number(payload.precio),
        limiteSucursales: Number(payload.limiteTenants),
        limiteUsuariosStaff: Number(payload.limiteStaff),
        activo: payload.activo,
        soportaModuloSport: payload.sport,
        soportaModuloStay: payload.stay,
        soportaModuloCare: payload.care,
        soportaFidelizacionPuntos: payload.fidelizacion,
        diasDuracionDemo:
          Number(payload.precio) <= 0
            ? Math.min(365, Math.max(1, Number(payload.diasDemo) || 30))
            : null,
      }),
    onSuccess: async () => {
      setEdit(null);
      setSaveError("");
      await qc.invalidateQueries({ queryKey: ["platform-planes-all"] });
    },
    onError: () => setSaveError("No se pudo guardar. Revisa permisos y datos."),
  });

  const rows = ((q.data ?? []) as Record<string, unknown>[]).map(planRow);

  function openEdit(p: ReturnType<typeof planRow>) {
    setSaveError("");
    setEdit({
      id: p.id,
      nombre: p.nombre,
      precio: String(p.precio),
      limiteTenants: String(p.limiteTenants),
      limiteStaff: String(p.limiteStaff),
      activo: p.activo,
      sport: p.sport,
      stay: p.stay,
      care: p.care,
      fidelizacion: p.fidelizacion,
      diasDemo: p.diasDemo != null ? String(p.diasDemo) : "30",
    });
  }

  return (
    <div>
      <h1 className={platformUi.pageTitle}>Planes SaaS</h1>
      <p className={platformUi.pageSubtitle}>
        Catálogo de suscripción. {puedeEditar ? "Puedes editar precios y límites desde aquí." : "Solo lectura."}
      </p>

      {q.isLoading && (
        <p className={`mt-8 flex items-center gap-2 ${platformUi.textMuted}`}>
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
        </p>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((p) => (
          <article key={p.id} className={platformUi.card}>
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold text-[var(--p-text)]">{p.nombre}</h2>
              <span className={p.activo ? platformUi.badgeOk : platformUi.badgeMuted}>
                {p.activo ? "Activo" : "Inactivo"}
              </span>
            </div>
            <p className={`mt-2 text-2xl font-bold text-[var(--p-text)]`}>{formatMoneyPEN(p.precio)}</p>
            <p className={`mt-1 text-xs ${platformUi.textMuted}`}>/ mes</p>
            {p.esDemo && (
              <p className={`mt-1 text-xs ${platformUi.badgeWarn}`}>
                Demo · {p.diasDemo != null ? Number(p.diasDemo) : 30} días de vigencia
              </p>
            )}
            {!p.esDemo && (
              <p className={`mt-1 text-xs ${platformUi.textMuted}`}>Renovación mensual</p>
            )}
            <ul className={`mt-4 space-y-1 text-sm ${platformUi.textBody}`}>
              <li>Hasta {p.limiteTenants || "∞"} tenants activos</li>
              <li>Hasta {p.limiteStaff || "∞"} usuarios staff</li>
              <li className={`text-xs ${platformUi.textMuted}`}>
                Módulos: {[p.sport && "Sport", p.stay && "Stay", p.care && "Care"].filter(Boolean).join(", ") || "—"}
              </li>
            </ul>
            {puedeEditar && (
              <button
                type="button"
                onClick={() => openEdit(p)}
                className={`${platformUi.btnSecondary} mt-4 w-full`}
              >
                <Pencil className="h-4 w-4" aria-hidden />
                Editar plan
              </button>
            )}
          </article>
        ))}
      </div>

      {edit && (
        <div className={platformUi.modalOverlay}>
          <div className={`${platformUi.modal} max-w-lg`}>
            <h2 className={platformUi.sectionTitle}>Editar plan</h2>
            {saveError && <p className={`mt-2 ${platformUi.alertDanger}`}>{saveError}</p>}
            <form
              className="mt-4 space-y-3 text-sm"
              onSubmit={(e) => {
                e.preventDefault();
                saveMut.mutate(edit);
              }}
            >
              <label className="block">
                <span className={platformUi.formLabel}>Nombre</span>
                <input
                  className={platformUi.input}
                  value={edit.nombre}
                  onChange={(ev) => setEdit({ ...edit, nombre: ev.target.value })}
                  required
                />
              </label>
              <label className="block">
                <span className={platformUi.formLabel}>Precio mensual (PEN)</span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  className={platformUi.input}
                  value={edit.precio}
                  onChange={(ev) => setEdit({ ...edit, precio: ev.target.value })}
                  required
                />
              </label>
              {Number(edit.precio) <= 0 && (
                <label className="block">
                  <span className={platformUi.formLabel}>Duración demo (días)</span>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    step={1}
                    className={platformUi.input}
                    value={edit.diasDemo}
                    onChange={(ev) => setEdit({ ...edit, diasDemo: ev.target.value })}
                    required
                  />
                  <span className={`mt-1 block text-xs ${platformUi.textMuted}`}>
                    Define cuántos días dura el periodo demo (1–365). Solo aplica a nuevos
                    ciclos al aprobar contratos o registrar empresas; puedes bajarlo cuando quieras.
                  </span>
                </label>
              )}
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={platformUi.formLabel}>Límite tenants</span>
                  <input
                    type="number"
                    min={0}
                    className={platformUi.input}
                    value={edit.limiteTenants}
                    onChange={(ev) => setEdit({ ...edit, limiteTenants: ev.target.value })}
                    required
                  />
                </label>
                <label className="block">
                  <span className={platformUi.formLabel}>Límite staff</span>
                  <input
                    type="number"
                    min={0}
                    className={platformUi.input}
                    value={edit.limiteStaff}
                    onChange={(ev) => setEdit({ ...edit, limiteStaff: ev.target.value })}
                    required
                  />
                </label>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={edit.activo}
                  onChange={(ev) => setEdit({ ...edit, activo: ev.target.checked })}
                />
                Plan activo
              </label>
              <fieldset className={`space-y-2 ${platformUi.fieldset}`}>
                <legend>Módulos</legend>
                {(
                  [
                    ["sport", "Sport"],
                    ["stay", "Stay"],
                    ["care", "Care"],
                    ["fidelizacion", "Fidelización"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={edit[key]}
                      onChange={(ev) => setEdit({ ...edit, [key]: ev.target.checked })}
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className={platformUi.btnSecondary} onClick={() => setEdit(null)}>
                  Cancelar
                </button>
                <button type="submit" disabled={saveMut.isPending} className={platformUi.btnPrimary}>
                  {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
