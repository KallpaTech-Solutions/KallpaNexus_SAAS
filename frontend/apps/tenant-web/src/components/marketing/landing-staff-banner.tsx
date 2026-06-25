"use client";

import { useAuthStore } from "@/lib/auth-store";
import Link from "next/link";
import { useEffect } from "react";

/** Gerente/staff logueado: acceso rápido sin quitar la landing pública. */
export function LandingStaffBanner() {
  const session = useAuthStore((s) => s.session);
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!session?.token) return null;

  const esGerente = session.rol?.toLowerCase().includes("gerente") ?? false;

  return (
    <div className="border-b border-blue-100 bg-blue-50/90">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm sm:px-6">
        <p className="text-slate-700">
          Sesión activa: <strong className="text-slate-900">{session.nombreCompleto}</strong>
          {session.rol ? (
            <span className="text-slate-500"> · {session.rol}</span>
          ) : null}
        </p>
        <div className="flex flex-wrap gap-2">
          {esGerente && (
            <Link
              href="/plan"
              className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 font-medium text-blue-700 hover:bg-blue-50"
            >
              Resumen mi empresa
            </Link>
          )}
          <Link
            href="/dashboard"
            className="rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700"
          >
            Ir al panel operativo
          </Link>
        </div>
      </div>
    </div>
  );
}
