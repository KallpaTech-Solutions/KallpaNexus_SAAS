/** Rutas del panel staff (sin analytics de marketing). */
const PANEL_ROUTE_PREFIXES = [
  "/dashboard",
  "/canchas",
  "/plan",
  "/tarifas",
  "/reservas",
  "/reservas-web",
  "/inventario",
  "/ventas",
  "/reportes",
  "/egresos",
  "/notificaciones",
  "/equipo",
  "/medios-pago",
  "/calendario",
  "/configuracion",
  "/sucursales",
] as const;

export function isTenantPublicMarketingPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? "/";
  if (path === "/") return true;
  return !PANEL_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}
