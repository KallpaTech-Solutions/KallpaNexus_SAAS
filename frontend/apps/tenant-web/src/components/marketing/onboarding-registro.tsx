"use client";

import { KallpaPublicFooter, KallpaPublicHeader } from "@/components/marketing/kallpa-public-chrome";
import { fetchDniOnboarding } from "@/components/marketing/landing-plans-section";
import { NEXUS_VERTICALS, sportTenantPublicPath, type NexusVerticalId } from "@/lib/nexus-verticals";
import { isKnxLocalDev, tenantStaffLoginUrl } from "@kallpanexus/env";
import { getApiErrorMessage } from "@kallpanexus/api-client";
import axios from "axios";
import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

type TipoPersona = 0 | 1;

type RegistroOk = {
  mensaje?: string;
  subdomain?: string;
  Subdomain?: string;
  loginStaff?: string | null;
};

export function OnboardingRegistroForm({
  servicio = "sport",
  planSaaSId,
}: {
  servicio?: NexusVerticalId;
  planSaaSId?: string;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState<RegistroOk | null>(null);
  const [gerenteDniRegistrado, setGerenteDniRegistrado] = useState<string | null>(null);

  const [loadingDni, setLoadingDni] = useState(false);
  const [loadingStaffDni, setLoadingStaffDni] = useState(false);

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

  const verificarSubdominio = useCallback(async () => {
    const s = subdomain.trim().toLowerCase();
    if (s.length < 3) {
      setSubdomainOk(null);
      return;
    }
    setCheckingSub(true);
    try {
      const { data } = await axios.get<{ disponible?: boolean; Disponible?: boolean }>(
        `/api/onboarding/verificar-subdominio?subdomain=${encodeURIComponent(s)}`
      );
      const disp = data.disponible ?? data.Disponible ?? false;
      setSubdomainOk(disp);
    } catch {
      setSubdomainOk(null);
    } finally {
      setCheckingSub(false);
    }
  }, [subdomain]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const dniGerente =
      tipo === 1
        ? staffDni.trim()
        : (staffDni.trim() || documentoFiscal.trim()).slice(0, 8);

    if (dniGerente.length !== 8) {
      setError(
        tipo === 1
          ? "Con empresa (RUC) debes ingresar el DNI de 8 dígitos del gerente (persona natural)."
          : "Indica el DNI del gerente (8 dígitos) o usa persona natural con tu DNI en datos de facturación."
      );
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        tipo,
        documentoFiscal: documentoFiscal.trim(),
        razonSocial: razonSocial.trim(),
        nombreComercial: nombreComercial.trim(),
        emailFacturacion: emailFacturacion.trim(),
        telefono: telefono.trim(),
        pais: "Peru",
        subdomain: subdomain.trim().toLowerCase(),
        nombreComercialNegocio: nombreComercialNegocio.trim(),
        nombreSucursalPrincipal: "Sucursal Principal",
        direccionSucursal: direccionSucursal.trim() || "Por definir",
        telefonoSucursal: telefono.trim(),
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
    } catch (err) {
      setError(getApiErrorMessage(err) || "No se pudo completar el registro.");
    } finally {
      setLoading(false);
    }
  }

  const subFinal = ok?.subdomain ?? ok?.Subdomain;

  if (!vertical.disponible) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Este servicio aún no está disponible para registro. Vuelve a la{" "}
        <Link href="/" className="font-medium underline">
          página principal
        </Link>
        .
      </p>
    );
  }

  if (ok) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden />
        <h2 className="mt-4 text-xl font-bold text-slate-900">¡Registro completado!</h2>
        <p className="mt-2 text-sm text-slate-600">{ok.mensaje ?? "Tu negocio ya está en la plataforma."}</p>
        {subFinal && (
          <p className="mt-4 text-sm">
            Subdominio: <strong>{subFinal}</strong>
          </p>
        )}
        {gerenteDniRegistrado && (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-700">
            Usuario gerente: DNI <strong>{gerenteDniRegistrado}</strong>. Contraseña
            inicial: <strong>el mismo DNI</strong> (8 dígitos). En el primer ingreso
            deberás cambiarla.
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href={subFinal ? tenantStaffLoginUrl(subFinal) : "/login"}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Ir al login del panel
          </Link>
          {subFinal && (
            <Link
              href={sportTenantPublicPath(subFinal)}
              className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium hover:bg-white"
            >
              Ver web pública
            </Link>
          )}
        </div>
        {subFinal && isKnxLocalDev() && (
          <p className="mt-4 text-xs text-slate-500">
            En local abre{" "}
            <code className="text-emerald-800">
              {subFinal}.localhost:3000/login
            </code>{" "}
            o usa el login global en localhost con el mismo DNI y contraseña.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-slate-900">Empresa pagadora</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="tipo"
              checked={tipo === 0}
              onChange={() => setTipo(0)}
            />
            Persona natural
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="tipo"
              checked={tipo === 1}
              onChange={() => setTipo(1)}
            />
            Empresa (RUC)
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-slate-600">{tipo === 1 ? "RUC" : "DNI"}</span>
            <input
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={documentoFiscal}
              onChange={(e) => setDocumentoFiscal(e.target.value.replace(/\D/g, "").slice(0, 11))}
              onBlur={() => tipo === 0 && buscarDni(documentoFiscal, "empresa")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (tipo === 0) void buscarDni(documentoFiscal, "empresa");
                }
              }}
            />
            {tipo === 0 && loadingDni && (
              <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin" /> Consultando DNI…
              </span>
            )}
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-slate-600">Razón social / nombre legal</span>
            <input
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Nombre comercial (facturación)</span>
            <input
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={nombreComercial}
              onChange={(e) => setNombreComercial(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Email</span>
            <input
              required
              type="email"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={emailFacturacion}
              onChange={(e) => setEmailFacturacion(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Teléfono</span>
            <input
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-slate-900">
          Tu negocio ({vertical.label})
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="text-slate-600">Subdominio (URL del panel)</span>
            <div className="mt-1 flex gap-2">
              <input
                required
                pattern="[a-z0-9-]{3,}"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 lowercase"
                placeholder="mi-complejo"
                value={subdomain}
                onChange={(e) => {
                  setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  setSubdomainOk(null);
                }}
                onBlur={verificarSubdominio}
              />
              <button
                type="button"
                onClick={verificarSubdominio}
                className="rounded-lg border border-slate-300 px-3 text-sm hover:bg-slate-50"
              >
                {checkingSub ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verificar"}
              </button>
            </div>
            {subdomainOk === true && (
              <span className="mt-1 block text-xs text-emerald-700">Disponible</span>
            )}
            {subdomainOk === false && (
              <span className="mt-1 block text-xs text-red-600">No disponible</span>
            )}
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-slate-600">Nombre del complejo (marca)</span>
            <input
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={nombreComercialNegocio}
              onChange={(e) => setNombreComercialNegocio(e.target.value)}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-slate-600">Dirección sede principal</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={direccionSucursal}
              onChange={(e) => setDireccionSucursal(e.target.value)}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-slate-900">Gerente (acceso al panel)</legend>
        {tipo === 1 && (
          <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-slate-700">
            La empresa se factura con <strong>RUC</strong>; quien entra al panel es una{" "}
            <strong>persona con DNI</strong> (representante o dueño). No repitas el RUC aquí.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-slate-600">
              DNI gerente{tipo === 1 ? " (obligatorio)" : ""}
            </span>
            <input
              required={tipo === 1}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={staffDni}
              onChange={(e) => setStaffDni(e.target.value.replace(/\D/g, "").slice(0, 8))}
              onBlur={() => {
                const d = staffDni || (tipo === 0 ? documentoFiscal : "");
                if (d.length === 8) void buscarDni(d, "gerente");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const d = staffDni || (tipo === 0 ? documentoFiscal : "");
                  if (d.length === 8) void buscarDni(d, "gerente");
                }
              }}
              placeholder={tipo === 1 ? "8 dígitos del representante" : "Opcional si coincide con tu DNI"}
            />
            {loadingStaffDni && (
              <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin" /> Consultando DNI…
              </span>
            )}
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Email gerente</span>
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-slate-600">Nombre gerente</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={staffNombre}
              onChange={(e) => setStaffNombre(e.target.value)}
            />
          </label>
        </div>
      </fieldset>

      <p className="text-xs text-slate-500">
        Al registrarte aceptas el plan demo activo. Puedes cambiar de plan desde el panel o con
        soporte Kallpa.
      </p>

      <button
        type="submit"
        disabled={loading || subdomainOk === false}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Crear mi cuenta Nexus Sport
      </button>
    </form>
  );
}

export function OnboardingRegistroPage() {
  const sp = useSearchParams();
  const servicioRaw = (sp.get("servicio") ?? "sport").toLowerCase();
  const servicio = (servicioRaw in NEXUS_VERTICALS ? servicioRaw : "sport") as NexusVerticalId;
  const plan = sp.get("plan") ?? undefined;
  const vertical = NEXUS_VERTICALS[servicio];

  return (
    <>
      <KallpaPublicHeader />
      <main className="mx-auto max-w-2xl px-4 pb-12 pt-24 sm:px-6">
        <Link href="/" className="text-sm text-emerald-700 hover:underline">
          ← Volver a inicio
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          Registrar — {vertical.label}
        </h1>
        <p className="mt-2 text-slate-600">
          Un solo registro crea: empresa pagadora, negocio (tenant), sede principal y un usuario
          gerente. Si contratas como <strong>empresa (RUC)</strong>, el gerente siempre es una persona
          con DNI distinto al RUC.
        </p>
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <OnboardingRegistroForm servicio={servicio} planSaaSId={plan ?? undefined} />
        </div>
      </main>
      <KallpaPublicFooter />
    </>
  );
}
