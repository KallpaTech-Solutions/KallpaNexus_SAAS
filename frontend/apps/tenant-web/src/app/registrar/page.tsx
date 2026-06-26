import dynamic from "next/dynamic";
import { Suspense } from "react";

const OnboardingRegistroPage = dynamic(
  () =>
    import("@/components/marketing/onboarding-registro").then((m) => ({
      default: m.OnboardingRegistroPage,
    })),
  {
    loading: () => (
      <div className="kallpa-public-landing flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-white text-sm text-slate-500">
        Cargando formulario…
      </div>
    ),
  }
);

export const metadata = {
  title: "Registrar negocio",
  description: "Alta de negocio en Kallpa Nexus (Nexus Sport y próximos módulos).",
};

export default function RegistrarPage() {
  return (
    <Suspense
      fallback={
        <div className="kallpa-public-landing flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-white text-sm text-slate-500">
          Cargando formulario…
        </div>
      }
    >
      <OnboardingRegistroPage />
    </Suspense>
  );
}
