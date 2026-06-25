import { PERMISOS_SPORT } from "@kallpanexus/types";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Globe,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  Crown,
  LayoutDashboard,
  MapPin,
  Package,
  Settings,
  ShoppingCart,
  TrendingDown,
  Trophy,
  UserCog,
  Users,
} from "lucide-react";
import { canAccess } from "@/lib/auth-store";
import type { TenantSuscripcionResumen } from "@kallpanexus/types";
import { tenantNavItemPermitido, tenantSoloGestionPlan } from "@kallpanexus/shared";

export type PanelNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Al menos uno de estos permisos (vacío = visible para cualquier sesión staff). */
  permisos: string[];
};

/** Permisos de gestión del club (no basta con sport:canchas:ver para operar reservas). */
const GESTION_CANCHAS = [
  PERMISOS_SPORT.canchasCrear,
  PERMISOS_SPORT.canchasModificar,
] as const;

const GESTION_EQUIPO = [
  PERMISOS_SPORT.usuariosCrear,
  PERMISOS_SPORT.usuariosActivar,
  PERMISOS_SPORT.usuariosEliminar,
  PERMISOS_SPORT.rolesVer,
  PERMISOS_SPORT.rolesGestionar,
] as const;

export const PANEL_NAV: PanelNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permisos: [PERMISOS_SPORT.reservasVer] },
  { href: "/calendario", label: "Calendario", icon: CalendarDays, permisos: [PERMISOS_SPORT.reservasVer] },
  { href: "/reservas-web", label: "Reservas web", icon: Globe, permisos: [PERMISOS_SPORT.reservasVer] },
  { href: "/reservas", label: "Reservas", icon: Users, permisos: [PERMISOS_SPORT.reservasVer] },
  {
    href: "/ventas",
    label: "Ventas",
    icon: ShoppingCart,
    permisos: [PERMISOS_SPORT.ventasVer, PERMISOS_SPORT.ventasCrear],
  },
  {
    href: "/inventario",
    label: "Inventario",
    icon: Package,
    permisos: [PERMISOS_SPORT.comprasVer, PERMISOS_SPORT.ventasProductosGestionar],
  },
  {
    href: "/egresos",
    label: "Egresos",
    icon: TrendingDown,
    permisos: [PERMISOS_SPORT.egresosVer, PERMISOS_SPORT.egresosCrear],
  },
  { href: "/canchas", label: "Canchas", icon: Trophy, permisos: [...GESTION_CANCHAS] },
  { href: "/sucursales", label: "Sucursales", icon: MapPin, permisos: [PERMISOS_SPORT.canchasModificar] },
  { href: "/tarifas", label: "Tarifas", icon: CircleDollarSign, permisos: [PERMISOS_SPORT.canchasModificar] },
  { href: "/medios-pago", label: "Medios de pago", icon: CreditCard, permisos: [PERMISOS_SPORT.canchasModificar] },
  { href: "/reportes", label: "Reportes", icon: BarChart3, permisos: [PERMISOS_SPORT.reportesFinancieros] },
  { href: "/equipo", label: "Equipo", icon: UserCog, permisos: [...GESTION_EQUIPO] },
  { href: "/plan", label: "Plan", icon: Crown, permisos: [PERMISOS_SPORT.rolesGestionar] },
  {
    href: "/configuracion",
    label: "Configuración",
    icon: Settings,
    permisos: [PERMISOS_SPORT.canchasModificar],
  },
];

export function navVisibleForPermisos(permisos: string[], item: PanelNavItem): boolean {
  if (item.permisos.length === 0) return true;
  return item.permisos.some((p) => canAccess(permisos, p));
}

export function filterPanelNav(permisos: string[]): PanelNavItem[] {
  return PANEL_NAV.filter((item) => navVisibleForPermisos(permisos, item));
}

export function panelNavItemForPath(pathname: string): PanelNavItem | undefined {
  return PANEL_NAV.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}

export function puedeAccederRutaPanel(
  pathname: string,
  permisos: string[],
  suscripcion?: TenantSuscripcionResumen | null
): boolean {
  const item = panelNavItemForPath(pathname);
  if (!item) return true;
  if (!navVisibleForPermisos(permisos, item)) return false;
  if (tenantSoloGestionPlan(suscripcion ?? undefined)) {
    return tenantNavItemPermitido(item.href, suscripcion ?? undefined);
  }
  return true;
}

export function navItemBloqueadoPorSuscripcion(
  href: string,
  suscripcion?: TenantSuscripcionResumen | null
): boolean {
  return !tenantNavItemPermitido(href, suscripcion ?? undefined);
}
