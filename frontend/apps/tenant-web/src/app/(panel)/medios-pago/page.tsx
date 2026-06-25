"use client";

import { PERMISOS_SPORT } from "@kallpanexus/types";
import { getApiErrorMessage } from "@kallpanexus/api-client";
import { panelUploadUrl } from "@/lib/tenant-media-url";
import { useTenantApi } from "@/lib/api-context";
import { canAccess, usePermisosSession } from "@/lib/auth-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

function QrMedioPreview({ qrUrl, nombre }: { qrUrl: string; nombre: string }) {
  const [fallo, setFallo] = useState(false);
  const src = panelUploadUrl(qrUrl);
  if (!src || fallo) {
    return (
      <span className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-[10px] text-slate-500">
        Sin vista previa
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={`QR ${nombre}`}
      className="h-20 w-20 rounded-lg border border-slate-200 bg-white object-contain p-1"
      onError={() => setFallo(true)}
    />
  );
}

export default function MediosPagoPage() {
  const api = useTenantApi();
  const qc = useQueryClient();
  const permisos = usePermisosSession();
  const puedeVer = canAccess(permisos, PERMISOS_SPORT.canchasVer);
  const puedeModificar = canAccess(permisos, PERMISOS_SPORT.canchasModificar);

  const { data: medios = [], isLoading } = useQuery({
    queryKey: ["medios-pago"],
    queryFn: () => api.mediosPago.list(),
    enabled: puedeVer,
  });

  const [error, setError] = useState<string | null>(null);
  const [subiendoQrId, setSubiendoQrId] = useState<string | null>(null);

  const setVisibleWeb = useMutation({
    mutationFn: ({ id, visibleEnWeb }: { id: string; visibleEnWeb: boolean }) =>
      api.mediosPago.actualizar(id, { visibleEnWeb }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["medios-pago"] }),
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  const setActivo = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      api.mediosPago.actualizar(id, { activo }),
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ["medios-pago"] });
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  const subirQr = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      api.mediosPago.subirQrWeb(id, file),
    onSuccess: () => {
      setError(null);
      setSubiendoQrId(null);
      qc.invalidateQueries({ queryKey: ["medios-pago"] });
    },
    onError: (e) => {
      setSubiendoQrId(null);
      setError(getApiErrorMessage(e));
    },
  });

  if (!puedeVer) {
    return <p className="font-medium text-amber-800">Sin permiso sport:canchas:ver</p>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="panel-page-title">Medios de pago</h2>
        <p className="panel-page-sub mt-1">
          Marca qué medios aparecen en la reserva web, sube el QR de Yape o Plin y configura el
          número de referencia en cada sucursal (WhatsApp / Yape).
        </p>
      </header>

      <div className="panel-info px-4 py-3 text-xs">
        <p>
          <span className="font-medium text-slate-800">Web pública:</span> solo los medios marcados
          abajo. El cliente ve el QR y el número de la sede.
        </p>
        <p className="mt-1">
          <span className="font-medium text-slate-800">Mostrador:</span> cobro en reserva al crear
          la reserva en el panel.
        </p>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <div className="panel-card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="panel-table-head">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Web pública</th>
              <th className="px-4 py-3">QR web</th>
              <th className="px-4 py-3">Voucher online</th>
              <th className="px-4 py-3">Sin voucher presencial</th>
              <th className="px-4 py-3">Estado</th>
              {puedeModificar && <th className="px-4 py-3">Acción</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-slate-500">
                  Cargando…
                </td>
              </tr>
            )}
            {medios.map((m) => (
              <tr key={m.id} className="panel-table-row">
                <td className="px-4 py-3">{m.nombre}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{m.tipo}</td>
                <td className="px-4 py-3">
                  {puedeModificar ? (
                    <input
                      type="checkbox"
                      checked={!!m.visibleEnWeb}
                      onChange={(e) =>
                        setVisibleWeb.mutate({ id: m.id, visibleEnWeb: e.target.checked })
                      }
                    />
                  ) : m.visibleEnWeb ? (
                    "Sí"
                  ) : (
                    "No"
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-start gap-2">
                    {m.qrUrl ? (
                      <QrMedioPreview key={`${m.id}-${m.qrUrl}`} qrUrl={m.qrUrl} nombre={m.nombre} />
                    ) : (
                      <span className="text-xs text-slate-500">Sin QR</span>
                    )}
                    {puedeModificar && (
                      <label className="cursor-pointer text-xs font-medium text-emerald-700 underline">
                        {subiendoQrId === m.id ? "Subiendo…" : "Subir QR (máx. 5 MB)"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          disabled={subirQr.isPending}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (!file) return;
                            if (file.size > 5 * 1024 * 1024) {
                              setError("El QR no puede superar 5 MB.");
                              return;
                            }
                            setSubiendoQrId(m.id);
                            subirQr.mutate({ id: m.id, file });
                          }}
                        />
                      </label>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">{m.requiereVoucherOnline ? "Sí" : "No"}</td>
                <td className="px-4 py-3">
                  {m.permiteSinVoucherPresencial ? "Sí" : "No"}
                </td>
                <td className="px-4 py-3">
                  {m.activo ? (
                    <span className="panel-badge-ok">Activo</span>
                  ) : (
                    <span className="text-slate-500">Inactivo</span>
                  )}
                  {m.esPasarelaExterna && (
                    <span className="ml-1 text-xs font-medium text-amber-800">· Pasarela</span>
                  )}
                </td>
                {puedeModificar && (
                  <td className="px-4 py-3">
                    {m.activo ? (
                      <button
                        type="button"
                        className="panel-link-warn text-sm disabled:opacity-50"
                        disabled={setActivo.isPending}
                        onClick={() => setActivo.mutate({ id: m.id, activo: false })}
                      >
                        Desactivar
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="panel-link-edit text-sm disabled:opacity-50"
                        disabled={setActivo.isPending}
                        onClick={() => setActivo.mutate({ id: m.id, activo: true })}
                      >
                        Activar
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
