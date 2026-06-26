"use client";

import { DemoSectionView } from "@/components/marketing/demo/demo-sport-sections";
import { demoIdFromPanelHref, DEMO_NEGOCIO, type DemoPeriodo } from "@/components/marketing/demo/demo-sport-data";
import { cn } from "@/lib/cn";
import { panel } from "@/lib/panel-light";
import { PANEL_NAV } from "@/lib/panel-nav";
import { ChevronRight, LogIn, Menu, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const REGISTRO_HREF = "/registrar?servicio=sport";

function DemoBanner() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-950 sm:text-sm">
      <Sparkles className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
      <span>
        <strong>Modo demostración</strong> — mismas pantallas que el panel Sport, con datos ficticios.
      </span>
      <Link
        href={REGISTRO_HREF}
        className="font-semibold text-blue-700 underline-offset-2 hover:underline"
      >
        Registrar
      </Link>
    </div>
  );
}

export function DemoSportExperience() {
  const [seccion, setSeccion] = useState("dashboard");
  const [periodo, setPeriodo] = useState<DemoPeriodo>("7d");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItem = PANEL_NAV.find((n) => demoIdFromPanelHref(n.href) === seccion);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <DemoBanner />
      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            "fixed bottom-0 left-0 top-14 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:h-auto lg:max-h-screen lg:translate-x-0",
            sidebarOpen ? "translate-x-0 shadow-xl" : "-translate-x-full lg:translate-x-0"
          )}
        >
          <div className="shrink-0 border-b border-slate-100 px-4 py-4">
            <Link href="/" className="text-lg font-extrabold text-blue-600">
              Kallpa Nexus
            </Link>
            <p className="mt-1 text-xs text-slate-500">Demo · panel Sport</p>
            <p className="mt-2 truncate text-sm font-semibold text-slate-800">{DEMO_NEGOCIO.marca}</p>
          </div>
          <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
            {PANEL_NAV.map((item) => {
              const id = demoIdFromPanelHref(item.href);
              const Icon = item.icon;
              const active = seccion === id;
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => {
                    setSeccion(id);
                    setSidebarOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition",
                    active ? "bg-sport-green/10 text-sport-green" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-80" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="shrink-0 border-t border-slate-100 p-3 text-xs text-slate-500">
            {DEMO_NEGOCIO.gerente} · {DEMO_NEGOCIO.sede}
          </div>
        </aside>

        {sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
            aria-label="Cerrar menú"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur sm:gap-3 sm:px-5">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-700 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="hidden min-w-0 truncate text-sm text-slate-500 sm:block">
              {navItem?.label ?? "Panel"} · demo interactiva
            </p>
            <div className="relative ml-auto hidden max-w-[200px] flex-1 md:block lg:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className={cn(panel.input, "w-full py-1.5 pl-9 text-sm")}
                placeholder="Buscar…"
                readOnly
                onFocus={(e) => e.target.blur()}
              />
            </div>
            <Link
              href="/login"
              className={cn(panel.btnSecondary, "inline-flex shrink-0 items-center gap-1 px-3 py-1.5 text-sm")}
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Iniciar sesión</span>
            </Link>
            <Link
              href={REGISTRO_HREF}
              className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 sm:gap-1 sm:px-4"
            >
              Registrar
              <ChevronRight className="h-4 w-4" />
            </Link>
          </header>

          <main className="flex-1 overflow-auto p-4 sm:p-6">
            <DemoSectionView seccion={seccion} periodo={periodo} onPeriodo={setPeriodo} />
          </main>
        </div>
      </div>
    </div>
  );
}
