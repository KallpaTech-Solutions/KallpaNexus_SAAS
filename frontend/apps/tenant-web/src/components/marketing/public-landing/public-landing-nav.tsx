"use client";

import { cn } from "@/lib/cn";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LANDING_NAV, landingSectionHref } from "./public-landing-content";

export function PublicLandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
            ? "h-14 rounded-2xl border border-slate-200/80 bg-white/90 shadow-lg backdrop-blur-md"
            : "h-[72px] border-b border-transparent bg-white/80 backdrop-blur-sm"
        )}
      >
        <Link
          href="/#inicio"
          className="text-xl font-extrabold tracking-tight text-blue-600 transition-all duration-300 hover:text-blue-700 sm:text-2xl"
        >
          Kallpa Nexus
        </Link>

        <div className="hidden min-w-0 flex-1 items-center justify-center gap-4 overflow-x-auto md:flex lg:gap-5">
          {LANDING_NAV.map((link) => {
            const href = landingSectionHref(link.href);
            const cls =
              "group relative shrink-0 whitespace-nowrap text-[14px] font-medium text-slate-600 transition-colors hover:text-blue-600 lg:text-[15px]";
            return (
              <Link key={link.href} href={href} className={cls}>
                {link.name}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-blue-600 transition-all duration-300 group-hover:w-full" />
              </Link>
            );
          })}
        </div>

        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <Link
            href="/login"
            className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-blue-600"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/registrar?servicio=sport"
            className="whitespace-nowrap rounded-[10px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700"
          >
            Registrar
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
          <div className="flex flex-1 flex-col justify-center gap-6">
            {LANDING_NAV.map((link, i) => {
              const href = landingSectionHref(link.href);
              const cls = cn(
                "text-3xl font-bold text-slate-900 transition-all duration-500",
                mobileOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              );
              const style = { transitionDelay: mobileOpen ? `${i * 60}ms` : "0ms" };
              return (
                <Link
                  key={link.href}
                  href={href}
                  className={cls}
                  style={style}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>
          <div
            className={cn(
              "flex gap-3 border-t border-slate-200 pt-6 transition-all duration-500",
              mobileOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            )}
            style={{ transitionDelay: mobileOpen ? "280ms" : "0ms" }}
          >
            <Link
              href="/login"
              className="flex flex-1 items-center justify-center rounded-xl border border-slate-300 py-3 text-sm font-semibold"
              onClick={() => setMobileOpen(false)}
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registrar?servicio=sport"
              className="flex flex-1 items-center justify-center rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white"
              onClick={() => setMobileOpen(false)}
            >
              Registrar
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
