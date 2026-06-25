/** Rutas públicas por vertical del ecosistema Kallpa Nexus. */
export const NEXUS_VERTICALS = {
  sport: {
    id: "sport",
    path: "/sports",
    label: "Nexus Sport",
    hubTitle: "Reservar canchas",
    disponible: true,
  },
  stay: {
    id: "stay",
    path: "/stay",
    label: "Nexus Stay",
    hubTitle: "Buscar alojamiento",
    disponible: false,
  },
  care: {
    id: "care",
    path: "/care",
    label: "Nexus Care",
    hubTitle: "Agendar servicios",
    disponible: false,
  },
  gear: {
    id: "gear",
    path: "/gear",
    label: "Nexus Gear",
    hubTitle: "Alquilar equipos",
    disponible: false,
  },
} as const;

export type NexusVerticalId = keyof typeof NEXUS_VERTICALS;

export function verticalHubPath(id: NexusVerticalId): string {
  return NEXUS_VERTICALS[id].path;
}

export function sportTenantPublicPath(tenantSlug: string): string {
  return `${NEXUS_VERTICALS.sport.path}/${tenantSlug}`;
}
