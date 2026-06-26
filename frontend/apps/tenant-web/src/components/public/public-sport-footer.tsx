import { PUBLIC_SPORT_CONTACT } from "@/lib/public-sport-site";
import { ArrowUpRight, Mail, MapPin, Phone, Trophy } from "lucide-react";
import Link from "next/link";

export function PublicSportFooter() {
  const year = new Date().getFullYear();
  const { phoneDisplay, phoneE164, whatsappUrl, email, locationLine } = PUBLIC_SPORT_CONTACT;

  return (
    <footer className="sports-hub-footer relative border-t border-emerald-900/20 bg-slate-950 text-slate-300">
      <div className="sports-hub-footer-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <Link href="/sports" className="inline-flex items-center gap-2.5 text-white">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-900/40">
                <Trophy className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-lg font-bold tracking-tight">Nexus Sports</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              Directorio de sedes y reservas del módulo Nexus Sports.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:border-emerald-400/60 hover:bg-emerald-500/20 hover:text-emerald-200"
            >
              Ir a Kallpa Nexus
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          <div className="lg:col-span-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-emerald-400/90">
              Contacto
            </h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-white transition hover:text-emerald-200"
                      >
                        {phoneDisplay}
                      </a>
                      <span className="text-slate-600" aria-hidden>
                        ·
                      </span>
                      <a
                        href={`tel:${phoneE164}`}
                        className="text-xs font-medium text-emerald-400 underline-offset-2 hover:text-emerald-300 hover:underline"
                      >
                        Llamar
                      </a>
                    </p>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-block text-xs text-slate-500 transition hover:text-slate-400"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
              </li>
              <li>
                <a
                  href={`mailto:${email}`}
                  className="flex items-start gap-3 transition hover:text-white"
                >
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                  <span className="break-all font-medium text-slate-200">{email}</span>
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                <span>{locationLine}</span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-emerald-400/90">
              Enlaces
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/sports#sedes" className="transition hover:text-emerald-300">
                  Sedes disponibles
                </Link>
              </li>
              <li>
                <Link href="/" className="transition hover:text-emerald-300">
                  Kallpa Nexus — plataforma para negocios
                </Link>
              </li>
              <li>
                <Link href="/registrar?servicio=sport" className="transition hover:text-emerald-300">
                  Registrar mi complejo
                </Link>
              </li>
              <li>
                <Link href="/login" className="transition hover:text-emerald-300">
                  Acceso staff
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-8 text-center text-xs text-slate-500 sm:flex-row sm:text-left">
          <p>© {year} Kallpa Tech · Nexus Sports</p>
          <p className="text-slate-600">
            ¿Eres dueño de un complejo?{" "}
            <Link href="/registrar?servicio=sport" className="text-emerald-400 hover:text-emerald-300">
              Empieza aquí
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
