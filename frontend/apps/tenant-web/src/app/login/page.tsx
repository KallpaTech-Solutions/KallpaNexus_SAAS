"use client";

import {
  getApiErrorMessage,
  getCuentaDesactivadaMessage,
  isApiUnreachableError,
  isCuentaDesactivadaError,
} from "@kallpanexus/api-client";
import { ApiConexionAnimada } from "@/components/api-conexion-animada";
import { CuentaDesactivadaAviso } from "@/components/cuenta-desactivada-aviso";
import { getDevTenantSubdomain } from "@kallpanexus/env";
import { normalizarDniStaff, resolveTenantSubdomainFromHost } from "@kallpanexus/shared";
import type { TenantStaffLoginResponse, TenantStaffNegocioOpcion } from "@kallpanexus/types";
import { useTenantApi } from "@/lib/api-context";
import { mapLoginSucursales, useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/cn";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function mapLoginResponse(data: TenantStaffLoginResponse) {
  if (!data.token) {
    throw new Error("Respuesta de login incompleta.");
  }
  return {
    token: data.token,
    tenantId: String(data.tenantId ?? ""),
    dni: data.dni ?? "",
    nombreCompleto: data.nombreCompleto ?? "",
    email: data.email ?? null,
    rol: data.rol ?? (data as { Rol?: string }).Rol ?? "",
    permisos: data.permisos ?? [],
    debeCambiarPassword: data.debeCambiarPassword ?? false,
    subdomain: data.subdomain,
    accesoTodasSucursales: data.accesoTodasSucursales ?? false,
    sucursales: mapLoginSucursales(data.sucursales),
  };
}

export default function LoginPage() {
  const api = useTenantApi();
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useAuthStore((s) => s.session);
  const setSubdomain = useAuthStore((s) => s.setSubdomain);
  const setSession = useAuthStore((s) => s.setSession);

  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [subFromHost, setSubFromHost] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [esperandoApi, setEsperandoApi] = useState(false);
  const [cuentaDesactivada, setCuentaDesactivada] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [negocios, setNegocios] = useState<TenantStaffNegocioOpcion[] | null>(null);

  const needsSubdomainField = useMemo(
    () => subFromHost === null && !getDevTenantSubdomain(),
    [subFromHost]
  );

  useEffect(() => {
    if (searchParams.get("sesion") === "expirada") {
      setError("Tu sesión expiró. Vuelve a iniciar sesión.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (session) {
      router.replace(
        session.debeCambiarPassword ? "/cambiar-password" : "/dashboard"
      );
      return;
    }
    const fromHost = resolveTenantSubdomainFromHost(window.location.host);
    if (fromHost) {
      setSubFromHost(fromHost);
      setSubdomain(fromHost);
    } else {
      const devSub = getDevTenantSubdomain();
      if (devSub) setSubdomain(devSub);
    }
  }, [session, router, setSubdomain]);

  async function completarLogin(data: TenantStaffLoginResponse) {
    const mapped = mapLoginResponse(data);
    if (mapped.subdomain) {
      setSubdomain(mapped.subdomain);
    }
    setSession({
      token: mapped.token,
      tenantId: mapped.tenantId,
      dni: mapped.dni,
      nombreCompleto: mapped.nombreCompleto,
      email: mapped.email,
      rol: mapped.rol,
      permisos: mapped.permisos,
      debeCambiarPassword: mapped.debeCambiarPassword,
      accesoTodasSucursales: mapped.accesoTodasSucursales,
      sucursales: mapped.sucursales,
    });
    router.replace(mapped.debeCambiarPassword ? "/cambiar-password" : "/dashboard");
  }

  async function onSubmit(e: React.FormEvent, tenantId?: string) {
    e.preventDefault();
    setError(null);
    setEsperandoApi(false);
    setCuentaDesactivada(null);
    setLoading(true);
    try {
      const dniNorm = normalizarDniStaff(dni);
      const data = await api.auth.loginGlobal(dniNorm, password, tenantId);

      if (data.requiereSeleccionNegocio && data.negocios?.length) {
        setNegocios(data.negocios);
        return;
      }

      await completarLogin(data);
    } catch (err) {
      if (isCuentaDesactivadaError(err)) {
        setError(null);
        setEsperandoApi(false);
        setCuentaDesactivada(getCuentaDesactivadaMessage(err));
      } else if (isApiUnreachableError(err)) {
        setError(null);
        setCuentaDesactivada(null);
        setEsperandoApi(true);
      } else {
        setEsperandoApi(false);
        setCuentaDesactivada(null);
        setError(getApiErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-xl">
        <p className="text-xs uppercase tracking-widest text-emerald-400">
          Nexus Sport
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-slate-400">
          {negocios
            ? "Elige el negocio en el que trabajas hoy."
            : subFromHost
              ? (
                  <>
                    Negocio:{" "}
                    <span className="text-emerald-300">{subFromHost}</span>
                  </>
                )
              : "DNI y contraseña del personal del club."}
        </p>
        {!negocios && (
          <p className="mt-2 text-xs text-slate-500">
            Primera vez: la contraseña es tu mismo DNI (8 dígitos). Luego deberás
            elegir una contraseña nueva.
          </p>
        )}

        {negocios ? (
          <ul className="mt-6 space-y-2">
            {negocios.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  disabled={loading}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-left transition hover:border-emerald-500/50 hover:bg-slate-900"
                  onClick={(e) => onSubmit(e, n.id)}
                >
                  <span className="block font-medium text-white">{n.nombreComercial}</span>
                  <span className="text-xs text-slate-500">{n.subdomain}</span>
                </button>
              </li>
            ))}
            <button
              type="button"
              className="mt-2 text-xs text-slate-500 hover:text-slate-300"
              onClick={() => setNegocios(null)}
            >
              Volver
            </button>
          </ul>
        ) : (
          <form onSubmit={(e) => onSubmit(e)} className="mt-6 space-y-4">
            <label className="block text-sm text-slate-300">
              DNI
              <input
                type="text"
                inputMode="numeric"
                autoComplete="username"
                maxLength={8}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-emerald-500"
                value={dni}
                onChange={(e) => setDni(normalizarDniStaff(e.target.value).slice(0, 8))}
                required
              />
            </label>
            <label className="block text-sm text-slate-300">
              Contraseña
              <input
                type="password"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-emerald-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            {needsSubdomainField && (
              <p className="text-xs text-slate-500">
                En local también puedes abrir{" "}
                <code className="text-emerald-300/90">sportza.localhost:3000</code>.
              </p>
            )}
            {cuentaDesactivada ? (
              <CuentaDesactivadaAviso mensaje={cuentaDesactivada} />
            ) : esperandoApi ? (
              <ApiConexionAnimada />
            ) : (
              error && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )
            )}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full rounded-lg bg-emerald-500 py-2.5 font-medium text-slate-950 transition hover:bg-emerald-400",
                loading && "opacity-60"
              )}
            >
              {loading ? "Entrando…" : "Iniciar sesión"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
