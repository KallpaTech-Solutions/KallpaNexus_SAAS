"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type Props = {
  measurementId: string;
};

/** Actualiza page_path (con query) en navegación App Router. */
export function TenantGoogleAnalyticsNavigation({ measurementId }: Props) {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const isFirst = useRef(true);

  useEffect(() => {
    if (typeof window.gtag !== "function") return;

    const qs = searchParams.toString();
    const page_path = qs ? `${pathname}?${qs}` : pathname;

    if (isFirst.current) {
      isFirst.current = false;
      window.gtag("config", measurementId, {
        page_path,
        page_title: document.title,
        page_location: window.location.href,
      });
      return;
    }

    window.gtag("config", measurementId, {
      page_path,
      page_title: document.title,
      page_location: window.location.href,
    });
  }, [pathname, searchParams, measurementId]);

  return null;
}
