"use client";

import { PERMISOS_SPORT, type TenantStaffListItem } from "@kallpanexus/types";
import { normalizarDniStaff } from "@kallpanexus/shared";
import { consultarDniParaFormulario } from "@/lib/consulta-dni";
import { useTenantApi } from "@/lib/api-context";
import { canAccess, useAuthStore } from "@/lib/auth-store";
import { ApiErrorPresentacion } from "@/components/api-error-presentacion";
import { useUiFeedback } from "@/components/ui-feedback-provider";
import { manejarErrorApi } from "@/lib/manejar-error-api";
import { PanelSeccionColapsable } from "@/components/panel-seccion-colapsable";
import { SucursalesStaffPicker } from "@/components/sucursales-staff-picker";
import { PermisosGruposPicker } from "@/components/permisos-grupos-picker";
import { PlanUsoBanner } from "@/components/plan-uso-banner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";

type Tab = "usuarios" | "roles";

function normalizarStaffListItem(raw: TenantStaffListItem): TenantStaffListItem {
  const ext = raw as TenantStaffListItem & {
    Id?: string;
    Sucursales?: { id?: string; Id?: string; nombre?: string; Nombre?: string }[];
  };
  const sucursales = (raw.sucursales ?? ext.Sucursales ?? [])
    .map((s) => ({
      id: String(s.id ?? (s as { Id?: string }).Id ?? ""),
      nombre: String(s.nombre ?? (s as { Nombre?: string }).Nombre ?? ""),
    }))
    .filter((s) => s.id.length > 0);
  return {
    ...raw,
    id: String(raw.id ?? ext.Id ?? ""),
    sucursales,
  };
}

export default function EquipoPage() {
  const permisos = useAuthStore((s) => s.session?.permisos ?? []);
  const puedeUsuarios = canAccess(permisos, PERMISOS_SPORT.usuariosVer);
  const puedeRoles = canAccess(permisos, PERMISOS_SPORT.rolesVer);
  const puedeCrearUsuario = canAccess(permisos, PERMISOS_SPORT.usuariosCrear);
  const puedeActivar = canAccess(permisos, PERMISOS_SPORT.usuariosActivar);
  const puedeEliminar = canAccess(permisos, PERMISOS_SPORT.usuariosEliminar);
  const puedeGestionarRoles = canAccess(permisos, PERMISOS_SPORT.rolesGestionar);

  const [tab, setTab] = useState<Tab>(puedeUsuarios ? "usuarios" : "roles");
  const api = useTenantApi();
  const { data: suscripcion } = useQuery({
    queryKey: ["tenant-suscripcion"],
    queryFn: () => api.suscripcion.resumen(),
    enabled: puedeUsuarios || puedeRoles,
  });

  if (!puedeUsuarios && !puedeRoles) {
    return (
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900">
        Sin permiso para ver usuarios o roles del club.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="panel-page-title">Equipo del club</h2>
        <p className="panel-page-sub">
          Usuarios y roles de <span className="font-semibold text-slate-800">este negocio</span> (cada club
          tiene sus propios roles; el gerente no aparece en el listado de usuarios).
        </p>
      </header>

      <PlanUsoBanner data={suscripcion} variante="staff" />

      <div className="flex gap-2 border-b border-slate-200">
        {puedeUsuarios && (
          <TabBtn active={tab === "usuarios"} onClick={() => setTab("usuarios")}>
            Usuarios
          </TabBtn>
        )}
        {puedeRoles && (
          <TabBtn active={tab === "roles"} onClick={() => setTab("roles")}>
            Roles
          </TabBtn>
        )}
      </div>

      {tab === "usuarios" && puedeUsuarios && (
        <UsuariosTab
          puedeCrear={puedeCrearUsuario}
          puedeActivar={puedeActivar}
          puedeEliminar={puedeEliminar}
        />
      )}
      {tab === "roles" && puedeRoles && (
        <RolesTab puedeGestionar={puedeGestionarRoles} permisosSesion={permisos} />
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "border-b-2 border-emerald-400 px-4 py-2 text-sm font-semibold text-sport-navy"
          : "px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
      }
    >
      {children}
    </button>
  );
}

function UsuariosTab({
  puedeCrear,
  puedeActivar,
  puedeEliminar,
}: {
  puedeCrear: boolean;
  puedeActivar: boolean;
  puedeEliminar: boolean;
}) {
  const api = useTenantApi();
  const { confirmar, notificar, notificarConexion } = useUiFeedback();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [esperandoApi, setEsperandoApi] = useState(false);
  const [cuentaDesactivada, setCuentaDesactivada] = useState<string | null>(null);

  function onErrorApi(e: unknown) {
    manejarErrorApi(e, {
      setError,
      setEsperandoApi,
      setCuentaDesactivada,
      notificarConexion,
    });
  }
  const [buscandoDni, setBuscandoDni] = useState(false);
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    nombreCompleto: "",
    email: "",
    rolTenantId: "",
    sucursalIds: [] as string[],
  });

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ["tenant-usuarios"],
    queryFn: async () => {
      const lista = await api.equipo.usuarios.list();
      return lista.map(normalizarStaffListItem);
    },
  });

  const { data: roles = [], isLoading: cargandoRoles } = useQuery({
    queryKey: ["tenant-roles"],
    queryFn: () => api.equipo.roles.list(),
    enabled: puedeCrear || puedeActivar,
  });

  const { data: sucursalesClub = [] } = useQuery({
    queryKey: ["sucursales"],
    queryFn: () => api.sucursales.list(),
    enabled: puedeCrear || puedeActivar,
  });

  const [nuevo, setNuevo] = useState({
    dni: "",
    nombreCompleto: "",
    email: "",
    rolTenantId: "",
    sucursalIds: [] as string[],
  });

  const rolNuevo = roles.find((r) => r.id === nuevo.rolTenantId);
  const emailObligatorio = rolNuevo?.codigo === "Gerente";
  const esRolGerente = rolNuevo?.codigo === "Gerente";
  const dniListo = nuevo.dni.length === 8;

  async function buscarDatosDni() {
    if (!dniListo || buscandoDni) return;
    const dniNorm = normalizarDniStaff(nuevo.dni);
    const enEquipo = usuarios.find((u) => u.dni === dniNorm);
    if (enEquipo) {
      setNuevo((n) => ({
        ...n,
        nombreCompleto: enEquipo.nombreCompleto,
        email: enEquipo.email ?? n.email,
      }));
      setError("Ese DNI ya pertenece a un usuario de este club.");
      return;
    }

    setBuscandoDni(true);
    const r = await consultarDniParaFormulario(api, dniNorm);
    setBuscandoDni(false);
    if (!r.ok) {
      setError(r.mensaje);
      return;
    }
    setError(null);
    setNuevo((n) => ({
      ...n,
      nombreCompleto: r.data.fullName || n.nombreCompleto,
      email: r.data.email ?? n.email,
    }));
  }

  const crear = useMutation({
    mutationFn: () =>
      api.equipo.usuarios.crear({
        dni: normalizarDniStaff(nuevo.dni),
        nombreCompleto: nuevo.nombreCompleto,
        email: emailObligatorio ? nuevo.email.trim() : undefined,
        rolTenantId: nuevo.rolTenantId,
        sucursalIds: esRolGerente ? undefined : nuevo.sucursalIds,
      }),
    onSuccess: () => {
      setNuevo({ dni: "", nombreCompleto: "", email: "", rolTenantId: "", sucursalIds: [] });
      setNuevoAbierto(false);
      setError(null);
      qc.invalidateQueries({ queryKey: ["tenant-usuarios"] });
      qc.invalidateQueries({ queryKey: ["tenant-suscripcion"] });
    },
    onError: onErrorApi,
  });

  const toggleActivo = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      api.equipo.usuarios.actualizar(id, { activo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenant-usuarios"] }),
  });

  const eliminar = useMutation({
    mutationFn: (id: string) => api.equipo.usuarios.eliminar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenant-usuarios"] }),
  });

  const restablecer = useMutation({
    mutationFn: (id: string) => api.equipo.usuarios.restablecerPassword(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenant-usuarios"] }),
    onError: onErrorApi,
  });

  const rolEdit = roles.find((r) => r.id === editForm.rolTenantId);
  const editEsGerente = rolEdit?.codigo === "Gerente";

  const guardarEdicion = useMutation({
    mutationFn: () => {
      if (!editId) throw new Error("Sin usuario");
      return api.equipo.usuarios.actualizar(editId, {
        nombreCompleto: editForm.nombreCompleto.trim(),
        email: editEsGerente ? editForm.email.trim() : undefined,
        rolTenantId: editForm.rolTenantId || undefined,
        sucursalIds: editEsGerente ? [] : editForm.sucursalIds,
      });
    },
    onSuccess: () => {
      setEditId(null);
      setError(null);
      notificar("Usuario actualizado.", "exito");
      qc.invalidateQueries({ queryKey: ["tenant-usuarios"] });
    },
    onError: onErrorApi,
  });

  function abrirEditar(u: TenantStaffListItem) {
    const norm = normalizarStaffListItem(u);
    const rolId = roles.find((r) => r.codigo === norm.rol)?.id ?? "";
    setEditId(norm.id);
    setEditForm({
      nombreCompleto: norm.nombreCompleto,
      email: norm.email ?? "",
      rolTenantId: rolId,
      sucursalIds: norm.sucursales?.map((s) => s.id) ?? [],
    });
    setError(null);
  }

  return (
    <div className="space-y-4">
      {editId && puedeActivar && (
        <PanelSeccionColapsable
          titulo="Editar usuario"
          descripcion="Nombre, rol, sucursales y correo (gerente)"
          variante="acento"
          abierto
          onAlternar={() => setEditId(null)}
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <input
              className="panel-input sm:col-span-2"
              value={editForm.nombreCompleto}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, nombreCompleto: e.target.value }))
              }
              placeholder="Nombre completo"
            />
            <select
              className="panel-input"
              value={editForm.rolTenantId}
              onChange={(e) =>
                setEditForm((f) => ({
                  ...f,
                  rolTenantId: e.target.value,
                  sucursalIds: [],
                }))
              }
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre} ({r.codigo})
                </option>
              ))}
            </select>
            {editEsGerente && (
              <input
                type="email"
                className="panel-input sm:col-span-2"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email gerente"
              />
            )}
          </div>
          {!editEsGerente && editForm.rolTenantId && (
            <SucursalesStaffPicker
              rolCodigo={rolEdit?.codigo ?? ""}
              sucursalIds={editForm.sucursalIds}
              onChange={(sucursalIds) => setEditForm((f) => ({ ...f, sucursalIds }))}
              sucursales={sucursalesClub}
            />
          )}
          {editId && (
            <ApiErrorPresentacion
              esperandoApi={esperandoApi}
              error={error}
              cuentaDesactivada={cuentaDesactivada}
            />
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="panel-btn-primary"
              disabled={
                guardarEdicion.isPending ||
                !editForm.nombreCompleto.trim() ||
                !editForm.rolTenantId ||
                (!editEsGerente && editForm.sucursalIds.length === 0) ||
                (editEsGerente && !editForm.email.trim())
              }
              onClick={() => {
                setError(null);
                guardarEdicion.mutate();
              }}
            >
              Guardar cambios
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300"
              onClick={() => setEditId(null)}
            >
              Cancelar
            </button>
          </div>
        </PanelSeccionColapsable>
      )}
      {puedeCrear && (
        <PanelSeccionColapsable
          titulo="Nuevo usuario"
          descripcion="DNI y Buscar (BD o RENIEC) → nombre; contraseña inicial = DNI"
          variante="acento"
          abierto={nuevoAbierto}
          onAlternar={() => setNuevoAbierto((v) => !v)}
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex gap-2 sm:col-span-2">
              <input
                placeholder="DNI (8 dígitos)"
                inputMode="numeric"
                maxLength={8}
                className="min-w-0 flex-1 panel-input"
                value={nuevo.dni}
                onChange={(e) => {
                  setError(null);
                  setNuevo((n) => ({
                    ...n,
                    dni: normalizarDniStaff(e.target.value).slice(0, 8),
                  }));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && dniListo && !buscandoDni) {
                    e.preventDefault();
                    void buscarDatosDni();
                  }
                }}
              />
              <button
                type="button"
                className="shrink-0 rounded-lg border-2 border-emerald-500 px-4 py-2 text-sm font-semibold text-sport-navy transition enabled:hover:bg-emerald-500/10 disabled:border-slate-700 disabled:text-slate-600"
                disabled={buscandoDni || !dniListo}
                onClick={() => void buscarDatosDni()}
              >
                {buscandoDni ? "…" : "Buscar"}
              </button>
            </div>
            <input
              placeholder="Nombre completo"
              className="panel-input"
              value={nuevo.nombreCompleto}
              onChange={(e) => setNuevo((n) => ({ ...n, nombreCompleto: e.target.value }))}
            />
            {emailObligatorio && (
              <input
                placeholder="Email (gerente)"
                type="email"
                className="panel-input"
                value={nuevo.email}
                onChange={(e) => setNuevo((n) => ({ ...n, email: e.target.value }))}
              />
            )}
            <select
              className="panel-input"
              value={nuevo.rolTenantId}
              onChange={(e) =>
                setNuevo((n) => ({
                  ...n,
                  rolTenantId: e.target.value,
                  sucursalIds: [],
                }))
              }
              disabled={cargandoRoles || roles.length === 0}
            >
              <option value="">
                {cargandoRoles
                  ? "Cargando roles…"
                  : roles.length === 0
                    ? "Sin roles — pestaña Roles"
                    : "Rol…"}
              </option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre} ({r.codigo})
                </option>
              ))}
            </select>
          </div>
          {nuevo.rolTenantId && !esRolGerente && (
            <SucursalesStaffPicker
              rolCodigo={rolNuevo?.codigo ?? ""}
              sucursalIds={nuevo.sucursalIds}
              onChange={(sucursalIds) => setNuevo((prev) => ({ ...prev, sucursalIds }))}
              sucursales={sucursalesClub}
            />
          )}
          {esRolGerente && nuevo.rolTenantId && (
            <p className="mt-2 text-xs text-slate-500">
              El rol Gerente opera en todas las sucursales del negocio.
            </p>
          )}
          {!cargandoRoles && roles.length === 0 && (
            <p className="text-xs text-amber-900/90">
              No hay roles asignables (debería existir al menos «Cajero»). Reinicia la API en
              desarrollo para reparar el seed de este tenant, o crea un rol en la pestaña Roles.
            </p>
          )}
          <ApiErrorPresentacion
            esperandoApi={esperandoApi}
            error={error}
            cuentaDesactivada={cuentaDesactivada}
          />
          <button
            type="button"
            className="mt-3 panel-btn-primary"
            disabled={
              crear.isPending ||
              !nuevo.rolTenantId ||
              nuevo.dni.length !== 8 ||
              !nuevo.nombreCompleto.trim() ||
              (emailObligatorio && !nuevo.email.trim()) ||
              (!esRolGerente && nuevo.sucursalIds.length === 0)
            }
            onClick={() => crear.mutate()}
          >
            Crear usuario
          </button>
        </PanelSeccionColapsable>
      )}

      <div className="panel-card overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="panel-table-head">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">DNI</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Sucursales</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-slate-500">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading && usuarios.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-slate-500">
                  No hay usuarios de nivel inferior (el gerente no aparece en esta lista).
                  Crea un cajero para empezar.
                </td>
              </tr>
            )}
            {usuarios.map((u) => (
              <tr key={u.id} className="panel-table-row">
                <td className="px-4 py-3 text-slate-900">{u.nombreCompleto}</td>
                <td className="px-4 py-3 font-mono text-slate-700">{u.dni}</td>
                <td className="px-4 py-3 text-slate-700">{u.email ?? "—"}</td>
                <td className="px-4 py-3 text-slate-700">
                  {u.rol} <span className="text-xs">nivel {u.nivel}</span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-700">
                  {u.accesoTodasSucursales
                    ? "Todas"
                    : (u.sucursales?.map((s) => s.nombre).join(", ") || "—")}
                </td>
                <td className="px-4 py-3">
                  {u.activo ? (
                    <span className="panel-badge-ok">Activo</span>
                  ) : (
                    <span className="text-slate-500">Inactivo</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2 text-xs">
                    {puedeActivar && (
                      <>
                        <button
                          type="button"
                          className="font-semibold text-sky-700 hover:underline"
                          onClick={() => abrirEditar(u)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="panel-link-edit"
                          onClick={() =>
                            toggleActivo.mutate({ id: u.id, activo: !u.activo })
                          }
                        >
                          {u.activo ? "Desactivar" : "Activar"}
                        </button>
                        <button
                          type="button"
                          className="panel-link-warn"
                          onClick={async () => {
                            const ok = await confirmar({
                              titulo: "Restablecer contraseña",
                              mensaje: `La clave volverá a ser el DNI (${u.dni}) y deberá cambiarla al ingresar. ¿Continuar?`,
                              confirmarTexto: "Restablecer",
                              variante: "advertencia",
                            });
                            if (ok) restablecer.mutate(u.id);
                          }}
                        >
                          Restablecer clave
                        </button>
                      </>
                    )}
                    {puedeEliminar && (
                      <button
                        type="button"
                        className="panel-link-danger"
                        onClick={async () => {
                          const ok = await confirmar({
                            titulo: "Eliminar usuario",
                            mensaje: `Se quitará del equipo a ${u.nombreCompleto} (DNI ${u.dni}). ¿Continuar?`,
                            confirmarTexto: "Eliminar",
                            variante: "peligro",
                          });
                          if (ok) eliminar.mutate(u.id);
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
    </div>
  );
}

function RolesTab({
  puedeGestionar,
  permisosSesion,
}: {
  puedeGestionar: boolean;
  permisosSesion: string[];
}) {
  const api = useTenantApi();
  const { confirmar, notificarConexion } = useUiFeedback();
  const qc = useQueryClient();
  const [rolEditId, setRolEditId] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [esperandoApi, setEsperandoApi] = useState(false);
  const [cuentaDesactivada, setCuentaDesactivada] = useState<string | null>(null);

  function onErrorApiRoles(e: unknown) {
    manejarErrorApi(e, {
      setError,
      setEsperandoApi,
      setCuentaDesactivada,
      notificarConexion,
    });
  }
  const [nuevoRolAbierto, setNuevoRolAbierto] = useState(false);
  const [nuevoRol, setNuevoRol] = useState({ nombre: "", permisos: [] as string[] });

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["tenant-roles"],
    queryFn: () => api.equipo.roles.list(),
  });

  const { data: catalogo = [] } = useQuery({
    queryKey: ["tenant-permisos-catalogo"],
    queryFn: () => api.equipo.roles.catalogoPermisos(),
    enabled: puedeGestionar,
  });

  const permisosAsignables = useMemo(
    () => catalogo.filter((c) => permisosSesion.includes(c)),
    [catalogo, permisosSesion]
  );

  const guardar = useMutation({
    mutationFn: () => {
      if (!rolEditId) throw new Error("Sin rol");
      return api.equipo.roles.actualizarPermisos(rolEditId, seleccion);
    },
    onSuccess: () => {
      setError(null);
      setRolEditId(null);
      qc.invalidateQueries({ queryKey: ["tenant-roles"] });
    },
    onError: onErrorApiRoles,
  });

  const crearRol = useMutation({
    mutationFn: () =>
      api.equipo.roles.crear({
        nombre: nuevoRol.nombre.trim(),
        permisoCodigos: nuevoRol.permisos,
      }),
    onSuccess: () => {
      setNuevoRol({ nombre: "", permisos: [] });
      setNuevoRolAbierto(false);
      setError(null);
      qc.invalidateQueries({ queryKey: ["tenant-roles"] });
    },
    onError: onErrorApiRoles,
  });

  const eliminarRol = useMutation({
    mutationFn: (id: string) => api.equipo.roles.eliminar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenant-roles"] }),
    onError: onErrorApiRoles,
  });

  function abrirEditar(rolId: string, permisosActuales: string[]) {
    setRolEditId(rolId);
    setSeleccion(permisosActuales);
    setError(null);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Los roles son de este negocio (SportZa, etc.). Solo ves roles de nivel inferior al tuyo;
        «Cajero» viene por defecto al crear el club.
      </p>

      {puedeGestionar && (
        <PanelSeccionColapsable
          titulo="Nuevo rol personalizado"
          descripcion="Elige permisos que tú ya tienes; luego asígnalo al crear usuarios"
          variante="acento"
          abierto={nuevoRolAbierto}
          onAlternar={() => setNuevoRolAbierto((v) => !v)}
        >
          <p className="mb-2 text-xs font-medium text-amber-900">
            No crees otro rol llamado «Cajero»: ya existe en la tabla. Ahí usa «Editar permisos».
          </p>
          <input
            placeholder="Nombre del rol (ej. Recepción)"
            className="panel-input w-full max-w-md"
            value={nuevoRol.nombre}
            onChange={(e) => {
              setError(null);
              setNuevoRol((n) => ({ ...n, nombre: e.target.value }));
            }}
          />
          <PermisosGruposPicker
            className="mt-3"
            catalogo={permisosAsignables}
            selected={nuevoRol.permisos}
            onChange={(permisos) => {
              setError(null);
              setNuevoRol((n) => ({ ...n, permisos }));
            }}
          />
          {!rolEditId && (
            <ApiErrorPresentacion
            esperandoApi={esperandoApi}
            error={error}
            cuentaDesactivada={cuentaDesactivada}
          />
          )}
          <button
            type="button"
            className="mt-3 panel-btn-primary"
            disabled={
              crearRol.isPending ||
              !nuevoRol.nombre.trim() ||
              nuevoRol.permisos.length === 0 ||
              /^(cajero|gerente)$/i.test(nuevoRol.nombre.trim())
            }
            onClick={() => {
              setError(null);
              crearRol.mutate();
            }}
          >
            Crear rol
          </button>
        </PanelSeccionColapsable>
      )}

      <div className="panel-card overflow-x-auto">
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead className="panel-table-head">
            <tr>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Nivel</th>
              <th className="px-4 py-3">Permisos</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-slate-500">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading && roles.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-slate-500">
                  Sin roles de nivel inferior. Reinicia la API (dev) para sembrar Cajero en este
                  tenant.
                </td>
              </tr>
            )}
            {roles.map((r) => (
              <tr key={r.id} className="panel-table-row">
                <td className="px-4 py-3 text-slate-900">
                  {r.nombre}
                  <span className="block text-xs text-slate-500">
                    {r.codigo}
                    {r.esSistema ? " · sistema" : ""}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">{r.nivel}</td>
                <td className="px-4 py-3 text-xs text-slate-700">
                  {r.permisos.length} permisos
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2 text-xs">
                    {puedeGestionar && (!r.esSistema || r.codigo === "Cajero") && (
                      <button
                        type="button"
                        className="panel-link-edit"
                        onClick={() => abrirEditar(r.id, r.permisos)}
                      >
                        Editar permisos
                      </button>
                    )}
                    {puedeGestionar && !r.esSistema && (
                      <button
                        type="button"
                        className="panel-link-danger"
                        onClick={async () => {
                          const ok = await confirmar({
                            titulo: "Eliminar rol",
                            mensaje: `¿Eliminar el rol «${r.nombre}»?`,
                            confirmarTexto: "Eliminar",
                            variante: "peligro",
                          });
                          if (ok) eliminarRol.mutate(r.id);
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

      {rolEditId && puedeGestionar && (
        <section className="panel-card p-4">
          <h3 className="text-sm font-medium text-slate-900">Permisos del rol</h3>
          <p className="mt-1 text-xs text-slate-500">
            Solo puedes asignar permisos que tú ya tienes.
          </p>
          <PermisosGruposPicker
            className="mt-3"
            catalogo={permisosAsignables}
            selected={seleccion}
            onChange={setSeleccion}
          />
          <ApiErrorPresentacion
            esperandoApi={esperandoApi}
            error={error}
            cuentaDesactivada={cuentaDesactivada}
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="panel-btn-primary"
              disabled={guardar.isPending}
              onClick={() => guardar.mutate()}
            >
              Guardar
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300"
              onClick={() => setRolEditId(null)}
            >
              Cancelar
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
