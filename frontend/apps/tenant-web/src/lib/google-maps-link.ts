export type GoogleMapsLinkParse = {
  /** Coordenadas del pin del negocio (!3d / !4d), no de la cámara (@). */
  lat?: number;
  lng?: number;
  /** Nombre del lugar en /place/Nombre/… */
  placeQuery?: string;
};

function decodePlaceSegment(segment: string): string {
  try {
    return decodeURIComponent(segment.replace(/\+/g, " ")).trim();
  } catch {
    return segment.replace(/\+/g, " ").trim();
  }
}

/** Extrae datos estables del enlace (el URL cambia al compartir, pero place y !3d!4d suelen repetirse). */
export function parseGoogleMapsShareLink(input: string): GoogleMapsLinkParse {
  const s = input.trim();
  if (!s) return {};

  let placeQuery: string | undefined;
  const place = s.match(/\/place\/([^/?@]+)/);
  if (place?.[1]) {
    const name = decodePlaceSegment(place[1]);
    if (name.length > 0) placeQuery = name;
  }

  const pinMatches = [...s.matchAll(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/g)];
  if (pinMatches.length > 0) {
    const last = pinMatches[pinMatches.length - 1]!;
    return {
      lat: parseFloat(last[1]!),
      lng: parseFloat(last[2]!),
      placeQuery,
    };
  }

  const qCoord = s.match(/[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (qCoord) {
    return {
      lat: parseFloat(qCoord[1]!),
      lng: parseFloat(qCoord[2]!),
      placeQuery,
    };
  }

  const queryCoord = s.match(/[?&]query=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (queryCoord) {
    return {
      lat: parseFloat(queryCoord[1]!),
      lng: parseFloat(queryCoord[2]!),
      placeQuery,
    };
  }

  if (placeQuery) return { placeQuery };

  return {};
}

export function esEnlaceGoogleMapsValido(input: string): boolean {
  const s = input.trim();
  if (!s) return false;
  if (/^https?:\/\//i.test(s)) {
    return (
      s.includes("google.com/maps") ||
      s.includes("maps.app.goo.gl") ||
      s.includes("goo.gl/maps")
    );
  }
  return false;
}

export function esEnlaceGoogleMapsCorto(input: string): boolean {
  const s = input.trim();
  return s.includes("maps.app.goo.gl") || s.includes("goo.gl/maps");
}

/** Texto de búsqueda estable para el mapa embebido (mismo negocio aunque el enlace compartido cambie). */
export function googleMapsEmbedSearchQuery(opts: {
  enlaceGoogleMaps?: string | null;
  direccion: string;
  ciudad?: string | null;
}): string {
  const link = opts.enlaceGoogleMaps?.trim();
  if (link) {
    const parsed = parseGoogleMapsShareLink(link);
    if (parsed.placeQuery) {
      return [parsed.placeQuery, opts.ciudad, "Perú"].filter(Boolean).join(", ");
    }
  }
  return [opts.direccion, opts.ciudad, "Perú"].filter(Boolean).join(", ");
}

/** Coordenadas del pin: siempre del enlace actual (!3d!4d), no confiar en @ ni en BD desactualizada. */
export function googleMapsPinFromEnlace(enlaceGoogleMaps?: string | null): {
  lat: number | null;
  lng: number | null;
} {
  const link = enlaceGoogleMaps?.trim();
  if (!link) return { lat: null, lng: null };
  const parsed = parseGoogleMapsShareLink(link);
  if (parsed.lat != null && parsed.lng != null) {
    return { lat: parsed.lat, lng: parsed.lng };
  }
  return { lat: null, lng: null };
}

/** Abre Google Maps con navegación (intents). El enlace compartido es la fuente de verdad. */
export function googleMapsComoLlegarUrl(opts: {
  enlaceGoogleMaps?: string | null;
  direccion: string;
  ciudad?: string | null;
  latitud?: number | null;
  longitud?: number | null;
}): string {
  const link = opts.enlaceGoogleMaps?.trim();
  if (link && esEnlaceGoogleMapsValido(link)) {
    return link;
  }

  const fromLink = googleMapsPinFromEnlace(link);
  const lat = fromLink.lat ?? opts.latitud ?? null;
  const lng = fromLink.lng ?? opts.longitud ?? null;

  if (lat != null && lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }

  const q = googleMapsEmbedSearchQuery({
    enlaceGoogleMaps: link,
    direccion: opts.direccion,
    ciudad: opts.ciudad,
  });
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** URL del iframe embebido (prioriza pin !3d!4d; no buscar solo por dirección escrita). */
export function googleMapsEmbedUrl(opts: {
  enlaceGoogleMaps?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  direccion: string;
  ciudad?: string | null;
  /** Pin ya resuelto (p. ej. tras expandir maps.app.goo.gl). */
  resolvedLat?: number | null;
  resolvedLng?: number | null;
}): string {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY?.trim();
  const link = opts.enlaceGoogleMaps?.trim();
  const parsed = link ? parseGoogleMapsShareLink(link) : {};

  const pin = googleMapsPinFromEnlace(link);
  const lat = opts.resolvedLat ?? pin.lat ?? opts.latitud ?? parsed.lat ?? null;
  const lng = opts.resolvedLng ?? pin.lng ?? opts.longitud ?? parsed.lng ?? null;

  const searchQ = parsed.placeQuery
    ? [parsed.placeQuery, opts.ciudad, "Perú"].filter(Boolean).join(", ")
    : [opts.direccion, opts.ciudad, "Perú"].filter(Boolean).join(", ");

  if (key) {
    const params = new URLSearchParams({ key, language: "es" });
    if (lat != null && lng != null) {
      params.set("q", `${lat},${lng}`);
      params.set("zoom", "17");
    } else {
      params.set("q", searchQ);
    }
    return `https://www.google.com/maps/embed/v1/place?${params}`;
  }

  if (lat != null && lng != null) {
    return `https://maps.google.com/maps?q=${lat},${lng}&z=17&output=embed`;
  }
  return `https://maps.google.com/maps?q=${encodeURIComponent(searchQ)}&z=16&output=embed`;
}

/** Solo embed por coordenadas (evita errores de búsqueda por texto). */
export function googleMapsEmbedFromPin(lat: number, lng: number): string {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY?.trim();
  if (key) {
    const params = new URLSearchParams({
      key,
      language: "es",
      q: `${lat},${lng}`,
      zoom: "17",
    });
    return `https://www.google.com/maps/embed/v1/place?${params}`;
  }
  return `https://maps.google.com/maps?q=${lat},${lng}&z=17&output=embed`;
}

export function esUrlGoogleMapsPermitida(input: string): boolean {
  try {
    const u = new URL(input.trim());
    const h = u.hostname.toLowerCase();
    return (
      h === "maps.app.goo.gl" ||
      h === "goo.gl" ||
      h.endsWith("google.com") ||
      h.endsWith("google.com.pe")
    );
  } catch {
    return false;
  }
}

export const DEFAULT_MAP_CENTER: [number, number] = [-9.9295, -76.2428];
