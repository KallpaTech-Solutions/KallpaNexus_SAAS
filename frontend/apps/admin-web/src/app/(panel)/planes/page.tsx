"use client";

import { usePlatformApi } from "@/lib/platform-api-context";
import { usePlatformPermisos } from "@/lib/platform-auth-store";
import { platformUi } from "@/lib/platform-ui";
import { formatMoneyPEN, hasPlatformPermission } from "@kallpanexus/shared";
import { cn } from "@/lib/cn";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Loader2, Pencil, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";

function planRow(p: Record<string, unknown>) {
  return {
    id: String(p.id ?? p.Id ?? ""),
    nombre: String(p.nombre ?? p.Nombre ?? ""),
    precio: Number(p.precioMensual ?? p.PrecioMensual ?? 0),
    limiteTenants: Number(p.limiteSucursales ?? p.LimiteSucursales ?? 0),
    limiteStaff: Number(p.limiteUsuariosStaff ?? p.LimiteUsuariosStaff ?? 0),
    limiteCanchas: Number(p.limiteCanchas ?? p.LimiteCanchas ?? 0),
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
  limiteCanchas: string;
  activo: boolean;
  sport: boolean;
  stay: boolean;
  care: boolean;
  fidelizacion: boolean;
  diasDemo: string;
};

function FormAccordion({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="platform-form-accordion">
      <button type="button" className="platform-form-accordion-toggle" onClick={onToggle}>
        <span>{title}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open ? <div className="platform-form-accordion-body">{children}</div> : null}
    </div>
  );
}

export default function PlatformPlanesPage() {
  const api = usePlatformApi();
  const permisos = usePlatformPermisos();
  const puedeEditar = hasPlatformPermission(permisos, "platform:planes:gestionar");
  const qc = useQueryClient();
  const [edit, setEdit] = useState<EditState | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("edit");
  const [saveError, setSaveError] = useState("");
  const [formOpen, setFormOpen] = useState({ datos: true, limites: true, modulos: true });

  const q = useQuery({
    queryKey: ["platform-planes-all"],
    queryFn: () => api.planes.list({ soloActivos: false }),
  });

  function planBody(payload: EditState) {
    return {
      nombre: payload.nombre.trim(),
      precioMensual: Number(payload.precio),
      limiteSucursales: Number(payload.limiteTenants),
      limiteUsuariosStaff: Number(payload.limiteStaff),
      limiteCanchas: payload.sport ? Number(payload.limiteCanchas) : 0,
      activo: payload.activo,
      soportaModuloSport: payload.sport,
      soportaModuloStay: payload.stay,
      soportaModuloCare: payload.care,
      soportaFidelizacionPuntos: payload.fidelizacion,
      diasDuracionDemo:
        Number(payload.precio) <= 0
          ? Math.min(365, Math.max(1, Number(payload.diasDemo) || 30))
          : null,
    };
  }

  const saveMut = useMutation({
    mutationFn: async ({
      payload,
      mode,
    }: {
      payload: EditState;
      mode: "create" | "edit";
    }) => {
      const body = planBody(payload);
      if (mode === "create") {
        return api.planes.crear({
          nombre: body.nombre,
          precioMensual: body.precioMensual,
          limiteSucursales: body.limiteSucursales,
          limiteUsuariosStaff: body.limiteUsuariosStaff,
          limiteCanchas: body.limiteCanchas,
          soportaModuloSport: body.soportaModuloSport,
          soportaModuloStay: body.soportaModuloStay,
          soportaModuloCare: body.soportaModuloCare,
          soportaFidelizacionPuntos: body.soportaFidelizacionPuntos,
          diasDuracionDemo: body.diasDuracionDemo,
        });
      }
      return api.planes.actualizar(payload.id, body);
    },
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
    setFormMode("edit");
    setFormOpen({ datos: true, limites: true, modulos: true });
    setEdit({
      id: p.id,
      nombre: p.nombre,
      precio: String(p.precio),
      limiteTenants: String(p.limiteTenants),
      limiteStaff: String(p.limiteStaff),
      limiteCanchas: String(p.limiteCanchas || (p.sport ? 5 : 0)),
      activo: p.activo,
      sport: p.sport,
      stay: p.stay,
      care: p.care,
      fidelizacion: p.fidelizacion,
      diasDemo: p.diasDemo != null ? String(p.diasDemo) : "30",
    });
  }

  function openCreate() {
    setSaveError("");
    setFormMode("create");
    setFormOpen({ datos: true, limites: true, modulos: true });
    setEdit({
      id: "",
      nombre: "",
      precio: "0",
      limiteTenants: "1",
      limiteStaff: "5",
      limiteCanchas: "5",
      activo: true,
      sport: true,
      stay: false,
      care: false,
      fidelizacion: false,
      diasDemo: "30",
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={platformUi.pageTitle}>Planes SaaS</h1>
          <p className={platformUi.pageSubtitle}>
            Catálogo de suscripción.{" "}
            {puedeEditar
              ? "Crea planes nuevos o edita precios y límites."
              : "Solo lectura."}
          </p>
        </div>
        {puedeEditar && (
          <button type="button" className={platformUi.btnPrimary} onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            Nuevo plan
          </button>
        )}
      </div>

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
              <li>Hasta {p.limiteTenants || "∞"} sucursales / negocio</li>
              <li>Hasta {p.limiteStaff || "∞"} usuarios staff</li>
              {p.sport && (
                <li>Hasta {p.limiteCanchas || "∞"} canchas (Sport)</li>
              )}
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
        <div
          className={platformUi.modalOverlay}
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !saveMut.isPending) setEdit(null);
          }}
        >
          <div className={`${platformUi.modal} max-w-lg`} role="dialog" aria-modal="true">
            <div className="platform-modal-header">
              <h2 className={platformUi.sectionTitle}>
                {formMode === "create" ? "Nuevo plan" : "Editar plan"}
              </h2>
              <p className={`mt-1 text-xs ${platformUi.textMuted}`}>
                {formMode === "create"
                  ? "Define nombre, precio (0 = demo), límites y módulos."
                  : "Ajusta precio, límites y módulos incluidos."}
              </p>
            </div>
            {saveError && (
              <p className={`mx-6 mt-3 ${platformUi.alertDanger}`}>{saveError}</p>
            )}
            <form
              id="platform-plan-edit-form"
              className="platform-modal-body text-sm"
              onSubmit={(e) => {
                e.preventDefault();
                saveMut.mutate({ payload: edit, mode: formMode });
              }}
            >
              <FormAccordion
                title="Datos del plan"
                open={formOpen.datos}
                onToggle={() => setFormOpen((s) => ({ ...s, datos: !s.datos }))}
              >
                <div className="space-y-3">
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
                        Vigencia del periodo demo (1–365) para nuevos ciclos al aprobar contratos o
                        registrar empresas.
                      </span>
                    </label>
                  )}
                  <label className="platform-check-row">
                    <input
                      type="checkbox"
                      checked={edit.activo}
                      onChange={(ev) => setEdit({ ...edit, activo: ev.target.checked })}
                    />
                    <span>Plan activo</span>
                  </label>
                </div>
              </FormAccordion>

              <FormAccordion
                title="Límites por negocio"
                open={formOpen.limites}
                onToggle={() => setFormOpen((s) => ({ ...s, limites: !s.limites }))}
              >
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className={platformUi.formLabel}>Sucursales / negocio</span>
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
                    <span className={platformUi.formLabel}>Staff</span>
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
                {edit.sport && (
                  <label className="mt-3 block">
                    <span className={platformUi.formLabel}>Canchas (Sport)</span>
                    <input
                      type="number"
                      min={0}
                      className={platformUi.input}
                      value={edit.limiteCanchas}
                      onChange={(ev) => setEdit({ ...edit, limiteCanchas: ev.target.value })}
                      required
                    />
                    <span className={`mt-1 block text-xs ${platformUi.textMuted}`}>
                      Máximo de canchas activas por tenant. 0 = sin tope.
                    </span>
                  </label>
                )}
              </FormAccordion>

              <FormAccordion
                title="Módulos incluidos"
                open={formOpen.modulos}
                onToggle={() => setFormOpen((s) => ({ ...s, modulos: !s.modulos }))}
              >
                <div className="grid gap-1 sm:grid-cols-2">
                  {(
                    [
                      ["sport", "Sport"],
                      ["stay", "Stay"],
                      ["care", "Care"],
                      ["fidelizacion", "Fidelización"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="platform-check-row">
                      <input
                        type="checkbox"
                        checked={edit[key]}
                        onChange={(ev) => setEdit({ ...edit, [key]: ev.target.checked })}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </FormAccordion>
            </form>
            <div className="platform-modal-footer">
              <button
                type="button"
                className={platformUi.btnSecondary}
                onClick={() => setEdit(null)}
                disabled={saveMut.isPending}
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="platform-plan-edit-form"
                disabled={saveMut.isPending}
                className={platformUi.btnPrimary}
              >
                {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {formMode === "create" ? "Crear plan" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
