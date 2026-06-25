import Link from "next/link";

export function KallpaPublicHeader() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/#inicio" className="text-2xl font-extrabold text-blue-600">
          Kallpa Nexus
        </Link>
        <nav className="hidden items-center gap-6 text-[15px] font-medium text-slate-600 md:flex">
          <Link href="/#inicio" className="hover:text-blue-600">
            Inicio
          </Link>
          <Link href="/#modulos" className="hover:text-blue-600">
            Módulos
          </Link>
          <Link href="/#beneficios" className="hover:text-blue-600">
            Beneficios
          </Link>
          <Link href="/#planes" className="hover:text-blue-600">
            Precios
          </Link>
          <Link href="/sports" className="hover:text-blue-600">
            Directorio Sport
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 sm:inline"
          >
            Acceso negocio
          </Link>
          <Link
            href="/registrar?servicio=sport"
            className="rounded-[10px] bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
          >
            Solicitar demo
          </Link>
        </div>
      </div>
    </header>
  );
}

export function KallpaPublicFooter() {
  return (
    <footer className="bg-slate-900 py-10 text-center text-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h3 className="text-lg font-bold">Kallpa Nexus</h3>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/80">
          Plataforma SaaS para gestión de negocios. Cada vertical (Sport, Stay, Care, Gear) es un
          módulo especializado; contratas el que necesitas.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-white/70">
          <Link href="/login" className="hover:text-white">
            Login negocio
          </Link>
          <Link href="/registrar?servicio=sport" className="hover:text-white">
            Registrarse
          </Link>
        </div>
        <p className="mt-8 text-xs text-white/60">
          © {new Date().getFullYear()} Kallpa Nexus. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
