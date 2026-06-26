import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reservar canchas",
  description:
    "Directorio de complejos deportivos con reserva online en Kallpa Nexus. Busca por ciudad, deporte o nombre.",
};

export default function PublicHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="sports-hub-page min-h-screen text-slate-900">
      {children}
    </div>
  );
}
