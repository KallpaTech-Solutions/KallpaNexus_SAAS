import { isTenantPublicMarketingPath } from "@/lib/public-routes";

export type PublicGaEventParams = Record<
  string,
  string | number | boolean | undefined
>;

function scrubParams(
  params: PublicGaEventParams | undefined
): Record<string, string | number | boolean> | undefined {
  if (!params) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Envía un evento GA4 (gtag) solo en rutas públicas de marketing. */
export function trackPublicGaEvent(
  eventName: string,
  params?: PublicGaEventParams
): void {
  if (typeof window === "undefined") return;
  if (!isTenantPublicMarketingPath(window.location.pathname)) return;
  if (typeof window.gtag !== "function") return;

  const name = eventName.trim();
  if (!name) return;

  const payload = scrubParams({
    page_path: window.location.pathname,
    page_location: window.location.href,
    ...params,
  });

  window.gtag("event", name, payload);
}
