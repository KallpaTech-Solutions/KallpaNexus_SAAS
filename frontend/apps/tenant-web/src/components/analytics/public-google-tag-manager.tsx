"use client";

import { isTenantPublicMarketingPath } from "@/lib/public-routes";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID?.trim();

/** Envía page_view al dataLayer en rutas públicas (navegación App Router). */
export function PublicGoogleTagManagerPageViews() {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    if (!GTM_ID) return;
    if (!isTenantPublicMarketingPath(pathname)) return;

    const w = window as Window & { dataLayer?: Record<string, unknown>[] };
    w.dataLayer = w.dataLayer ?? [];
    w.dataLayer.push({
      event: "page_view",
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname]);

  return null;
}
