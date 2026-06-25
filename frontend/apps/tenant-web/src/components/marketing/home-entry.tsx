"use client";

import { LandingPage } from "@/components/marketing/landing-page";
import { useAuthStore } from "@/lib/auth-store";
import { useEffect, useState } from "react";

/** La raíz `/` es siempre la web pública de Kallpa Nexus. El panel operativo está en `/dashboard`. */
export function HomeEntry() {
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate();
    setReady(true);
  }, [hydrate]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
        Cargando…
      </div>
    );
  }

  return <LandingPage />;
}
