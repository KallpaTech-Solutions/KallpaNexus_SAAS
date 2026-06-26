"use client";

import { PERMISOS_SPORT } from "@kallpanexus/types";
import { getApiErrorMessage } from "@kallpanexus/api-client";
import { soloDigitosTelefono, etiquetaTelefonoCliente } from "@kallpanexus/shared";
import { useTenantApi } from "@/lib/api-context";
import { useAuthStore, canAccess } from "@/lib/auth-store";
import { CampoFormulario, inputClass } from "@/components/campo-formulario";
import { ConfiguracionMediosWeb } from "@/components/configuracion-medios-web";
import { PanelSeccionColapsable } from "@/components/panel-seccion-colapsable";
import { useUiFeedback } from "@/components/ui-feedback-provider";
import { PUBLIC_HERO_IMAGE, resolveMediaUrl } from "@/lib/public-brand";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Pencil, Settings2 } from "lucide-react";

const PLACEHOLDERS_AYUDA =
  "{{nombre}}, {{dni}}, {{cancha}}, {{fecha}}, {{hora}}, {{monto}}, {{negocio}}";

export default function ConfiguracionPage() {
  const api = useTenantApi();
  const qc = useQueryClient();
  const { notificar } = useUiFeedback();
  const subdomain = useAuthStore((s) => s.subdomain);
  const permisos = useAuthStore((s) => s.session?.permisos ?? []);
  const puedeVer = canAccess(permisos, PERMISOS_SPORT.canchasVer);
  const puedeModificar = canAccess(permisos, PERMISOS_SPORT.canchasModificar);

  const { data, isLoading } = useQuery({
    queryKey: ["configuracion-negocio"],
    queryFn: () => api.configuracionNegocio.obtener(),
    enabled: puedeVer,
  });

  const [form, setForm] = useState({
    nombreComercial: "",
    razonSocial: "",
    telefonoWhatsAppNegocio: "",
    mensajeWhatsAppReserva: "",
    reservaWebActiva: false,
    minutosHoldWeb: "15",
    maxReservasWebPorDniPorDia: "3",
    tituloWebLanding: "",
    mensajeWebLanding: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [editarAbierto, setEditarAbierto] = useState(false);
  const [webPaginaAbierto, setWebPaginaAbierto] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!data) return;
    setForm({
      nombreComercial: data.nombreComercial ?? "",
      razonSocial: data.razonSocial ?? "",
      telefonoWhatsAppNegocio: data.telefonoWhatsAppNegocio ?? "",
      mensajeWhatsAppReserva: data.mensajeWhatsAppReserva ?? "",
      reservaWebActiva: data.reservaWebActiva ?? false,
      minutosHoldWeb: String(data.minutosHoldWeb ?? 15),
      maxReservasWebPorDniPorDia: String(data.maxReservasWebPorDniPorDia ?? 3),
      tituloWebLanding: data.tituloWebLanding ?? "",
      mensajeWebLanding: data.mensajeWebLanding ?? "",
    });
  }, [data]);

  const guardar = useMutation({
    mutationFn: () => {
      const wa = soloDigitosTelefono(form.telefonoWhatsAppNegocio);
      if (wa.length > 0 && wa.length !== 9) {
        throw new Error("El WhatsApp del negocio debe tener 9 dígitos.");
      }
      return api.configuracionNegocio.guardar({
        nombreComercial: form.nombreComercial.trim(),
        razonSocial: form.razonSocial.trim() || undefined,
        telefonoWhatsAppNegocio: wa || undefined,
        mensajeWhatsAppReserva: form.mensajeWhatsAppReserva.trim(),
        reservaWebActiva: form.reservaWebActiva,
        minutosHoldWeb: parseInt(form.minutosHoldWeb, 10) || 15,
        maxReservasWebPorDniPorDia: parseInt(form.maxReservasWebPorDniPorDia, 10) || 3,
        tituloWebLanding: form.tituloWebLanding.trim() || null,
        mensajeWebLanding: form.mensajeWebLanding.trim() || null,
      });
    },
    onSuccess: () => {
      setError(null);
      setEditarAbierto(false);
      notificar("Configuración guardada.", "exito");
      qc.invalidateQueries({ queryKey: ["configuracion-negocio"] });
    },
    onError: (e) => {
      setError(getApiErrorMessage(e));
    },
  });

  const subirHero = useMutation({
    mutationFn: (file: File) => api.configuracionNegocio.subirImagenHero(file),
    onSuccess: () => {
      notificar("Imagen del banner actualizada.", "exito");
      qc.invalidateQueries({ queryKey: ["configuracion-negocio"] });
    },
    onError: (e) => notificar(getApiErrorMessage(e), "error"),
  });

  const quitarHero = useMutation({
    mutationFn: () => api.configuracionNegocio.quitarImagenHero(),
    onSuccess: () => {
      notificar("Se usará la imagen por defecto.", "exito");
      qc.invalidateQueries({ queryKey: ["configuracion-negocio"] });
    },
    onError: (e) => notificar(getApiErrorMessage(e), "error"),
  });

  const guardarWebTextos = useMutation({
    mutationFn: () =>
      api.configuracionNegocio.guardar({
        nombreComercial: (data?.nombreComercial ?? form.nombreComercial).trim(),
        razonSocial: data?.razonSocial?.trim() || form.razonSocial.trim() || undefined,
        telefonoWhatsAppNegocio: data?.telefonoWhatsAppNegocio ?? undefined,
        mensajeWhatsAppReserva: data?.mensajeWhatsAppReserva ?? form.mensajeWhatsAppReserva,
        tituloWebLanding: form.tituloWebLanding.trim() || null,
        mensajeWebLanding: form.mensajeWebLanding.trim() || null,
      }),
    onSuccess: () => {
      notificar("Textos de la página web guardados.", "exito");
      qc.invalidateQueries({ queryKey: ["configuracion-negocio"] });
    },
    onError: (e) => notificar(getApiErrorMessage(e), "error"),
  });

  if (!puedeVer) {
    return (
      <p className="text-slate-400">No tienes permiso para ver la configuración.</p>
    );
  }

  const waRaw = data?.telefonoWhatsAppNegocio ?? "";
  const waLabel =
    waRaw.trim().length > 0 ? etiquetaTelefonoCliente(waRaw) : "No configurado";

  const heroPreview = resolveMediaUrl(data?.imagenHeroUrl, PUBLIC_HERO_IMAGE);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="flex items-center gap-2 panel-page-title">
          <Settings2 className="h-7 w-7 text-emerald-400" aria-hidden />
          Configuración del negocio
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          WhatsApp del negocio (panel y página pública) y mensajes para contactar clientes desde
          Reservas.
        </p>
      </header>

      {isLoading && <p className="text-slate-500">Cargando…</p>}

      {!isLoading && data && (
        <>
          <div className="panel-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Configuración actual
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {data.nombreComercial || "Sin nombre comercial"}
                </p>
                {data.razonSocial && (
                  <p className="text-sm text-slate-400">{data.razonSocial}</p>
                )}
              </div>
              {data.esValoresPorDefecto && (
                <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-900">
                  Valores sugeridos — guarda para fijar
                </span>
              )}
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-500">WhatsApp negocio</dt>
                <dd className="text-slate-800">{waLabel}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500">Reservas web (/sports/slug)</dt>
                <dd className="text-slate-800">
                  {data.reservaWebActiva ? (
                    <>
                      Activas · hold {data.minutosHoldWeb ?? 15} min · máx.{" "}
                      {data.maxReservasWebPorDniPorDia ?? 3} / DNI / día
                      {subdomain && (
                        <span className="mt-1 block text-xs text-emerald-700">
                          Enlace:{" "}
                          <a
                            className="underline"
                            href={`/sports/${subdomain}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            /sports/{subdomain}
                          </a>
                        </span>
                      )}
                    </>
                  ) : (
                    "Desactivadas"
                  )}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500">Landing web (título)</dt>
                <dd className="text-slate-800">
                  {data.tituloWebLanding?.trim() || data.nombreComercial || "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500">Mensaje en banner</dt>
                <dd className="panel-info mt-1 line-clamp-2 whitespace-pre-wrap">
                  {data.mensajeWebLanding || "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500">Mensaje WhatsApp (vista previa)</dt>
                <dd className="panel-info mt-1 line-clamp-3 whitespace-pre-wrap">
                  {data.mensajeWhatsAppReserva || "—"}
                </dd>
              </div>
            </dl>
            {puedeModificar && (
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 px-3 py-2 text-sm text-emerald-300 hover:bg-emerald-500/10"
                onClick={() => setEditarAbierto((v) => !v)}
              >
                <Pencil className="h-4 w-4" />
                {editarAbierto ? "Ocultar editor" : "Editar configuración"}
              </button>
            )}
          </div>

          {puedeModificar && (
            <PanelSeccionColapsable
              titulo="Editor de configuración"
              descripcion="Nombre, WhatsApp y plantilla del mensaje"
              abierto={editarAbierto}
              onAlternar={() => setEditarAbierto((v) => !v)}
            >
              <div className="space-y-4">
                <CampoFormulario label="Nombre comercial">
                  <input
                    className={inputClass}
                    value={form.nombreComercial}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nombreComercial: e.target.value }))
                    }
                  />
                </CampoFormulario>

                <CampoFormulario label="Razón social (opcional)">
                  <input
                    className={inputClass}
                    value={form.razonSocial}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, razonSocial: e.target.value }))
                    }
                  />
                </CampoFormulario>

                <CampoFormulario
                  label="WhatsApp del negocio"
                  hint="9 dígitos. Se muestra en /sports/tu-slug (#contacto) si la sede no tiene WhatsApp propio."
                >
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    maxLength={9}
                    value={form.telefonoWhatsAppNegocio}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        telefonoWhatsAppNegocio: soloDigitosTelefono(e.target.value),
                      }))
                    }
                    placeholder="987654321"
                  />
                </CampoFormulario>

                <CampoFormulario
                  label="Mensaje al abrir WhatsApp con un cliente"
                  hint={`Placeholders: ${PLACEHOLDERS_AYUDA}`}
                >
                  <textarea
                    className={`${inputClass} min-h-[120px]`}
                    value={form.mensajeWhatsAppReserva}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, mensajeWhatsAppReserva: e.target.value }))
                    }
                  />
                </CampoFormulario>

                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-800">Reservas web públicas</p>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.reservaWebActiva}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, reservaWebActiva: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Activar reservas en /sports/{subdomain ?? "tu-slug"}
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <CampoFormulario label="Minutos de retención (hold)" hint="15, 30, etc.">
                      <input
                        className={inputClass}
                        type="number"
                        min={5}
                        max={120}
                        value={form.minutosHoldWeb}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, minutosHoldWeb: e.target.value }))
                        }
                      />
                    </CampoFormulario>
                    <CampoFormulario label="Máx. reservas web / DNI / día">
                      <input
                        className={inputClass}
                        type="number"
                        min={1}
                        max={10}
                        value={form.maxReservasWebPorDniPorDia}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, maxReservasWebPorDniPorDia: e.target.value }))
                        }
                      />
                    </CampoFormulario>
                  </div>
                </div>

                {error && <p className="text-sm text-red-300">{error}</p>}

                <button
                  type="button"
                  className="panel-btn-primary hover:bg-emerald-400"
                  disabled={guardar.isPending}
                  onClick={() => guardar.mutate()}
                >
                  Guardar cambios
                </button>
              </div>
            </PanelSeccionColapsable>
          )}

          {puedeModificar && (
            <PanelSeccionColapsable
              titulo="Página web pública"
              descripcion={`Banner, título y mensaje de /sports/${subdomain ?? "slug"}`}
              abierto={webPaginaAbierto}
              onAlternar={() => setWebPaginaAbierto((v) => !v)}
            >
              <div className="space-y-4">
                <div className="relative min-h-[200px] overflow-hidden rounded-xl bg-slate-800 sm:min-h-[240px] md:min-h-[280px]">
                  <img
                    src={heroPreview}
                    alt=""
                    className="h-full min-h-[200px] w-full object-contain object-center sm:min-h-[240px] md:min-h-[280px]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
                    <p className="text-xs text-emerald-300">Vista previa del banner</p>
                    <p className="mt-2 text-lg font-bold">
                      {form.tituloWebLanding.trim() ||
                        data.nombreComercial ||
                        "Título de la landing"}
                    </p>
                  </div>
                </div>

                <input
                  ref={heroInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) subirHero.mutate(f);
                    e.target.value = "";
                  }}
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-emerald-500/40 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                    disabled={subirHero.isPending}
                    onClick={() => heroInputRef.current?.click()}
                  >
                    {subirHero.isPending ? "Subiendo…" : "Subir imagen de fondo"}
                  </button>
                  {data.imagenHeroUrl && (
                    <button
                      type="button"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                      disabled={quitarHero.isPending}
                      onClick={() => quitarHero.mutate()}
                    >
                      Usar imagen por defecto
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  JPG, PNG o WebP · máx. 5 MB. Si no subes nada, se usa{" "}
                  <code className="text-xs">/brand/img/Fondo_1.png</code>.
                </p>

                <CampoFormulario
                  label="Título principal (hero)"
                  hint="Vacío = nombre comercial o nombre de la sede en la landing."
                >
                  <input
                    className={inputClass}
                    value={form.tituloWebLanding}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, tituloWebLanding: e.target.value }))
                    }
                    maxLength={200}
                    placeholder={data.nombreComercial || "SportZa Sede Central"}
                  />
                </CampoFormulario>

                <CampoFormulario label="Mensaje bajo el título">
                  <textarea
                    className={`${inputClass} min-h-[88px]`}
                    value={form.mensajeWebLanding}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, mensajeWebLanding: e.target.value }))
                    }
                    maxLength={800}
                  />
                </CampoFormulario>

                <ConfiguracionMediosWeb />

                <button
                  type="button"
                  className="panel-btn-primary hover:bg-emerald-400"
                  disabled={guardarWebTextos.isPending}
                  onClick={() => guardarWebTextos.mutate()}
                >
                  Guardar textos de la web
                </button>
              </div>
            </PanelSeccionColapsable>
          )}
        </>
      )}
    </div>
  );
}
