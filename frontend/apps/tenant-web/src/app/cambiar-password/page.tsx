"use client";

import { getApiErrorMessage } from "@kallpanexus/api-client";
import { validarPoliticaPasswordStaff } from "@kallpanexus/shared";
import { useTenantApi } from "@/lib/api-context";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/cn";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CambiarPasswordPage() {
  const api = useTenantApi();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const setSession = useAuthStore((s) => s.setSession);
  const logout = useAuthStore((s) => s.logout);

  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!session.debeCambiarPassword) {
      router.replace("/dashboard");
    }
  }, [session, router]);

  if (!session?.debeCambiarPassword) {
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setError(null);
    if (nueva !== confirmar) {
      setError("La confirmación no coincide.");
      return;
    }
    const politica = validarPoliticaPasswordStaff(nueva, session.dni);
    if (politica) {
      setError(politica);
      return;
    }
    setLoading(true);
    try {
      await api.auth.cambiarPassword(actual, nueva);
      setSession({ ...session, debeCambiarPassword: false });
      router.replace("/dashboard");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-slate-900/90 p-8 shadow-xl">
        <h1 className="text-xl font-semibold text-white">Crea tu contraseña</h1>
        <p className="mt-2 text-sm text-slate-400">
          Hola {session.nombreCompleto || session.dni}. Por seguridad debes cambiar la
          contraseña inicial. Si aún no la cambiaste, tu contraseña actual es tu{" "}
          <span className="text-slate-300">DNI</span>.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Mínimo 8 caracteres, con mayúscula, minúscula y número. No puede ser igual al DNI.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm text-slate-300">
            Contraseña actual
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm text-slate-300">
            Nueva contraseña
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm text-slate-300">
            Confirmar nueva contraseña
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
            />
          </label>
          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full rounded-lg bg-emerald-500 py-2.5 font-medium text-slate-950",
              loading && "opacity-60"
            )}
          >
            {loading ? "Guardando…" : "Guardar y continuar"}
          </button>
          <button
            type="button"
            className="w-full text-sm text-slate-500 hover:text-slate-300"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
