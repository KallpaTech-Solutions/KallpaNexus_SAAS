"use client";

import { consultarDniPublico } from "@/lib/consulta-dni-public";
import { publicSportApi } from "@/lib/public-api";
import {
  montoAdelantoWeb,
  publicTenantMediaUrl,
  type TipoAdelantoWeb,
} from "@/lib/tenant-media-url";
import type { PublicProductoWeb, PublicReservaSlot } from "@kallpanexus/types";
import {
  documentoClienteListoParaBuscar,
  formatMoneyPEN,
  soloDigitosTelefono,
  telefonoClienteValidoParaGuardar,
  urlWhatsAppCliente,
} from "@kallpanexus/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FileText, Loader2, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const silverModal =
  "border border-zinc-300/80 bg-gradient-to-br from-zinc-200 via-zinc-50 to-zinc-300 shadow-[0_8px_32px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.85)]";

const silverPanel =
  "relative overflow-hidden rounded-xl border border-zinc-400/50 bg-gradient-to-br from-zinc-100 via-white to-zinc-200 p-4 shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-2px_6px_rgba(100,116,139,0.15),0_1px_2px_rgba(0,0,0,0.06)] before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.55)_50%,transparent_60%)] before:opacity-70";

const silverInput =
  "w-full rounded-lg border border-zinc-400/45 bg-gradient-to-b from-zinc-50 to-zinc-200/90 px-3 py-2.5 text-sm text-slate-900 shadow-[inset_0_2px_4px_rgba(148,163,184,0.25),0_1px_0_rgba(255,255,255,0.8)] focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400/35";

const silverChipOn =
  "border border-zinc-500/70 bg-gradient-to-b from-zinc-200 to-zinc-300 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(0,0,0,0.08)]";

const silverChipOff =
  "border border-zinc-400/45 bg-gradient-to-b from-zinc-50 to-zinc-100 text-slate-700 hover:from-white hover:to-zinc-200";

const silverDropzone =
  "relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-zinc-400/70 bg-gradient-to-br from-zinc-100 via-zinc-50 to-zinc-200 px-4 py-5 text-center shadow-[inset_0_2px_8px_rgba(255,255,255,0.9),inset_0_-1px_4px_rgba(100,116,139,0.12)] transition hover:border-zinc-500/80 hover:shadow-[inset_0_2px_10px_rgba(255,255,255,1),0_0_0_1px_rgba(255,255,255,0.5)] before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(120deg,transparent_35%,rgba(255,255,255,0.65)_48%,transparent_62%)] before:opacity-60";

type Props = {
  slug: string;
  open: boolean;
  onClose: () => void;
  canchaId: string;
  canchaNombre: string;
  sucursalId: string;
  fecha: string;
  horasSeleccionadas: number[];
  slots: PublicReservaSlot[];
  productos?: PublicProductoWeb[];
  carrito?: Record<string, number>;
  onEnviado: (opts?: { whatsAppUrl?: string }) => void;
};

export function PublicReservaModal({
  slug,
  open,
  onClose,
  canchaId,
  canchaNombre,
  sucursalId,
  fecha,
  horasSeleccionadas,
  slots,
  productos = [],
  carrito = {},
  onEnviado,
}: Props) {
  const [horas, setHoras] = useState<number[]>([]);
  const [dni, setDni] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [medioPagoId, setMedioPagoId] = useState("");
  const [codigoOperacion, setCodigoOperacion] = useState("");
  const [voucherUrl, setVoucherUrl] = useState("");
  const [voucherPreview, setVoucherPreview] = useState<{
    url: string;
    kind: "image" | "pdf";
    name: string;
  } | null>(null);
  const [subiendoVoucher, setSubiendoVoucher] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buscandoDni, setBuscandoDni] = useState(false);
  const [msgDni, setMsgDni] = useState<string | null>(null);
  const [tipoAdelanto, setTipoAdelanto] = useState<TipoAdelantoWeb>("Total");

  useEffect(() => {
    if (open) {
      setHoras([...horasSeleccionadas].sort((a, b) => a - b));
      setError(null);
    } else {
      setVoucherPreview((prev) => {
        if (prev?.url.startsWith("blob:")) URL.revokeObjectURL(prev.url);
        return null;
      });
    }
  }, [open, horasSeleccionadas]);

  useEffect(() => {
    return () => {
      if (voucherPreview?.url.startsWith("blob:")) {
        URL.revokeObjectURL(voucherPreview.url);
      }
    };
  }, [voucherPreview?.url]);

  const mediosQ = useQuery({
    queryKey: ["public-medios", slug, sucursalId],
    queryFn: () => publicSportApi.mediosPago(slug, sucursalId),
    enabled: open && !!sucursalId,
  });

  const medios = mediosQ.data ?? [];

  useEffect(() => {
    if (!medioPagoId && medios.length > 0) {
      setMedioPagoId(medios[0]!.id);
    }
  }, [medios, medioPagoId]);

  const medioSel = medios.find((m) => m.id === medioPagoId);

  const lineasHoras = useMemo(() => {
    return horas
      .map((h) => slots.find((s) => s.horaInicio === h))
      .filter((s): s is PublicReservaSlot => !!s);
  }, [horas, slots]);

  const totalCancha = lineasHoras.reduce((s, x) => s + x.precio, 0);

  const totalProductos = useMemo(() => {
    let t = 0;
    for (const p of productos) {
      const q = carrito[p.id] ?? 0;
      if (q > 0) t += p.precio * q;
    }
    return t;
  }, [productos, carrito]);

  const total = totalCancha + totalProductos;
  const montoAPagar = montoAdelantoWeb(total, tipoAdelanto);
  const requiereComprobante =
    tipoAdelanto !== "SinAdelanto" && (medioSel?.requiereVoucherOnline ?? true);

  const productosLineas = useMemo(
    () =>
      Object.entries(carrito)
        .filter(([, q]) => q > 0)
        .map(([productoId, cantidad]) => ({ productoId, cantidad })),
    [carrito]
  );

  const enviar = useMutation({
    mutationFn: async () => {
      const dniNorm = dni.replace(/\D/g, "");
      if (dniNorm.length < 8) throw new Error("Ingresa un DNI válido.");
      if (!nombre.trim()) throw new Error("Ingresa tu nombre completo.");
      if (!telefonoClienteValidoParaGuardar(telefono, false)) {
        throw new Error("Ingresa un celular de 9 dígitos.");
      }
      if (tipoAdelanto !== "SinAdelanto" && !medioPagoId) throw new Error("Elige Yape o Plin.");
      if (
        requiereComprobante &&
        !voucherUrl.trim() &&
        !codigoOperacion.trim()
      ) {
        throw new Error("Sube el voucher o indica el código de operación.");
      }
      if (horas.length === 0) throw new Error("Elige al menos un horario.");

      const base = {
        duracionHoras: 1,
        dniCliente: dniNorm,
        nombreCompletoCliente: nombre.trim(),
        telefonoCliente: soloDigitosTelefono(telefono),
        codigoOperacion: codigoOperacion.trim() || undefined,
        voucherUrl: voucherUrl.trim() || undefined,
        tipoAdelantoWeb: tipoAdelanto,
        productos: productosLineas.length ? productosLineas : undefined,
        ...(tipoAdelanto !== "SinAdelanto" && medioPagoId
          ? { medioPagoId }
          : {}),
      };

      const grupoId = crypto.randomUUID();
      const horariosTexto = lineasHoras.map((s) => s.horarioTexto).join(", ");
      const montoGrupo = montoAdelantoWeb(total, tipoAdelanto);

      for (let i = 0; i < horas.length; i++) {
        const h = horas[i]!;
        const horaInicio = `${fecha}T${String(h).padStart(2, "0")}:00:00`;
        await publicSportApi.solicitarReserva(slug, {
          canchaId,
          horaInicio,
          ...base,
          grupoSolicitudWebId: horas.length > 1 ? grupoId : undefined,
          registrarPagoEnEstaLinea: i === 0,
          montoPagoGrupo: i === 0 && tipoAdelanto !== "SinAdelanto" ? montoGrupo : undefined,
          productos: i === 0 ? base.productos : undefined,
        });
      }

      return {
        horariosTexto,
        total,
        montoGrupo,
        tipoAdelanto,
        telefonoWa: medioSel?.telefonoReferencia ?? null,
      };
    },
    onSuccess: (data) => {
      setError(null);
      const tel = data?.telefonoWa?.replace(/\D/g, "") ?? "";
      const pagoTxt =
        data?.tipoAdelanto === "SinAdelanto"
          ? "Reserva sin adelanto (pago en el local)."
          : `Pago registrado: ${formatMoneyPEN(data?.montoGrupo ?? 0)} de ${formatMoneyPEN(data?.total ?? total)}.`;
      const msg = `Hola, soy ${nombre.trim()}. Solicité reserva web en ${canchaNombre}.\nFecha: ${fecha}\nHorarios: ${data?.horariosTexto ?? ""}\nTotal reserva: ${formatMoneyPEN(data?.total ?? total)}\n${pagoTxt}\nDNI: ${dni.replace(/\D/g, "")}\nPor favor confirmar en el calendario de reservas. Gracias.`;
      const whatsAppUrl =
        tel.length === 9 ? urlWhatsAppCliente(tel, msg) : undefined;
      onEnviado(whatsAppUrl ? { whatsAppUrl } : undefined);
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : "No se pudo enviar la solicitud.");
    },
  });

  async function buscarReniec() {
    if (!documentoClienteListoParaBuscar(dni)) return;
    setBuscandoDni(true);
    setMsgDni(null);
    const r = await consultarDniPublico(slug, dni);
    setBuscandoDni(false);
    if (r.ok && r.data.fullName?.trim()) {
      setNombre(r.data.fullName.trim());
      setMsgDni(
        r.data.origen === "reniec" || r.data.origen === "decolecta"
          ? "Nombre obtenido de RENIEC."
          : "Nombre encontrado en nuestros registros."
      );
    } else {
      setMsgDni(r.ok ? "Sin nombre en el registro. Escríbelo manualmente." : r.mensaje);
    }
  }

  async function onVoucherFile(file: File | null) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("La captura no puede superar 5 MB.");
      return;
    }
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    setVoucherPreview((prev) => {
      if (prev?.url.startsWith("blob:")) URL.revokeObjectURL(prev.url);
      if (isPdf) {
        return { url: "", kind: "pdf", name: file.name };
      }
      return { url: URL.createObjectURL(file), kind: "image", name: file.name };
    });
    setSubiendoVoucher(true);
    setError(null);
    try {
      const { voucherUrl: url } = await publicSportApi.subirVoucher(slug, file);
      setVoucherUrl(url);
    } catch (e) {
      setVoucherUrl("");
      setVoucherPreview((prev) => {
        if (prev?.url.startsWith("blob:")) URL.revokeObjectURL(prev.url);
        return null;
      });
      setError(e instanceof Error ? e.message : "No se pudo subir el comprobante.");
    } finally {
      setSubiendoVoucher(false);
    }
  }

  function quitarVoucher() {
    setVoucherUrl("");
    setVoucherPreview((prev) => {
      if (prev?.url.startsWith("blob:")) URL.revokeObjectURL(prev.url);
      return null;
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="public-reserva-title"
    >
      <div
        className={`flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl ${silverModal}`}
      >
        <div className="flex items-center justify-between border-b border-zinc-300/80 bg-gradient-to-r from-zinc-100/90 to-zinc-200/90 px-5 py-4 shadow-[inset_0_-1px_0_rgba(255,255,255,0.6)]">
          <div>
            <p id="public-reserva-title" className="text-lg font-bold text-slate-900">
              Confirmar reserva
            </p>
            <p className="text-xs text-slate-500">
              {canchaNombre} · {fecha}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-zinc-100/50 to-zinc-200/40 px-5 py-4">
          <div className={`${silverPanel} !p-3`}>
            <p className="relative text-sm font-semibold text-slate-800">Horarios</p>
            <ul className="relative mt-2 space-y-2">
              {lineasHoras.map((slot) => (
                <li
                  key={slot.horaInicio}
                  className="flex items-center justify-between rounded-lg border border-zinc-300/60 bg-gradient-to-r from-white/80 to-zinc-100/90 px-3 py-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                >
                  <span>
                    {slot.horarioTexto}{" "}
                    <span className="font-medium text-emerald-700">
                      {formatMoneyPEN(slot.precio)}
                    </span>
                  </span>
                  {horas.length > 1 && (
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-800"
                      onClick={() => setHoras((h) => h.filter((x) => x !== slot.horaInicio))}
                      aria-label="Quitar horario"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {productosLineas.length > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                Bebidas/extras en la primera reserva: {formatMoneyPEN(totalProductos)}
              </p>
            )}
            <p className="mt-2 text-base font-bold text-slate-900">
              Total: <span className="text-emerald-700">{formatMoneyPEN(total)}</span>
            </p>
            {montoAPagar > 0 && montoAPagar < total && (
              <p className="text-sm text-violet-800">
                A pagar ahora: <strong>{formatMoneyPEN(montoAPagar)}</strong>
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">DNI</label>
              <div className="flex gap-2">
                <input
                  className={silverInput}
                  inputMode="numeric"
                  maxLength={8}
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void buscarReniec();
                    }
                  }}
                />
                <button
                  type="button"
                  className="shrink-0 rounded-xl border border-emerald-700/40 bg-gradient-to-b from-white to-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 shadow-sm hover:from-emerald-50 disabled:opacity-50"
                  disabled={!documentoClienteListoParaBuscar(dni) || buscandoDni}
                  onClick={() => void buscarReniec()}
                >
                  {buscandoDni ? "…" : "RENIEC"}
                </button>
              </div>
              {msgDni && <p className="mt-1 text-xs text-slate-500">{msgDni}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Celular</label>
              <input
                className={silverInput}
                inputMode="numeric"
                maxLength={9}
                value={telefono}
                onChange={(e) => setTelefono(soloDigitosTelefono(e.target.value))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Nombre completo
              </label>
              <input
                className={silverInput}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
          </div>

          <div className={silverPanel}>
            <p className="relative text-sm font-semibold text-slate-800">Pago</p>
            <p className="mt-1 text-xs text-slate-600">¿Cuánto adelantas ahora?</p>
            <p className="mt-1.5 rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-2.5 py-2 text-[11px] leading-snug text-emerald-950">
              <span className="font-semibold">Con adelanto</span> (30 % o pago total) el negocio
              prioriza tu solicitud al revisar el voucher.{" "}
              <span className="text-emerald-900/90">
                Sin adelanto suele tardar más y el horario puede quedar libre para otro cliente.
              </span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  ["Total", "Pagar todo (100 %)"],
                  ["Porcentaje30", "Adelanto 30 %"],
                  ["SinAdelanto", "Reservar sin adelanto"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setTipoAdelanto(val)}
                  className={`relative rounded-lg border px-3 py-2 text-xs font-semibold sm:text-sm ${
                    tipoAdelanto === val ? silverChipOn : silverChipOff
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tipoAdelanto !== "SinAdelanto" && (
              <>
            {mediosQ.isLoading && (
              <p className="mt-2 text-sm text-slate-500">Cargando medios…</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {medios.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMedioPagoId(m.id)}
                  className={`relative rounded-lg border px-3 py-2 text-sm font-semibold ${
                    medioPagoId === m.id ? silverChipOn : silverChipOff
                  }`}
                >
                  {m.nombre}
                </button>
              ))}
            </div>
            {medioSel?.telefonoReferencia && (
              <p className="mt-2 text-center text-sm font-medium text-slate-700">
                Paga al número:{" "}
                <span className="text-emerald-800">{medioSel.telefonoReferencia}</span>
              </p>
            )}
            {medioSel?.qrUrl && (
              <div className="relative mt-3 rounded-xl border border-zinc-400/55 bg-gradient-to-br from-white via-zinc-50 to-zinc-200 p-4 text-center shadow-[inset_0_2px_6px_rgba(255,255,255,0.95),0_2px_8px_rgba(0,0,0,0.06)]">
                <p className="mb-2 text-xs font-medium text-slate-600">Escanea para pagar</p>
                <img
                  src={publicTenantMediaUrl(slug, medioSel.qrUrl)}
                  alt={`QR ${medioSel.nombre}`}
                  className="mx-auto max-h-52 w-auto max-w-full rounded-lg object-contain ring-1 ring-zinc-300/80"
                  onError={(e) => {
                    e.currentTarget.closest("div")?.classList.add("hidden");
                  }}
                />
              </div>
            )}
            <div className="relative mt-4">
              <label className="mb-2 block text-xs font-medium text-slate-700">
                Comprobante de pago (máx. 5 MB)
              </label>

              {voucherPreview && (
                <div className="relative mb-3 overflow-hidden rounded-xl border border-zinc-400/60 bg-gradient-to-br from-zinc-50 via-white to-zinc-200 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_12px_rgba(15,23,42,0.08)]">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-slate-800">
                      Vista previa
                      {voucherUrl ? (
                        <span className="ml-1 font-normal text-emerald-700">· subido ✓</span>
                      ) : subiendoVoucher ? (
                        <span className="ml-1 font-normal text-slate-500">· subiendo…</span>
                      ) : null}
                    </p>
                    <button
                      type="button"
                      className="shrink-0 rounded-lg border border-zinc-400/50 bg-white/80 px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-50"
                      onClick={quitarVoucher}
                      disabled={subiendoVoucher}
                    >
                      Quitar
                    </button>
                  </div>
                  {voucherPreview.kind === "image" && voucherPreview.url ? (
                    <div className="relative max-h-48 overflow-hidden rounded-lg border border-zinc-300/70 bg-zinc-900/5">
                      <img
                        src={voucherPreview.url}
                        alt="Vista previa del comprobante"
                        className="mx-auto max-h-48 w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg border border-zinc-300/60 bg-white/70 px-3 py-4">
                      <FileText className="h-10 w-10 shrink-0 text-zinc-500" />
                      <div className="min-w-0 text-left">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {voucherPreview.name}
                        </p>
                        <p className="text-xs text-slate-500">PDF adjunto</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!voucherPreview && (
                <label className={silverDropzone}>
                  <span className="relative text-sm font-semibold text-slate-800">
                    Subir captura o PDF
                  </span>
                  <span className="relative mt-1 text-xs text-slate-600">
                    JPG, PNG, WebP o PDF
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="sr-only"
                    disabled={subiendoVoucher}
                    onChange={(e) => {
                      void onVoucherFile(e.target.files?.[0] ?? null);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}

              {subiendoVoucher && (
                <p className="mt-2 flex items-center justify-center gap-1 text-xs text-slate-600">
                  <Loader2 className="h-3 w-3 animate-spin" /> Subiendo comprobante…
                </p>
              )}
            </div>
            <div className="relative mt-3">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Código de operación (opcional si subes captura)
              </label>
              <input
                className={silverInput}
                value={codigoOperacion}
                onChange={(e) => setCodigoOperacion(e.target.value)}
              />
            </div>
              </>
            )}
            {tipoAdelanto === "SinAdelanto" && (
              <p className="mt-3 rounded-lg border border-amber-200/90 bg-amber-50/90 px-2.5 py-2 text-xs leading-snug text-amber-950">
                Reserva <strong>sin pago ahora</strong>: el local confirma cuando pueda y pagas
                todo al llegar. Si el cupo se llena, pueden atender antes a quienes ya
                adelantaron con voucher.
              </p>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="border-t border-zinc-300/80 bg-gradient-to-r from-zinc-100 to-zinc-200/95 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          <button
            type="button"
            disabled={enviar.isPending || horas.length === 0}
            onClick={() => enviar.mutate()}
            className="w-full rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 py-3.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(5,150,105,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] hover:from-emerald-600 hover:to-emerald-800 disabled:opacity-50"
          >
            {enviar.isPending ? "Enviando solicitud…" : "Confirmar reserva"}
          </button>
          <p className="mt-2 text-center text-[11px] text-slate-500">
            El local verificará tu pago antes de confirmar el horario.
          </p>
        </div>
      </div>
    </div>
  );
}
