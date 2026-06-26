"use client";

import { platformUi } from "@/lib/platform-ui";
import { usePlatformApi } from "@/lib/platform-api-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type TenantRow = {
  id: string;
  subdomain: string;
  nombreComercialNegocio?: string;
  isActive?: boolean;
  reservaWebActiva?: boolean;
};

type Props = {
  tenants: TenantRow[];
  reservaWebPermitidaPlataforma: boolean;
};

export function EmpresaTenantsWebControl({ tenants, reservaWebPermitidaPlataforma }: Props) {
  const api = usePlatformApi();
  const qc = useQueryClient();

  const toggle = useMutation({
    mutationFn: ({ tenantId, activa }: { tenantId: string; activa: boolean }) =>
      api.tenants.configurarReservaWeb(tenantId, activa),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["platform-empresa"] });
    },
  });

  if (tenants.length === 0) return null;

  return (
    <div className={`${platformUi.card} mt-6`}>
      <h2 className={`text-sm font-semibold uppercase tracking-wide ${platformUi.textMuted}`}>
        Web pública por negocio
      </h2>
      {!reservaWebPermitidaPlataforma && (
        <p className="mt-2 text-xs text-amber-800">
          La plataforma tiene bloqueada la web para esta empresa. Activa el permiso arriba primero.
        </p>
      )}
      <ul className="mt-3 space-y-2">
        {tenants.map((t) => {
          const activa = Boolean(t.reservaWebActiva);
          return (
            <li
              key={t.id}
              className={`flex flex-wrap items-center justify-between gap-2 ${platformUi.cardInner} px-3 py-2`}
            >
              <div>
                <p className="text-sm font-medium">{t.nombreComercialNegocio ?? t.subdomain}</p>
                <p className={`font-mono text-xs ${platformUi.textMuted}`}>/sports/{t.subdomain}</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={activa ? "text-emerald-700" : platformUi.textMuted}>
                  {activa ? "Web activa (tenant)" : "Web off"}
                </span>
                <button
                  type="button"
                  className={activa ? platformUi.btnSecondary : platformUi.btnPrimary}
                  disabled={
                    toggle.isPending ||
                    (!reservaWebPermitidaPlataforma && !activa)
                  }
                  onClick={() =>
                    toggle.mutate({ tenantId: t.id, activa: !activa })
                  }
                >
                  {activa ? "Desactivar web" : "Activar web"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
