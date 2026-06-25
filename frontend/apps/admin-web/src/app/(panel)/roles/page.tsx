"use client";

import { PermisosGruposPicker } from "@/components/permisos-grupos-picker";
import { usePlatformApi } from "@/lib/platform-api-context";
import { usePlatformAuthStore, usePlatformPermisos } from "@/lib/platform-auth-store";
import { platformUi } from "@/lib/platform-ui";
import { getApiErrorMessage } from "@kallpanexus/api-client";
import { hasPlatformPermission } from "@kallpanexus/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type PermisoRow = { id: string; codigo: string; modulo: string; descripcion: string };

type RolRow = {
  id: string;
  codigo: string;
  nombre: string;
  nivel: number;
  esSistema: boolean;
  permisos: string[];
};

function mapPermiso(p: Record<string, unknown>): PermisoRow {
  return {
    id: String(p.id ?? p.Id ?? ""),
    codigo: String(p.codigo ?? p.Codigo ?? ""),
    modulo: String(p.modulo ?? p.Modulo ?? ""),
    descripcion: String(p.descripcion ?? p.Descripcion ?? ""),
  };
}

function mapRol(r: Record<string, unknown>): RolRow {
  const perms = r.permisos ?? r.Permisos;
  return {
    id: String(r.id ?? r.Id ?? ""),
    codigo: String(r.codigo ?? r.Codigo ?? ""),
    nombre: String(r.nombre ?? r.Nombre ?? ""),
    nivel: Number(r.nivel ?? r.Nivel ?? 0),
    esSistema: Boolean(r.esSistema ?? r.EsSistema ?? false),
    permisos: Array.isArray(perms) ? (perms as string[]) : [],
  };
}

function nivelSesionPlataforma(rolCodigo: string | undefined): number {
  if (rolCodigo === "SuperAdmin") return 100;
  if (rolCodigo === "AdminPlataforma") return 80;
  if (rolCodigo === "GerentePlataforma") return 50;
  return 40;
}

function slugCodigoRol(nombre: string): string {
  const base = nombre
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .slice(0, 48);
  return base.length > 0 ? base : "RolCustom";
}

const NIVELES_SUGERIDOS = [
  { value: 40, label: "40 — Operador plataforma" },
  { value: 30, label: "30 — Soporte limitado" },
  { value: 20, label: "20 — Solo lectura ampliada" },
  { value: 10, label: "10 — Mínimo" },
];

export default function PlatformRolesPage() {
  const api = usePlatformApi();
  const qc = useQueryClient();
  const permisosSesion = usePlatformPermisos();
  const rolSesion = usePlatformAuthStore((s) => s.session?.rol);
  const puedeGestionar = hasPlatformPermission(permisosSesion, "platform:roles:gestionar");

  const miNivel = nivelSesionPlataforma(rolSesion);
  const nivelesCrear = NIVELES_SUGERIDOS.filter((n) => n.value < miNivel);

  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoCodigo, setNuevoCodigo] = useState("");
  const [nuevoNivel, setNuevoNivel] = useState<number>(() => nivelesCrear[0]?.value ?? 10);
  const [nuevoPermisos, setNuevoPermisos] = useState<string[]>([]);
  const [rolEditId, setRolEditId] = useState<string | null>(null);
  const [editPermisos, setEditPermisos] = useState<string[]>([]);
  const [error, setError] = useState("");

  const rolesQ = useQuery({
    queryKey: ["platform-roles"],
    queryFn: () => api.roles.list(),
  });

  const catalogoQ = useQuery({
    queryKey: ["platform-permisos-catalogo"],
    queryFn: () => api.roles.permisosCatalogo(),
    enabled: puedeGestionar,
  });

  const permisosCatalogo = useMemo(
    () => ((catalogoQ.data ?? []) as Record<string, unknown>[]).map(mapPermiso),
    [catalogoQ.data]
  );

  const idPorCodigo = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of permisosCatalogo) m.set(p.codigo, p.id);
    return m;
  }, [permisosCatalogo]);

  const permisosAsignables = useMemo(
    () =>
      permisosCatalogo
        .filter((p) => permisosSesion.includes(p.codigo))
        .map((p) => p.codigo)
        .sort(),
    [permisosCatalogo, permisosSesion]
  );

  const roles = useMemo(
    () => ((rolesQ.data ?? []) as Record<string, unknown>[]).map(mapRol),
    [rolesQ.data]
  );

  function codigosAIds(codigos: string[]): string[] {
    return codigos.map((c) => idPorCodigo.get(c)).filter((id): id is string => Boolean(id));
  }

  const crearMut = useMutation({
    mutationFn: async () => {
      const codigo = (nuevoCodigo.trim() || slugCodigoRol(nuevoNombre)).slice(0, 48);
      const ids = codigosAIds(nuevoPermisos);
      return api.roles.crear({
        codigo,
        nombre: nuevoNombre.trim(),
        nivel: nuevoNivel,
        permisoIds: ids,
      });
    },
    onSuccess: async () => {
      setNuevoNombre("");
      setNuevoCodigo("");
      setNuevoPermisos([]);
      setNuevoAbierto(false);
      setError("");
      await qc.invalidateQueries({ queryKey: ["platform-roles"] });
    },
    onError: (e) => setError(getApiErrorMessage(e) || "No se pudo crear el rol."),
  });

  const guardarPermisosMut = useMutation({
    mutationFn: async () => {
      if (!rolEditId) throw new Error("Sin rol");
      return api.roles.actualizarPermisos(rolEditId, codigosAIds(editPermisos));
    },
    onSuccess: async () => {
      setRolEditId(null);
      setEditPermisos([]);
      setError("");
      await qc.invalidateQueries({ queryKey: ["platform-roles"] });
    },
    onError: (e) => setError(getApiErrorMessage(e) || "No se pudieron guardar los permisos."),
  });

  const eliminarMut = useMutation({
    mutationFn: (id: string) => api.roles.eliminar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-roles"] }),
    onError: (e) => setError(getApiErrorMessage(e) || "No se pudo eliminar el rol."),
  });

  function abrirEditar(rol: RolRow) {
    setRolEditId(rol.id);
    setEditPermisos([...rol.permisos]);
    setError("");
  }

  return (
    <div>
      <h1 className={platformUi.pageTitle}>Roles de plataforma</h1>
      <p className={platformUi.pageSubtitle}>
        Roles internos de Kallpa Nexus (permisos de consola). Asígnalos al{" "}
        <Link href="/usuarios" className={platformUi.link}>
          crear usuario de plataforma
        </Link>
        .
      </p>

      {error && <p className={`mt-4 ${platformUi.alertDanger}`}>{error}</p>}

      {rolesQ.isLoading && (
        <p className={`mt-8 flex items-center gap-2 ${platformUi.textMuted}`}>
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando roles…
        </p>
      )}

      {puedeGestionar && (
        <div className={`${platformUi.card} mt-6`}>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 text-left"
            onClick={() => setNuevoAbierto((v) => !v)}
          >
            <span className="font-semibold text-[var(--p-text)]">Nuevo rol personalizado</span>
            {nuevoAbierto ? (
              <ChevronUp className={`h-5 w-5 ${platformUi.textMuted}`} />
            ) : (
              <ChevronDown className={`h-5 w-5 ${platformUi.textMuted}`} />
            )}
          </button>
          {nuevoAbierto && (
            <div className="mt-4 border-t border-[var(--p-border)] pt-4">
              <p className={`text-sm ${platformUi.textBody}`}>
                Solo puedes asignar permisos que tú ya tienes. El nivel del rol debe ser menor al
                tuyo ({miNivel}).
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm sm:col-span-2">
                  <span className={platformUi.formLabel}>Nombre del rol</span>
                  <input
                    className={platformUi.input}
                    value={nuevoNombre}
                    onChange={(e) => {
                      setNuevoNombre(e.target.value);
                      if (!nuevoCodigo.trim()) {
                        setNuevoCodigo(slugCodigoRol(e.target.value));
                      }
                    }}
                    placeholder="Ej. Soporte comercial"
                  />
                </label>
                <label className="block text-sm">
                  <span className={platformUi.formLabel}>Código (único)</span>
                  <input
                    className={platformUi.input}
                    value={nuevoCodigo}
                    onChange={(e) => setNuevoCodigo(e.target.value.replace(/\s/g, ""))}
                    placeholder="SoporteComercial"
                  />
                </label>
                <label className="block text-sm">
                  <span className={platformUi.formLabel}>Nivel</span>
                  <select
                    className={platformUi.input}
                    value={nuevoNivel}
                    onChange={(e) => setNuevoNivel(Number(e.target.value))}
                  >
                    {nivelesCrear.map((n) => (
                      <option key={n.value} value={n.value}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className={`mt-4 text-xs font-medium uppercase ${platformUi.textMuted}`}>
                Permisos de plataforma
              </p>
              <PermisosGruposPicker
                className={`mt-2 max-h-72 overflow-y-auto p-2 ${platformUi.cardInner}`}
                catalogo={permisosAsignables}
                selected={nuevoPermisos}
                onChange={setNuevoPermisos}
              />
              <button
                type="button"
                className={`${platformUi.btnPrimary} mt-4`}
                disabled={
                  crearMut.isPending ||
                  !nuevoNombre.trim() ||
                  nuevoPermisos.length === 0 ||
                  nivelesCrear.length === 0
                }
                onClick={() => {
                  setError("");
                  crearMut.mutate();
                }}
              >
                {crearMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Crear rol
              </button>
            </div>
          )}
        </div>
      )}

      <div className={`${platformUi.tableWrap} mt-6`}>
        <table className="min-w-full text-left text-sm">
          <thead className={platformUi.tableHead}>
            <tr>
              <th className={platformUi.th}>Rol</th>
              <th className={platformUi.th}>Nivel</th>
              <th className={platformUi.th}>Permisos</th>
              <th className={platformUi.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id} className={platformUi.tableRow}>
                <td className={platformUi.td}>
                  <p className="font-medium text-[var(--p-text)]">{r.nombre}</p>
                  <p className={`text-xs ${platformUi.textMuted}`}>
                    {r.codigo}
                    {r.esSistema ? " · sistema" : ""}
                  </p>
                </td>
                <td className={platformUi.td}>{r.nivel}</td>
                <td className={`${platformUi.td} text-xs ${platformUi.textBody}`}>
                  {r.permisos.length} permisos
                </td>
                <td className={platformUi.td}>
                  <div className="flex flex-wrap gap-2">
                    {puedeGestionar && r.nivel < miNivel && (
                      <button
                        type="button"
                        className={platformUi.btnSecondary}
                        onClick={() => abrirEditar(r)}
                      >
                        Editar permisos
                      </button>
                    )}
                    {puedeGestionar && !r.esSistema && r.nivel < miNivel && (
                      <button
                        type="button"
                        className={`${platformUi.btnSecondary} !border-red-400 !text-red-700`}
                        disabled={eliminarMut.isPending}
                        onClick={() => {
                          if (
                            !window.confirm(
                              `¿Eliminar el rol «${r.nombre}»? Debe no tener usuarios asignados.`
                            )
                          ) {
                            return;
                          }
                          setError("");
                          eliminarMut.mutate(r.id);
                        }}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!rolesQ.isLoading && roles.length === 0 && (
              <tr>
                <td colSpan={4} className={`px-4 py-8 text-center ${platformUi.textMuted}`}>
                  Sin roles visibles para tu nivel.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rolEditId && puedeGestionar && (
        <section className={`${platformUi.card} mt-6`}>
          <h2 className={platformUi.sectionTitle}>Permisos del rol</h2>
          <p className={`mt-1 text-xs ${platformUi.textMuted}`}>
            Solo permisos que tú ya tienes en sesión.
          </p>
          <PermisosGruposPicker
            className={`mt-3 max-h-72 overflow-y-auto p-2 ${platformUi.cardInner}`}
            catalogo={permisosAsignables}
            selected={editPermisos}
            onChange={setEditPermisos}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={platformUi.btnPrimary}
              disabled={guardarPermisosMut.isPending || editPermisos.length === 0}
              onClick={() => {
                setError("");
                guardarPermisosMut.mutate();
              }}
            >
              {guardarPermisosMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar permisos
            </button>
            <button
              type="button"
              className={platformUi.btnSecondary}
              onClick={() => {
                setRolEditId(null);
                setEditPermisos([]);
              }}
            >
              Cancelar
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
