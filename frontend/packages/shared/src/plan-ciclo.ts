/** Texto de cuenta regresiva según fin de ciclo (demo o renovación mensual). */
export function textoCuentaRegresivaPlan(
  diasRestantes: number | undefined,
  esDemo: boolean
): string | null {
  if (diasRestantes === undefined || Number.isNaN(diasRestantes)) return null;
  const demo = esDemo;
  if (diasRestantes < 0) {
    return demo ? "Periodo demo vencido" : "Renovación vencida";
  }
  if (diasRestantes === 0) {
    return demo ? "Demo vence hoy" : "Renovación hoy";
  }
  if (diasRestantes === 1) {
    return demo ? "Demo: 1 día restante" : "Renovación en 1 día";
  }
  return demo
    ? `Demo: ${diasRestantes} días restantes`
    : `Renovación mensual en ${diasRestantes} días`;
}

export function severidadCuentaRegresiva(diasRestantes: number): "ok" | "warn" | "danger" {
  if (diasRestantes < 0) return "danger";
  if (diasRestantes <= 3) return "danger";
  if (diasRestantes <= 7) return "warn";
  return "ok";
}

/** Solo la pantalla Plan (ciclo vencido o equivalente). */
export function tenantSoloGestionPlan(
  data: { soloGestionPlan?: boolean; cicloVencido?: boolean } | undefined
): boolean {
  if (!data) return false;
  return data.soloGestionPlan === true || data.cicloVencido === true;
}

export const TENANT_RUTA_PLAN = "/plan";

export function tenantNavItemPermitido(
  href: string,
  data: { soloGestionPlan?: boolean; cicloVencido?: boolean } | undefined
): boolean {
  if (href === TENANT_RUTA_PLAN || href.startsWith(`${TENANT_RUTA_PLAN}/`)) return true;
  return !tenantSoloGestionPlan(data);
}
