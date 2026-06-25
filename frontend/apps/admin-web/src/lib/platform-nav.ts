import { getTenantWebUrl, tenantPublicSportUrl } from "@kallpanexus/env";
import { hasPlatformPermission } from "@kallpanexus/shared";
import {
  Building2,
  CreditCard,
  FileText,
  LayoutDashboard,
  Network,
  Shield,
  Users,
} from "lucide-react";

export type PlatformNavItem = {
  href: string;
  label: string;
  permiso: string;
  icon: typeof LayoutDashboard;
};

export const PLATFORM_NAV: PlatformNavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    permiso: "platform:dashboard:ver",
    icon: LayoutDashboard,
  },
  {
    href: "/empresas",
    label: "Empresas",
    permiso: "platform:empresas:ver",
    icon: Building2,
  },
  {
    href: "/tenants",
    label: "Tenants",
    permiso: "platform:tenants:ver",
    icon: Network,
  },
  {
    href: "/planes",
    label: "Planes",
    permiso: "platform:planes:ver",
    icon: CreditCard,
  },
  {
    href: "/solicitudes-contrato",
    label: "Contratos",
    permiso: "platform:empresas:ver",
    icon: FileText,
  },
  {
    href: "/usuarios",
    label: "Usuarios",
    permiso: "platform:usuarios:ver",
    icon: Users,
  },
  {
    href: "/roles",
    label: "Roles plataforma",
    permiso: "platform:roles:ver",
    icon: Shield,
  },
];

export function filterPlatformNav(permisos: string[]): PlatformNavItem[] {
  return PLATFORM_NAV.filter((item) => hasPlatformPermission(permisos, item.permiso));
}

export function puedeAccederRutaPlatform(pathname: string, permisos: string[]): boolean {
  const item = PLATFORM_NAV.find(
    (n) => pathname === n.href || pathname.startsWith(`${n.href}/`)
  );
  if (!item) return true;
  return hasPlatformPermission(permisos, item.permiso);
}

export function tenantPanelLoginUrl(subdomain: string): string {
  const q = encodeURIComponent(subdomain.trim().toLowerCase());
  return `${getTenantWebUrl()}/login?subdomain=${q}`;
}

export function tenantPublicUrl(subdomain: string): string {
  return tenantPublicSportUrl(subdomain);
}
