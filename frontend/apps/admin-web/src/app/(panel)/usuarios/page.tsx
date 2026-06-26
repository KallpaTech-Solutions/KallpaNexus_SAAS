"use client";

import { CrearStaffEmpresaPanel } from "@/components/crear-staff-empresa-panel";
import { CrearUsuarioPlataformaPanel } from "@/components/crear-usuario-plataforma-panel";
import { PlatformEntityActions } from "@/components/platform-entity-actions";
import { usePlatformApi } from "@/lib/platform-api-context";
import { usePlatformPermisos } from "@/lib/platform-auth-store";
import { platformUi } from "@/lib/platform-ui";
import { hasPlatformPermission } from "@kallpanexus/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type Tab = "plataforma" | "negocios";

function userRow(u: Record<string, unknown>) {
  return {
    id: String(u.id ?? u.Id ?? ""),
    nombre: String(u.nombreCompleto ?? u.NombreCompleto ?? ""),
    email: String(u.email ?? u.Email ?? ""),
    rol: String(u.rol ?? u.Rol ?? ""),
    activo: Boolean(u.activo ?? u.Activo ?? true),
  };
}

function staffRow(s: Record<string, unknown>) {
  return {
    id: String(s.id ?? s.Id ?? ""),
    dni: String(s.dni ?? s.Dni ?? ""),
    nombre: String(s.nombreCompleto ?? s.NombreCompleto ?? ""),
    email: String(s.email ?? s.Email ?? "—"),
    rol: String(s.rol ?? s.Rol ?? ""),
    activo: Boolean(s.activo ?? s.Activo ?? true),
    subdomain: String(s.subdomain ?? s.Subdomain ?? ""),
    negocio: String(s.negocio ?? s.Negocio ?? ""),
    empresa: String(s.empresaPagadora ?? s.EmpresaPagadora ?? ""),
    empresaId: String(s.clienteEmpresaId ?? s.ClienteEmpresaId ?? ""),
    tenantId: String(s.tenantId ?? s.TenantId ?? ""),
    sucursalesAsignadas: Number(s.sucursalesAsignadas ?? s.SucursalesAsignadas ?? 0),
    totalSucursales: Number(s.totalSucursalesTenant ?? s.TotalSucursalesTenant ?? 0),
  };
}

function UsuarioPlataformaAcciones({
  id,
  activo,
  onChanged,
}: {
  id: string;
  activo: boolean;
  onChanged: () => void;
}) {
  const api = usePlatformApi();
  const permisos = usePlatformPermisos();
  const puedeActivar = hasPlatformPermission(permisos, "platform:usuarios:activar");
  const puedeEliminar = hasPlatformPermission(permisos, "platform:usuarios:eliminar");

  const actions = [];
  if (puedeActivar) {
    actions.push({
      id: activo ? "off" : "on",
      label: activo ? "Desactivar" : "Activar",
      confirm: activo
        ? "El usuario no podrá iniciar sesión en la consola Kallpa."
        : undefined,
      onClick: async () => {
        if (activo) {
          await api.usuarios.desactivar(id);
        } else {
          await api.usuarios.actualizar(id, { activo: true });
        }
        onChanged();
      },
    });
  }
  if (puedeEliminar) {
    actions.push({
      id: "del",
      label: "Eliminar",
      variant: "danger" as const,
      confirm:
        "Eliminación permanente del usuario de plataforma. Esta acción no se puede deshacer.",
      onClick: async () => {
        await api.usuarios.eliminar(id);
        onChanged();
      },
    });
  }

  return <PlatformEntityActions actions={actions} />;
}

function StaffNegocioAcciones({
  id,
  dni,
  activo,
  onChanged,
}: {
  id: string;
  dni: string;
  activo: boolean;
  onChanged: () => void;
}) {
  const api = usePlatformApi();
  const permisos = usePlatformPermisos();
  const puede = hasPlatformPermission(permisos, "platform:tenants:gestionar");
  if (!puede) return null;

  const actions = [
    {
      id: "staff-reset-pwd",
      label: "Restablecer clave",
      confirmTitle: "Restablecer contraseña",
      confirm: `La clave volverá a ser el DNI (${dni}) y deberá cambiarla al ingresar al panel del negocio.`,
      successMessage: "Contraseña restablecida al DNI.",
      onClick: async () => {
        await api.operaciones.restablecerPasswordStaffNegocio(id);
        onChanged();
      },
    },
    {
      id: activo ? "staff-off" : "staff-on",
      label: activo ? "Desactivar" : "Activar",
      confirmTitle: activo ? "Desactivar staff" : undefined,
      confirm: activo ? "El staff no podrá entrar al panel del negocio." : undefined,
      successMessage: activo ? "Staff desactivado." : "Staff activado.",
      onClick: async () => {
        await api.operaciones.actualizarStaffNegocio(id, { activo: !activo });
        onChanged();
      },
    },
    {
      id: "staff-del",
      label: "Eliminar",
      variant: "danger" as const,
      confirmTitle: "Eliminar staff del negocio",
      confirm:
        "Elimina el usuario staff de ese tenant (no borra la empresa ni otros negocios con el mismo DNI).",
      successMessage: "Staff eliminado del negocio.",
      onClick: async () => {
        await api.operaciones.eliminarStaffNegocio(id);
        onChanged();
      },
    },
  ];

  return <PlatformEntityActions actions={actions} />;
}

export default function PlatformUsuariosPage() {
  const api = usePlatformApi();
  const permisos = usePlatformPermisos();
  const qc = useQueryClient();
  const puedeGestionarStaff = hasPlatformPermission(permisos, "platform:tenants:gestionar");
  const puedeStaffNegocios = hasPlatformPermission(permisos, "platform:tenants:ver");
  const puedeCrearPlataforma = hasPlatformPermission(permisos, "platform:usuarios:crear");
  const [tab, setTab] = useState<Tab>("plataforma");
  const [qText, setQText] = useState("");

  const platformQ = useQuery({
    queryKey: ["platform-usuarios"],
    queryFn: () => api.usuarios.list(),
    enabled: tab === "plataforma",
  });

  const staffQ = useQuery({
    queryKey: ["platform-staff-negocios", qText],
    queryFn: () =>
      api.operaciones.staffNegocios({
        q: qText.trim() || undefined,
        soloActivos: false,
      }),
    enabled: tab === "negocios" && puedeStaffNegocios,
  });

  const platformRows = useMemo(
    () => ((platformQ.data ?? []) as Record<string, unknown>[]).map(userRow),
    [platformQ.data]
  );
  const staffRows = useMemo(
    () => ((staffQ.data ?? []) as Record<string, unknown>[]).map(staffRow),
    [staffQ.data]
  );

  function refreshPlataforma() {
    void qc.invalidateQueries({ queryKey: ["platform-usuarios"] });
  }

  function refreshStaff() {
    void qc.invalidateQueries({ queryKey: ["platform-staff-negocios"] });
  }

  return (
    <div>
      <h1 className={platformUi.pageTitle}>Usuarios</h1>
      <p className={platformUi.pageSubtitle}>
        Staff de Kallpa Plataforma y usuarios staff de cada negocio (tenant). Roles internos en{" "}
        <Link href="/roles" className={platformUi.link}>
          Roles plataforma
        </Link>
        .
      </p>

      <div className={platformUi.tabsBar}>
        <button
          type="button"
          className={tab === "plataforma" ? platformUi.tabActive : platformUi.tabIdle}
          onClick={() => setTab("plataforma")}
        >
          Plataforma Kallpa
        </button>
        {puedeStaffNegocios && (
          <button
            type="button"
            className={tab === "negocios" ? platformUi.tabActive : platformUi.tabIdle}
            onClick={() => setTab("negocios")}
          >
            Negocios (staff)
          </button>
        )}
      </div>

      {tab === "plataforma" && puedeCrearPlataforma && (
        <CrearUsuarioPlataformaPanel onCreated={refreshPlataforma} />
      )}

      {puedeGestionarStaff && (
        <CrearStaffEmpresaPanel
          onCreated={() => {
            refreshStaff();
            refreshPlataforma();
          }}
        />
      )}

      {tab === "plataforma" && (
        <>
          {platformQ.isLoading && (
            <p className={`mt-8 flex items-center gap-2 ${platformUi.textMuted}`}>
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </p>
          )}
          <div className={platformUi.tableWrap}>
            <table className="min-w-full text-left text-sm">
              <thead className={platformUi.tableHead}>
                <tr>
                  <th className={platformUi.th}>Nombre</th>
                  <th className={platformUi.th}>Email</th>
                  <th className={platformUi.th}>Rol</th>
                  <th className={platformUi.th}>Activo</th>
                  <th className={platformUi.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {platformRows.map((u) => (
                  <tr key={u.id} className={platformUi.tableRow}>
                    <td className={platformUi.td}>{u.nombre}</td>
                    <td className={platformUi.td}>{u.email}</td>
                    <td className={`${platformUi.td} font-mono text-xs ${platformUi.textMuted}`}>{u.rol}</td>
                    <td className={platformUi.td}>{u.activo ? "Sí" : "No"}</td>
                    <td className={platformUi.td}>
                      <UsuarioPlataformaAcciones
                        id={u.id}
                        activo={u.activo}
                        onChanged={refreshPlataforma}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "negocios" && puedeStaffNegocios && (
        <>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className={platformUi.formLabel}>Buscar (DNI, nombre, email)</span>
              <input
                className={`${platformUi.input} max-w-xs`}
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                placeholder="Ej. 76063362"
              />
            </label>
          </div>
          {staffQ.isLoading && (
            <p className={`mt-6 flex items-center gap-2 ${platformUi.textMuted}`}>
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando staff…
            </p>
          )}
          {staffQ.isError && (
            <p className={`mt-6 ${platformUi.alertWarn}`}>
              Reinicia la API para cargar{" "}
              <code className="text-xs">/api/platform/operaciones/staff-negocios</code> y acciones
              PUT/DELETE.
            </p>
          )}
          <div className={`${platformUi.tableWrap} mt-4`}>
            <table className="min-w-full text-left text-sm">
              <thead className={platformUi.tableHead}>
                <tr>
                  <th className={platformUi.th}>Persona</th>
                  <th className={platformUi.th}>Rol tenant</th>
                  <th className={platformUi.th}>Negocio / tenant</th>
                  <th className={platformUi.th}>Empresa pagadora</th>
                  <th className={platformUi.th}>Sucursales</th>
                  <th className={platformUi.th}>Activo</th>
                  <th className={platformUi.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {staffRows.map((u) => (
                  <tr key={u.id} className={platformUi.tableRow}>
                    <td className={platformUi.td}>
                      <p className="font-medium">{u.nombre}</p>
                      <p className={`text-xs ${platformUi.textMuted}`}>
                        DNI {u.dni} · {u.email}
                      </p>
                    </td>
                    <td className={`${platformUi.td} text-xs ${platformUi.textBody}`}>{u.rol}</td>
                    <td className={platformUi.td}>
                      <p>{u.negocio}</p>
                      <p className={`font-mono text-xs ${platformUi.textMuted}`}>{u.subdomain}</p>
                    </td>
                    <td className={platformUi.td}>
                      {u.empresaId ? (
                        <Link href={`/empresas/${u.empresaId}`} className={platformUi.link}>
                          {u.empresa}
                        </Link>
                      ) : (
                        u.empresa
                      )}
                    </td>
                    <td className={platformUi.td}>
                      {u.sucursalesAsignadas} asign. / {u.totalSucursales} en tenant
                    </td>
                    <td className={platformUi.td}>{u.activo ? "Sí" : "No"}</td>
                    <td className={platformUi.td}>
                      <StaffNegocioAcciones
                        id={u.id}
                        dni={u.dni}
                        activo={u.activo}
                        onChanged={refreshStaff}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!staffQ.isLoading && staffRows.length === 0 && (
              <p className={`px-4 py-8 text-center ${platformUi.textMuted}`}>Sin usuarios staff en negocios.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
