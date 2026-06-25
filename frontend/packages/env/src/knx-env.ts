/**
 * Punto único de verdad para URLs y variables de despliegue del monorepo frontend.
 * Los defaults son solo para desarrollo local; en producción define las variables en el host.
 *
 * Ver `frontend/.env.example` y el README del monorepo.
 */

export const KNX_DEV_DEFAULTS = {
  /** Backend .NET (proxy Next en servidor) */
  apiUrl: "https://localhost:7110",
  tenantWebUrl: "http://localhost:3000",
  adminWebUrl: "http://localhost:3001",
  adminLoginPath: "/login",
} as const;

function trimSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function readEnv(key: string): string | undefined {
  const v = process.env[key]?.trim();
  return v || undefined;
}

/**
 * URL del API .NET usada por rutas proxy de Next (`/api/*`, `/uploads/*`).
 * Prioridad: KNX_API_URL → API_PROXY_TARGET → default dev.
 */
export function getKnxApiServerUrl(): string {
  const raw =
    readEnv("KNX_API_URL") ??
    readEnv("API_PROXY_TARGET") ??
    KNX_DEV_DEFAULTS.apiUrl;
  return trimSlash(raw);
}

/**
 * Si está definida, el navegador llama al API directamente (CORS en backend).
 * Si no, usa mismo origen + proxy Next (`baseURL` vacío en cliente).
 */
export function getKnxPublicApiUrl(): string | undefined {
  const raw = readEnv("NEXT_PUBLIC_KNX_API_URL");
  return raw ? trimSlash(raw) : undefined;
}

/** Base URL para Axios/fetch del panel tenant (browser vs SSR). */
export function getTenantApiClientBaseUrl(): string {
  const direct = getKnxPublicApiUrl();
  if (typeof window !== "undefined") {
    return direct ?? "";
  }
  return direct ?? getKnxApiServerUrl();
}

/** Base URL para la consola plataforma (admin-web). */
export function getAdminApiClientBaseUrl(): string {
  if (typeof window !== "undefined") {
    const direct = getKnxPublicApiUrl();
    return direct ?? window.location.origin;
  }
  const app =
    readEnv("NEXT_PUBLIC_APP_URL") ?? KNX_DEV_DEFAULTS.adminWebUrl;
  const direct = getKnxPublicApiUrl();
  return direct ?? trimSlash(app);
}

export function getTenantWebUrl(): string {
  return trimSlash(
    readEnv("NEXT_PUBLIC_TENANT_WEB_URL") ?? KNX_DEV_DEFAULTS.tenantWebUrl
  );
}

export function getAdminWebUrl(): string {
  return trimSlash(
    readEnv("NEXT_PUBLIC_ADMIN_URL") ??
      `${KNX_DEV_DEFAULTS.adminWebUrl}${KNX_DEV_DEFAULTS.adminLoginPath}`
  );
}

/** Solo desarrollo: subdominio tenant cuando no hay `{sub}.localhost`. */
export function getDevTenantSubdomain(): string | undefined {
  return readEnv("NEXT_PUBLIC_DEV_TENANT_SUBDOMAIN");
}

export function getGoogleMapsEmbedApiKey(): string | undefined {
  return readEnv("NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY");
}

/** URL pública del panel tenant de un negocio (enlaces desde admin). */
export function tenantPanelUrlForSubdomain(subdomain: string): string {
  const sub = subdomain.trim().toLowerCase();
  const base = getTenantWebUrl();
  try {
    const u = new URL(base);
    if (u.hostname === "localhost" || u.hostname.endsWith(".localhost")) {
      return `${u.protocol}//${sub}.localhost${u.port ? `:${u.port}` : ""}`;
    }
    const host = u.hostname.startsWith("www.") ? u.hostname.slice(4) : u.hostname;
    return `${u.protocol}//${sub}.${host}${u.port ? `:${u.port}` : ""}`;
  } catch {
    return `${base}?tenant=${encodeURIComponent(sub)}`;
  }
}

/** Landing pública Sport `/sports/{slug}`. */
export function tenantPublicSportUrl(slug: string): string {
  return `${getTenantWebUrl()}/sports/${encodeURIComponent(slug.trim())}`;
}
