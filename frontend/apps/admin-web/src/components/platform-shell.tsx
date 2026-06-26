"use client";

import {
  filterPlatformNav,
  filterPlatformNavSections,
  puedeAccederRutaPlatform,
  type PlatformNavItem,
} from "@/lib/platform-nav";
import { PLATFORM_SOLICITUDES_PENDIENTES_QUERY_KEY } from "@/lib/platform-query-keys";
import { usePlatformAuthStore, usePlatformPermisos } from "@/lib/platform-auth-store";
import {
  applyPlatformTheme,
  readPlatformTheme,
  writePlatformTheme,
  type PlatformTheme,
} from "@/lib/platform-theme";
import { usePlatformApi } from "@/lib/platform-api-context";
import { cn } from "@/lib/cn";
import { hasPlatformPermission } from "@kallpanexus/shared";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Home, Layers, LogOut, Moon, Search, Sun } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

const CONTRATOS_NAV_HREF = "/solicitudes-contrato";

const PlatformConsoleBackdrop = dynamic(
  () =>
    import("@/components/platform-console-backdrop").then((m) => ({
      default: m.PlatformConsoleBackdrop,
    })),
  { ssr: false }
);

function iniciales(nombre: string, email: string): string {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts[0]?.length) return parts[0].slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

function tituloRuta(pathname: string, nav: PlatformNavItem[]): string {
  const exact = nav.find((n) => n.href === pathname);
  if (exact) return exact.label;
  const nested = nav.find((n) => pathname.startsWith(`${n.href}/`));
  if (nested) return nested.label;
  if (pathname.startsWith("/empresas/")) return "Empresa";
  return "Consola";
}

function NavLink({
  item,
  active,
  badge,
}: {
  item: PlatformNavItem;
  active: boolean;
  badge?: number;
}) {
  const Icon = item.icon;
  const showBadge = badge != null && badge > 0;
  return (
    <Link
      href={item.href}
      className={cn(
        "platform-nav-link flex items-center gap-3 px-3 py-2.5 text-sm font-medium",
        active && "platform-nav-link-active"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {showBadge ? (
        <span
          className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-semibold leading-none text-white shadow-sm"
          aria-label={`${badge} solicitudes pendientes`}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

export function PlatformShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const api = usePlatformApi();
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
  const navSections = useMemo(() => filterPlatformNavSections(permisos), [permisos]);
  const puedeVerContratos = hasPlatformPermission(permisos, "platform:empresas:ver");
  const rutaTitulo = useMemo(() => tituloRuta(pathname, nav), [pathname, nav]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [consoleQuery, setConsoleQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const consoleSearchHits = useMemo(() => {
    const ql = consoleQuery.trim().toLowerCase();
    if (!ql) return [];
    return nav.filter(
      (item) =>
        item.label.toLowerCase().includes(ql) ||
        item.href.toLowerCase().includes(ql) ||
        item.href.replace(/\//g, " ").toLowerCase().includes(ql)
    );
  }, [consoleQuery, nav]);

  const sectionLabelByHref = useMemo(() => {
    const map = new Map<string, string>();
    for (const { section, items } of navSections) {
      for (const item of items) map.set(item.href, section.label);
    }
    return map;
  }, [navSections]);

  useEffect(() => {
    if (!searchFocused && !consoleQuery) return;
    function onDoc(e: MouseEvent) {
      if (!searchWrapRef.current?.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [searchFocused, consoleQuery]);

  const showSearchDropdown =
    searchFocused && consoleQuery.trim().length > 0;

  useEffect(() => {
    setOpenSections((prev) => {
      const next = { ...prev };
      for (const { section, items } of navSections) {
        const hasActive = items.some(
          (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
        );
        if (hasActive) next[section.id] = true;
        else if (next[section.id] === undefined) next[section.id] = section.id !== "staff";
      }
      return next;
    });
  }, [pathname, navSections]);

  const pendientesContratos = useQuery({
    queryKey: [...PLATFORM_SOLICITUDES_PENDIENTES_QUERY_KEY],
    queryFn: () => api.solicitudesContrato.contarPendientes(),
    enabled: mounted && !!session?.token && puedeVerContratos,
    refetchInterval: 60_000,
  });

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

  const avatar = iniciales(session.nombreCompleto ?? "", session.email ?? "??");

  return (
    <div className="platform-shell flex min-h-screen">
      <aside className="platform-sidebar sticky top-0 flex h-screen w-64 shrink-0 flex-col px-3 py-4">
        <div className="platform-logo-text mb-6 flex shrink-0 items-center gap-2.5 px-2 text-lg">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--p-border)] bg-[var(--p-nav-active-bg)] text-[var(--p-accent)] shadow-sm">
            <Layers className="h-5 w-5" aria-hidden />
          </span>
          <span>
            Kallpa{" "}
            <span className="platform-logo-text-accent">Nexus</span>
          </span>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto py-1">
          {navSections.map(({ section, items }) => {
            const open = openSections[section.id] ?? true;
            const singleItem = items.length === 1 && section.id === "resumen";
            if (singleItem) {
              return (
                <div key={section.id} className="platform-nav-section">
                  {items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                    />
                  ))}
                </div>
              );
            }
            return (
              <div key={section.id} className="platform-nav-section">
                <button
                  type="button"
                  className="platform-nav-section-toggle"
                  aria-expanded={open}
                  onClick={() =>
                    setOpenSections((s) => ({ ...s, [section.id]: !open }))
                  }
                >
                  <span>{section.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-transform",
                      open && "rotate-180"
                    )}
                    aria-hidden
                  />
                </button>
                {open ? (
                  <div className="platform-nav-section-items">
                    {items.map((item) => (
                      <NavLink
                        key={item.href}
                        item={item}
                        active={
                          pathname === item.href || pathname.startsWith(`${item.href}/`)
                        }
                        badge={
                          item.href === CONTRATOS_NAV_HREF
                            ? pendientesContratos.data
                            : undefined
                        }
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
        <div className="platform-sidebar-footer mt-auto shrink-0 pt-4 pb-1">
          <p className="platform-user-email truncate px-2 text-xs" title={session.email}>
            {session.email}
          </p>
          <button
            type="button"
            onClick={cerrarSesion}
            className="platform-btn-logout mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="platform-header flex h-16 shrink-0 flex-wrap items-center gap-3 px-4 lg:px-6">
          <nav
            className="flex min-w-0 items-center gap-1.5 text-sm platform-text-muted"
            aria-label="Ubicación"
          >
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 hover:text-[var(--p-text)]"
            >
              <Home className="h-3.5 w-3.5" aria-hidden />
              Consola
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
            <span className="truncate font-medium text-[var(--p-text)]">{rutaTitulo}</span>
          </nav>

          <div ref={searchWrapRef} className="platform-header-search-wrap mx-auto">
            <label className="platform-header-search">
              <Search className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
              <input
                type="search"
                placeholder="Buscar en la consola…"
                value={consoleQuery}
                onChange={(e) => setConsoleQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearchFocused(false);
                    setConsoleQuery("");
                    return;
                  }
                  if (e.key === "Enter" && consoleSearchHits[0]) {
                    e.preventDefault();
                    router.push(consoleSearchHits[0].href);
                    setConsoleQuery("");
                    setSearchFocused(false);
                  }
                }}
                aria-expanded={showSearchDropdown}
                aria-controls="platform-console-search-list"
                aria-autocomplete="list"
              />
            </label>
            {showSearchDropdown ? (
              <ul
                id="platform-console-search-list"
                className="platform-console-search-menu"
                role="listbox"
              >
                {consoleSearchHits.length === 0 ? (
                  <li className="platform-console-search-empty px-3 py-2.5 text-sm">
                    Sin coincidencias para «{consoleQuery.trim()}»
                  </li>
                ) : (
                  consoleSearchHits.map((item) => {
                    const Icon = item.icon;
                    const section = sectionLabelByHref.get(item.href);
                    return (
                      <li key={item.href} role="option">
                        <Link
                          href={item.href}
                          className="platform-console-search-hit"
                          onClick={() => {
                            setConsoleQuery("");
                            setSearchFocused(false);
                          }}
                        >
                          <Icon className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{item.label}</span>
                            {section ? (
                              <span className="block truncate text-xs opacity-70">{section}</span>
                            ) : null}
                          </span>
                          <span className="shrink-0 text-xs opacity-50">{item.href}</span>
                        </Link>
                      </li>
                    );
                  })
                )}
              </ul>
            ) : null}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2 sm:gap-3">
            {theme === "dark" ? (
              <span className="platform-live-badge hidden sm:inline-flex">En vivo</span>
            ) : (
              <span className="platform-live-badge hidden sm:inline-flex">Consola</span>
            )}
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
            <div className="platform-user-chip">
              <span className="platform-user-avatar" aria-hidden>
                {avatar}
              </span>
              <span className="hidden max-w-[10rem] truncate text-sm font-medium text-[var(--p-text)] sm:inline">
                {session.nombreCompleto}
              </span>
            </div>
          </div>
        </header>

        <div className="platform-main-area">
          <PlatformConsoleBackdrop />
          <main className="platform-main-inner">{children}</main>
        </div>
      </div>
    </div>
  );
}
