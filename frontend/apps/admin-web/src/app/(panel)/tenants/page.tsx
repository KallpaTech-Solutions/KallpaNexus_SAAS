"use client";

import { tenantPanelLoginUrl, tenantPublicUrl } from "@/lib/platform-nav";
import { usePlatformApi } from "@/lib/platform-api-context";
import { platformUi } from "@/lib/platform-ui";
import { normalizePlatformTenant } from "@kallpanexus/api-client";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";

export default function PlatformTenantsPage() {
  const api = usePlatformApi();
  const q = useQuery({
    queryKey: ["platform-tenants-all"],
    queryFn: () => api.tenants.list({ soloActivos: false }),
  });

  const rows = (q.data ?? []).map(normalizePlatformTenant);

  return (
    <div>
      <h1 className={platformUi.pageTitle}>Tenants</h1>
      <p className={platformUi.pageSubtitle}>
        Cada tenant es un negocio operativo vinculado a una empresa pagadora.
      </p>

      {q.isLoading && (
        <p className={`mt-8 flex items-center gap-2 ${platformUi.textMuted}`}>
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
        </p>
      )}

      <div className={platformUi.tableWrap}>
        <table className="min-w-full text-left text-sm">
          <thead className={platformUi.tableHead}>
            <tr>
              <th className={platformUi.th}>Subdominio</th>
              <th className={platformUi.th}>Negocio</th>
              <th className={platformUi.th}>Empresa pagadora</th>
              <th className={platformUi.th}>Activo</th>
              <th className={platformUi.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className={platformUi.tableRow}>
                <td className={`${platformUi.td} font-mono text-[var(--p-text)]`}>{t.subdomain}</td>
                <td className={platformUi.td}>{t.nombreComercialNegocio}</td>
                <td className={platformUi.td}>
                  {t.clienteEmpresaId ? (
                    <Link href={`/empresas/${t.clienteEmpresaId}`} className={platformUi.link}>
                      {t.empresa || "Ver empresa"}
                    </Link>
                  ) : (
                    <span className={platformUi.textMuted}>{t.empresa || "—"}</span>
                  )}
                </td>
                <td className={platformUi.td}>{t.isActive ? "Sí" : "No"}</td>
                <td className={platformUi.td}>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={tenantPanelLoginUrl(t.subdomain)}
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex items-center gap-1 text-xs ${platformUi.link}`}
                    >
                      Panel <ExternalLink className="h-3 w-3" />
                    </a>
                    <a
                      href={tenantPublicUrl(t.subdomain)}
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex items-center gap-1 text-xs ${platformUi.link}`}
                    >
                      Público <ExternalLink className="h-3 w-3" />
                    </a>
                    <Link href={`/usuarios`} className={`text-xs ${platformUi.link}`}>
                      Staff
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
