"use client";

import { isTenantPublicMarketingPath } from "@/lib/public-routes";
import { GoogleAnalytics } from "@next/third-parties/google";
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

/** gtag.js solo en rutas públicas; actualiza page_path en navegación App Router. */
export function TenantGoogleAnalytics({ measurementId }: Props) {
  const pathname = usePathname() ?? "/";
  const isPublic = isTenantPublicMarketingPath(pathname);
  const hadPublicView = useRef(false);

  useEffect(() => {
    if (!isPublic || typeof window.gtag !== "function") return;

    if (!hadPublicView.current) {
      hadPublicView.current = true;
      return;
    }

    window.gtag("config", measurementId, {
      page_path: pathname,
      page_title: document.title,
    });
  }, [pathname, isPublic, measurementId]);

  if (!isPublic) return null;

  return <GoogleAnalytics gaId={measurementId} />;
}
