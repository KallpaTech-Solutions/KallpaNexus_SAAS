"use client";

import { usePlatformApi } from "@/lib/platform-api-context";
import { platformUi } from "@/lib/platform-ui";
import { getApiErrorMessage } from "@kallpanexus/api-client";
import { validarPoliticaPasswordStaff } from "@kallpanexus/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Loader2, ShieldPlus } from "lucide-react";
import { useMemo, useState } from "react";

function mapRol(r: Record<string, unknown>) {
  return {
    id: String(r.id ?? r.Id ?? ""),
    codigo: String(r.codigo ?? r.Codigo ?? ""),
    nombre: String(r.nombre ?? r.Nombre ?? ""),
    nivel: Number(r.nivel ?? r.Nivel ?? 0),
    esSistema: Boolean(r.esSistema ?? r.EsSistema ?? false),
  };
}

export function CrearUsuarioPlataformaPanel({ onCreated }: { onCreated: () => void }) {
  const api = usePlatformApi();
  const qc = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rolId, setRolId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const rolesQ = useQuery({
    queryKey: ["platform-roles"],
    queryFn: () => api.roles.list(),
    enabled: abierto,
  });

  const roles = useMemo(
    () => ((rolesQ.data ?? []) as Record<string, unknown>[]).map(mapRol),
    [rolesQ.data]
  );

  const rolSel = roles.find((r) => r.id === rolId);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const pwdErr = validarPoliticaPasswordStaff(password, "00000000");
    if (pwdErr) {
      setError(pwdErr);
      return;
    }
    if (!rolId) {
      setError("Elige un rol de plataforma.");
      return;
    }
    setLoading(true);
    try {
      await api.usuarios.crear({
        nombreCompleto: nombre.trim(),
        email: email.trim(),
        password,
        rolPlataformaId: rolId,
        activo: true,
      });
      setNombre("");
      setEmail("");
      setPassword("");
      setRolId("");
      setAbierto(false);
      onCreated();
      await qc.invalidateQueries({ queryKey: ["platform-usuarios"] });
    } catch (err) {
      setError(getApiErrorMessage(err) || "No se pudo crear el usuario.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`${platformUi.card} mt-6`}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left"
        onClick={() => setAbierto((v) => !v)}
      >
        <span className="flex items-center gap-2 font-semibold text-[var(--p-text)]">
          <ShieldPlus className="h-5 w-5" aria-hidden />
          Crear usuario de plataforma (Kallpa Nexus)
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
            Asigna un rol del catálogo (SuperAdmin, AdminPlataforma, GerentePlataforma, etc.). Solo
            puedes crear usuarios con rol de nivel inferior al tuyo; la API valida duplicados y
            límites (p. ej. un SuperAdmin visible activo).
          </p>

          {error && <p className={`mt-3 ${platformUi.alertDanger}`}>{error}</p>}

          {rolesQ.isLoading && (
            <p className={`mt-4 flex items-center gap-2 text-sm ${platformUi.textMuted}`}>
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando roles…
            </p>
          )}

          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                <span className={platformUi.formLabel}>Nombre completo</span>
                <input
                  required
                  className={platformUi.input}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className={platformUi.formLabel}>Email (login)</span>
                <input
                  type="email"
                  required
                  autoComplete="off"
                  className={platformUi.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className={platformUi.formLabel}>Contraseña inicial</span>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  className={platformUi.input}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <span className={`mt-1 block text-xs ${platformUi.textMuted}`}>
                  Mín. 8 caracteres, mayúscula, minúscula y número.
                </span>
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className={platformUi.formLabel}>Rol en la plataforma</span>
                <select
                  required
                  className={platformUi.input}
                  value={rolId}
                  onChange={(e) => setRolId(e.target.value)}
                >
                  <option value="">— Seleccionar rol —</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre} ({r.codigo}) · nivel {r.nivel}
                      {r.esSistema ? " · sistema" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {rolSel?.codigo === "SuperAdmin" && (
              <p className={platformUi.alertWarn}>
                SuperAdmin tiene acceso total. Solo puede haber un SuperAdmin activo visible; si ya
                existe, la API rechazará la creación.
              </p>
            )}

            <button type="submit" disabled={loading || roles.length === 0} className={platformUi.btnPrimary}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear usuario de plataforma
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
