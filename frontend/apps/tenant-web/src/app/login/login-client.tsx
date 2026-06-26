"use client";

import {
  getApiErrorMessage,
  getCuentaDesactivadaMessage,
  isApiUnreachableError,
  isCuentaDesactivadaError,
} from "@kallpanexus/api-client";
import { LoginPartnerMarquee } from "@/components/auth/login-partner-marquee";
import { LoginWaitlistBackdrop } from "@/components/auth/login-waitlist-backdrop";
import { ApiConexionAnimada } from "@/components/api-conexion-animada";
import { CuentaDesactivadaAviso } from "@/components/cuenta-desactivada-aviso";
import { getDevTenantSubdomain, isKnxLocalDev } from "@kallpanexus/env";
import { normalizarDniStaff, resolveTenantSubdomainFromHost } from "@kallpanexus/shared";
import type { TenantStaffLoginResponse, TenantStaffNegocioOpcion } from "@kallpanexus/types";
import { useTenantApi } from "@/lib/api-context";
import { mapLoginSucursales, useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/cn";
import Link from "next/link";
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
    nombreComercialNegocio:
      data.nombreComercialNegocio ??
      (data as { NombreComercialNegocio?: string }).NombreComercialNegocio,
    nombreEmpresa:
      data.nombreEmpresa ?? (data as { NombreEmpresa?: string }).NombreEmpresa,
    accesoTodasSucursales: data.accesoTodasSucursales ?? false,
    sucursales: mapLoginSucursales(data.sucursales),
  };
}

export function TenantLoginClient() {
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
  const [mounted, setMounted] = useState(false);

  const needsSubdomainField = useMemo(
    () => mounted && subFromHost === null && !getDevTenantSubdomain(),
    [mounted, subFromHost]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (searchParams.get("sesion") === "expirada") {
      setError("Tu sesión expiró. Vuelve a iniciar sesión.");
    }
    const subParam = searchParams.get("subdomain")?.trim().toLowerCase();
    if (subParam) {
      setSubdomain(subParam);
    }
  }, [searchParams, setSubdomain]);

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
      nombreComercialNegocio: mapped.nombreComercialNegocio ?? null,
      nombreEmpresa: mapped.nombreEmpresa ?? null,
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
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-white text-slate-900">
      <LoginWaitlistBackdrop />

      <Link
        href="/"
        className="fixed left-4 top-4 z-50 inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition hover:bg-white"
      >
        Kallpa Nexus
      </Link>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-16 sm:py-20">
        <div className="w-full max-w-6xl space-y-10 text-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm">
              Acceso del personal
            </div>

            <h1 className="text-balance text-4xl font-serif italic leading-[0.95] tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
              El control de tu empresa,
              <br />
              en un solo lugar.
            </h1>
          </div>

          <div className="mx-auto w-full max-w-md text-left">
            <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-8 shadow-lg shadow-slate-200/50 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-slate-900">Iniciar sesión</h2>
              <p className="mt-2 text-sm text-slate-500">
                {negocios
                  ? "Elige el negocio en el que trabajas hoy."
                  : mounted && subFromHost
                    ? (
                        <>
                          Acceso al negocio{" "}
                          <span className="font-medium text-emerald-600">{subFromHost}</span>
                          <span className="text-slate-400"> (subdominio)</span>
                        </>
                      )
                    : "Ingresa tus credenciales para continuar."}
              </p>
              {!negocios && (
                <p className="mt-2 text-xs text-slate-400">
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
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-emerald-400/60 hover:bg-white"
                        onClick={(e) => onSubmit(e, n.id)}
                      >
                        <span className="block font-medium text-slate-900">
                          {n.nombreComercial}
                        </span>
                        <span className="text-xs text-slate-500">{n.subdomain}</span>
                      </button>
                    </li>
                  ))}
                  <button
                    type="button"
                    className="mt-2 text-xs text-slate-500 hover:text-slate-700"
                    onClick={() => setNegocios(null)}
                  >
                    Volver
                  </button>
                </ul>
              ) : (
                <form onSubmit={(e) => onSubmit(e)} className="mt-6 space-y-4">
                  <label className="block text-sm text-slate-700">
                    DNI
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="username"
                      maxLength={8}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
                      value={dni}
                      onChange={(e) =>
                        setDni(normalizarDniStaff(e.target.value).slice(0, 8))
                      }
                      required
                    />
                  </label>
                  <label className="block text-sm text-slate-700">
                    Contraseña
                    <input
                      type="password"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </label>
                  {needsSubdomainField && isKnxLocalDev() && (
                    <p className="text-xs text-slate-500">
                      En local también puedes abrir{" "}
                      <code className="rounded bg-slate-100 px-1 text-emerald-700">
                        sportza.localhost:3000
                      </code>
                      .
                    </p>
                  )}
                  {cuentaDesactivada ? (
                    <CuentaDesactivadaAviso mensaje={cuentaDesactivada} />
                  ) : esperandoApi ? (
                    <ApiConexionAnimada />
                  ) : (
                    error && (
                      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                      </p>
                    )
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className={cn(
                      "w-full rounded-lg bg-emerald-500 py-2.5 font-medium text-white transition hover:bg-emerald-600",
                      loading && "opacity-60"
                    )}
                  >
                    {loading ? "Entrando…" : "Iniciar sesión"}
                  </button>
                </form>
              )}

              <p className="mt-6 text-center text-sm text-slate-500">
                ¿Aún no tienes cuenta?{" "}
                <Link
                  href="/registrar"
                  className="font-medium text-blue-600 hover:text-blue-700"
                >
                  Registrar negocio
                </Link>
              </p>
            </div>
          </div>

          <div className="mx-auto w-full max-w-4xl pt-4">
            <LoginPartnerMarquee />
          </div>
        </div>
      </div>
    </main>
  );
}
