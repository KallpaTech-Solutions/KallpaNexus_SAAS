/** URL para archivos subidos al API (/uploads/...) vía proxy de Next o media pública. */
export function panelUploadUrl(ruta: string | null | undefined): string {
  const t = ruta?.trim();
  if (!t) return "";
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  return t.startsWith("/") ? t : `/${t}`;
}

export function publicTenantMediaUrl(slug: string, ruta: string | null | undefined): string {
  const t = ruta?.trim();
  if (!t) return "";
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  const normalized = t.startsWith("/") ? t : `/${t}`;
  return `/api/public/${encodeURIComponent(slug)}/media?ruta=${encodeURIComponent(normalized)}`;
}

/** Imagen/archivo en landing pública: uploads vía API pública; resto rutas estáticas del front. */
export function resolvePublicMediaUrl(
  slug: string,
  url: string | null | undefined,
  fallback: string
): string {
  const t = url?.trim();
  if (!t) return fallback;
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  const normalized = t.startsWith("/") ? t : `/${t}`;
  if (normalized.toLowerCase().startsWith("/uploads/")) {
    return publicTenantMediaUrl(slug, normalized);
  }
  return normalized;
}

export type TipoAdelantoWeb = "Total" | "Porcentaje30" | "SinAdelanto";

export function montoAdelantoWeb(total: number, tipo: TipoAdelantoWeb): number {
  if (tipo === "SinAdelanto") return 0;
  if (tipo === "Porcentaje30") return Math.round(total * 0.3 * 100) / 100;
  return total;
}
