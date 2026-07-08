export const LANDING_MODULOS = [
  {
    id: "sport",
    emoji: "⚽",
    titulo: "Nexus Sport",
    estado: "disponible" as const,
    desc: "Canchas y complejos deportivos.",
    tagline: "Reservas web, tarifas y panel en tiempo real.",
    items: [
      "Reservas web y calendario en tiempo real",
      "Panel admin, tarifas y medios de pago",
      "Reportes y reservas web pendientes",
    ],
  },
  {
    id: "stay",
    emoji: "🏨",
    titulo: "Nexus Stay",
    estado: "proximo" as const,
    desc: "Hoteles, hostales y alojamientos.",
    tagline: "Habitaciones y check-in digital.",
    items: ["Check-in digital", "Housekeeping", "Tarifas dinámicas", "Motor de reservas"],
  },
  {
    id: "care",
    emoji: "💜",
    titulo: "Nexus Care",
    estado: "proximo" as const,
    desc: "Spas, clínicas y bienestar.",
    tagline: "Agenda y membresías.",
    items: ["Agenda inteligente", "Historial de clientes", "Recordatorios", "Membresías"],
  },
  {
    id: "gear",
    emoji: "🚜",
    titulo: "Nexus Gear",
    estado: "proximo" as const,
    desc: "Alquiler de maquinaria.",
    tagline: "Catálogo y contratos.",
    items: ["Catálogo digital", "Disponibilidad", "Contratos", "Facturación"],
  },
] as const;

export const LANDING_PROBLEMAS = [
  {
    t: "Reservas duplicadas",
    p: "Calendario sincronizado y bloqueo automático de horarios.",
  },
  {
    t: "Control manual",
    p: "Menos WhatsApp y planillas: confirmaciones y cobros en un solo lugar.",
  },
  {
    t: "Falta de reportes",
    p: "Ingresos, reservas y sedes con datos en tiempo real.",
  },
] as const;

export const LANDING_BENEFICIOS = [
  { h: "24/7", p: "Reservas y gestión en cualquier momento." },
  { h: "Pagos", p: "Cobros digitales con trazabilidad." },
  { h: "Reportes", p: "Estadísticas para decidir mejor." },
  { h: "Multi-sede", p: "Varios negocios (tenants) bajo tu empresa." },
] as const;

export const LANDING_MARQUEE = [
  { value: "24/7", label: "reservas web activas" },
  { value: "Multi-sede", label: "tenants por empresa" },
  { value: "Tiempo real", label: "calendario y cobros" },
  { value: "Sport", label: "módulo disponible hoy" },
] as const;

export const LANDING_HERO_WORDS = ["reservar", "cobrar", "reportar", "escalar"] as const;

export const LANDING_NAV = [
  { name: "Inicio", href: "#inicio" },
  { name: "Oferta", href: "#oferta" },
  { name: "Módulos", href: "#modulos" },
  { name: "Precios", href: "#planes" },
  { name: "Sport", href: "/sports" },
  { name: "Demo", href: "/demo/sport" },
] as const;

/** Enlaces a secciones de la landing: siempre al inicio (`/#modulos`), no al path actual. */
export function landingSectionHref(href: string): string {
  if (href.startsWith("#")) return `/${href}`;
  return href;
}
