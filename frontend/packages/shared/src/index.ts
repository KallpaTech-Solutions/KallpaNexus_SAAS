const TENANT_SUBDOMAIN_KEY = "knx_tenant_subdomain";
const TENANT_TOKEN_KEY = "knx_tenant_token";
const TENANT_SESSION_KEY = "knx_tenant_session";

export type StaffSucursalAcceso = {
  id: string;
  nombre: string;
};

export type StoredTenantSession = {
  token: string;
  tenantId: string;
  dni: string;
  nombreCompleto: string;
  email?: string | null;
  rol: string;
  permisos: string[];
  debeCambiarPassword?: boolean;
  accesoTodasSucursales?: boolean;
  sucursales?: StaffSucursalAcceso[];
  sucursalActivaId?: string | null;
  /** Marca del negocio (tenant), visible al público. */
  nombreComercialNegocio?: string | null;
  /** Nombre comercial de la empresa pagadora. */
  nombreEmpresa?: string | null;
};

export {
  readSucursalActivaId,
  resolverSucursalActivaInicial,
  sucursalActivaStorageKey,
  writeSucursalActivaId,
} from "./sucursal-staff";

export {
  severidadCuentaRegresiva,
  textoCuentaRegresivaPlan,
  tenantNavItemPermitido,
  tenantSoloGestionPlan,
  TENANT_RUTA_PLAN,
} from "./plan-ciclo";

export {
  groupPermisosCatalogo,
  permisosGrupoParcial,
  permisosGrupoSeleccionados,
  seleccionPermisosParcial,
  togglePermisoGrupo,
  toggleTodosPermisos,
  todosPermisosSeleccionados,
  type PermisoGrupo,
} from "./permiso-grupos";

/** Normaliza DNI staff (solo dígitos). */
export function normalizarDniStaff(dni: string): string {
  return dni.replace(/\D/g, "");
}

export function validarPoliticaPasswordStaff(
  password: string,
  dni: string
): string | null {
  if (password.length < 8) {
    return "Mínimo 8 caracteres.";
  }
  if (password === dni) {
    return "No puede ser igual a tu DNI.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Incluye al menos una mayúscula.";
  }
  if (!/[a-z]/.test(password)) {
    return "Incluye al menos una minúscula.";
  }
  if (!/[0-9]/.test(password)) {
    return "Incluye al menos un número.";
  }
  return null;
}

export function resolveTenantSubdomainFromHost(host: string): string | null {
  const hostname = host.split(":")[0].toLowerCase();
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return null;
  }
  const parts = hostname.split(".");
  if (parts.length >= 2 && parts[0] !== "www") {
    return parts[0];
  }
  return null;
}

export function getStoredTenantSubdomain(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem(TENANT_SUBDOMAIN_KEY) ||
    resolveTenantSubdomainFromHost(window.location.host)
  );
}

export function setStoredTenantSubdomain(subdomain: string): void {
  localStorage.setItem(TENANT_SUBDOMAIN_KEY, subdomain.trim().toLowerCase());
}

export function getStoredTenantToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TENANT_TOKEN_KEY);
}

export function setStoredTenantToken(token: string): void {
  localStorage.setItem(TENANT_TOKEN_KEY, token);
}

export function clearTenantAuth(): void {
  localStorage.removeItem(TENANT_TOKEN_KEY);
  localStorage.removeItem(TENANT_SESSION_KEY);
}

export function getStoredTenantSession(): StoredTenantSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(TENANT_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredTenantSession;
  } catch {
    return null;
  }
}

export function setStoredTenantSession(session: StoredTenantSession): void {
  localStorage.setItem(TENANT_SESSION_KEY, JSON.stringify(session));
  setStoredTenantToken(session.token);
}

export function hasPermission(permisos: string[], codigo: string): boolean {
  return permisos.includes(codigo);
}

const PLATFORM_TOKEN_KEY = "knx_platform_token";
const PLATFORM_SESSION_KEY = "knx_platform_session";

export type StoredPlatformSession = {
  token: string;
  usuarioId: string;
  nombreCompleto: string;
  email: string;
  rol: string;
  permisos: string[];
};

export function getStoredPlatformToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PLATFORM_TOKEN_KEY);
}

export function getStoredPlatformSession(): StoredPlatformSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PLATFORM_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredPlatformSession;
  } catch {
    return null;
  }
}

export function setStoredPlatformSession(session: StoredPlatformSession): void {
  localStorage.setItem(PLATFORM_SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(PLATFORM_TOKEN_KEY, session.token);
}

export function clearPlatformAuth(): void {
  localStorage.removeItem(PLATFORM_TOKEN_KEY);
  localStorage.removeItem(PLATFORM_SESSION_KEY);
}

export function hasPlatformPermission(permisos: string[], codigo: string): boolean {
  return permisos.includes(codigo);
}

export function formatMoneyPEN(value: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(value);
}

/**
 * Hora civil Lima para el API (sin Z). El backend usa solo SportTimeHelper (America/Lima).
 */
export function toApiDateTimeLocal(datetimeLocal: string): string {
  if (!datetimeLocal) return "";
  let s = datetimeLocal.trim().replace(" ", "T");
  if (s.endsWith("Z") || s.endsWith("z")) {
    s = s.slice(0, -1);
  }
  const off = s.match(/[+-]\d{2}:?\d{2}$/);
  if (off) {
    s = s.slice(0, off.index);
  }
  if (s.length === 16) {
    s = `${s}:00`;
  }
  return s;
}

/**
 * Instant desde el API (UTC con Z). No usar para cadenas sin zona enviadas al crear reserva.
 */
export function parseApiDateTime(iso: string): Date {
  if (!iso) return new Date();
  const s = iso.trim();
  if (s.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(s)) {
    return new Date(s);
  }
  // Sin zona: reloj civil Lima → instante UTC correcto (UTC-5).
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})/);
  if (m) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const y = m[1];
    const mo = m[2];
    const d = m[3];
    const h = pad(Number(m[4]));
    const min = pad(Number(m[5]));
    return new Date(`${y}-${mo}-${d}T${h}:${min}:00-05:00`);
  }
  return new Date(`${s}Z`);
}

export function formatDateTime(iso: string): string {
  return parseApiDateTime(iso).toLocaleString("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Lima",
  });
}

/** Valor para input datetime-local desde ISO del API. */
export function toDateTimeLocalValue(iso: string): string {
  const d = parseApiDateTime(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** Fecha + hora en punto (minutos :00) para reservas por hora. */
export function splitDateTimeLocalValue(value: string): { fecha: string; hora: number } {
  if (!value) return { fecha: "", hora: 12 };
  const [fecha, time] = value.split("T");
  const hour = Number.parseInt(time?.split(":")[0] ?? "12", 10);
  return { fecha: fecha ?? "", hora: Number.isNaN(hour) ? 12 : hour };
}

export function formatHoraReloj24(h: number): string {
  const hour = ((h % 24) + 24) % 24;
  return `${String(hour).padStart(2, "0")}:00`;
}

export function formatHoraReloj12(h: number): string {
  const hour = ((h % 24) + 24) % 24;
  if (hour === 0) return "12:00 a.m.";
  if (hour === 12) return "12:00 p.m.";
  if (hour < 12) return `${hour}:00 a.m.`;
  return `${hour - 12}:00 p.m.`;
}

/** Fecha actual en Lima (yyyy-MM-dd) para prellenar reservas. */
export function fechaHoyLima(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "01";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function joinDateTimeLocalValue(fecha: string, hora: number): string {
  const h = String(Math.min(23, Math.max(0, hora))).padStart(2, "0");
  const f = fecha.trim() || fechaHoyLima();
  return `${f}T${h}:00`;
}

/** ISO del API → fecha/hora Lima al inicio de la hora. */
export function toReservaFechaHoraFromIso(iso: string): { fecha: string; hora: number } {
  return splitDateTimeLocalValue(toDateTimeLocalValue(iso));
}

export const TELEFONO_CLIENTE_SN = "SN";

/** DNI interno para cliente varios / sin documento (mostrador). */
export const DNI_CLIENTE_VARIOS = "123";

export function esDniClienteVarios(dni: string): boolean {
  const d = dni.replace(/\D/g, "");
  return d === DNI_CLIENTE_VARIOS || dni.trim() === DNI_CLIENTE_VARIOS;
}

export function documentoClienteListoParaBuscar(dni: string): boolean {
  const digits = dni.replace(/\D/g, "");
  if (esDniClienteVarios(dni)) return true;
  return digits.length === 8;
}

export function soloDigitosTelefono(value: string): string {
  return value.replace(/\D/g, "").slice(0, 9);
}

export function esSinTelefonoCliente(stored: string | null | undefined): boolean {
  if (!stored?.trim()) return false;
  return stored.trim().toUpperCase() === TELEFONO_CLIENTE_SN;
}

export function etiquetaTelefonoCliente(stored: string | null | undefined): string {
  if (!stored?.trim()) return "—";
  if (esSinTelefonoCliente(stored)) return "Sin celular";
  const d = soloDigitosTelefono(stored);
  return d.length === 9 ? d : stored.trim();
}

export function telefonoClienteParaApi(
  telefono: string,
  sinTelefono: boolean
): { telefonoCliente: string; sinTelefonoCliente: boolean } {
  if (sinTelefono) {
    return { telefonoCliente: "", sinTelefonoCliente: true };
  }
  return {
    telefonoCliente: soloDigitosTelefono(telefono),
    sinTelefonoCliente: false,
  };
}

/** 9 dígitos o SN (solo personal en mostrador). */
export function telefonoClienteValidoParaGuardar(
  telefono: string,
  sinTelefono: boolean
): boolean {
  if (sinTelefono) return true;
  return soloDigitosTelefono(telefono).length === 9;
}

export function puedeAbrirWhatsAppCliente(stored: string | null | undefined): boolean {
  return soloDigitosTelefono(stored ?? "").length === 9;
}

const WHATSAPP_PLACEHOLDERS = [
  "nombre",
  "dni",
  "cancha",
  "fecha",
  "hora",
  "monto",
  "negocio",
] as const;

export function aplicarPlantillaWhatsApp(
  plantilla: string,
  vars: Partial<Record<(typeof WHATSAPP_PLACEHOLDERS)[number], string>>
): string {
  let out = plantilla;
  for (const key of WHATSAPP_PLACEHOLDERS) {
    const val = vars[key] ?? "";
    out = out.replaceAll(`{{${key}}}`, val);
  }
  return out;
}

export function urlWhatsAppCliente(
  telefono9: string,
  mensaje: string
): string {
  const digits = soloDigitosTelefono(telefono9);
  if (digits.length !== 9) return "#";
  const text = encodeURIComponent(mensaje);
  return `https://wa.me/51${digits}?text=${text}`;
}

/** YYYY-MM-DD en calendario Lima (para inputs type=date). */
export function fechaHoyLimaInput(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
}

export function fechaLimaInputConOffset(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
}

/** Convierte rango inclusive (Lima) a ISO UTC para API Reservas (solapamiento). */
export {
  etiquetaFechaHora,
  etiquetaFranjaHoraria,
  etiquetaHorario,
  etiquetaRangoFechas,
  extraerCiudadDesdeDireccion,
  hintHoraFranja,
  sufijoCiudadParentesis,
  textoHorariosNegocio,
  textoResumenHoy,
} from "./sucursal-zona";

export function rangoFechasLimaParaApi(desde: string, hasta: string): {
  desde: string;
  hasta: string;
} {
  const [y1, m1, d1] = desde.split("-").map(Number);
  const [y2, m2, d2] = hasta.split("-").map(Number);
  const desdeIso = new Date(Date.UTC(y1, m1 - 1, d1, 5, 0, 0)).toISOString();
  const hastaIso = new Date(Date.UTC(y2, m2 - 1, d2 + 1, 5, 0, 0)).toISOString();
  return { desde: desdeIso, hasta: hastaIso };
}
