"use client";

import { cn } from "@/lib/cn";
import { Menu, Trophy, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type NavLink = { name: string; href: string };

type Props = {
  /** En página de negocio: nombre del club */
  tenantNombre?: string;
  tenantSlug?: string;
  /** Hero oscuro: barra superior siempre legible (blanco sólido) */
  solidTopBar?: boolean;
};

function navLinkClass() {
  return "group relative shrink-0 whitespace-nowrap text-[14px] font-medium text-slate-600 transition-colors hover:text-emerald-700 lg:text-[15px]";
}

export function PublicSportHeader({ tenantNombre, tenantSlug, solidTopBar }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const links: NavLink[] = tenantSlug
    ? [
        { name: "Para negocios", href: "/" },
        { name: "Sedes", href: `/sports/${tenantSlug}#sedes` },
        { name: "Reservar", href: `/sports/${tenantSlug}#reservar` },
        { name: "Tienda", href: `/sports/${tenantSlug}#tienda` },
        { name: "Contacto", href: `/sports/${tenantSlug}#contacto` },
      ]
    : [
        { name: "Para negocios", href: "/" },
        { name: "Sedes", href: "/sports#sedes" },
      ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const brandHref = "/sports";
  const brandLabel = "Nexus Sports";

  return (
    <header
      className={cn(
        "fixed z-50 transition-all duration-500",
        scrolled ? "left-3 right-3 top-3 sm:left-4 sm:right-4 sm:top-4" : "left-0 right-0 top-0"
      )}
    >
      <nav
        className={cn(
          "mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 transition-all duration-500 sm:px-6",
          scrolled || mobileOpen
            ? "h-14 rounded-2xl border border-slate-200/80 bg-white/95 shadow-lg shadow-slate-900/5 backdrop-blur-md"
            : solidTopBar
              ? "h-[72px] border-b border-slate-200/70 bg-white shadow-sm"
              : "h-[72px] border-b border-transparent bg-white/80 backdrop-blur-sm"
        )}
      >
        <Link
          href={brandHref}
          className="group flex min-w-0 items-center gap-2 font-semibold text-slate-900"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30 transition group-hover:shadow-lg">
            <Trophy className="h-5 w-5" aria-hidden />
          </span>
          <span className="truncate text-lg tracking-tight sm:text-xl">{brandLabel}</span>
        </Link>

        <div className="hidden min-w-0 flex-1 items-center justify-center gap-6 overflow-x-auto md:flex lg:gap-8">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={navLinkClass()}>
              {link.name}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-emerald-600 transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </div>

        <div className="hidden shrink-0 items-center gap-2 md:flex">
          {tenantNombre ? (
            <span
              className="max-w-[120px] truncate text-sm font-medium text-slate-700 lg:max-w-[180px]"
              title={tenantNombre}
            >
              {tenantNombre}
            </span>
          ) : null}
          <Link
            href="/login"
            className="whitespace-nowrap rounded-lg border border-slate-300 bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-white hover:text-emerald-800"
          >
            Acceso staff
          </Link>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-slate-700 md:hidden"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-white transition-opacity duration-300 md:hidden",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden={!mobileOpen}
      >
        <div className="flex h-full flex-col px-6 pb-8 pt-24">
          {tenantNombre ? (
            <p className="mb-4 text-sm font-medium text-slate-500">{tenantNombre}</p>
          ) : null}
          <div className="flex flex-1 flex-col justify-center gap-6">
            {links.map((link, i) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-3xl font-bold text-slate-900 transition-all duration-500",
                  mobileOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                )}
                style={{ transitionDelay: mobileOpen ? `${i * 60}ms` : "0ms" }}
                onClick={() => setMobileOpen(false)}
              >
                {link.name}
              </Link>
            ))}
          </div>
          <div
            className={cn(
              "border-t border-slate-200 pt-6 transition-all duration-500",
              mobileOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            )}
            style={{ transitionDelay: mobileOpen ? "280ms" : "0ms" }}
          >
            <Link
              href="/login"
              className="flex w-full items-center justify-center rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-800"
              onClick={() => setMobileOpen(false)}
            >
              Acceso staff
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export { PublicSportFooter } from "./public-sport-footer";
