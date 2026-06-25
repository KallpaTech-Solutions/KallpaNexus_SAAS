"use client";

import { usePlatformApi } from "@/lib/platform-api-context";
import { usePlatformAuthStore } from "@/lib/platform-auth-store";
import { platformUi } from "@/lib/platform-ui";
import { tenantPanelLoginUrl, tenantPublicUrl } from "@/lib/platform-nav";
import { severidadCuentaRegresiva, textoCuentaRegresivaPlan } from "@kallpanexus/shared";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";

function num(data: Record<string, unknown>, camel: string, pascal: string): number {
  const v = data[camel] ?? data[pascal];
  return typeof v === "number" ? v : 0;
}

function listOf(data: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const v = data[key] ?? data[key.charAt(0).toUpperCase() + key.slice(1)];
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

function mapAlerta(row: Record<string, unknown>) {
  const dias = Number(row.diasRestantes ?? row.DiasRestantes ?? 0);
  const esDemo = Boolean(row.esPlanDemo ?? row.EsPlanDemo);
  return {
    id: String(row.id ?? row.Id ?? ""),
    nombre: String(row.nombreComercial ?? row.NombreComercial ?? "—"),
    plan: String(row.plan ?? row.Plan ?? ""),
    estado: String(row.estado ?? row.Estado ?? ""),
    dias,
    esDemo,
    texto: textoCuentaRegresivaPlan(dias, esDemo) ?? "",
    sev: severidadCuentaRegresiva(dias),
  };
}

export default function PlatformDashboardPage() {
  const api = usePlatformApi();
  const session = usePlatformAuthStore((s) => s.session);
  const q = useQuery({
    queryKey: ["platform-dashboard-resumen"],
    queryFn: () => api.dashboard.resumen(),
  });
  const qEmp = useQuery({
    queryKey: ["platform-dashboard-empresas"],
    queryFn: () => api.dashboard.empresas(),
  });

  const d = (q.data ?? {}) as Record<string, unknown>;
  const alertas = listOf(d, "alertasCicloPlan").map(mapAlerta);
  const recientes = listOf(d, "empresasRecientes");

  const kpis = q.data
    ? [
        { label: "Empresas pagadoras", value: num(d, "totalEmpresasPagadoras", "TotalEmpresasPagadoras") },
        { label: "Tenants activos", value: num(d, "totalTenantsActivos", "TotalTenantsActivos") },
        { label: "Staff negocios", value: num(d, "totalStaffNegociosActivos", "TotalStaffNegociosActivos") },
        { label: "Reservas Sport", value: num(d, "totalReservasSport_Global", "TotalReservasSport_Global") },
      ]
    : [];

  const empresas = ((qEmp.data ?? []) as Record<string, unknown>[]).slice(0, 6);

  const primerNombre = session?.nombreCompleto?.split(" ")[0] ?? "Admin";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={platformUi.pageTitleHero}>
            Bienvenido, {primerNombre}
          </h1>
          <p className={platformUi.pageSubtitle}>Centro de control de Kallpa Nexus</p>
        </div>
        <Link href="/tenants" className={platformUi.btnPrimary}>
          + Nuevo tenant
        </Link>
      </div>

      {q.isLoading && (
        <p className={`mt-8 flex items-center gap-2 ${platformUi.textMuted}`}>
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
        </p>
      )}

      {q.data && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className={platformUi.card}>
                <p className={platformUi.kpiLabel}>{kpi.label}</p>
                <p className={platformUi.kpiValue}>{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
            <section className={platformUi.card}>
              <h2 className={platformUi.sectionTitle}>Negocios registrados</h2>
              <div className="mt-4 space-y-3">
                {empresas.map((emp) => {
                  const id = String(emp.id ?? emp.Id ?? "");
                  const tenants = (emp.tenants ?? emp.Tenants ?? []) as Record<string, unknown>[];
                  const t0 = tenants[0];
                  const sub = t0 ? String(t0.subdomain ?? t0.Subdomain ?? "") : "";
                  return (
                    <div key={id} className={platformUi.cardInner}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong className="text-[var(--p-text)]">
                          {String(emp.nombreComercial ?? emp.NombreComercial ?? "—")}
                        </strong>
                        <span className={platformUi.badgeOk}>
                          {String(emp.estado ?? emp.Estado ?? "")}
                        </span>
                      </div>
                      {sub && (
                        <p className={`mt-1 text-sm ${platformUi.textMuted}`}>{sub}.kallpanexus.com</p>
                      )}
                      <p className={`mt-2 text-xs ${platformUi.textMuted}`}>
                        Plan: {String(emp.plan ?? emp.Plan ?? "—")}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {sub && (
                          <>
                            <a
                              href={tenantPanelLoginUrl(sub)}
                              className={platformUi.btnSecondary}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Panel
                            </a>
                            <a
                              href={tenantPublicUrl(sub)}
                              className={platformUi.btnSecondary}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Web pública
                            </a>
                          </>
                        )}
                        <Link href={`/empresas/${id}`} className={platformUi.btnSecondary}>
                          Empresa
                        </Link>
                      </div>
                    </div>
                  );
                })}
                {empresas.length === 0 && !qEmp.isLoading && (
                  <p className={`text-sm ${platformUi.textMuted}`}>Sin empresas.</p>
                )}
              </div>
            </section>

            <aside className="space-y-6">
              <section className={platformUi.card}>
                <h2 className={platformUi.sectionTitle}>Alertas de plan</h2>
                <p className={`mt-1 text-xs ${platformUi.textMuted}`}>
                  Cuenta regresiva según fin de demo o renovación mensual (
                  <code className={platformUi.textBody}>ProximoPago</code>).
                </p>
                <ul className="mt-4 space-y-2">
                  {alertas.map((a) => (
                    <li
                      key={a.id}
                      className={`rounded-xl px-3 py-2 text-sm ${
                        a.sev === "danger"
                          ? platformUi.alertDanger
                          : a.sev === "warn"
                            ? platformUi.alertWarn
                            : platformUi.alertOk
                      }`}
                    >
                      <Link href={`/empresas/${a.id}`} className="font-medium hover:underline">
                        {a.nombre}
                      </Link>
                      <span className="block text-xs opacity-90">{a.texto}</span>
                      <span className="text-xs opacity-75">
                        {a.plan} · {a.estado}
                      </span>
                    </li>
                  ))}
                  {alertas.length === 0 && (
                    <li className={`text-sm ${platformUi.textMuted}`}>
                      Ningún ciclo vence en los próximos 14 días.
                    </li>
                  )}
                </ul>
                <Link href="/solicitudes-contrato" className={`${platformUi.link} mt-4 inline-block text-sm`}>
                  Ver solicitudes de contrato →
                </Link>
              </section>

              <section className={platformUi.card}>
                <h2 className={platformUi.sectionTitle}>Empresas por estado</h2>
                <ul className="mt-3 space-y-2">
                  {listOf(d, "empresasPorEstado").map((row) => (
                    <li
                      key={String(row.estado ?? row.Estado)}
                      className={`flex justify-between rounded-lg px-3 py-2 text-sm ${platformUi.cardInner}`}
                    >
                      <span className={platformUi.textMuted}>{String(row.estado ?? row.Estado)}</span>
                      <span className="font-medium text-[var(--p-text)]">
                        {Number(row.total ?? row.Total ?? 0)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </aside>
          </div>

          {recientes.length > 0 && (
            <section className="mt-8">
              <h2 className={platformUi.sectionTitle}>Contacto rápido</h2>
              <div className={platformUi.tableWrap}>
                <table className="min-w-full text-left text-sm">
                  <thead className={platformUi.tableHead}>
                    <tr>
                      <th className={platformUi.th}>Empresa</th>
                      <th className={platformUi.th}>Ciclo plan</th>
                      <th className={platformUi.th}>Contacto</th>
                      <th className={platformUi.th} />
                    </tr>
                  </thead>
                  <tbody>
                    {recientes.map((row) => {
                      const id = String(row.id ?? row.Id ?? "");
                      const dias = Number(
                        row.diasRestantes ?? row.DiasRestantes ??
                          (row.proximoPago || row.ProximoPago
                            ? Math.ceil(
                                (new Date(String(row.proximoPago ?? row.ProximoPago)).getTime() -
                                  Date.now()) /
                                  86400000
                              )
                            : NaN)
                      );
                      const esDemo = Boolean(row.esPlanDemo ?? row.EsPlanDemo);
                      const ciclo =
                        textoCuentaRegresivaPlan(
                          Number.isFinite(dias) ? dias : undefined,
                          esDemo
                        ) ?? "—";
                      return (
                        <tr key={id} className={platformUi.tableRow}>
                          <td className={platformUi.td}>
                            {String(row.nombreComercial ?? row.NombreComercial ?? "—")}
                          </td>
                          <td className={platformUi.td}>{ciclo}</td>
                          <td className={platformUi.td}>
                            {String(row.emailFacturacion ?? row.EmailFacturacion ?? "")}
                          </td>
                          <td className={platformUi.td}>
                            <Link href={`/empresas/${id}`} className={platformUi.link}>
                              Ver
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
