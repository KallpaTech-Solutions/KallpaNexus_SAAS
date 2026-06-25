import { NextRequest, NextResponse } from "next/server";
import { fetchNominatim, readNominatimJson } from "@/lib/nominatim-server";

const NOMINATIM = "https://nominatim.openstreetmap.org";

type NominatimHit = {
  lat: string;
  lon: string;
  display_name?: string;
  error?: string;
};

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lon = req.nextUrl.searchParams.get("lon");
  if (!lat || !lon) {
    return NextResponse.json({ error: "lat and lon required" }, { status: 400 });
  }

  const zooms = ["18", "17", "16", "14"];

  try {
    for (const zoom of zooms) {
      const params = new URLSearchParams({
        format: "json",
        addressdetails: "1",
        zoom,
        lat,
        lon,
      });
      const res = await fetchNominatim(`${NOMINATIM}/reverse?${params}`);
      const hit = await readNominatimJson<NominatimHit>(res);
      if (hit?.display_name && !hit.error) {
        return NextResponse.json(hit, {
          headers: { "Cache-Control": "private, max-age=120" },
        });
      }
    }

    const searchParams = new URLSearchParams({
      format: "json",
      addressdetails: "1",
      q: `${lat}, ${lon}`,
      limit: "3",
      countrycodes: "pe",
    });
    const searchRes = await fetchNominatim(`${NOMINATIM}/search?${searchParams}`);
    const list = await readNominatimJson<NominatimHit[]>(searchRes);
    const best = list?.find((h) => h.display_name);
    if (best) {
      return NextResponse.json(best, {
        headers: { "Cache-Control": "private, max-age=120" },
      });
    }

    return NextResponse.json(null, { status: 404 });
  } catch {
    return NextResponse.json(null, { status: 502 });
  }
}
