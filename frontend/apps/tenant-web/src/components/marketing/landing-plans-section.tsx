"use client";

import { NEXUS_VERTICALS, type NexusVerticalId } from "@/lib/nexus-verticals";
import type { DniConsultaResult, RucConsultaResult } from "@kallpanexus/types";
import axios from "axios";
import Link from "next/link";

export { PublicLandingPlans as LandingPlanesSection } from "./public-landing/public-landing-plans";

export function LandingServiciosContratar() {
  const servicios: { id: NexusVerticalId; desc: string }[] = [
    { id: "sport", desc: "Complejos deportivos, canchas y reservas web." },
    { id: "stay", desc: "Hoteles y hospedaje (próximamente)." },
    { id: "care", desc: "Clínicas, spas y citas (próximamente)." },
    { id: "gear", desc: "Alquiler de maquinaria (próximamente)." },
  ];

  return (
    <section id="contratar" className="bg-slate-50 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-2xl font-bold text-slate-900">Contratar un servicio</h2>
        <p className="mt-2 text-slate-600">Selecciona el vertical de tu negocio para registrarte.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {servicios.map(({ id, desc }) => {
            const v = NEXUS_VERTICALS[id];
            const activo = v.disponible;
            return (
              <div
                key={id}
                className={`rounded-2xl border p-5 ${
                  activo ? "border-emerald-300 bg-white" : "border-slate-200 bg-slate-100/80 opacity-90"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-slate-900">{v.label}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      activo ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {activo ? "Disponible" : "Próximamente"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{desc}</p>
                {activo ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/registrar?servicio=${id}`}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      Registrarme
                    </Link>
                    <Link
                      href={v.path}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                    >
                      Ver directorio
                    </Link>
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-slate-500">Te avisaremos cuando esté listo.</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export async function fetchDniOnboarding(numero: string): Promise<DniConsultaResult | null> {
  const digits = numero.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  try {
    const { data } = await axios.get<DniConsultaResult>(
      `/api/onboarding/consultar-dni?numero=${encodeURIComponent(digits)}`
    );
    return data;
  } catch {
    return null;
  }
}

export async function fetchRucOnboarding(numero: string): Promise<RucConsultaResult | null> {
  const digits = numero.replace(/\D/g, "");
  if (digits.length !== 11) return null;
  try {
    const { data } = await axios.get<RucConsultaResult>(
      `/api/onboarding/consultar-ruc?numero=${encodeURIComponent(digits)}`
    );
    return data;
  } catch {
    return null;
  }
}
