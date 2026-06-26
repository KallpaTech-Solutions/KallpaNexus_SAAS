"use client";

import {
  etiquetaTelefonoCliente,
  soloDigitosTelefono,
  urlWhatsAppCliente,
} from "@kallpanexus/shared";
import type { PublicNegocioInfo } from "@kallpanexus/types";
import { MessageCircle, Phone } from "lucide-react";

type Sede = PublicNegocioInfo["sucursales"][number];

type Props = {
  nombreComercial: string;
  telefonoWhatsAppNegocio?: string | null;
  sucursalActiva?: Sede;
  variasSedes: boolean;
};

function waUrlPara(digits9: string, nombre: string) {
  return urlWhatsAppCliente(
    digits9,
    `Hola ${nombre}, vi su página web y quiero hacer una consulta.`
  );
}

export function PublicContactoNegocio({
  nombreComercial,
  telefonoWhatsAppNegocio,
  sucursalActiva,
  variasSedes,
}: Props) {
  const waNegocio = soloDigitosTelefono(telefonoWhatsAppNegocio ?? "");
  const waSede = soloDigitosTelefono(sucursalActiva?.telefonoWhatsApp ?? "");
  const telSede = (sucursalActiva?.telefono ?? "").trim();

  const waPrincipal =
    waSede.length === 9 ? waSede : waNegocio.length === 9 ? waNegocio : "";
  const telPrincipal = telSede.length > 0 ? telSede : "";

  if (!waPrincipal && !telPrincipal) return null;

  const subtitulo = variasSedes && sucursalActiva
    ? `Contacto de ${sucursalActiva.nombre}`
    : "Escríbenos o llámanos";

  return (
    <section id="contacto" className="scroll-mt-24 border-b border-slate-200 bg-slate-50 py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Ayuda</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">Contacto</h2>
        <p className="mt-2 text-sm text-slate-600">{subtitulo}</p>

        <div className="mt-4 flex flex-wrap gap-3">
          {telPrincipal && (
            <a
              href={`tel:+51${soloDigitosTelefono(telPrincipal)}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-100"
            >
              <Phone className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              {etiquetaTelefonoCliente(telPrincipal)}
            </a>
          )}
          {waPrincipal && (
            <a
              href={waUrlPara(waPrincipal, nombreComercial)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
              WhatsApp {etiquetaTelefonoCliente(waPrincipal)}
            </a>
          )}
        </div>

        {variasSedes && !sucursalActiva && (
          <p className="mt-3 text-xs text-slate-500">
            Elige una sede arriba para ver teléfono y WhatsApp de esa ubicación.
          </p>
        )}
      </div>
    </section>
  );
}
