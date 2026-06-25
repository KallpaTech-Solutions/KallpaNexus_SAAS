"use client";

import { BRAND_SPORT } from "@/lib/brand-sport";
import { cn } from "@/lib/cn";
import { canAccess, useAuthStore, usePermisosSession } from "@/lib/auth-store";
import { PanelUserMenu } from "@/components/panel-user-menu";
import { useReservasWebPendientesPorSucursal } from "@/lib/use-reservas-web-pendientes";
import { PERMISOS_SPORT } from "@kallpanexus/types";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export function PanelHeader() {
  const session = useAuthStore((s) => s.session);
  const setSucursalActiva = useAuthStore((s) => s.setSucursalActiva);
  const permisos = usePermisosSession();
  const puedeVerReservasWeb = canAccess(permisos, PERMISOS_SPORT.reservasVer);
  const pendientesPorSede = useReservasWebPendientesPorSucursal();
  const qc = useQueryClient();
  const router = useRouter();
  const [sedeAbierta, setSedeAbierta] = useState(false);
  const [notifCliente, setNotifCliente] = useState(false);
  const sedeRef = useRef<HTMLDivElement>(null);

  useEffect(() => setNotifCliente(true), []);

  const sucursales = session?.sucursales ?? [];
  const activaId = session?.sucursalActivaId;
  const activa = sucursales.find((s) => s.id === activaId) ?? sucursales[0];
  const varias = sucursales.length > 1;

  const totalPendientesWeb = useMemo(() => {
    if (!notifCliente || !puedeVerReservasWeb) return 0;
    let n = 0;
    for (const s of sucursales) {
      n += pendientesPorSede.get(s.id) ?? 0;
    }
    return n;
  }, [sucursales, pendientesPorSede, notifCliente, puedeVerReservasWeb]);

  const pendientesSedeActiva = activa ? (pendientesPorSede.get(activa.id) ?? 0) : 0;

  function invalidarDatosSede() {
    void qc.invalidateQueries({ queryKey: ["reservas"] });
    void qc.invalidateQueries({ queryKey: ["reservas-hoy"] });
    void qc.invalidateQueries({ queryKey: ["canchas"] });
    void qc.invalidateQueries({ queryKey: ["reportes"] });
    void qc.invalidateQueries({ queryKey: ["reportes-archivados"] });
    void qc.invalidateQueries({ queryKey: ["disponibilidad"] });
  }

  function elegirSede(sedeId: string, irReservasWeb: boolean) {
    setSucursalActiva(sedeId);
    setSedeAbierta(false);
    invalidarDatosSede();
    if (irReservasWeb && puedeVerReservasWeb) {
      router.push("/reservas-web");
    }
  }

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!sedeRef.current?.contains(e.target as Node)) setSedeAbierta(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
      <div className="flex h-[3.25rem] items-center gap-3 px-3 sm:h-14 sm:gap-4 sm:px-5">
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-2 rounded-lg py-1 pr-2 transition hover:bg-slate-50"
        >
          <Image
            src={BRAND_SPORT.logoUrl}
            alt={BRAND_SPORT.logoAlt}
            width={40}
            height={40}
            className="h-9 w-9 rounded-md object-contain sm:h-10 sm:w-10"
            priority
          />
          <span className="hidden text-sm font-semibold tracking-tight text-sport-navy lg:block">
            Nexus <span className="text-sport-orange">Sport</span>
          </span>
        </Link>

        <div className="hidden h-8 w-px bg-slate-200 md:block" />

        {session && activa && (
          <div ref={sedeRef} className="relative min-w-0 flex-1 md:max-w-xs lg:max-w-sm">
            <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Trabajando en
            </p>
            {varias ? (
              <button
                type="button"
                onClick={() => setSedeAbierta((v) => !v)}
                className="relative flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-sm text-slate-900 hover:border-sport-orange/40"
              >
                {notifCliente && totalPendientesWeb > 0 && (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-white"
                    title="Hay solicitudes web pendientes en una o más sedes"
                  />  
                )}
                <Building2 className="h-4 w-4 shrink-0 text-sport-orange" />
                <span className="min-w-0 flex-1 truncate font-medium">{activa.nombre}</span>
                {notifCliente && pendientesSedeActiva > 0 && (
                  <span className="shrink-0 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                    {pendientesSedeActiva > 9 ? "9+" : pendientesSedeActiva}
                  </span>
                )}
                {notifCliente &&
                  totalPendientesWeb > 0 &&
                  pendientesSedeActiva === 0 && (
                    <span className="shrink-0 text-[10px] font-semibold text-red-600">
                      Otra sede
                    </span>
                  )}
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 text-slate-400", sedeAbierta && "rotate-180")}
                />
              </button>
            ) : (
              <button
                type="button"
                className="relative flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-sm text-slate-800 hover:border-sport-orange/40"
                onClick={() => {
                  if (activa && pendientesSedeActiva > 0) {
                    elegirSede(activa.id, true);
                  }
                }}
              >
                {notifCliente && pendientesSedeActiva > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-white" />
                )}
                <Building2 className="h-4 w-4 shrink-0 text-sport-green" />
                <span className="truncate font-medium">{activa.nombre}</span>
                {notifCliente && pendientesSedeActiva > 0 && (
                  <span className="ml-auto text-[10px] font-semibold text-red-700">
                    {pendientesSedeActiva} web
                  </span>
                )}
              </button>
            )}
            {sedeAbierta && varias && (
              <ul className="absolute left-0 right-0 top-full z-40 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {sucursales.map((s) => {
                  const selected = s.id === activa.id;
                  const n = notifCliente ? (pendientesPorSede.get(s.id) ?? 0) : 0;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm",
                          selected
                            ? "bg-sport-orange/10 font-medium text-sport-orange"
                            : "text-slate-700 hover:bg-slate-50"
                        )}
                        onClick={() => elegirSede(s.id, n > 0)}
                      >
                        <span
                          className={cn(
                            "h-2 w-2 shrink-0 rounded-full",
                            n > 0 ? "bg-red-600" : "bg-slate-200"
                          )}
                          aria-hidden
                        />
                        <Building2 className="h-4 w-4 shrink-0 opacity-70" />
                        <span className="min-w-0 flex-1 truncate">{s.nombre}</span>
                        {n > 0 ? (
                          <span className="shrink-0 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                            {n} solicitud{n === 1 ? "" : "es"}
                          </span>
                        ) : (
                          <span className="shrink-0 text-[11px] text-slate-400">—</span>
                        )}
                      </button>
                    </li>
                  );
                })}
                {notifCliente && totalPendientesWeb > 0 && (
                  <li className="border-t border-slate-100 px-3 py-2">
                    <Link
                      href="/reservas-web"
                      className="text-xs font-medium text-emerald-700 hover:underline"
                      onClick={() => setSedeAbierta(false)}
                    >
                      Ver todas en Reservas web →
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </div>
        )}

        <div className="flex-1" />

        <PanelUserMenu />
      </div>
      <div
        className="h-0.5 w-full bg-gradient-to-r from-sport-orange via-sport-green to-sport-orange"
        aria-hidden
      />
    </header>
  );
}
