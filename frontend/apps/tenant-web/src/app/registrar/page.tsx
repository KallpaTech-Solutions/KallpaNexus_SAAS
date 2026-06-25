import { OnboardingRegistroPage } from "@/components/marketing/onboarding-registro";
import { Suspense } from "react";

export const metadata = {
  title: "Registrar negocio",
  description: "Alta de negocio en Kallpa Nexus (Nexus Sport y próximos módulos).",
};

export default function RegistrarPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
          Cargando formulario…
        </div>
      }
    >
      <OnboardingRegistroPage />
    </Suspense>
  );
}
