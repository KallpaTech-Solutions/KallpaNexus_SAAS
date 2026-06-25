"use client";

import { PermisosGruposPicker } from "@/components/permisos-grupos-picker";
import { usePlatformApi } from "@/lib/platform-api-context";
import { platformUi } from "@/lib/platform-ui";
import { normalizePlatformEmpresa, normalizePlatformTenant, getApiErrorMessage } from "@kallpanexus/api-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Loader2, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type RolRow = {
  id: string;
  codigo: string;
  nombre: string;
  nivel: number;
  esSistema: boolean;
  permisos: string[];
};

function pickCodigo(row: { codigo?: string; Codigo?: string }) {
  return String(row.codigo ?? row.Codigo ?? "");
}

export function CrearStaffEmpresaPanel({ onCreated }: { onCreated: () => void }) {
  const api = usePlatformApi();
  const qc = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [empresaId, setEmpresaId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [dni, setDni] = useState("");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [rolId, setRolId] = useState("");
  const [sucursalIds, setSucursalIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mostrarNuevoRol, setMostrarNuevoRol] = useState(false);
  const [rolNombre, setRolNombre] = useState("");
  const [rolPermisos, setRolPermisos] = useState<string[]>([]);
  const [rolLoading, setRolLoading] = useState(false);

  const empresasQ = useQuery({
    queryKey: ["platform-empresas"],
    queryFn: () => api.empresas.list(),
    enabled: abierto,
  });

  const tenantsQ = useQuery({
    queryKey: ["platform-tenants-all"],
    queryFn: () => api.tenants.list({ soloActivos: false }),
    enabled: abierto,
  });

  const catalogoQ = useQuery({
    queryKey: ["platform-permisos-sport"],
    queryFn: () => api.operaciones.permisosSportCatalogo(),
    enabled: abierto && mostrarNuevoRol,
  });

  const rolesQ = useQuery({
    queryKey: ["platform-tenant-roles", tenantId],
    queryFn: () => api.operaciones.rolesTenant(tenantId),
    enabled: abierto && Boolean(tenantId),
  });

  const sucursalesQ = useQuery({
    queryKey: ["platform-tenant-sucursales", tenantId],
    queryFn: () => api.operaciones.sucursalesTenant(tenantId),
    enabled: abierto && Boolean(tenantId),
  });

  const empresas = (empresasQ.data ?? []).map(normalizePlatformEmpresa);
  const tenantsAll = (tenantsQ.data ?? []).map(normalizePlatformTenant);
  const tenants = useMemo(
    () => (empresaId ? tenantsAll.filter((t) => t.clienteEmpresaId === empresaId) : []),
    [tenantsAll, empresaId]
  );

  const roles: RolRow[] = useMemo(() => {
    return ((rolesQ.data ?? []) as Record<string, unknown>[]).map((r) => ({
      id: String(r.id ?? r.Id ?? ""),
      codigo: String(r.codigo ?? r.Codigo ?? ""),
      nombre: String(r.nombre ?? r.Nombre ?? ""),
      nivel: Number(r.nivel ?? r.Nivel ?? 0),
      esSistema: Boolean(r.esSistema ?? r.EsSistema ?? false),
      permisos: (Array.isArray(r.permisos ?? r.Permisos) ? (r.permisos ?? r.Permisos) : []) as string[],
    }));
  }, [rolesQ.data]);

  const rolSel = roles.find((r) => r.id === rolId);
  const esGerente = rolSel?.codigo === "Gerente";

  const permisosCatalogo = useMemo(
    () =>
      ((catalogoQ.data ?? []) as Record<string, unknown>[])
        .map((p) => pickCodigo(p))
        .filter(Boolean)
        .sort(),
    [catalogoQ.data]
  );

  const sucursales = ((sucursalesQ.data ?? []) as Record<string, unknown>[]).map((s) => ({
    id: String(s.id ?? s.Id ?? ""),
    nombre: String(s.nombre ?? s.Nombre ?? ""),
    activa: Boolean(s.activa ?? s.Activa ?? true),
  }));

  useEffect(() => {
    setTenantId("");
    setRolId("");
    setSucursalIds([]);
  }, [empresaId]);

  useEffect(() => {
    setRolId("");
    setSucursalIds([]);
  }, [tenantId]);

  useEffect(() => {
    if (roles.length > 0 && !rolId) {
      const cajero = roles.find((r) => r.codigo === "Cajero") ?? roles[0];
      setRolId(cajero.id);
    }
  }, [roles, rolId]);

  async function crearRol() {
    if (!tenantId) return;
    setRolLoading(true);
    setError("");
    try {
      await api.operaciones.crearRolTenant(tenantId, {
        nombre: rolNombre.trim(),
        permisoCodigos: rolPermisos,
        nivel: 2,
      });
      setRolNombre("");
      setRolPermisos([]);
      setMostrarNuevoRol(false);
      await qc.invalidateQueries({ queryKey: ["platform-tenant-roles", tenantId] });
    } catch (err) {
      setError(getApiErrorMessage(err) || "No se pudo crear el rol.");
    } finally {
      setRolLoading(false);
    }
  }

  async function crearStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !rolId) return;
    setLoading(true);
    setError("");
    try {
      await api.operaciones.crearStaffNegocio({
        tenantId,
        dni: dni.trim(),
        nombreCompleto: nombre.trim(),
        email: email.trim() || undefined,
        rolTenantId: rolId,
        sucursalIds: esGerente ? undefined : sucursalIds,
      });
      setDni("");
      setNombre("");
      setEmail("");
      setSucursalIds([]);
      onCreated();
      setAbierto(false);
    } catch (err) {
      setError(getApiErrorMessage(err) || "No se pudo crear el usuario.");
    } finally {
      setLoading(false);
    }
  }

  function toggleSucursal(id: string) {
    setSucursalIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className={`${platformUi.card} mt-6`}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left"
        onClick={() => setAbierto((v) => !v)}
      >
        <span className="flex items-center gap-2 font-semibold text-[var(--p-text)]">
          <UserPlus className="h-5 w-5" aria-hidden />
          Crear usuario en una empresa (staff del negocio)
        </span>
        {abierto ? (
          <ChevronUp className={`h-5 w-5 ${platformUi.textMuted}`} />
        ) : (
          <ChevronDown className={`h-5 w-5 ${platformUi.textMuted}`} />
        )}
      </button>

      {abierto && (
        <div className="mt-4 border-t border-[var(--p-border)] pt-4">
          <p className={`text-sm ${platformUi.textBody}`}>
            Elige la <strong>empresa pagadora</strong> y el <strong>negocio (tenant)</strong>. Si no hay roles, se
            crean Gerente y Cajero automáticamente; también puedes definir un rol custom con permisos.
          </p>

          {error && (
            <p className={`mt-3 ${platformUi.alertDanger}`}>{error}</p>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className={platformUi.formLabel}>Empresa pagadora</span>
              <select
                className={platformUi.input}
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
              >
                <option value="">— Seleccionar —</option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombreComercial} ({e.estado})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className={platformUi.formLabel}>Negocio (tenant)</span>
              <select
                className={platformUi.input}
                value={tenantId}
                disabled={!empresaId}
                onChange={(e) => setTenantId(e.target.value)}
              >
                <option value="">— Seleccionar —</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombreComercialNegocio} · {t.subdomain}
                    {!t.isActive ? " (inactivo)" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {empresaId && tenants.length === 0 && (
            <p className={`mt-2 text-sm ${platformUi.alertWarn}`}>
              Esta empresa no tiene tenants. Créalo desde Tenants o onboarding antes de asignar staff.
            </p>
          )}

          {tenantId && (
            <>
              {(rolesQ.isLoading || sucursalesQ.isLoading) && (
                <p className={`mt-3 flex items-center gap-2 text-sm ${platformUi.textMuted}`}>
                  <Loader2 className="h-4 w-4 animate-spin" /> Cargando roles y sucursales…
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={platformUi.btnSecondary}
                  onClick={() => void rolesQ.refetch()}
                >
                  Refrescar roles
                </button>
                <button
                  type="button"
                  className={platformUi.btnSecondary}
                  onClick={() => setMostrarNuevoRol((v) => !v)}
                >
                  {mostrarNuevoRol ? "Ocultar nuevo rol" : "Crear rol y permisos"}
                </button>
              </div>

              {mostrarNuevoRol && (
                <div className={`mt-4 p-4 ${platformUi.cardInner}`}>
                  <label className="block text-sm">
                    <span className={platformUi.formLabel}>Nombre del rol</span>
                    <input
                      className={platformUi.input}
                      value={rolNombre}
                      onChange={(e) => setRolNombre(e.target.value)}
                      placeholder="Ej. Recepción"
                    />
                  </label>
                  <p className={`mt-3 text-xs font-medium uppercase ${platformUi.textMuted}`}>Permisos Sport</p>
                  <PermisosGruposPicker
                    className={`mt-2 max-h-64 overflow-y-auto p-2 ${platformUi.cardInner}`}
                    catalogo={permisosCatalogo}
                    selected={rolPermisos}
                    onChange={setRolPermisos}
                  />
                  <button
                    type="button"
                    disabled={rolLoading || !rolNombre.trim() || rolPermisos.length === 0}
                    className={`${platformUi.btnPrimary} mt-3`}
                    onClick={() => void crearRol()}
                  >
                    {rolLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Guardar rol en este negocio
                  </button>
                </div>
              )}

              <form onSubmit={crearStaff} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className={platformUi.formLabel}>DNI (8 dígitos)</span>
                    <input
                      required
                      className={platformUi.input}
                      value={dni}
                      onChange={(e) => setDni(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className={platformUi.formLabel}>Nombre completo</span>
                    <input
                      required
                      className={platformUi.input}
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className={platformUi.formLabel}>Email</span>
                    <input
                      type="email"
                      className={platformUi.input}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className={platformUi.formLabel}>Rol en el negocio</span>
                    <select
                      required
                      className={platformUi.input}
                      value={rolId}
                      onChange={(e) => setRolId(e.target.value)}
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nombre} ({r.codigo}){r.esSistema ? " · sistema" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {!esGerente && sucursales.length > 0 && (
                  <fieldset className="text-sm">
                    <legend className={platformUi.formLabel}>Sucursales asignadas</legend>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {sucursales.filter((s) => s.activa).map((s) => (
                        <label key={s.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={sucursalIds.includes(s.id)}
                            onChange={() => toggleSucursal(s.id)}
                          />
                          {s.nombre}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}

                <button type="submit" disabled={loading} className={platformUi.btnPrimary}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Crear usuario staff
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
