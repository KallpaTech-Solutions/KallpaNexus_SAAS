"use client";

import {
  SportFunnelEvents,
  trackSportFunnel,
} from "@/lib/analytics/sport-reserva-funnel";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/** Page views de embudo en /sports y /sports/[slug] (complementa gtag page_path). */
export function PublicSportPageView() {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const lastKey = useRef("");

  useEffect(() => {
    const sede = searchParams.get("sede")?.trim() || undefined;
    const key = `${pathname}?${searchParams.toString()}`;

    if (lastKey.current === key) return;
    lastKey.current = key;

    if (pathname === "/sports") {
      trackSportFunnel(SportFunnelEvents.hubView, { funnel_step: "directorio" });
      return;
    }

    const match = pathname.match(/^\/sports\/([^/]+)$/);
    if (match) {
      const tenant_slug = decodeURIComponent(match[1]!);
      trackSportFunnel(SportFunnelEvents.tenantView, {
        tenant_slug,
        sede_slug: sede,
        funnel_step: "complejo",
      });
    }
  }, [pathname, searchParams]);

  return null;
}
