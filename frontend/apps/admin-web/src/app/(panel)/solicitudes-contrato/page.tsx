"use client";

import { PLATFORM_SOLICITUDES_PENDIENTES_QUERY_KEY } from "@/lib/platform-query-keys";
import { usePlatformApi } from "@/lib/platform-api-context";
import { usePlatformPermisos } from "@/lib/platform-auth-store";
import { platformUi } from "@/lib/platform-ui";
import { formatMoneyPEN, hasPlatformPermission } from "@kallpanexus/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, X } from "lucide-react";
import { useMemo, useState } from "react";

type SolicitudRow = {
  id: string;
  estado: string;
  createdAt: string;
  mensajeCliente?: string | null;
  notasPlataforma?: string | null;
  subdomain?: string | null;
  plan: { id: string; nombre: string; precioMensual: number };
  empresa: {
    id: string;
    nombreComercial: string;
    razonSocial: string;
    documentoFiscal: string;
    emailFacturacion: string;
    telefono: string;
    estadoSuscripcion: string;
  };
  solicitante: {
    solicitanteNombre: string;
    solicitanteDni: string;
    solicitanteEmail?: string | null;
  };
};

function mapRow(raw: Record<string, unknown>): SolicitudRow {
  const plan = (raw.plan ?? raw.Plan ?? {}) as Record<string, unknown>;
  const empresa = (raw.empresa ?? raw.Empresa ?? {}) as Record<string, unknown>;
  const sol = (raw.solicitante ?? raw.Solicitante ?? {}) as Record<string, unknown>;
  return {
    id: String(raw.id ?? raw.Id ?? ""),
    estado: String(raw.estado ?? raw.Estado ?? ""),
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ""),
    mensajeCliente: (raw.mensajeCliente ?? raw.MensajeCliente) as string | null,
    notasPlataforma: (raw.notasPlataforma ?? raw.NotasPlataforma) as string | null,
    subdomain: (raw.subdomain ?? raw.Subdomain) as string | null,
    plan: {
      id: String(plan.id ?? plan.Id ?? ""),
      nombre: String(plan.nombre ?? plan.Nombre ?? ""),
      precioMensual: Number(plan.precioMensual ?? plan.PrecioMensual ?? 0),
    },
    empresa: {
      id: String(empresa.id ?? empresa.Id ?? ""),
      nombreComercial: String(empresa.nombreComercial ?? empresa.NombreComercial ?? ""),
      razonSocial: String(empresa.razonSocial ?? empresa.RazonSocial ?? ""),
      documentoFiscal: String(empresa.documentoFiscal ?? empresa.DocumentoFiscal ?? ""),
      emailFacturacion: String(empresa.emailFacturacion ?? empresa.EmailFacturacion ?? ""),
      telefono: String(empresa.telefono ?? empresa.Telefono ?? ""),
      estadoSuscripcion: String(empresa.estadoSuscripcion ?? empresa.EstadoSuscripcion ?? ""),
    },
    solicitante: {
      solicitanteNombre: String(sol.solicitanteNombre ?? sol.SolicitanteNombre ?? ""),
      solicitanteDni: String(sol.solicitanteDni ?? sol.SolicitanteDni ?? ""),
      solicitanteEmail: (sol.solicitanteEmail ?? sol.SolicitanteEmail) as string | null,
    },
  };
}

const ESTADOS = [
  { value: "", label: "Todas" },
  { value: "Pendiente", label: "Pendientes" },
  { value: "Aprobada", label: "Aprobadas" },
  { value: "Rechazada", label: "Rechazadas" },
];

export default function SolicitudesContratoPage() {
  const api = usePlatformApi();
  const permisos = usePlatformPermisos();
  const puedeGestionar = hasPlatformPermission(permisos, "platform:empresas:modificar");
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState("Pendiente");
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [notas, setNotas] = useState("");

  const q = useQuery({
    queryKey: ["platform-solicitudes-contrato", filtro],
    queryFn: () => api.solicitudesContrato.list(filtro || undefined),
  });

  const rows = useMemo(
    () => ((q.data ?? []) as Record<string, unknown>[]).map(mapRow),
    [q.data]
  );

  const detalle = useMemo(
    () => rows.find((r) => r.id === detalleId) ?? null,
    [rows, detalleId]
  );

  const accion = useMutation({
    mutationFn: async (p: { tipo: "aprobar" | "rechazar"; id: string }) => {
      if (p.tipo === "aprobar") {
        return api.solicitudesContrato.aprobar(p.id, notas.trim() || undefined);
      }
      return api.solicitudesContrato.rechazar(p.id, notas.trim() || undefined);
    },
    onSuccess: async () => {
      setDetalleId(null);
      setNotas("");
      await qc.invalidateQueries({ queryKey: ["platform-solicitudes-contrato"] });
      void qc.invalidateQueries({ queryKey: [...PLATFORM_SOLICITUDES_PENDIENTES_QUERY_KEY] });
    },
  });

  const guardarNotas = useMutation({
    mutationFn: () => {
      if (!detalleId) throw new Error("Sin solicitud");
      return api.solicitudesContrato.actualizarNotas(detalleId, notas);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-solicitudes-contrato"] }),
  });

  function empresaEtiquetas(empresa: SolicitudRow["empresa"]) {
    const comercial = empresa.nombreComercial.trim();
    const razon = empresa.razonSocial.trim();
    const titulo = comercial || razon || "—";
    const subtitulo =
      razon && comercial && razon.toLowerCase() !== comercial.toLowerCase() ? razon : null;
    return { titulo, subtitulo };
  }

  return (
    <div>
      <h1 className={platformUi.pageTitle}>Solicitudes de contrato</h1>
      <p className={platformUi.pageSubtitle}>
        Pedidos de cambio o contratación de plan desde los negocios. Aprueba el contrato,
        registra notas de contacto y revisa datos de la empresa solicitante.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {ESTADOS.map((e) => (
          <button
            key={e.value || "all"}
            type="button"
            onClick={() => setFiltro(e.value)}
            className={
              filtro === e.value
                ? platformUi.btnPrimary
                : platformUi.btnSecondary
            }
          >
            {e.label}
          </button>
        ))}
      </div>

      {q.isLoading && (
        <p className={`mt-8 flex items-center gap-2 ${platformUi.textMuted}`}>
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
        </p>
      )}

      <div className={`${platformUi.tableWrap} mt-6`}>
        <table className="min-w-full text-left text-sm">
          <thead className={platformUi.tableHead}>
            <tr>
              <th className={platformUi.th}>Fecha</th>
              <th className={platformUi.th}>Empresa</th>
              <th className={platformUi.th}>Plan solicitado</th>
              <th className={platformUi.th}>Contacto</th>
              <th className={platformUi.th}>Estado</th>
              <th className={platformUi.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={platformUi.tableRow}>
                <td className={`${platformUi.td} whitespace-nowrap ${platformUi.textBody}`}>
                  {new Date(r.createdAt).toLocaleString("es-PE")}
                </td>
                <td className={platformUi.td}>
                  <p className="font-medium text-[var(--p-text)]">{r.empresa.nombreComercial}</p>
                  <p className={`text-xs ${platformUi.textMuted}`}>
                    {r.empresa.documentoFiscal} · {r.subdomain ?? "—"}
                  </p>
                </td>
                <td className={platformUi.td}>
                  {r.plan.nombre}
                  <span className={`block text-xs ${platformUi.textMuted}`}>
                    {r.plan.precioMensual === 0
                      ? "Demo"
                      : `${formatMoneyPEN(r.plan.precioMensual)}/mes`}
                  </span>
                </td>
                <td className={`${platformUi.td} text-xs ${platformUi.textBody}`}>
                  <p>{r.solicitante.solicitanteNombre}</p>
                  <p>DNI {r.solicitante.solicitanteDni}</p>
                  <p>{r.empresa.emailFacturacion}</p>
                  <p>{r.empresa.telefono}</p>
                </td>
                <td className={platformUi.td}>
                  <span
                    className={
                      r.estado === "Pendiente"
                        ? platformUi.badgeWarn
                        : r.estado === "Aprobada"
                          ? platformUi.badgeOk
                          : platformUi.badgeMuted
                    }
                  >
                    {r.estado}
                  </span>
                </td>
                <td className={platformUi.td}>
                  <button
                    type="button"
                    className={platformUi.btnSecondary}
                    onClick={() => {
                      setDetalleId(r.id);
                      setNotas(r.notasPlataforma ?? "");
                    }}
                  >
                    Ver / gestionar
                  </button>
                </td>
              </tr>
            ))}
            {!q.isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className={`px-4 py-8 text-center ${platformUi.textMuted}`}>
                  No hay solicitudes en este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {detalle && (
        <div
          className={platformUi.modalOverlay}
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetalleId(null);
          }}
        >
          <div className={`${platformUi.modal} max-w-lg`} role="dialog" aria-modal="true">
            <div className="platform-modal-header">
              <h2 className={platformUi.sectionTitle}>Solicitud de contrato</h2>
              <p className={`mt-1 text-xs ${platformUi.textMuted}`}>
                {new Date(detalle.createdAt).toLocaleString("es-PE")} · {detalle.estado}
              </p>
            </div>

            <div className="platform-modal-body">
              {(() => {
                const emp = empresaEtiquetas(detalle.empresa);
                return (
                  <section className="platform-modal-section">
                    <h3 className="platform-modal-section-title">Empresa pagadora</h3>
                    <p className="font-semibold text-[var(--p-text)]">{emp.titulo}</p>
                    {emp.subtitulo ? (
                      <p className={`mt-0.5 text-sm ${platformUi.textMuted}`}>{emp.subtitulo}</p>
                    ) : null}
                    <p className={`mt-2 text-xs ${platformUi.textBody}`}>
                      {detalle.empresa.documentoFiscal}
                      {detalle.subdomain ? ` · ${detalle.subdomain}.kallpanexus.com` : ""}
                    </p>
                    <p className={`text-xs ${platformUi.textMuted}`}>
                      {detalle.empresa.emailFacturacion}
                      {detalle.empresa.telefono ? ` · ${detalle.empresa.telefono}` : ""}
                    </p>
                  </section>
                );
              })()}

              <section className="platform-modal-section">
                <h3 className="platform-modal-section-title">Plan solicitado</h3>
                <p className="font-medium text-[var(--p-text)]">{detalle.plan.nombre}</p>
                <p className={`text-sm ${platformUi.textMuted}`}>
                  {detalle.plan.precioMensual === 0
                    ? "Periodo demo"
                    : `${formatMoneyPEN(detalle.plan.precioMensual)}/mes`}
                </p>
              </section>

              <section className="platform-modal-section">
                <h3 className="platform-modal-section-title">Gerente / solicitante</h3>
                <p className={platformUi.textBody}>
                  {detalle.solicitante.solicitanteNombre} · DNI{" "}
                  {detalle.solicitante.solicitanteDni}
                </p>
                <p className={`text-sm ${platformUi.textMuted}`}>
                  {detalle.solicitante.solicitanteEmail ?? "Sin email de solicitante"}
                </p>
              </section>

              {detalle.mensajeCliente ? (
                <section className="platform-modal-section">
                  <h3 className="platform-modal-section-title">Mensaje del cliente</h3>
                  <p className={`text-sm ${platformUi.textBody}`}>{detalle.mensajeCliente}</p>
                </section>
              ) : null}

              <label className="mt-4 block text-sm">
                <span className={platformUi.formLabel}>Notas internas / seguimiento</span>
                <textarea
                  className={`${platformUi.input} mt-1 min-h-[88px]`}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Llamada, correo enviado, acuerdo comercial…"
                />
              </label>
            </div>

            <div className="platform-modal-footer">
              <button type="button" className={platformUi.btnSecondary} onClick={() => setDetalleId(null)}>
                Cerrar
              </button>
              {puedeGestionar && (
                <>
                  <button
                    type="button"
                    className={platformUi.btnSecondary}
                    disabled={guardarNotas.isPending}
                    onClick={() => guardarNotas.mutate()}
                  >
                    Guardar notas
                  </button>
                  {detalle.estado === "Pendiente" && (
                    <>
                      <button
                        type="button"
                        className="platform-btn-danger"
                        disabled={accion.isPending}
                        onClick={() => accion.mutate({ tipo: "rechazar", id: detalle.id })}
                      >
                        <X className="h-4 w-4" /> Rechazar
                      </button>
                      <button
                        type="button"
                        className={platformUi.btnPrimary}
                        disabled={accion.isPending}
                        onClick={() => accion.mutate({ tipo: "aprobar", id: detalle.id })}
                      >
                        <Check className="h-4 w-4" /> Aprobar y aplicar plan
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
