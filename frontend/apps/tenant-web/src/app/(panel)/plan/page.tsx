"use client";

import { PERMISOS_SPORT } from "@kallpanexus/types";
import { formatMoneyPEN } from "@kallpanexus/shared";
import {
  getApiErrorMessage,
  getCuentaDesactivadaMessage,
  isApiUnreachableError,
  isCuentaDesactivadaError,
} from "@kallpanexus/api-client";
import { ApiConexionAnimada } from "@/components/api-conexion-animada";
import { CuentaDesactivadaAviso } from "@/components/cuenta-desactivada-aviso";
import { useTenantApi } from "@/lib/api-context";
import { canAccess, useAuthStore } from "@/lib/auth-store";
import { PlanUsoBanner } from "@/components/plan-uso-banner";
import { useUiFeedback } from "@/components/ui-feedback-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export default function PlanPage() {
  const api = useTenantApi();
  const qc = useQueryClient();
  const { confirmar, notificar, notificarErrorApi } = useUiFeedback();
  const permisos = useAuthStore((s) => s.session?.permisos ?? []);
  const puedeVer = canAccess(permisos, PERMISOS_SPORT.rolesGestionar);
  const puedeGestionar = canAccess(permisos, PERMISOS_SPORT.rolesGestionar);

  const { data, isLoading, error } = useQuery({
    queryKey: ["tenant-suscripcion"],
    queryFn: () => api.suscripcion.resumen(),
    enabled: puedeVer,
  });

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["tenant-suscripcion"] });
  };

  const cambiarPlan = useMutation({
    mutationFn: (planId: string) => api.suscripcion.solicitarPlan(planId),
    onSuccess: (res) => {
      notificar(
        res?.mensaje ??
          "Solicitud enviada. Kallpa Nexus se comunicará contigo para confirmar el plan.",
        "exito"
      );
      invalidar();
    },
    onError: (e) => notificarErrorApi(e),
  });

  const suscribir = useMutation({
    mutationFn: () => api.suscripcion.suscribir(),
    onSuccess: (res: { mensaje?: string }) => {
      notificar(res?.mensaje ?? "Suscripción actualizada.", "exito");
      invalidar();
    },
    onError: (e) => notificarErrorApi(e),
  });

  const cancelar = useMutation({
    mutationFn: () => api.suscripcion.cancelar(),
    onSuccess: (res: { mensaje?: string }) => {
      notificar(res?.mensaje ?? "Suscripción cancelada.", "info");
      invalidar();
    },
    onError: (e) => notificarErrorApi(e),
  });

  if (!puedeVer) {
    return <p className="text-slate-400">Sin permiso para ver el plan.</p>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="panel-page-title">Plan y suscripción</h2>
        <p className="text-sm text-slate-400">
          Límites de sucursales y usuarios staff según tu contrato Kallpa Nexus Sport.
        </p>
      </header>

      {isLoading && <p className="text-slate-500">Cargando…</p>}
      {error &&
        (isCuentaDesactivadaError(error) ? (
          <CuentaDesactivadaAviso mensaje={getCuentaDesactivadaMessage(error)} />
        ) : isApiUnreachableError(error) ? (
          <ApiConexionAnimada />
        ) : (
          <p className="text-sm text-red-300">{getApiErrorMessage(error)}</p>
        ))}

      {data && (
        <>
          <PlanUsoBanner data={data} variante="general" mostrarLinkPlan={false} />

          {data.soloGestionPlan && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
              Tu plan venció. El resto del panel está bloqueado hasta que renueves o contrates un plan
              aquí abajo.
            </div>
          )}

          {data.cancelacionProgramada && !data.cicloVencido && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Cancelaste la renovación automática, pero sigues con acceso hasta la fecha de fin de
              ciclo. Puedes reactivar antes de esa fecha sin perder el conteo.
            </div>
          )}

          {data.proximoPago && (
            <p className="text-xs text-slate-500">
              {data.estado === "Demo" || (data.plan as { esDemo?: boolean }).esDemo
                ? "Fin del periodo demo: "
                : "Fin del ciclo / próxima renovación: "}
              <span className="font-medium text-slate-700">
                {new Date(data.proximoPago).toLocaleDateString("es-PE", {
                  timeZone: "America/Lima",
                })}
              </span>
            </p>
          )}

          {data.solicitudPendiente && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Tienes una solicitud de plan en revisión:{" "}
              <strong>{data.solicitudPendiente.plan?.nombre}</strong>. Kallpa Nexus te
              contactará para confirmar el contrato.
            </div>
          )}

          {puedeGestionar && (
            <section className="space-y-4 panel-card p-4">
              <h3 className="text-sm font-semibold text-sport-navy">Planes disponibles</h3>
              <p className="text-xs text-slate-500">
                El pago en línea se integrará después. Al elegir un plan envías una solicitud;
                el equipo de Kallpa Nexus la revisará y te contactará para activar el contrato.
              </p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {(data.planesDisponibles ?? []).map((p) => (
                  <li
                    key={p.id}
                    className={
                      p.esActual
                        ? "rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4"
                        : "rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                    }
                  >
                    <p className="font-medium text-slate-900">{p.nombre}</p>
                    <p className="mt-1 text-lg font-semibold text-sport-green">
                      {p.precioMensual === 0
                        ? "Gratis (demo)"
                        : `${formatMoneyPEN(p.precioMensual)}/mes`}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      Hasta {p.limiteSucursales} sucursales · {p.limiteUsuariosStaff} usuarios staff
                      {(p as { esDemo?: boolean }).esDemo &&
                        (p as { diasDuracionDemo?: number }).diasDuracionDemo && (
                          <>
                            {" "}
                            · Demo{" "}
                            {(p as { diasDuracionDemo?: number }).diasDuracionDemo} días
                          </>
                        )}
                    </p>
                    {p.esActual ? (
                      <span className="mt-3 inline-block text-xs text-emerald-400">Plan actual</span>
                    ) : (
                      <button
                        type="button"
                        className="panel-btn-secondary mt-3 px-3 py-1.5 text-xs"
                        disabled={cambiarPlan.isPending || Boolean(data.solicitudPendiente)}
                        onClick={async () => {
                          const ok = await confirmar({
                            titulo: "Solicitar plan",
                            mensaje: `¿Enviar solicitud para «${p.nombre}»? Kallpa Nexus revisará tu pedido y se comunicará contigo para confirmar el contrato.`,
                            confirmarTexto: "Enviar solicitud",
                          });
                          if (ok) cambiarPlan.mutate(p.id);
                        }}
                      >
                        {data.solicitudPendiente ? "Solicitud en revisión" : "Elegir este plan"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-4">
                {data.estado === "Cancelado" && !data.cicloVencido && (
                  <button
                    type="button"
                    className="panel-btn-primary"
                    disabled={suscribir.isPending}
                    onClick={() => suscribir.mutate()}
                  >
                    Reactivar suscripción
                  </button>
                )}
                {(data.cicloVencido || data.soloGestionPlan) &&
                  !((data.plan as { esDemo?: boolean }).esDemo ?? data.plan.precioMensual <= 0) && (
                  <button
                    type="button"
                    className="panel-btn-primary"
                    disabled={suscribir.isPending}
                    onClick={() => suscribir.mutate()}
                  >
                    Iniciar nuevo ciclo de pago
                  </button>
                )}
                {data.estado !== "Cancelado" && !data.cicloVencido && (
                  <>
                    {(data.estado === "Demo" || data.estado === "Suspendido") && (
                      <button
                        type="button"
                        className="panel-btn-primary"
                        disabled={suscribir.isPending}
                        onClick={() => suscribir.mutate()}
                      >
                        Activar suscripción
                      </button>
                    )}
                    <button
                      type="button"
                      className="rounded-lg border border-red-500/50 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                      disabled={cancelar.isPending}
                      onClick={async () => {
                        const fin = data.proximoPago
                          ? new Date(data.proximoPago).toLocaleDateString("es-PE", {
                              timeZone: "America/Lima",
                            })
                          : "fin de ciclo";
                        const ok = await confirmar({
                          titulo: "Cancelar suscripción",
                          mensaje:
                            `Seguirás con acceso al panel hasta ${fin}. Después de esa fecha solo podrás gestionar el plan para volver a contratar. ¿Continuar?`,
                          confirmarTexto: "Cancelar suscripción",
                          variante: "advertencia",
                        });
                        if (ok) cancelar.mutate();
                      }}
                    >
                      Cancelar suscripción
                    </button>
                  </>
                )}
              </div>
            </section>
          )}

          {!puedeGestionar && (
            <p className="text-sm text-slate-500">
              Solo el gerente puede cambiar de plan o cancelar la suscripción.
            </p>
          )}
        </>
      )}
    </div>
  );
}
