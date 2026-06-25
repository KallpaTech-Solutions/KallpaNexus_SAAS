import { NEXUS_VERTICALS } from "@/lib/nexus-verticals";

/** Imagen hero por defecto (public/brand/img). */
export const PUBLIC_HERO_IMAGE = "/brand/img/Fondo_1.png";

/** Imagen de cancha en landing si no hay foto propia. */
export const PUBLIC_CANCHA_IMAGE = "/brand/img/Cancha.png";

export function resolveMediaUrl(
  url: string | null | undefined,
  fallback: string
): string {
  const t = url?.trim();
  if (!t) return fallback;
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  return t.startsWith("/") ? t : `/${t}`;
}

export type PublicSedeRef = {
  id: string;
  nombre: string;
  slug?: string;
};

export function slugifySedeNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "sede";
}

/** Resuelve id de sucursal desde ?sede=slug o legacy ?sucursal=uuid. */
export function resolveSedeId(
  sucursales: PublicSedeRef[],
  sedeSlug: string,
  legacySucursalId: string
): string {
  if (!sucursales.length) return "";

  if (legacySucursalId) {
    const byId = sucursales.find((s) => s.id === legacySucursalId);
    if (byId) return byId.id;
  }

  if (sedeSlug) {
    const bySlug = sucursales.find(
      (s) => (s.slug ?? slugifySedeNombre(s.nombre)) === sedeSlug
    );
    if (bySlug) return bySlug.id;
  }

  return sucursales[0]!.id;
}

export function sedeSlugFor(s: PublicSedeRef): string {
  return s.slug ?? slugifySedeNombre(s.nombre);
}

export function tenantSedeHref(
  tenantSlug: string,
  sede: PublicSedeRef,
  hash = "reservar",
  opts?: { omitQueryIfOnlySede?: boolean }
): string {
  const base = `${NEXUS_VERTICALS.sport.path}/${tenantSlug}`;
  const useQuery = !opts?.omitQueryIfOnlySede;
  const q = useQuery ? `?sede=${encodeURIComponent(sedeSlugFor(sede))}` : "";
  return hash ? `${base}${q}#${hash}` : `${base}${q}`;
}
