"use client";

import { NEXUS_VERTICALS, type NexusVerticalId } from "@/lib/nexus-verticals";
import { formatMoneyPEN } from "@kallpanexus/shared";
import type { DniConsultaResult, RucConsultaResult } from "@kallpanexus/types";
import axios from "axios";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

type PlanRow = {
  id: string;
  nombre: string;
  precioMensual: number;
  limiteSucursales: number;
  limiteUsuariosStaff: number;
  recomendado?: boolean;
  modulos?: {
    soportaModuloSport?: boolean;
    SoportaModuloSport?: boolean;
  };
};

function normalizePlan(raw: Record<string, unknown>): PlanRow {
  const modulos = (raw.modulos ?? raw.Modulos) as PlanRow["modulos"];
  return {
    id: String(raw.id ?? raw.Id ?? ""),
    nombre: String(raw.nombre ?? raw.Nombre ?? ""),
    precioMensual: Number(raw.precioMensual ?? raw.PrecioMensual ?? 0),
    limiteSucursales: Number(raw.limiteSucursales ?? raw.LimiteSucursales ?? 0),
    limiteUsuariosStaff: Number(raw.limiteUsuariosStaff ?? raw.LimiteUsuariosStaff ?? 0),
    recomendado: Boolean(raw.recomendado ?? raw.Recomendado),
    modulos,
  };
}

export function LandingPlanesSection() {
  const q = useQuery({
    queryKey: ["onboarding-planes"],
    queryFn: async () => {
      const { data } = await axios.get<{ planes?: PlanRow[]; Planes?: PlanRow[] }>(
        "/api/onboarding/planes"
      );
      const list = data.planes ?? data.Planes ?? [];
      return list.map((p) => normalizePlan(p as Record<string, unknown>));
    },
  });

  return (
    <section id="planes" className="border-y border-slate-200 bg-white py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-2xl font-bold text-slate-900">Planes y contratación</h2>
        <p className="mt-2 max-w-2xl text-slate-600">
          Elige un plan y contrata el servicio que necesitas. Hoy puedes activar{" "}
          <strong>Nexus Sport</strong> (canchas); Stay, Care y Gear se habilitarán pronto.
        </p>

        {q.isLoading && (
          <p className="mt-8 flex items-center gap-2 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando planes…
          </p>
        )}

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(q.data ?? []).map((plan) => (
            <article
              key={plan.id}
              className={`relative rounded-2xl border p-6 shadow-sm ${
                plan.recomendado
                  ? "border-emerald-400 ring-2 ring-emerald-200"
                  : "border-slate-200"
              }`}
            >
              {plan.recomendado && (
                <span className="absolute -top-3 left-4 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
                  Recomendado
                </span>
              )}
              <h3 className="text-lg font-bold text-slate-900">{plan.nombre}</h3>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {formatMoneyPEN(plan.precioMensual)}
                <span className="text-sm font-normal text-slate-500"> / mes</span>
              </p>
              <ul className="mt-4 space-y-1 text-sm text-slate-600">
                <li>Hasta {plan.limiteSucursales || "∞"} negocios (tenants)</li>
                <li>Hasta {plan.limiteUsuariosStaff || "∞"} usuarios staff</li>
                <li>Módulo Sport incluido</li>
              </ul>
              <Link
                href={`/registrar?servicio=sport&plan=${encodeURIComponent(plan.id)}`}
                className="mt-6 inline-flex w-full justify-center rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Contratar Nexus Sport
              </Link>
            </article>
          ))}
        </div>

        {!q.isLoading && (q.data?.length ?? 0) === 0 && (
          <p className="mt-6 text-sm text-amber-800">
            No hay planes activos. Contacta a soporte o usa el registro demo sin plan.
          </p>
        )}
      </div>
    </section>
  );
}

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
