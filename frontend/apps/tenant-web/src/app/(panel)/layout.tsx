"use client";

import { TenantShell } from "@/components/tenant-shell";
import { useAuthStore } from "@/lib/auth-store";
import { useEffect, type ReactNode } from "react";

export default function PanelLayout({ children }: { children: ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return <TenantShell>{children}</TenantShell>;
}
