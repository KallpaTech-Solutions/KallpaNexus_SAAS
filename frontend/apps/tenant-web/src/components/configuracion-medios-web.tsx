"use client";

import { useTenantApi } from "@/lib/api-context";
import { canAccess, usePermisosSession } from "@/lib/auth-store";
import { PERMISOS_SPORT } from "@kallpanexus/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

/** Toggles de medios visibles en reserva web (Yape, Plin, transferencia, etc.). */
export function ConfiguracionMediosWeb() {
  const api = useTenantApi();
  const qc = useQueryClient();
  const permisos = usePermisosSession();
  const puedeModificar = canAccess(permisos, PERMISOS_SPORT.canchasModificar);

  const { data: medios = [], isLoading } = useQuery({
    queryKey: ["medios-pago"],
    queryFn: () => api.mediosPago.list(),
  });

  const setVisibleWeb = useMutation({
    mutationFn: ({ id, visibleEnWeb }: { id: string; visibleEnWeb: boolean }) =>
      api.mediosPago.actualizar(id, { visibleEnWeb }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["medios-pago"] }),
  });

  const webMedios = medios.filter((m) => m.activo && !m.esPasarelaExterna);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">Medios de pago en la web pública</p>
          <p className="text-xs text-slate-500">
            El mostrador puede usar transferencia u otros medios aunque no estén aquí. Solo afecta al
            checkout de <code className="text-[11px]">/sports/tu-slug</code>.
          </p>
        </div>
        <Link href="/medios-pago" className="text-xs font-medium text-emerald-700 underline">
          QR y detalle →
        </Link>
      </div>

      {isLoading && <p className="text-xs text-slate-500">Cargando medios…</p>}

      {!isLoading && webMedios.length === 0 && (
        <p className="text-xs text-amber-900">
          No hay medios activos. Revisa la página Medios de pago.
        </p>
      )}

      <ul className="flex flex-wrap gap-2">
        {webMedios.map((m) => (
          <li key={m.id}>
            <label
              className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                m.visibleEnWeb
                  ? "border-emerald-400 bg-emerald-50 text-emerald-950"
                  : "border-slate-300 bg-white text-slate-700"
              } ${!puedeModificar ? "pointer-events-none opacity-70" : ""}`}
            >
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-slate-300"
                checked={!!m.visibleEnWeb}
                disabled={!puedeModificar || setVisibleWeb.isPending}
                onChange={(e) =>
                  setVisibleWeb.mutate({ id: m.id, visibleEnWeb: e.target.checked })
                }
              />
              {m.nombre}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
