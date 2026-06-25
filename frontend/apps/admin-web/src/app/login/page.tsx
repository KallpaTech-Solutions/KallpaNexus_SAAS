"use client";

import { usePlatformApi } from "@/lib/platform-api-context";
import { usePlatformAuthStore } from "@/lib/platform-auth-store";
import { applyPlatformTheme, readPlatformTheme } from "@/lib/platform-theme";
import { platformUi } from "@/lib/platform-ui";
import { getApiErrorMessage, type PlatformLoginResponse } from "@kallpanexus/api-client";
import { Layers, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function PlatformLoginPage() {
  const api = usePlatformApi();
  const router = useRouter();
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
      <div className={platformUi.loginCard}>
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-[var(--p-accent)] bg-[var(--p-nav-active-bg)] text-[var(--p-accent)]">
            <Layers className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="font-semibold text-[var(--p-text)]">Plataforma Kallpa</p>
            <p className={`text-xs ${platformUi.textMuted}`}>Operación SaaS interna</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <p className={platformUi.alertDanger}>{error}</p>}
          <label className="block text-sm">
            <span className={platformUi.formLabel}>Email</span>
            <input
              type="email"
              required
              autoComplete="username"
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
            Entrar
          </button>
        </form>
        <p className={`mt-6 text-center text-xs ${platformUi.textMuted}`}>
          Dev: credenciales en appsettings → Platform:SuperAdminEmail
        </p>
      </div>
    </div>
  );
}
