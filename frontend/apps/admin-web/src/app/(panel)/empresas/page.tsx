"use client";

import { usePlatformApi } from "@/lib/platform-api-context";
import { platformUi } from "@/lib/platform-ui";
import { platformEmpresaDocTexto } from "@/lib/empresa-documento";
import { normalizePlatformEmpresa } from "@kallpanexus/api-client";
import { EmpresaAcciones } from "@/components/empresa-acciones";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

function badgeEstado(estado: string) {
  const e = estado.toLowerCase();
  if (e === "activo") return platformUi.badgeOk;
  if (e === "demo") return platformUi.badgeWarn;
  if (e === "suspendido" || e === "cancelado") return platformUi.badgeDanger;
  return platformUi.badgeMuted;
}

export default function PlatformEmpresasPage() {
  const api = usePlatformApi();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["platform-empresas"],
    queryFn: () => api.empresas.list(),
  });

  const rows = (q.data ?? []).map(normalizePlatformEmpresa);

  const stats = useMemo(() => {
    const porEstado: Record<string, number> = {};
    let activas = 0;
    let demo = 0;
    let suspendidas = 0;
    for (const e of rows) {
      const k = e.estado || "—";
      porEstado[k] = (porEstado[k] ?? 0) + 1;
      const low = k.toLowerCase();
      if (low === "activo") activas += 1;
      else if (low === "demo") demo += 1;
      else if (low === "suspendido" || low === "cancelado") suspendidas += 1;
    }
    return {
      total: rows.length,
      activas,
      demo,
      suspendidas,
      porEstado,
    };
  }, [rows]);

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["platform-empresas"] });
    void qc.invalidateQueries({ queryKey: ["platform-dashboard-resumen"] });
  }

  return (
    <div>
      <h1 className={platformUi.pageTitle}>Empresas</h1>
      <p className={platformUi.pageSubtitle}>
        Clientes pagadores: datos fiscales, plan y estado de suscripción.
      </p>

      {q.isLoading && (
        <p className={`mt-8 flex items-center gap-2 ${platformUi.textMuted}`}>
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
        </p>
      )}

      {rows.length > 0 && (
        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className={platformUi.card}>
              <p className={platformUi.kpiLabel}>Total empresas</p>
              <p className={platformUi.kpiValue}>{stats.total}</p>
            </div>
            <div className={platformUi.card}>
              <p className={platformUi.kpiLabel}>Activas</p>
              <p className={platformUi.kpiValue}>{stats.activas}</p>
            </div>
            <div className={platformUi.card}>
              <p className={platformUi.kpiLabel}>Demo</p>
              <p className={platformUi.kpiValue}>{stats.demo}</p>
            </div>
            <div className={platformUi.card}>
              <p className={platformUi.kpiLabel}>Suspendidas / canceladas</p>
              <p className={platformUi.kpiValue}>{stats.suspendidas}</p>
            </div>
          </div>

          <aside className={platformUi.card}>
            <h2 className="text-sm font-semibold text-[var(--p-text)]">Empresas por estado</h2>
            <ul className="mt-4 space-y-2">
              {Object.entries(stats.porEstado).map(([estado, total]) => (
                <li
                  key={estado}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${platformUi.cardInner}`}
                >
                  <span className={badgeEstado(estado)}>{estado}</span>
                  <span className="font-semibold text-[var(--p-text)]">{total}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}

      <div className={platformUi.tableWrap}>
        <table className="min-w-full text-left text-sm">
          <thead className={platformUi.tableHead}>
            <tr>
              <th className={platformUi.th}>Empresa</th>
              <th className={platformUi.th}>Contacto</th>
              <th className={platformUi.th}>Plan</th>
              <th className={platformUi.th}>Estado</th>
              <th className={platformUi.th}>Tenants</th>
              <th className={platformUi.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className={platformUi.tableRow}>
                <td className={platformUi.td}>
                  <p className="font-semibold text-[var(--p-text)]">{e.nombreComercial}</p>
                  <p className={`text-xs ${platformUi.textMuted}`}>{e.razonSocial}</p>
                  <p className={`text-xs ${platformUi.textMuted}`}>
                    {platformEmpresaDocTexto(e.tipo, e.documentoFiscal)}
                  </p>
                </td>
                <td className={platformUi.td}>
                  <p className="text-[var(--p-text-secondary)]">{e.emailFacturacion || "—"}</p>
                  <p className={`text-xs ${platformUi.textMuted}`}>{e.telefono || ""}</p>
                </td>
                <td className={platformUi.td}>{e.planNombre}</td>
                <td className={platformUi.td}>
                  <span className={badgeEstado(e.estado)}>{e.estado}</span>
                </td>
                <td className={platformUi.td}>{e.totalTenants}</td>
                <td className={platformUi.td}>
                  <div className="flex flex-col gap-2">
                    <Link href={`/empresas/${e.id}`} className={`text-xs ${platformUi.link}`}>
                      Ver ficha
                    </Link>
                    <EmpresaAcciones
                      id={e.id}
                      estado={e.estado}
                      nombreComercial={e.nombreComercial}
                      onChanged={refresh}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!q.isLoading && rows.length === 0 && (
          <p className={`px-4 py-8 text-center ${platformUi.textMuted}`}>
            Sin empresas registradas.
          </p>
        )}
      </div>
    </div>
  );
}
