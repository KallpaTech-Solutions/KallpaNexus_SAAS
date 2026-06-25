const USER_AGENT = "KallpaNexus-TenantWeb/1.0 (sucursales; geocoding proxy)";

/** Nominatim exige ~1 req/s; serializamos en el servidor Node. */
let lastNominatimAt = 0;

async function waitNominatimSlot() {
  const minGapMs = 1100;
  const wait = Math.max(0, minGapMs - (Date.now() - lastNominatimAt));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastNominatimAt = Date.now();
}

export async function fetchNominatim(url: string): Promise<Response> {
  await waitNominatimSlot();
  return fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "es",
      "User-Agent": USER_AGENT,
    },
    next: { revalidate: 0 },
  });
}

export async function readNominatimJson<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!res.ok) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export { USER_AGENT };
