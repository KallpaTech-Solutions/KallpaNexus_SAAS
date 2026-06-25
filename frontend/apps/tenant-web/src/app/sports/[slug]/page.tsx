import { Loader2 } from "lucide-react";
import { Suspense } from "react";
import { TenantLandingClient } from "./tenant-landing-client";

type Props = { params: Promise<{ slug: string }> };

function TenantLandingFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
    </div>
  );
}

export default function TenantLandingPage(props: Props) {
  return (
    <Suspense fallback={<TenantLandingFallback />}>
      <TenantLandingClient {...props} />
    </Suspense>
  );
}
