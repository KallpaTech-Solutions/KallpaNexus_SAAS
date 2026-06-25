import Link from "next/link";
import { KallpaPublicFooter, KallpaPublicHeader } from "./kallpa-public-chrome";
import { LandingStaffBanner } from "./landing-staff-banner";
import { LandingPlanesSection, LandingServiciosContratar } from "./landing-plans-section";

const MODULOS = [
  {
    id: "sport",
    emoji: "⚽",
    titulo: "Nexus Sport",
    estado: "disponible" as const,
    desc: "Canchas y complejos deportivos.",
    items: [
      "Reservas web y calendario en tiempo real",
      "Panel admin, tarifas y medios de pago",
      "Reportes y reservas web pendientes",
    ],
  },
  {
    id: "stay",
    emoji: "🏨",
    titulo: "Nexus Stay",
    estado: "proximo" as const,
    desc: "Hoteles, hostales y alojamientos.",
    items: ["Check-in digital", "Housekeeping", "Tarifas dinámicas", "Motor de reservas"],
  },
  {
    id: "care",
    emoji: "💜",
    titulo: "Nexus Care",
    estado: "proximo" as const,
    desc: "Spas, clínicas y bienestar.",
    items: ["Agenda inteligente", "Historial de clientes", "Recordatorios", "Membresías"],
  },
  {
    id: "gear",
    emoji: "🚜",
    titulo: "Nexus Gear",
    estado: "proximo" as const,
    desc: "Alquiler de maquinaria.",
    items: ["Catálogo digital", "Disponibilidad", "Contratos", "Facturación"],
  },
];

export function LandingPage() {
  return (
    <div className="font-sans text-slate-900">
      <KallpaPublicHeader />
      <div className="pt-[72px]">
        <LandingStaffBanner />
      </div>

      <main id="inicio">
        <section className="bg-gradient-to-br from-blue-50 to-white pb-24 pt-10">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
            <div>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-[3.25rem]">
                Gestiona tu negocio con módulos especializados{" "}
                <span className="text-blue-600">Kallpa Nexus</span>
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-slate-500">
                No es un solo producto genérico: elige <strong className="font-semibold text-slate-700">Nexus Sport</strong>{" "}
                para canchas (ya disponible) o suma Stay, Care y Gear cuando estén listos. Una
                cuenta empresa, tenants por negocio, panel operativo por sede.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/registrar?servicio=sport"
                  className="rounded-[10px] bg-blue-600 px-7 py-3.5 font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-blue-700"
                >
                  Solicitar demo — Sport
                </Link>
                <Link
                  href="/sports"
                  className="rounded-[10px] border-2 border-blue-600 px-7 py-3.5 font-semibold text-blue-600 hover:bg-blue-50"
                >
                  Ver directorio público
                </Link>
                <Link
                  href="/login"
                  className="rounded-[10px] px-4 py-3.5 text-sm font-medium text-slate-600 hover:text-blue-600"
                >
                  Acceso gerente / staff →
                </Link>
              </div>
            </div>

            <div className="rounded-[20px] bg-white p-8 shadow-[0_20px_40px_rgba(0,0,0,.08)]">
              <h3 className="text-lg font-bold text-slate-800">Ejemplo — panel operativo (Sport)</h3>
              <p className="mt-1 text-xs text-slate-500">
                Tras contratar, el gerente entra por login y ve reservas, cobros y sedes en tiempo
                real.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  { v: "—", l: "Reservas hoy" },
                  { v: "—", l: "Cobrado hoy" },
                  { v: "—", l: "Ocupación" },
                  { v: "—", l: "Sedes activas" },
                ].map((c) => (
                  <div key={c.l} className="rounded-xl bg-slate-50 p-4">
                    <strong className="block text-2xl text-blue-600">{c.v}</strong>
                    <span className="text-xs text-slate-500">{c.l}</span>
                  </div>
                ))}
              </div>
              <Link href="/login" className="mt-5 inline-block text-sm font-semibold text-blue-600 hover:underline">
                Ir al panel de mi negocio
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold sm:text-4xl">¿Qué problemas resolvemos?</h2>
              <p className="mt-2 text-slate-500">Digitaliza procesos críticos del dueño del negocio.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  t: "Reservas duplicadas",
                  p: "Calendario sincronizado y bloqueo automático de horarios.",
                },
                {
                  t: "Control manual",
                  p: "Menos WhatsApp y planillas: confirmaciones y cobros en un solo lugar.",
                },
                {
                  t: "Falta de reportes",
                  p: "Ingresos, reservas y sedes con datos en tiempo real.",
                },
              ].map((x) => (
                <div
                  key={x.t}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <h3 className="font-semibold text-slate-900">{x.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{x.p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="modulos" className="bg-slate-50 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold sm:text-4xl">Módulos especializados</h2>
              <p className="mt-2 text-slate-500">
                Una plataforma, varios verticales. Contratas por módulo, no mezclamos todo en uno.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2">
              {MODULOS.map((m) => (
                <article
                  key={m.id}
                  className="rounded-[18px] bg-white p-8 shadow-[0_10px_25px_rgba(0,0,0,.08)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xl font-bold">
                      {m.emoji} {m.titulo}
                    </h3>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        m.estado === "disponible"
                          ? "bg-green-100 text-green-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {m.estado === "disponible" ? "Disponible" : "Próximamente"}
                    </span>
                  </div>
                  <p className="mt-2 text-slate-600">{m.desc}</p>
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-600">
                    {m.items.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                  {m.estado === "disponible" && (
                    <Link
                      href={`/registrar?servicio=${m.id}`}
                      className="mt-5 inline-block text-sm font-semibold text-blue-600 hover:underline"
                    >
                      Contratar {m.titulo} →
                    </Link>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <LandingServiciosContratar />

        <section id="beneficios" className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold sm:text-4xl">¿Por qué Kallpa Nexus?</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { h: "24/7", p: "Reservas y gestión en cualquier momento." },
                { h: "Pagos", p: "Cobros digitales con trazabilidad." },
                { h: "Reportes", p: "Estadísticas para decidir mejor." },
                { h: "Multi-sede", p: "Varios negocios (tenants) bajo tu empresa." },
              ].map((b) => (
                <div key={b.h} className="rounded-[18px] bg-slate-50 p-8 text-center">
                  <h3 className="text-lg font-bold text-blue-600">{b.h}</h3>
                  <p className="mt-2 text-sm text-slate-600">{b.p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div id="planes">
          <LandingPlanesSection />
        </div>

        <section id="contacto" className="py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="rounded-[30px] bg-gradient-to-br from-blue-600 to-blue-800 px-6 py-16 text-center text-white sm:px-12">
              <h2 className="text-3xl font-bold sm:text-4xl">Impulsa tu negocio con Kallpa Nexus</h2>
              <p className="mx-auto mt-4 max-w-2xl text-blue-100">
                Registra tu complejo con Nexus Sport, o contáctanos para una demo. La consola Kallpa
                administra tenants y empresas que contrataron el servicio.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/registrar?servicio=sport"
                  className="rounded-[10px] bg-white px-8 py-3.5 font-bold text-blue-600 hover:bg-blue-50"
                >
                  Solicitar demo gratuita
                </Link>
                <a
                  href="mailto:hola@kallpanexus.com"
                  className="rounded-[10px] border border-white/40 px-8 py-3.5 font-semibold hover:bg-white/10"
                >
                  Contacto
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <KallpaPublicFooter />
    </div>
  );
}
