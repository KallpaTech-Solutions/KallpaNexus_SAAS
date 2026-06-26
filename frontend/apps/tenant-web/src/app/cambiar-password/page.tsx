"use client";

import { getApiErrorMessage } from "@kallpanexus/api-client";
import { validarPoliticaPasswordStaff } from "@kallpanexus/shared";
import { LoginWaitlistBackdrop } from "@/components/auth/login-waitlist-backdrop";
import { useTenantApi } from "@/lib/api-context";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30";

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

  const nombre = session.nombreCompleto?.trim() || session.dni;

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
              Seguridad de la cuenta
            </div>
            <h1 className="text-balance text-4xl font-serif italic leading-[0.95] tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
              Crea tu contraseña
              <br />
              y entra al panel.
            </h1>
          </div>

          <div className="mx-auto w-full max-w-md text-left">
            <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-8 shadow-lg shadow-slate-200/50 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-slate-900">Hola, {nombre}</h2>
              <p className="mt-2 text-sm text-slate-500">
                Debes cambiar la contraseña inicial antes de continuar. Si aún no la cambiaste,
                usa tu <span className="font-medium text-slate-700">DNI</span> como contraseña
                actual.
              </p>

              <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                  Requisitos
                </p>
                <ul className="mt-2 space-y-1 text-xs text-emerald-900/90">
                  <li>Mínimo 8 caracteres</li>
                  <li>Mayúscula, minúscula y número</li>
                  <li>No puede ser igual a tu DNI</li>
                </ul>
              </div>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <fieldset className="space-y-4">
                  <legend className="sr-only">Contraseñas</legend>
                  <label className="block text-sm text-slate-700">
                    Contraseña actual
                    <input
                      type="password"
                      autoComplete="current-password"
                      className={inputClass}
                      value={actual}
                      onChange={(e) => setActual(e.target.value)}
                      required
                    />
                  </label>
                  <label className="block text-sm text-slate-700">
                    Nueva contraseña
                    <input
                      type="password"
                      autoComplete="new-password"
                      className={inputClass}
                      value={nueva}
                      onChange={(e) => setNueva(e.target.value)}
                      required
                    />
                  </label>
                  <label className="block text-sm text-slate-700">
                    Confirmar nueva contraseña
                    <input
                      type="password"
                      autoComplete="new-password"
                      className={inputClass}
                      value={confirmar}
                      onChange={(e) => setConfirmar(e.target.value)}
                      required
                    />
                  </label>
                </fieldset>

                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    "w-full rounded-lg bg-emerald-500 py-2.5 font-medium text-white transition hover:bg-emerald-600",
                    loading && "opacity-60"
                  )}
                >
                  {loading ? "Guardando…" : "Guardar y continuar"}
                </button>
              </form>

              <button
                type="button"
                className="mt-4 w-full text-center text-sm text-slate-500 transition hover:text-slate-700"
                onClick={() => {
                  logout();
                  router.replace("/login");
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
