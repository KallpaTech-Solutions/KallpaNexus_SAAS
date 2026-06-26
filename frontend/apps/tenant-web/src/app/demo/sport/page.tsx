import { DemoSportExperience } from "@/components/marketing/demo/demo-sport-experience";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demostración Nexus Sport | Kallpa Nexus",
  description:
    "Explora un prototipo interactivo del panel Sport: reservas, filtros y reportes con datos de ejemplo.",
};

export default function DemoSportPage() {
  return <DemoSportExperience />;
}
