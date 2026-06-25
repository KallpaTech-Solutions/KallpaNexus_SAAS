import Link from "next/link";
import { Layers } from "lucide-react";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Layers className="h-5 w-5" aria-hidden />
          </span>
          <span className="hidden sm:inline">Kallpa Nexus</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          <Link href="/#modulos" className="hover:text-emerald-700">
            Módulos
          </Link>
          <Link href="/#beneficios" className="hover:text-emerald-700">
            Beneficios
          </Link>
          <Link href="/#planes" className="hover:text-emerald-700">
            Planes
          </Link>
          <Link href="/sports" className="hover:text-emerald-700">
            Reservar canchas
          </Link>
        </nav>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/login"
            className="hidden rounded-lg px-3 py-1.5 text-slate-700 hover:bg-slate-50 sm:inline"
          >
            Acceso negocio
          </Link>
          <Link
            href="/registrar"
            className="rounded-lg bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700"
          >
            Empezar
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-900 py-12 text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
        <div>
          <p className="font-semibold text-white">Kallpa Nexus</p>
          <p className="mt-2 text-sm">Una plataforma. Todos tus negocios.</p>
        </div>
        <div className="text-sm">
          <p className="font-medium text-white">Enlaces</p>
          <ul className="mt-2 space-y-1">
            <li>
              <Link href="/sports" className="hover:text-emerald-400">
                Buscar canchas (Sport)
              </Link>
            </li>
            <li>
              <Link href="/registrar" className="hover:text-emerald-400">
                Registrar mi negocio
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-emerald-400">
                Panel del negocio
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-medium text-white">Contacto</p>
          <p className="mt-2">
            <a href="mailto:hola@kallpanexus.com" className="hover:text-emerald-400">
              hola@kallpanexus.com
            </a>
          </p>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-6xl px-4 text-center text-xs text-slate-500 sm:px-6">
        © {new Date().getFullYear()} Kallpa Tech. Términos y privacidad (próximamente).
      </p>
    </footer>
  );
}
