"use client";

import { trackPublicGaEvent } from "@/lib/analytics/track-public-ga-event";
import { isTenantPublicMarketingPath } from "@/lib/public-routes";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

function linkText(el: HTMLAnchorElement | HTMLButtonElement): string {
  const labeled = el.getAttribute("aria-label")?.trim();
  if (labeled) return labeled.slice(0, 100);
  const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  return text.slice(0, 100);
}

function resolveHref(anchor: HTMLAnchorElement): string {
  const href = anchor.getAttribute("href")?.trim();
  if (!href || href.startsWith("#")) return href ?? "";
  try {
    return new URL(href, window.location.origin).href;
  } catch {
    return href;
  }
}

function isOutbound(url: string): boolean {
  if (!url || url.startsWith("#")) return false;
  try {
    const u = new URL(url, window.location.origin);
    return u.origin !== window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Captura clics en <a> y <button> del sitio público.
 * Atributos opcionales: data-ga-event, data-ga-section, data-ga-label.
 */
export function PublicAnalyticsClicks() {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    if (!isTenantPublicMarketingPath(pathname)) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a");
      if (anchor) {
        const href = resolveHref(anchor);
        const customEvent = anchor.getAttribute("data-ga-event")?.trim();
        const section =
          anchor.getAttribute("data-ga-section")?.trim() ||
          anchor.closest("[data-ga-section]")?.getAttribute("data-ga-section")?.trim();
        const label =
          anchor.getAttribute("data-ga-label")?.trim() || linkText(anchor);

        trackPublicGaEvent(customEvent || "public_link_click", {
          link_url: href,
          link_text: label,
          link_outbound: isOutbound(href),
          section,
          element_id: anchor.id || undefined,
        });
        return;
      }

      const button = target.closest("button");
      if (!button || button.disabled) return;

      const customEvent = button.getAttribute("data-ga-event")?.trim();
      const section =
        button.getAttribute("data-ga-section")?.trim() ||
        button.closest("[data-ga-section]")?.getAttribute("data-ga-section")?.trim();
      const label =
        button.getAttribute("data-ga-label")?.trim() || linkText(button);

      trackPublicGaEvent(customEvent || "public_button_click", {
        button_text: label,
        section,
        element_id: button.id || undefined,
        button_type: button.getAttribute("type") || "button",
      });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);

  return null;
}
