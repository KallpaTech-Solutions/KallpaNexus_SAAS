"use client";

import { fetchDniOnboarding, fetchRucOnboarding } from "@/components/marketing/landing-plans-section";
import { PublicLandingFooter } from "@/components/marketing/public-landing/public-landing-footer";
import { PublicLandingNav } from "@/components/marketing/public-landing/public-landing-nav";
import { PublicLandingReveal } from "@/components/marketing/public-landing/public-landing-reveal";
import { useMountReveal } from "@/components/marketing/public-landing/use-in-view-reveal";
import "@/components/marketing/public-landing/marketing-public.css";
import { NEXUS_VERTICALS, sportTenantPublicPath, type NexusVerticalId } from "@/lib/nexus-verticals";
import { cn } from "@/lib/cn";
import { NotificacionToastStack } from "@/components/notificacion-toast";
import { useRegistroToast } from "@/components/marketing/onboarding-registro-toast";
import { getApiErrorMessage } from "@kallpanexus/api-client";
import type { RucConsultaResult } from "@kallpanexus/types";
import { isKnxLocalDev, tenantPanelUrlForSubdomain } from "@kallpanexus/env";
import axios from "axios";
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  UserCircle2,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type TipoPersona = 0 | 1;

type RegistroOk = {
  mensaje?: string;
  subdomain?: string;
  Subdomain?: string;
  loginStaff?: string | null;
};

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

const PERU_CELULAR_DIGITOS = 9;
const DNI_DIGITOS = 8;
const RUC_DIGITOS = 11;

/** Tipos de documento en facturación (persona natural = DNI, empresa = RUC). */
const TIPOS_DOC_FACTURACION = [
  { value: 0 as TipoPersona, codigo: "DNI", digitos: DNI_DIGITOS },
  { value: 1 as TipoPersona, codigo: "RUC", digitos: RUC_DIGITOS },
] as const;

function docFiscalConfig(tipo: TipoPersona) {
  return TIPOS_DOC_FACTURACION.find((t) => t.value === tipo) ?? TIPOS_DOC_FACTURACION[0];
}

function soloDigitos(value: string, max: number) {
  return value.replace(/\D/g, "").slice(0, max);
}

const fieldsetClass =
  "space-y-4 rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-sm sm:p-6";

const legendClass = "mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900";

const WIZARD_STEPS = [
  { id: 0, titulo: "Facturación", icon: Building2 },
  { id: 1, titulo: "Tu negocio", icon: MapPin },
  { id: 2, titulo: "Gerente", icon: UserCircle2 },
] as const;

function RegistroWizardStepper({ paso }: { paso: number }) {
  return (
    <ol className="mb-6 flex items-center gap-1 sm:gap-2" aria-label="Pasos del registro">
      {WIZARD_STEPS.map((s, i) => {
        const hecho = paso > s.id;
        const activo = paso === s.id;
        return (
          <li key={s.id} className="flex min-w-0 flex-1 items-center gap-1">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition",
                hecho && "border-emerald-500 bg-emerald-500 text-white",
                activo && !hecho && "border-blue-600 bg-blue-50 text-blue-700",
                !activo && !hecho && "border-slate-200 bg-white text-slate-400"
              )}
            >
              {hecho ? <Check className="h-4 w-4" aria-hidden /> : s.id + 1}
            </div>
            <span
              className={cn(
                "hidden truncate text-xs font-semibold sm:block",
                activo ? "text-slate-900" : "text-slate-500"
              )}
            >
              {s.titulo}
            </span>
            {i < WIZARD_STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-0.5 h-0.5 min-w-[0.75rem] flex-1 rounded-full sm:min-w-[1.5rem]",
                  paso > s.id ? "bg-emerald-400" : "bg-slate-200"
                )}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function OnboardingRegistroForm({
  servicio = "sport",
  planSaaSId,
  onStepChange,
}: {
  servicio?: NexusVerticalId;
  planSaaSId?: string;
  onStepChange?: (step: number) => void;
}) {
  const vertical = NEXUS_VERTICALS[servicio] ?? NEXUS_VERTICALS.sport;

  const [tipo, setTipo] = useState<TipoPersona>(0);
  const [documentoFiscal, setDocumentoFiscal] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
  const [emailFacturacion, setEmailFacturacion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [nombreComercialNegocio, setNombreComercialNegocio] = useState("");
  const [direccionSucursal, setDireccionSucursal] = useState("");
  const [staffDni, setStaffDni] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffNombre, setStaffNombre] = useState("");
  const [subdomainOk, setSubdomainOk] = useState<boolean | null>(null);
  const [checkingSub, setCheckingSub] = useState(false);
  const [marcaOk, setMarcaOk] = useState<boolean | null>(null);
  const [checkingMarca, setCheckingMarca] = useState(false);
  const [dniGerenteOk, setDniGerenteOk] = useState<boolean | null>(null);
  const [checkingDniGerente, setCheckingDniGerente] = useState(false);
  const [documentoFiscalOk, setDocumentoFiscalOk] = useState<boolean | null>(null);
  const [checkingDocumentoFiscal, setCheckingDocumentoFiscal] = useState(false);
  const [paso, setPaso] = useState(0);
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<RegistroOk | null>(null);
  const [gerenteDniRegistrado, setGerenteDniRegistrado] = useState<string | null>(null);
  const { toasts, cerrar: cerrarToast, notificar } = useRegistroToast();

  const [loadingDni, setLoadingDni] = useState(false);
  const [loadingStaffDni, setLoadingStaffDni] = useState(false);

  const ready = useMountReveal();

  const dniGerenteEfectivo = useCallback(() => {
    const gerente = staffDni.replace(/\D/g, "").slice(0, 8);
    if (tipo === 1) return gerente;
    if (gerente.length === 8) return gerente;
    return documentoFiscal.replace(/\D/g, "").slice(0, 8);
  }, [tipo, staffDni, documentoFiscal]);

  const verificarDniGerente = useCallback(async () => {
    const digits = dniGerenteEfectivo();
    if (digits.length !== 8) {
      setDniGerenteOk(null);
      return;
    }
    setCheckingDniGerente(true);
    try {
      const { data } = await axios.get<{ disponible?: boolean; Disponible?: boolean }>(
        `/api/onboarding/verificar-gerente-dni?dni=${encodeURIComponent(digits)}`
      );
      const disp = data.disponible ?? data.Disponible ?? false;
      setDniGerenteOk(disp);
    } catch {
      setDniGerenteOk(null);
    } finally {
      setCheckingDniGerente(false);
    }
  }, [dniGerenteEfectivo]);

  const verificarDocumentoFiscalEmpresa = useCallback(async (): Promise<boolean> => {
    const cfg = docFiscalConfig(tipo);
    const digits = documentoFiscal.replace(/\D/g, "");
    if (digits.length !== cfg.digitos) {
      setDocumentoFiscalOk(null);
      return false;
    }
    setCheckingDocumentoFiscal(true);
    try {
      const { data } = await axios.get<{
        disponible?: boolean;
        Disponible?: boolean;
        motivo?: string;
        Motivo?: string;
      }>(
        `/api/onboarding/verificar-documento-fiscal?tipo=${tipo}&numero=${encodeURIComponent(digits)}`
      );
      const disp = data.disponible ?? data.Disponible ?? false;
      setDocumentoFiscalOk(disp);
      return disp;
    } catch {
      setDocumentoFiscalOk(null);
      return false;
    } finally {
      setCheckingDocumentoFiscal(false);
    }
  }, [tipo, documentoFiscal]);

  const buscarDni = useCallback(
    async (digits: string, destino: "empresa" | "gerente") => {
      if (digits.length !== 8) return;
      if (destino === "empresa") setLoadingDni(true);
      else setLoadingStaffDni(true);
      try {
        const data = await fetchDniOnboarding(digits);
        const nombre = data?.fullName?.trim();
        if (!nombre) return;
        if (destino === "empresa") {
          if (tipo === 0) {
            setRazonSocial(nombre);
            if (!nombreComercial.trim()) setNombreComercial(nombre.split(" ")[0] ?? nombre);
            if (!staffDni.trim()) {
              setStaffDni(digits);
              setStaffNombre(nombre);
            }
          }
        } else {
          setStaffNombre(nombre);
          if (!staffDni) setStaffDni(digits);
        }
      } finally {
        if (destino === "empresa") setLoadingDni(false);
        else setLoadingStaffDni(false);
      }
    },
    [tipo, nombreComercial, staffDni]
  );

  const buscarRuc = useCallback(
    async (digits: string) => {
      if (digits.length !== RUC_DIGITOS) return;
      setLoadingDni(true);
      try {
        const data = await fetchRucOnboarding(digits);
        if (!data) return;
        const razon =
          data.razonSocial?.trim() ??
          (data as RucConsultaResult & { RazonSocial?: string }).RazonSocial?.trim();
        if (!razon) return;
        setRazonSocial(razon);
        if (!nombreComercial.trim()) {
          const corto = razon.split(/\s+/).slice(0, 2).join(" ");
          setNombreComercial(corto || razon);
        }
      } finally {
        setLoadingDni(false);
      }
    },
    [nombreComercial]
  );

  const consultarDocumentoFiscal = useCallback(
    (raw: string) => {
      const digits = raw.replace(/\D/g, "");
      if (tipo === 1) void buscarRuc(digits);
      else if (digits.length === DNI_DIGITOS) void buscarDni(digits, "empresa");
    },
    [tipo, buscarDni, buscarRuc]
  );

  useEffect(() => {
    setDniGerenteOk(null);
    setDocumentoFiscalOk(null);
  }, [tipo]);

  useEffect(() => {
    setDocumentoFiscalOk(null);
  }, [documentoFiscal]);

  useEffect(() => {
    onStepChange?.(paso);
  }, [paso, onStepChange]);

  function irPaso(n: number) {
    setPaso(Math.max(0, Math.min(WIZARD_STEPS.length - 1, n)));
  }

  function validarPasoFacturacion(): boolean {
    if (!documentoFiscal.trim()) {
      notificar("Indica el DNI o RUC de facturación.");
      return false;
    }
    if (tipo === 0 && documentoFiscal.replace(/\D/g, "").length !== DNI_DIGITOS) {
      notificar(`El DNI debe tener ${DNI_DIGITOS} dígitos.`);
      return false;
    }
    if (tipo === 1 && documentoFiscal.replace(/\D/g, "").length !== RUC_DIGITOS) {
      notificar(`El RUC debe tener ${RUC_DIGITOS} dígitos.`);
      return false;
    }
    if (documentoFiscalOk === false) {
      notificar("Este documento ya está registrado como empresa pagadora. Usa otro DNI/RUC o inicia sesión.");
      return false;
    }
    if (!razonSocial.trim()) {
      notificar("Completa la razón social o nombre legal.");
      return false;
    }
    if (!nombreComercial.trim()) {
      notificar("Completa el nombre comercial de facturación.");
      return false;
    }
    if (!emailFacturacion.trim()) {
      notificar("Indica un correo de facturación.");
      return false;
    }
    if (!telefono.trim()) {
      notificar("Indica un teléfono de contacto.");
      return false;
    }
    const tel = soloDigitos(telefono, PERU_CELULAR_DIGITOS);
    if (tel.length !== PERU_CELULAR_DIGITOS) {
      notificar(`El celular debe tener ${PERU_CELULAR_DIGITOS} dígitos (Perú).`);
      return false;
    }
    if (tel[0] !== "9") {
      notificar("El celular en Perú suele empezar con 9 (ej. 987654321).");
      return false;
    }
    return true;
  }

  async function validarPasoNegocio(): Promise<boolean> {
    const sub = subdomain.trim().toLowerCase();
    if (sub.length < 3) {
      notificar("El subdominio debe tener al menos 3 caracteres.");
      return false;
    }
    if (!nombreComercialNegocio.trim()) {
      notificar("Indica la marca visible de tu negocio.");
      return false;
    }
    const subDisp = await verificarSubdominio();
    const marcaDisp = await verificarMarca();
    if (subDisp === false) {
      notificar("Ese subdominio no está disponible. Elige otro.");
      return false;
    }
    if (marcaDisp === false) {
      notificar("Ese nombre de marca ya está registrado.");
      return false;
    }
    if (subDisp !== true) {
      notificar("Verifica que el subdominio esté disponible antes de continuar.");
      return false;
    }
    if (marcaDisp !== true) {
      notificar("Verifica que el nombre de marca esté disponible antes de continuar.");
      return false;
    }
    return true;
  }

  async function avanzarPaso() {
    if (paso === 0) {
      if (!validarPasoFacturacion()) return;
      const docDisp = documentoFiscalOk === true ? true : await verificarDocumentoFiscalEmpresa();
      if (!docDisp) {
        notificar("Este documento ya está registrado como empresa pagadora. Usa otro DNI/RUC o inicia sesión.");
        return;
      }
      if (tipo === 0) await verificarDniGerente();
      irPaso(1);
      return;
    }
    if (paso === 1) {
      const okNegocio = await validarPasoNegocio();
      if (!okNegocio) return;
      irPaso(2);
    }
  }

  const verificarSubdominio = useCallback(async (): Promise<boolean | null> => {
    const s = subdomain.trim().toLowerCase();
    if (s.length < 3) {
      setSubdomainOk(null);
      return null;
    }
    setCheckingSub(true);
    try {
      const { data } = await axios.get<{ disponible?: boolean; Disponible?: boolean }>(
        `/api/onboarding/verificar-subdominio?subdomain=${encodeURIComponent(s)}`
      );
      const disp = data.disponible ?? data.Disponible ?? false;
      setSubdomainOk(disp);
      return disp;
    } catch {
      setSubdomainOk(null);
      return null;
    } finally {
      setCheckingSub(false);
    }
  }, [subdomain]);

  const verificarMarca = useCallback(async (): Promise<boolean | null> => {
    const nombre = nombreComercialNegocio.trim();
    if (nombre.length < 2) {
      setMarcaOk(null);
      return null;
    }
    setCheckingMarca(true);
    try {
      const { data } = await axios.get<{ disponible?: boolean; Disponible?: boolean }>(
        `/api/onboarding/verificar-marca?nombre=${encodeURIComponent(nombre)}`
      );
      const disp = data.disponible ?? data.Disponible ?? false;
      setMarcaOk(disp);
      return disp;
    } catch {
      setMarcaOk(null);
      return null;
    } finally {
      setCheckingMarca(false);
    }
  }, [nombreComercialNegocio]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const dniGerente =
      tipo === 1
        ? staffDni.trim()
        : (staffDni.trim() || documentoFiscal.trim()).slice(0, 8);

    if (dniGerente.length !== 8) {
      notificar(
        tipo === 1
          ? "Ingresa el DNI de 8 dígitos del gerente."
          : "Indica el DNI del gerente (8 dígitos) o usa persona natural con tu DNI en facturación."
      );
      return;
    }

    if (subdomainOk === false) {
      notificar("El subdominio no está disponible. Elige otro y verifica de nuevo.");
      return;
    }
    if (marcaOk === false) {
      notificar("Ese nombre de marca ya está registrado. Usa otro nombre comercial.");
      return;
    }
    if (dniGerenteOk === false) {
      notificar(
        "Este DNI ya tiene una cuenta demo o de negocio. Inicia sesión o usa otro DNI de gerente."
      );
      return;
    }

    const dniParaAlta = dniGerenteEfectivo();
    if (dniParaAlta.length === 8) {
      try {
        const { data } = await axios.get<{ disponible?: boolean; Disponible?: boolean }>(
          `/api/onboarding/verificar-gerente-dni?dni=${encodeURIComponent(dniParaAlta)}`
        );
        const disp = data.disponible ?? data.Disponible ?? false;
        setDniGerenteOk(disp);
        if (!disp) {
          notificar(
            "Este DNI ya tiene una cuenta demo o de negocio. Inicia sesión o usa otro DNI de gerente."
          );
          return;
        }
      } catch {
        notificar("No se pudo verificar el DNI. Intenta de nuevo.");
        return;
      }
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        tipo,
        documentoFiscal: soloDigitos(
          documentoFiscal,
          tipo === 1 ? RUC_DIGITOS : DNI_DIGITOS
        ),
        razonSocial: razonSocial.trim(),
        nombreComercial: nombreComercial.trim(),
        emailFacturacion: emailFacturacion.trim(),
        telefono: soloDigitos(telefono, PERU_CELULAR_DIGITOS),
        pais: "Peru",
        subdomain: subdomain.trim().toLowerCase(),
        nombreComercialNegocio: nombreComercialNegocio.trim(),
        nombreSucursalPrincipal: "Sucursal Principal",
        direccionSucursal: direccionSucursal.trim() || "Por definir",
        telefonoSucursal: soloDigitos(telefono, PERU_CELULAR_DIGITOS),
        staffGerenteDni: dniGerente,
        staffGerenteEmail: (staffEmail.trim() || emailFacturacion.trim()).toLowerCase(),
        staffGerenteNombre: staffNombre.trim() || razonSocial.trim().split(" ")[0] || "Gerente",
      };
      if (planSaaSId?.trim()) {
        body.planSaaSId = planSaaSId.trim();
      }
      const { data } = await axios.post<RegistroOk>("/api/onboarding/registrar", body);
      setGerenteDniRegistrado(dniGerente.replace(/\D/g, "").slice(0, 8));
      setOk(data);
      notificar("¡Registro completado! Ya puedes entrar al panel.", "exito");
    } catch (err) {
      notificar(getApiErrorMessage(err) || "No se pudo completar el registro.");
    } finally {
      setLoading(false);
    }
  }

  const subFinal = ok?.subdomain ?? ok?.Subdomain;

  if (!vertical.disponible) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Este servicio aún no está disponible para registro. Vuelve a la{" "}
        <Link href="/" className="font-medium underline">
          página principal
        </Link>
        .
      </p>
    );
  }

  if (ok) {
    const panelUrl = subFinal ? tenantPanelUrlForSubdomain(subFinal) : null;
    return (
      <>
        <NotificacionToastStack toasts={toasts} onCerrar={cerrarToast} />
        <div
          className={cn(
            "rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white p-8 text-center shadow-lg transition-all duration-700",
            ready ? "scale-100 opacity-100" : "scale-[0.98] opacity-0"
          )}
        >
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" aria-hidden />
          <h2 className="mt-4 text-2xl font-bold text-slate-900">¡Registro completado!</h2>
          <p className="mt-2 text-sm text-slate-600">
            {nombreComercialNegocio.trim() ? (
              <>
                <strong className="text-slate-800">{nombreComercialNegocio.trim()}</strong> ya está
                en Kallpa Nexus.
              </>
            ) : (
              "Tu negocio ya está en la plataforma."
            )}
          </p>
          {subFinal && (
            <p className="mt-3 text-sm text-slate-600">
              Identificador de acceso:{" "}
              <strong className="text-emerald-800">{subFinal}</strong>
            </p>
          )}
          {gerenteDniRegistrado && (
            <p className="mt-4 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-left text-sm text-slate-700">
              Usuario gerente: DNI <strong>{gerenteDniRegistrado}</strong>. Contraseña inicial:{" "}
              <strong>el mismo DNI</strong> (8 dígitos). En el primer ingreso deberás cambiarla.
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href={
                subFinal
                  ? `/login?subdomain=${encodeURIComponent(subFinal)}`
                  : "/login"
              }
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700"
            >
              Ir al login del panel
            </Link>
            {subFinal && (
              <Link
                href={sportTenantPublicPath(subFinal)}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium transition hover:border-blue-300 hover:bg-blue-50/50"
              >
                Ver web pública
              </Link>
            )}
          </div>
          {panelUrl && !isKnxLocalDev() && (
            <p className="mt-4 text-xs text-slate-500">
              Usa el botón de arriba para entrar; no necesitas recordar la URL técnica.
            </p>
          )}
          {subFinal && isKnxLocalDev() && (
            <details className="mt-4 text-left text-xs text-slate-500">
              <summary className="cursor-pointer font-medium text-slate-600">
                Notas solo para desarrollo local
              </summary>
              <p className="mt-2">
                URL de prueba:{" "}
                <code className="rounded bg-slate-100 px-1 text-emerald-800">{panelUrl}/login</code>
              </p>
            </details>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <NotificacionToastStack toasts={toasts} onCerrar={cerrarToast} />
      <form
        noValidate
        onSubmit={onSubmit}
        className={cn(
          "transition-all duration-700 delay-100",
          ready ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        )}
      >
        <RegistroWizardStepper paso={paso} />

        {paso === 0 && (
          <fieldset className={cn(fieldsetClass, "space-y-4")}>
        <legend className={legendClass}>
          <Building2 className="h-4 w-4 text-blue-600" aria-hidden />
          Empresa pagadora
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-600">Tipo de documento</span>
            <select
              className={inputClass}
              value={tipo}
              onChange={(e) => {
                const next = Number(e.target.value) as TipoPersona;
                setTipo(next);
                setDocumentoFiscal("");
                setDniGerenteOk(null);
                setDocumentoFiscalOk(null);
              }}
            >
              {TIPOS_DOC_FACTURACION.map((t) => (
                <option key={t.codigo} value={t.value}>
                  {t.codigo} ({t.digitos} dígitos)
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-600">
              Número de {docFiscalConfig(tipo).codigo}
            </span>
            <input
              required
              inputMode="numeric"
              autoComplete="off"
              maxLength={docFiscalConfig(tipo).digitos}
              placeholder={tipo === 1 ? "20XXXXXXXXX" : "12345678"}
              className={inputClass}
              value={documentoFiscal}
              onChange={(e) => {
                setDocumentoFiscal(soloDigitos(e.target.value, docFiscalConfig(tipo).digitos));
                if (tipo === 0) setDniGerenteOk(null);
                setDocumentoFiscalOk(null);
              }}
              onBlur={() => {
                consultarDocumentoFiscal(documentoFiscal);
                void verificarDocumentoFiscalEmpresa();
                if (tipo === 0) void verificarDniGerente();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  consultarDocumentoFiscal(documentoFiscal);
                }
              }}
            />
            {checkingDocumentoFiscal && (
              <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin" /> Verificando documento…
              </span>
            )}
            {!checkingDocumentoFiscal && documentoFiscalOk === true && (
              <span className="mt-1 block text-xs font-medium text-emerald-700">
                Documento disponible para registro
              </span>
            )}
            {!checkingDocumentoFiscal && documentoFiscalOk === false && (
              <span className="mt-1 block text-xs font-medium text-red-600">
                Ya existe una empresa pagadora con este documento
              </span>
            )}
            {loadingDni && (
              <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin" /> Consultando{" "}
                {docFiscalConfig(tipo).codigo}…
              </span>
            )}
            {tipo === 0 && !staffDni.trim() && dniGerenteOk === true && (
              <span className="mt-1 block text-xs font-medium text-emerald-700">
                DNI disponible para demo
              </span>
            )}
            {tipo === 0 && !staffDni.trim() && dniGerenteOk === false && (
              <span className="mt-1 block text-xs font-medium text-red-600">
                Este DNI ya tiene una cuenta en Kallpa Nexus
              </span>
            )}
            {tipo === 0 && checkingDniGerente && !staffDni.trim() && (
              <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin" /> Verificando DNI…
              </span>
            )}
            <span className="mt-1 block text-xs text-slate-500">
              {tipo === 1
                ? `RUC de la empresa pagadora, ${RUC_DIGITOS} dígitos. El gerente se registra con DNI en el último paso.`
                : `Documento nacional de identidad, ${DNI_DIGITOS} dígitos.`}
            </span>
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-600">Razón social / nombre legal</span>
            <input
              required
              className={inputClass}
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
            />
          </label>
          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 sm:items-end">
            <label className="flex flex-col text-sm">
              <span className="mb-1.5 min-h-[2.5rem] font-medium leading-snug text-slate-600">
                Nombre comercial{" "}
                <span className="block text-xs font-normal text-slate-500">(facturación)</span>
              </span>
              <input
                required
                className={cn(inputClass, "mt-0")}
                value={nombreComercial}
                onChange={(e) => setNombreComercial(e.target.value)}
              />
            </label>
            <label className="flex flex-col text-sm">
              <span className="mb-1.5 min-h-[2.5rem] font-medium leading-snug text-slate-600">
                Email
              </span>
              <input
                required
                type="email"
                className={cn(inputClass, "mt-0")}
                value={emailFacturacion}
                onChange={(e) => setEmailFacturacion(e.target.value)}
              />
            </label>
          </div>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-600">Celular (Perú)</span>
            <input
              required
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={PERU_CELULAR_DIGITOS}
              placeholder="987654321"
              className={inputClass}
              value={telefono}
              onChange={(e) => setTelefono(soloDigitos(e.target.value, PERU_CELULAR_DIGITOS))}
            />
            <span className="mt-1 block text-xs text-slate-500">
              {PERU_CELULAR_DIGITOS} dígitos, normalmente empieza con 9.
            </span>
          </label>
        </div>
          </fieldset>
        )}

        {paso === 1 && (
      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>
          <MapPin className="h-4 w-4 text-blue-600" aria-hidden />
          Tu negocio ({vertical.label})
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-600">Subdominio (identificador técnico)</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Solo letras minúsculas y guiones. Forma la URL de acceso, por ejemplo{" "}
              <strong className="font-medium text-slate-600">flores</strong>
              .kallpanexus.page — no es el nombre que ven tus clientes.
            </span>
            <div className="mt-1.5 flex gap-2">
              <input
                required
                pattern="[a-z0-9-]{3,}"
                className={cn(inputClass, "mt-0 flex-1 lowercase")}
                placeholder="mi-complejo"
                value={subdomain}
                onChange={(e) => {
                  setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  setSubdomainOk(null);
                }}
                onBlur={() => void verificarSubdominio()}
              />
              <button
                type="button"
                onClick={() => void verificarSubdominio()}
                className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50/50"
              >
                {checkingSub ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verificar"}
              </button>
            </div>
            {subdomainOk === true && (
              <span className="mt-1 block text-xs font-medium text-emerald-700">Disponible</span>
            )}
            {subdomainOk === false && (
              <span className="mt-1 block text-xs font-medium text-red-600">No disponible</span>
            )}
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-600">Marca del negocio (nombre visible)</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Así te verán en el directorio y en tu web pública, por ejemplo &quot;Complejo Deportivo
              Flores&quot;. Debe ser único en Kallpa Nexus.
            </span>
            <div className="mt-1.5 flex gap-2">
              <input
                required
                className={cn(inputClass, "mt-0 flex-1")}
                placeholder="Complejo Deportivo Flores"
                value={nombreComercialNegocio}
                onChange={(e) => {
                  setNombreComercialNegocio(e.target.value);
                  setMarcaOk(null);
                }}
                onBlur={() => void verificarMarca()}
              />
              <button
                type="button"
                onClick={() => void verificarMarca()}
                className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50/50"
              >
                {checkingMarca ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verificar"}
              </button>
            </div>
            {marcaOk === true && (
              <span className="mt-1 block text-xs font-medium text-emerald-700">Nombre disponible</span>
            )}
            {marcaOk === false && (
              <span className="mt-1 block text-xs font-medium text-red-600">
                Ya hay un negocio o empresa con ese nombre
              </span>
            )}
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-600">Dirección sede principal</span>
            <input
              className={inputClass}
              value={direccionSucursal}
              onChange={(e) => setDireccionSucursal(e.target.value)}
            />
          </label>
        </div>
      </fieldset>
        )}

        {paso === 2 && (
      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>
          <UserCircle2 className="h-4 w-4 text-blue-600" aria-hidden />
          Gerente (acceso al panel)
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-600">
              DNI gerente{tipo === 1 ? " (obligatorio)" : ""}
            </span>
            <input
              required={tipo === 1}
              inputMode="numeric"
              maxLength={DNI_DIGITOS}
              className={inputClass}
              value={staffDni}
              onChange={(e) => {
                setStaffDni(soloDigitos(e.target.value, DNI_DIGITOS));
                setDniGerenteOk(null);
              }}
              onBlur={() => {
                const d = staffDni || (tipo === 0 ? documentoFiscal : "");
                if (d.length === 8) void buscarDni(d, "gerente");
                void verificarDniGerente();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const d = staffDni || (tipo === 0 ? documentoFiscal : "");
                  if (d.length === 8) void buscarDni(d, "gerente");
                }
              }}
              placeholder={tipo === 1 ? "8 dígitos" : "Opcional si coincide con tu DNI"}
            />
            {loadingStaffDni && (
              <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin" /> Consultando DNI…
              </span>
            )}
            {(tipo === 1 || staffDni.trim().length > 0) && dniGerenteOk === true && (
              <span className="mt-1 block text-xs font-medium text-emerald-700">
                DNI disponible para demo
              </span>
            )}
            {(tipo === 1 || staffDni.trim().length > 0) && dniGerenteOk === false && (
              <span className="mt-1 block text-xs font-medium text-red-600">
                Este DNI ya tiene una cuenta en Kallpa Nexus
              </span>
            )}
            {(tipo === 1 || staffDni.trim().length > 0) && checkingDniGerente && (
              <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin" /> Verificando DNI…
              </span>
            )}
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-600">Email gerente</span>
            <input
              type="email"
              className={inputClass}
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-600">Nombre gerente</span>
            <input
              className={inputClass}
              value={staffNombre}
              onChange={(e) => setStaffNombre(e.target.value)}
            />
          </label>
        </div>
      </fieldset>
        )}

        {paso === 2 && (
          <p className="mt-1 text-xs text-slate-500">
            Al registrarte aceptas el plan demo activo. Puedes cambiar de plan desde el panel o con
            soporte Kallpa.
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {paso > 0 && (
            <button
              type="button"
              onClick={() => irPaso(paso - 1)}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:flex-none sm:px-6"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Atrás
            </button>
          )}
          {paso < 2 ? (
            <button
              type="button"
              onClick={() => void avanzarPaso()}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 sm:flex-none sm:px-8"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading || subdomainOk === false || marcaOk === false || dniGerenteOk === false}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:translate-y-0 disabled:opacity-50 sm:flex-none sm:min-w-[12rem]"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear demo {vertical.label}
            </button>
          )}
        </div>
      </form>
    </>
  );
}

const REGISTRO_PASOS = [
  { n: "01", t: "Datos de facturación", d: "Persona natural o empresa." },
  { n: "02", t: "Tu negocio en línea", d: "Subdominio y sede principal." },
  { n: "03", t: "Acceso gerente", d: "DNI y correo para el panel." },
] as const;

export function OnboardingRegistroPage() {
  const sp = useSearchParams();
  const servicioRaw = (sp.get("servicio") ?? "sport").toLowerCase();
  const servicio = (servicioRaw in NEXUS_VERTICALS ? servicioRaw : "sport") as NexusVerticalId;
  const plan = sp.get("plan") ?? undefined;
  const vertical = NEXUS_VERTICALS[servicio];
  const ready = useMountReveal();
  const [wizardStep, setWizardStep] = useState(0);

  return (
    <div className="kallpa-public-landing relative min-h-screen overflow-x-hidden bg-gradient-to-br from-blue-50 via-white to-slate-50 text-slate-900">
      <div className="pointer-events-none absolute -right-32 top-40 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl kallpa-landing-orb" />
      <div className="pointer-events-none absolute -left-24 bottom-32 h-72 w-72 rounded-full bg-sky-300/15 blur-3xl kallpa-landing-orb-alt" />

      <PublicLandingNav />

      <main className="relative mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6 lg:pb-20 lg:pt-32">
        <Link
          href="/"
          className={cn(
            "inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 transition hover:gap-2",
            ready ? "opacity-100" : "opacity-0"
          )}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver a inicio
        </Link>

        <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:items-start lg:gap-12 xl:gap-16">
          <div className="mb-10 lg:mb-0 lg:sticky lg:top-28">
            <p
              className={cn(
                "text-sm font-medium text-slate-500 transition-all duration-700",
                ready ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              )}
            >
              <span className="mr-2 inline-block h-px w-8 align-middle bg-blue-300" />
              Alta en Kallpa Nexus
            </p>
            <h1
              className={cn(
                "mt-3 text-3xl font-extrabold tracking-tight text-slate-900 transition-all duration-700 delay-75 sm:text-4xl",
                ready ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              )}
            >
              Registrar — <span className="text-blue-600">{vertical.label}</span>
            </h1>
            <p
              className={cn(
                "mt-4 max-w-md text-lg leading-relaxed text-slate-600 transition-all duration-700 delay-100",
                ready ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              )}
            >
              Completa cada paso y avanza con <strong className="font-semibold text-slate-700">Siguiente</strong>.
              Los avisos aparecen flotando arriba a la derecha.
            </p>

            <ul className="mt-10 hidden space-y-4 lg:block">
              {REGISTRO_PASOS.map((paso, i) => (
                <PublicLandingReveal key={paso.n} delayMs={i * 80}>
                  <li
                    className={cn(
                      "flex gap-4 rounded-xl border px-4 py-3 backdrop-blur-sm transition",
                      wizardStep === i
                        ? "border-blue-400 bg-blue-50/80 shadow-sm"
                        : wizardStep > i
                          ? "border-emerald-200/80 bg-emerald-50/50"
                          : "border-slate-200/80 bg-white/60"
                    )}
                  >
                    <span
                      className={cn(
                        "font-mono text-sm font-semibold",
                        wizardStep >= i ? "text-blue-600" : "text-slate-400"
                      )}
                    >
                      {paso.n}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">{paso.t}</p>
                      <p className="text-sm text-slate-500">{paso.d}</p>
                    </div>
                  </li>
                </PublicLandingReveal>
              ))}
            </ul>
          </div>

          <div
            className={cn(
              "rounded-[20px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(37,99,235,0.08)] backdrop-blur-md transition-all duration-1000 delay-150 sm:p-8",
              ready ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            )}
          >
            <OnboardingRegistroForm
              servicio={servicio}
              planSaaSId={plan ?? undefined}
              onStepChange={setWizardStep}
            />
          </div>
        </div>
      </main>

      <PublicLandingFooter />
    </div>
  );
}
