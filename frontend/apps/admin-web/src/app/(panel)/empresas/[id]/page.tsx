"use client";

import { EmpresaAcciones } from "@/components/empresa-acciones";
import { tenantPanelLoginUrl, tenantPublicUrl } from "@/lib/platform-nav";
import { usePlatformApi } from "@/lib/platform-api-context";
import { platformUi } from "@/lib/platform-ui";
import { normalizePlatformTenant } from "@kallpanexus/api-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function PlatformEmpresaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const api = usePlatformApi();
  const qc = useQueryClient();

  const empresaQ = useQuery({
    queryKey: ["platform-empresa", id],
    queryFn: () => api.empresas.get(id),
    enabled: Boolean(id),
  });

  const tenantsQ = useQuery({
    queryKey: ["platform-tenants-empresa", id],
    queryFn: () => api.tenants.list({ clienteEmpresaId: id, soloActivos: false }),
    enabled: Boolean(id),
  });

  const empresa = empresaQ.data as Record<string, unknown> | undefined;
  const tenants = (tenantsQ.data ?? []).map(normalizePlatformTenant);
  const tipo = String(empresa?.tipo ?? empresa?.Tipo ?? "");
  const estadoEmpresa = String(empresa?.estado ?? empresa?.Estado ?? "");

  function refreshEmpresa() {
    void qc.invalidateQueries({ queryKey: ["platform-empresa", id] });
    void qc.invalidateQueries({ queryKey: ["platform-tenants-empresa", id] });
    void qc.invalidateQueries({ queryKey: ["platform-empresas"] });
  }

  return (
    <div>
      <Link href="/empresas" className={`text-sm ${platformUi.link}`}>
        ← Empresas
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className={platformUi.pageTitle}>
            {(empresa?.nombreComercial ?? empresa?.NombreComercial ?? "Empresa") as string}
          </h1>
          <p className={platformUi.pageSubtitle}>Ficha de registro y tenants vinculados.</p>
        </div>
        {id && estadoEmpresa && (
          <EmpresaAcciones id={id} estado={estadoEmpresa} onChanged={refreshEmpresa} />
        )}
      </div>

      {(empresaQ.isLoading || tenantsQ.isLoading) && (
        <p className={`mt-6 flex items-center gap-2 ${platformUi.textMuted}`}>
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
        </p>
      )}

      {empresa && (
        <div className={`${platformUi.card} mt-6`}>
          <h2 className={`text-sm font-semibold uppercase tracking-wide ${platformUi.textMuted}`}>
            Datos registrados
          </h2>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className={platformUi.textMuted}>Tipo persona</dt>
              <dd className="font-medium">{tipo || "—"}</dd>
            </div>
            <div>
              <dt className={platformUi.textMuted}>Documento fiscal</dt>
              <dd>{String(empresa.documentoFiscal ?? empresa.DocumentoFiscal ?? "—")}</dd>
            </div>
            <div>
              <dt className={platformUi.textMuted}>Razón social</dt>
              <dd>{String(empresa.razonSocial ?? empresa.RazonSocial ?? "—")}</dd>
            </div>
            <div>
              <dt className={platformUi.textMuted}>Nombre comercial</dt>
              <dd>{String(empresa.nombreComercial ?? empresa.NombreComercial ?? "—")}</dd>
            </div>
            <div>
              <dt className={platformUi.textMuted}>Email facturación / contacto</dt>
              <dd>{String(empresa.emailFacturacion ?? empresa.EmailFacturacion ?? "—")}</dd>
            </div>
            <div>
              <dt className={platformUi.textMuted}>Teléfono</dt>
              <dd>{String(empresa.telefono ?? empresa.Telefono ?? "—")}</dd>
            </div>
            <div>
              <dt className={platformUi.textMuted}>Dirección fiscal</dt>
              <dd>{String(empresa.direccionFiscal ?? empresa.DireccionFiscal ?? "—")}</dd>
            </div>
            <div>
              <dt className={platformUi.textMuted}>País</dt>
              <dd>{String(empresa.pais ?? empresa.Pais ?? "—")}</dd>
            </div>
            <div>
              <dt className={platformUi.textMuted}>Estado suscripción</dt>
              <dd>{String(empresa.estado ?? empresa.Estado ?? "—")}</dd>
            </div>
            <div>
              <dt className={platformUi.textMuted}>Plan</dt>
              <dd>
                {(() => {
                  const plan = (empresa.plan ?? empresa.Plan) as Record<string, unknown> | undefined;
                  if (!plan) return "—";
                  return String(plan.nombre ?? plan.Nombre ?? "—");
                })()}
              </dd>
            </div>
          </dl>
          <p className={`mt-4 text-xs ${platformUi.textMuted}`}>
            El email y teléfono suelen corresponder a quien completó el registro / facturación.
          </p>
        </div>
      )}

      <h2 className={`mt-10 ${platformUi.sectionTitle}`}>Tenants de esta empresa</h2>
      <ul className="mt-4 space-y-3">
        {tenants.map((t) => (
          <li
            key={t.id}
            className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${platformUi.cardInner}`}
          >
            <div>
              <p className="font-medium text-[var(--p-text)]">{t.nombreComercialNegocio}</p>
              <p className={`font-mono text-xs ${platformUi.textMuted}`}>{t.subdomain}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <a
                href={tenantPanelLoginUrl(t.subdomain)}
                target="_blank"
                rel="noreferrer"
                className={`${platformUi.btnSecondary} !px-2 !py-1`}
              >
                Abrir panel <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href={tenantPublicUrl(t.subdomain)}
                target="_blank"
                rel="noreferrer"
                className={`${platformUi.btnSecondary} !px-2 !py-1`}
              >
                /sports/{t.subdomain} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </li>
        ))}
      </ul>
      {!tenantsQ.isLoading && tenants.length === 0 && (
        <p className={`mt-4 text-sm ${platformUi.textMuted}`}>Sin tenants vinculados.</p>
      )}
    </div>
  );
}
