import Link from "next/link";

export function PublicLandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 py-10 text-center text-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h3 className="text-lg font-bold">Kallpa Nexus</h3>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/80">
          Plataforma SaaS para gestión de negocios. Cada vertical (Sport, Stay, Care, Gear) es un
          módulo especializado; contratas el que necesitas.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-white/70">
          <Link href="/login" className="transition hover:text-white">
            Login negocio
          </Link>
          <Link href="/registrar?servicio=sport" className="transition hover:text-white">
            Registrarse
          </Link>
          <Link href="/sports" className="transition hover:text-white">
            Directorio Sport
          </Link>
        </div>
        <p className="mt-8 text-xs text-white/60">© {year} Kallpa Nexus. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
