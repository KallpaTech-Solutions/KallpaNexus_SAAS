import Link from "next/link";
import { Trophy } from "lucide-react";

type Props = {
  /** En página de negocio: nombre del club */
  tenantNombre?: string;
  tenantSlug?: string;
};

export function PublicSportHeader({ tenantNombre, tenantSlug }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/sports" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Trophy className="h-5 w-5" aria-hidden />
          </span>
          <span className="hidden sm:inline">Kallpa Reservas</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          <Link href="/" className="hover:text-emerald-700">
            Para negocios
          </Link>
          {tenantSlug ? (
            <Link href={`/sports/${tenantSlug}#sedes`} className="hover:text-emerald-700">
              Sedes
            </Link>
          ) : (
            <Link href="/sports#sedes" className="hover:text-emerald-700">
              Sedes
            </Link>
          )}
          {tenantSlug && (
            <Link href={`/sports/${tenantSlug}#canchas`} className="hover:text-emerald-700">
              Canchas
            </Link>
          )}
          {tenantSlug && (
            <Link href={`/sports/${tenantSlug}#tienda`} className="hover:text-emerald-700">
              Tienda
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2 text-sm">
          {tenantNombre ? (
            <span className="max-w-[140px] truncate font-medium text-slate-800 sm:max-w-none">
              {tenantNombre}
            </span>
          ) : null}
          <Link
            href="/login"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
          >
            Acceso staff
          </Link>
        </div>
      </div>
    </header>
  );
}

export function PublicSportFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
      <p>Reserva canchas y servicios con Kallpa Nexus.</p>
      <p className="mt-1 text-xs">© {new Date().getFullYear()} Kallpa Tech</p>
    </footer>
  );
}
