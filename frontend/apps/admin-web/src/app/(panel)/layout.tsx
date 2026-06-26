"use client";

import { PlatformShell } from "@/components/platform-shell";
import { PlatformToastProvider } from "@/components/platform-toast";
import { usePlatformAuthStore } from "@/lib/platform-auth-store";
import { useEffect, type ReactNode } from "react";

export default function PanelLayout({ children }: { children: ReactNode }) {
  const hydrate = usePlatformAuthStore((s) => s.hydrateFromStorage);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <PlatformToastProvider>
      <PlatformShell>{children}</PlatformShell>
    </PlatformToastProvider>
  );
}
