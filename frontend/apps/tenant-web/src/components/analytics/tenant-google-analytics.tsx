"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type Props = {
  measurementId: string;
};

/** Actualiza page_path en navegación App Router (la carga inicial va en <head>). */
export function TenantGoogleAnalyticsNavigation({ measurementId }: Props) {
  const pathname = usePathname() ?? "/";
  const isFirst = useRef(true);

  useEffect(() => {
    if (typeof window.gtag !== "function") return;

    if (isFirst.current) {
      isFirst.current = false;
      return;
    }

    window.gtag("config", measurementId, {
      page_path: pathname,
      page_title: document.title,
    });
  }, [pathname, measurementId]);

  return null;
}
