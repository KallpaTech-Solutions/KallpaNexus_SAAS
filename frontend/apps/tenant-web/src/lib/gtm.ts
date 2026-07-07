export function readGtmId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_GTM_ID?.trim();
  return id || undefined;
}
