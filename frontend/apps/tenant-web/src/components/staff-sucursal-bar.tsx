"use client";

import { cn } from "@/lib/cn";
import { useAuthStore } from "@/lib/auth-store";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, ChevronDown, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function StaffSucursalBar() {
  const session = useAuthStore((s) => s.session);
  const setSucursalActiva = useAuthStore((s) => s.setSucursalActiva);
  const qc = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const sucursales = session?.sucursales ?? [];
  const activaId = session?.sucursalActivaId;
  const activa = sucursales.find((s) => s.id === activaId) ?? sucursales[0];

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!session || sucursales.length === 0 || !activa) {
    return null;
  }

  const varias = sucursales.length > 1;

  return (
    <div
      ref={ref}
      className="relative sticky top-0 z-20 border-b border-emerald-500/20 bg-slate-950/95 px-4 py-2.5 backdrop-blur sm:px-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
          <MapPin className="h-3.5 w-3.5 text-emerald-500/80" />
          Trabajando en
        </p>
      </div>

      {varias ? (
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="mt-1 flex w-full max-w-md items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-left text-sm text-white hover:border-emerald-500/40"
        >
          <Building2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span className="min-w-0 flex-1 truncate font-medium">{activa.nombre}</span>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 text-slate-400 transition", abierto && "rotate-180")}
          />
        </button>
      ) : (
        <div className="mt-1 flex max-w-md items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-200">
          <Building2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span className="truncate font-medium">{activa.nombre}</span>
        </div>
      )}

      {abierto && varias && (
        <ul
          className="absolute left-4 right-4 top-full z-30 mt-1 max-w-md rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl shadow-black/40 sm:left-6"
          role="listbox"
        >
          {sucursales.map((s) => {
            const selected = s.id === activa.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition",
                    selected
                      ? "bg-emerald-500/15 text-emerald-200"
                      : "text-slate-300 hover:bg-slate-800"
                  )}
                  onClick={() => {
                    setSucursalActiva(s.id);
                    setAbierto(false);
                    void qc.invalidateQueries({ queryKey: ["reservas"] });
                    void qc.invalidateQueries({ queryKey: ["reservas-hoy"] });
                    void qc.invalidateQueries({ queryKey: ["canchas"] });
                    void qc.invalidateQueries({ queryKey: ["reportes"] });
                    void qc.invalidateQueries({ queryKey: ["disponibilidad"] });
                  }}
                >
                  <Building2 className="h-4 w-4 shrink-0 opacity-70" />
                  {s.nombre}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
