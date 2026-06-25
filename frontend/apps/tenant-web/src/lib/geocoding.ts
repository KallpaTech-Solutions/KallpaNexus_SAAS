const HEADERS: HeadersInit = {
  Accept: "application/json",
};

export type GeoResult = {
  lat: number;
  lng: number;
  displayName: string;
  ciudad?: string;
};

export type GeoSugerencia = GeoResult & {
  id: string;
  detalle?: string;
};

type NominatimHit = {
  lat: string;
  lon: string;
  display_name: string;
  address?: Record<string, string>;
  place_id?: number;
  type?: string;
  class?: string;
  importance?: number;
};

function parseCiudadFromAddress(address: Record<string, string> | undefined): string | undefined {
  if (!address) return undefined;
  return (
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    address.state_district ??
    address.suburb ??
    address.county
  );
}

export function formatDireccionCorta(
  address: Record<string, string> | undefined,
  displayName: string
): string {
  if (!address) return displayName.split(",").slice(0, 3).join(", ").trim();

  const via =
    address.road ??
    address.residential ??
    address.living_street ??
    address.pedestrian ??
    address.footway ??
    address.unclassified ??
    address.path ??
    address.cycleway ??
    address.hamlet;

  const numero = address.house_number;
  const zona =
    address.suburb ??
    address.neighbourhood ??
    address.quarter ??
    address.city_district ??
    address.district;

  const partes = [via, numero, zona].filter(Boolean);
  if (partes.length > 0) {
    return partes.join(" ");
  }

  const lugar =
    address.house_name ??
    address.building ??
    address.amenity ??
    address.shop ??
    address.leisure;

  const partesConLugar = [lugar, via, numero, zona].filter(Boolean);
  if (partesConLugar.length > 0) {
    return partesConLugar.join(", ");
  }

  return displayName.split(",").slice(0, 2).join(", ").trim();
}

/** Línea de dirección más completa (mz, lote, urbanización) a partir de Nominatim. */
export function formatDireccionDesdeDisplayName(displayName: string, maxPartes = 4): string {
  return displayName
    .split(",")
    .slice(0, maxPartes)
    .map((p) => p.trim())
    .filter(Boolean)
    .join(", ");
}

function mapHitToSugerencia(hit: NominatimHit, _queryNorm: string): GeoSugerencia {
  const larga = formatDireccionDesdeDisplayName(hit.display_name, 5);
  const corta = formatDireccionCorta(hit.address, hit.display_name);
  const titulo = larga.length >= corta.length ? larga : corta;
  const detalle =
    hit.display_name.length > titulo.length ? hit.display_name : undefined;

  return {
    id: String(hit.place_id ?? `${hit.lat},${hit.lon}`),
    lat: parseFloat(hit.lat),
    lng: parseFloat(hit.lon),
    displayName: titulo,
    ciudad: parseCiudadFromAddress(hit.address),
    detalle,
  };
}

function scoreHit(hit: NominatimHit, queryNorm: string): number {
  const name = hit.display_name.toLowerCase();
  let score = hit.importance ?? 0;

  if (queryNorm.length >= 3 && name.includes(queryNorm)) score += 3;

  const tokens = queryNorm.split(/\s+/).filter((t) => t.length > 2);
  for (const t of tokens) {
    if (name.includes(t)) score += 0.8;
  }

  if (hit.class === "highway") {
    if (hit.type === "motorway" || hit.type === "trunk") score -= 2;
    if (
      hit.type === "residential" ||
      hit.type === "living_street" ||
      hit.type === "unclassified" ||
      hit.type === "tertiary" ||
      hit.type === "secondary"
    ) {
      score += 1.2;
    }
  }

  if (hit.class === "building" || hit.class === "amenity" || hit.class === "shop") {
    score += 1.5;
  }

  return score;
}

async function nominatimSearch(params: Record<string, string>): Promise<NominatimHit[]> {
  const qs = new URLSearchParams(params);
  try {
    const res = await fetch(`/api/geocoding/search?${qs}`, { headers: HEADERS });
    if (!res.ok) return [];
    return (await res.json()) as NominatimHit[];
  } catch {
    return [];
  }
}

function buildQueries(direccion: string, ciudad?: string): string[] {
  const d = direccion.trim();
  const c = ciudad?.trim();
  const out: string[] = [];
  if (c) out.push(`${d}, ${c}, Perú`);
  out.push(`${d}, Perú`);
  if (c) out.push(`${d}, ${c}`);
  out.push(d);
  return [...new Set(out)];
}

export async function buscarSugerenciasDireccion(
  direccion: string,
  ciudad?: string,
  limit = 8
): Promise<GeoSugerencia[]> {
  const queryNorm = direccion.trim().toLowerCase();
  if (queryNorm.length < 3) return [];

  const seen = new Set<string>();
  const ranked: { sug: GeoSugerencia; score: number; placeId: number }[] = [];

  for (const q of buildQueries(direccion, ciudad)) {
    const data = await nominatimSearch({
      q,
      limit: String(limit),
      countrycodes: "pe",
    });

    for (const hit of data) {
      const key = `${hit.lat},${hit.lon}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const sug = mapHitToSugerencia(hit, queryNorm);
      ranked.push({
        sug,
        score: scoreHit(hit, queryNorm),
        placeId: hit.place_id ?? 0,
      });
    }

    if (ranked.length >= limit) break;
  }

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.placeId - a.placeId;
  });
  return ranked.slice(0, limit).map((r) => r.sug);
}

export async function geocodificarCiudad(ciudad: string): Promise<GeoResult | null> {
  const c = ciudad.trim();
  if (c.length < 2) return null;

  const queries = [`${c}, Perú`, c];
  for (const q of queries) {
    const data = await nominatimSearch({ q, limit: "5", countrycodes: "pe" });
    if (!data.length) continue;

    const preferidos = data.filter((h) =>
      ["city", "town", "municipality", "administrative", "village", "suburb"].includes(
        h.type ?? ""
      )
    );
    const hit = preferidos[0] ?? data[0];
    if (!hit) continue;

    return {
      lat: parseFloat(hit.lat),
      lng: parseFloat(hit.lon),
      displayName: formatDireccionCorta(hit.address, hit.display_name),
      ciudad: parseCiudadFromAddress(hit.address) ?? c,
    };
  }

  return null;
}

export async function geocodificarDireccion(
  direccion: string,
  ciudad?: string
): Promise<GeoResult | null> {
  const list = await buscarSugerenciasDireccion(direccion, ciudad, 1);
  return list[0] ?? null;
}

export async function geocodificarInverso(lat: number, lng: number): Promise<GeoResult | null> {
  try {
    const qs = new URLSearchParams({ lat: String(lat), lon: String(lng) });
    const res = await fetch(`/api/geocoding/reverse?${qs}`, { headers: HEADERS });
    if (res.status === 404 || res.status === 502) return null;
    if (!res.ok) return null;
    const hit = (await res.json()) as NominatimHit | null;
    if (!hit?.display_name) return null;

    const corta = formatDireccionCorta(hit.address, hit.display_name);
    const larga = formatDireccionDesdeDisplayName(hit.display_name, 5);
    const displayName =
      larga.length > corta.length ? larga : corta.length > 0 ? corta : larga;

    return {
      lat: parseFloat(hit.lat),
      lng: parseFloat(hit.lon),
      displayName,
      ciudad: parseCiudadFromAddress(hit.address),
    };
  } catch {
    return null;
  }
}

export function mapsEmbedUrl(opts: {
  lat?: number | null;
  lng?: number | null;
  direccion: string;
  ciudad?: string | null;
}): string {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY?.trim();

  if (key) {
    const params = new URLSearchParams({
      key,
      language: "es",
    });
    if (opts.lat != null && opts.lng != null) {
      params.set("q", `${opts.lat},${opts.lng}`);
      params.set("zoom", "16");
    } else {
      const q = [opts.direccion, opts.ciudad, "Perú"].filter(Boolean).join(", ");
      params.set("q", q);
    }
    return `https://www.google.com/maps/embed/v1/place?${params}`;
  }

  if (opts.lat != null && opts.lng != null) {
    return `https://maps.google.com/maps?q=${opts.lat},${opts.lng}&z=16&output=embed`;
  }
  const q = [opts.direccion, opts.ciudad, "Perú"].filter(Boolean).join(", ");
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=15&output=embed`;
}

export const DEFAULT_MAP_CENTER: [number, number] = [-12.0464, -77.0428];
