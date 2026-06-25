"use client";

import { cn } from "@/lib/cn";
import { canAccess, useAuthStore } from "@/lib/auth-store";
import { filterPanelNav } from "@/lib/panel-nav";
import { sportTenantPublicPath } from "@/lib/nexus-verticals";
import { PERMISOS_SPORT } from "@kallpanexus/types";
import { getStoredTenantSubdomain } from "@kallpanexus/shared";
import {
  ChevronDown,
  ExternalLink,
  Home,
  KeyRound,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function PanelUserMenu() {
  const session = useAuthStore((s) => s.session);
  const subdomain = useAuthStore((s) => s.subdomain);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const permisos = session?.permisos ?? [];
  const puedeConfig = filterPanelNav(permisos).some((i) => i.href === "/configuracion");

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!session) return null;

  const tenantSlug =
    subdomain?.trim().toLowerCase() ||
    (typeof window !== "undefined" ? getStoredTenantSubdomain() : null);
  const webNegocioHref = tenantSlug ? sportTenantPublicPath(tenantSlug) : null;

  const nombre = session.nombreCompleto || "Staff";
  const rolLabel =
    session.rol === "Gerente"
      ? "Gerente"
      : session.rol === "Cajero"
        ? "Cajero"
        : session.rol;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className={cn(
          "flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2.5 text-left shadow-sm transition hover:border-sport-orange/40",
          abierto && "border-sport-orange/50 ring-2 ring-sport-orange/15"
        )}
        aria-expanded={abierto}
        aria-haspopup="menu"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sport-orange to-sport-green text-sm font-semibold text-white shadow-md shadow-black/30">
          {iniciales(nombre)}
        </span>
        <span className="hidden max-w-32 truncate text-sm font-medium text-slate-800 sm:block">
          {nombre.split(" ")[0]}
        </span>
        <ChevronDown
          className={cn("hidden h-4 w-4 text-slate-400 transition sm:block", abierto && "rotate-180")}
        />
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
            <p className="truncate font-medium text-slate-900">{nombre}</p>
            <p className="text-xs text-slate-500">DNI {session.dni}</p>
            <p className="mt-1 text-xs font-medium text-sport-green">Rol: {rolLabel}</p>
          </div>
          <ul className="py-1">
            <li>
              <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700">
                <User className="h-4 w-4 text-sport-orange" />
                <span>Mi perfil</span>
              </div>
              <p className="px-4 pb-2 text-[11px] leading-snug text-slate-500">
                {session.email ? session.email : "Sesión staff del club"}
              </p>
            </li>
            {puedeConfig && (
              <li>
                <Link
                  href="/configuracion"
                  role="menuitem"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                  onClick={() => setAbierto(false)}
                >
                  <Settings className="h-4 w-4 text-sport-green" />
                  Configuración del negocio
                </Link>
              </li>
            )}
            {canAccess(permisos, PERMISOS_SPORT.rolesGestionar) && (
              <li>
                <Link
                  href="/plan"
                  role="menuitem"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                  onClick={() => setAbierto(false)}
                >
                  <Settings className="h-4 w-4 text-slate-400" />
                  Plan y suscripción
                </Link>
              </li>
            )}
            <li>
              <Link
                href="/cambiar-password"
                role="menuitem"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                onClick={() => setAbierto(false)}
              >
                <KeyRound className="h-4 w-4 text-slate-400" />
                Cambiar contraseña
              </Link>
            </li>
            <li>
              <Link
                href="/"
                role="menuitem"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                onClick={() => setAbierto(false)}
              >
                <Home className="h-4 w-4 text-slate-400" />
                Ir a la página principal
              </Link>
            </li>
            {webNegocioHref && (
              <li>
                <Link
                  href={webNegocioHref}
                  role="menuitem"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                  onClick={() => setAbierto(false)}
                >
                  <ExternalLink className="h-4 w-4 text-sport-green" />
                  Ver web de mi negocio
                </Link>
              </li>
            )}
            <li className="mt-1 border-t border-slate-100 pt-1">
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
                onClick={() => {
                  setAbierto(false);
                  logout();
                  router.replace("/login");
                }}
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
