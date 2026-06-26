"use client";

import { usePlatformApi } from "@/lib/platform-api-context";
import { usePlatformAuthStore } from "@/lib/platform-auth-store";
import { applyPlatformTheme, readPlatformTheme } from "@/lib/platform-theme";
import { platformUi } from "@/lib/platform-ui";
import { getApiErrorMessage, type PlatformLoginResponse } from "@kallpanexus/api-client";
import { Layers, Loader2, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function PlatformLoginClient() {
  const api = usePlatformApi();
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = usePlatformAuthStore((s) => s.session);
  const setSession = usePlatformAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    applyPlatformTheme(readPlatformTheme());
  }, []);

  useEffect(() => {
    if (searchParams.get("sesion") === "expirada") {
      setError("Tu sesión expiró. Vuelve a iniciar sesión.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (session?.token) router.replace("/dashboard");
  }, [session, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.auth.login(email.trim(), password);
      if (!data.token) throw new Error("Token no recibido");
      const raw = data as PlatformLoginResponse & { Id?: string };
      setSession({
        token: data.token,
        usuarioId: String(raw.id ?? raw.Id ?? ""),
        nombreCompleto: data.nombreCompleto ?? "",
        email: data.email ?? email,
        rol: data.rol ?? "",
        permisos: data.permisos ?? [],
      });
      router.replace("/dashboard");
    } catch (err) {
      setError(getApiErrorMessage(err) || "Credenciales inválidas.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={platformUi.loginPage}>
      <header className="platform-login-hero">
        <p className="platform-login-hero-badge">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
          Consola de plataforma · Admin
        </p>
        <h1 className="platform-login-hero-title">
          Operación interna de Kallpa Nexus
        </h1>
        <p className="platform-login-hero-lead">
          Gestión de empresas, tenants y equipo interno. Aquí entras con{" "}
          <strong className="font-semibold text-[var(--p-text)]">correo electrónico</strong>
          , no con DNI.
        </p>
      </header>

      <div className={platformUi.loginCard}>
        <div className="mb-5 flex items-center gap-3 border-b border-[var(--p-border)] pb-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--p-accent)] bg-[var(--p-nav-active-bg)] text-[var(--p-accent)]">
            <Layers className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="font-semibold text-[var(--p-text)]">Acceso administrador</p>
            <p className={`text-xs ${platformUi.textMuted}`}>
              Correo y contraseña del staff de plataforma
            </p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <p className={platformUi.alertDanger}>{error}</p>}
          <label className="block text-sm">
            <span className={platformUi.formLabel}>Correo electrónico</span>
            <input
              type="email"
              required
              autoComplete="username"
              inputMode="email"
              placeholder="tu.correo@kallpa…"
              className={platformUi.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className={platformUi.formLabel}>Contraseña</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              className={platformUi.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button type="submit" disabled={loading} className={`${platformUi.btnPrimary} w-full py-2.5`}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Entrar a la consola
          </button>
        </form>
      </div>

      <p className="platform-login-context">
        ¿Eres personal de un negocio cliente? Entra con{" "}
        <strong className="font-medium text-[var(--p-text)]">DNI</strong> en el portal
        del tenant (web pública o subdominio), no en esta consola.
      </p>
    </div>
  );
}
