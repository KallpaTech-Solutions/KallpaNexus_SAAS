export type StaffSucursalAcceso = {
  id: string;
  nombre: string;
};

export const SUCURSAL_ACTIVA_STORAGE_KEY = "knx_sucursal_activa";

export function sucursalActivaStorageKey(tenantId: string, dni: string): string {
  return `${SUCURSAL_ACTIVA_STORAGE_KEY}:${tenantId}:${dni}`;
}

export function readSucursalActivaId(tenantId: string, dni: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(sucursalActivaStorageKey(tenantId, dni));
}

export function writeSucursalActivaId(tenantId: string, dni: string, sucursalId: string): void {
  localStorage.setItem(sucursalActivaStorageKey(tenantId, dni), sucursalId);
}

export function resolverSucursalActivaInicial(
  sucursales: StaffSucursalAcceso[],
  tenantId: string,
  dni: string
): string | null {
  if (sucursales.length === 0) return null;
  const guardada = readSucursalActivaId(tenantId, dni);
  if (guardada && sucursales.some((s) => s.id === guardada)) return guardada;
  return sucursales[0]?.id ?? null;
}
