"use client";

import {
  filterPlatformNav,
  puedeAccederRutaPlatform,
  type PlatformNavItem,
} from "@/lib/platform-nav";
import { usePlatformAuthStore, usePlatformPermisos } from "@/lib/platform-auth-store";
import {
  applyPlatformTheme,
  readPlatformTheme,
  writePlatformTheme,
  type PlatformTheme,
} from "@/lib/platform-theme";
import { cn } from "@/lib/cn";
import { Layers, LogOut, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

function NavLink({ item, active }: { item: PlatformNavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "platform-nav-link flex items-center gap-3 px-3 py-2.5 text-sm font-medium",
        active && "platform-nav-link-active"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {item.label}
    </Link>
  );
}

export function PlatformShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = usePlatformAuthStore((s) => s.session);
  const logout = usePlatformAuthStore((s) => s.logout);
  const hydrate = usePlatformAuthStore((s) => s.hydrateFromStorage);
  const permisos = usePlatformPermisos();
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<PlatformTheme>("light");

  useEffect(() => {
    hydrate();
    const t = readPlatformTheme();
    setTheme(t);
    applyPlatformTheme(t);
    setMounted(true);
  }, [hydrate]);

  useEffect(() => {
    if (!mounted) return;
    if (!session?.token) {
      router.replace("/login");
      return;
    }
    if (!puedeAccederRutaPlatform(pathname, permisos)) {
      const dest = filterPlatformNav(permisos)[0]?.href ?? "/login";
      router.replace(dest);
    }
  }, [mounted, session, pathname, permisos, router]);

  const nav = filterPlatformNav(permisos);

  function cerrarSesion() {
    logout();
    router.replace("/login");
  }

  function toggleTheme() {
    const next: PlatformTheme = theme === "light" ? "dark" : "light";
    setTheme(next);
    writePlatformTheme(next);
    applyPlatformTheme(next);
  }

  if (!mounted || !session) {
    return (
      <div className="platform-shell flex min-h-screen items-center justify-center text-sm platform-text-muted">
        Cargando consola…
      </div>
    );
  }

  return (
    <div className="platform-shell flex min-h-screen">
      <aside className="platform-sidebar sticky top-0 flex h-screen w-64 shrink-0 flex-col px-3 py-4">
        <div className="platform-logo-text mb-6 flex shrink-0 items-center gap-2 px-2 text-lg">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-[var(--p-accent)] bg-[var(--p-nav-active-bg)] text-[var(--p-accent)]">
            <Layers className="h-5 w-5" aria-hidden />
          </span>
          Kallpa Nexus
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto py-1">
          <div className="flex flex-col gap-1">
            {nav.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
              />
            ))}
          </div>
        </nav>
        <div className="platform-sidebar-footer mt-auto shrink-0 pt-4 pb-1">
          <p className="platform-user-email truncate px-2 text-xs" title={session.email}>
            {session.email}
          </p>
          <button type="button" onClick={cerrarSesion} className="platform-btn-logout mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium">
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            Cerrar sesión
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="platform-header flex shrink-0 flex-wrap items-center justify-between gap-3 px-6 py-3 text-sm">
          <span className="font-medium text-[var(--p-text)]">
            {session.nombreCompleto}
            <span className="platform-text-muted font-normal"> · {session.rol}</span>
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            className="platform-btn-theme inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm"
            aria-label={theme === "light" ? "Activar modo oscuro" : "Activar modo claro"}
          >
            {theme === "light" ? (
              <>
                <Moon className="h-4 w-4" aria-hidden /> Modo oscuro
              </>
            ) : (
              <>
                <Sun className="h-4 w-4" aria-hidden /> Modo claro
              </>
            )}
          </button>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
