const GA_ID_PATTERN = /^G-[A-Z0-9]+$/;

/** ID de la propiedad GA4 de kallpanexus.page (público; visible en el HTML). */
const KALLPA_NEXUS_GA_MEASUREMENT_ID = "G-WR73P59YVH";

export function readGaMeasurementId(): string | undefined {
  const fromEnv = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  const id =
    fromEnv ||
    (process.env.NODE_ENV === "production"
      ? KALLPA_NEXUS_GA_MEASUREMENT_ID
      : "");

  if (!id || !GA_ID_PATTERN.test(id)) return undefined;
  return id;
}
