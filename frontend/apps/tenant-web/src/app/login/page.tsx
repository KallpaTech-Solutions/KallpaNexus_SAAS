import { Suspense } from "react";
import { TenantLoginClient } from "./login-client";

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
      Cargando…
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <TenantLoginClient />
    </Suspense>
  );
}
