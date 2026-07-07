const GA_ID_PATTERN = /^G-[A-Z0-9]+$/;

export function readGaMeasurementId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  if (!id || !GA_ID_PATTERN.test(id)) return undefined;
  return id;
}
