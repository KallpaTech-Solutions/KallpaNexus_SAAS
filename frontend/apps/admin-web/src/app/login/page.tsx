import { Loader2 } from "lucide-react";
import { Suspense } from "react";
import { PlatformLoginClient } from "./login-client";

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
    </div>
  );
}

export default function PlatformLoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <PlatformLoginClient />
    </Suspense>
  );
}
