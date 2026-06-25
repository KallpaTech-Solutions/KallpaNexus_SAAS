"use client";

import { cn } from "@/lib/cn";
import { mapLoginSucursales, useAuthStore, usePermisosSession } from "@/lib/auth-store";
import { PanelHeader } from "@/components/panel-header";
import { PanelSolicitudesWebBadge } from "@/components/panel-solicitudes-web-badge";
import { PanelReservasWebPendientesSync } from "@/components/panel-reservas-web-pendientes-sync";
import { useTenantApi } from "@/lib/api-context";
import { filterPanelNav, navItemBloqueadoPorSuscripcion, puedeAccederRutaPanel } from "@/lib/panel-nav";
import { tenantSoloGestionPlan, TENANT_RUTA_PLAN } from "@kallpanexus/shared";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { UiFeedbackProvider } from "@/components/ui-feedback-provider";

export function TenantShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const setSession = useAuthStore((s) => s.setSession);
  const api = useTenantApi();
  const permisos = usePermisosSession();
  const nav = useMemo(() => filterPanelNav(permisos), [permisos]);
  const [mounted, setMounted] = useState(false);

  const suscripcionQ = useQuery({
    queryKey: ["tenant-suscripcion"],
    queryFn: () => api.suscripcion.resumen(),
    enabled: Boolean(session?.token),
    staleTime: 60_000,
  });

  const suscripcion = suscripcionQ.data;
  const soloPlan = tenantSoloGestionPlan(suscripcion);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !session) {
      router.replace("/login");
      return;
    }
    if (mounted && session?.debeCambiarPassword) {
      router.replace("/cambiar-password");
      return;
    }
    if (mounted && session && !puedeAccederRutaPanel(pathname, permisos, suscripcion)) {
      if (soloPlan) {
        router.replace(TENANT_RUTA_PLAN);
        return;
      }
      const destino = filterPanelNav(permisos)[0]?.href ?? "/login";
      router.replace(destino);
    }
  }, [mounted, session, router, pathname, permisos, suscripcion, soloPlan]);

  useEffect(() => {
    if (!mounted || !session?.token) return;
    let cancelled = false;
    void api.auth.yo().then((yo) => {
      if (cancelled) return;
      const actual = useAuthStore.getState().session;
      if (!actual?.token) return;
      setSession({
        ...actual,
        permisos: yo.permisos ?? actual.permisos,
        rol: yo.rol ?? actual.rol,
        debeCambiarPassword: yo.debeCambiarPassword,
        accesoTodasSucursales: yo.accesoTodasSucursales ?? actual.accesoTodasSucursales,
        sucursales:
          yo.sucursales && yo.sucursales.length > 0
            ? mapLoginSucursales(yo.sucursales)
            : actual.sucursales,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [mounted, session?.token, api, setSession]);

  if (!mounted) {
    return null;
  }

  if (!session) {
    return null;
  }

  return (
    <UiFeedbackProvider>
      <PanelReservasWebPendientesSync />
      <div className="flex min-h-screen bg-sport-panel-bg text-slate-900">
        <aside className="flex w-[4.5rem] flex-col border-r border-slate-200 bg-white lg:w-56">
          <div className="hidden border-b border-slate-100 px-4 py-4 lg:block">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-sport-orange">
              Panel
            </p>
            <p className="text-xs text-slate-500">Operación diaria</p>
          </div>
          {soloPlan && (
            <p className="mx-2 mt-2 hidden rounded-lg border border-amber-300 bg-amber-50 px-2 py-2 text-[10px] leading-snug text-amber-900 lg:block">
              Plan vencido: solo «Plan» está disponible para renovar o contratar.
            </p>
          )}
          <nav className="flex flex-1 flex-col gap-0.5 p-2 lg:p-3">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const bloqueado = navItemBloqueadoPorSuscripcion(item.href, suscripcion);
              const muestraBadge = item.href === "/reservas-web" && !bloqueado;

              const className = cn(
                "relative flex items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-sm transition lg:justify-start lg:px-3",
                bloqueado &&
                  "cursor-not-allowed opacity-40 pointer-events-none select-none",
                !bloqueado &&
                  active &&
                  "bg-sport-green/15 font-semibold text-sport-navy shadow-sm ring-2 ring-sport-green/40",
                !bloqueado &&
                  !active &&
                  "text-slate-700 hover:bg-slate-100 hover:text-slate-950 hover:shadow-sm"
              );

              const inner = (
                <>
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      bloqueado && "text-slate-400",
                      !bloqueado && active && "text-sport-orange",
                      !bloqueado && !active && "text-slate-500"
                    )}
                  />
                  <span className="hidden truncate lg:inline">{item.label}</span>
                  {muestraBadge && (
                    <PanelSolicitudesWebBadge className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white lg:static lg:ml-auto" />
                  )}
                </>
              );

              if (bloqueado) {
                return (
                  <span
                    key={item.href}
                    title={`${item.label} (renueva tu plan)`}
                    className={className}
                    aria-disabled
                  >
                    {inner}
                  </span>
                );
              }

              return (
                <Link key={item.href} href={item.href} title={item.label} className={className}>
                  {inner}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <PanelHeader />
          <main className="flex-1 overflow-auto bg-sport-panel-bg p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </UiFeedbackProvider>
  );
}
