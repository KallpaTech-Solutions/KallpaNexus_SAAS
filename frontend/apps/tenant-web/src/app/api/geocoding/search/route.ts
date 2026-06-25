import { NextRequest, NextResponse } from "next/server";
import { fetchNominatim, readNominatimJson } from "@/lib/nominatim-server";

const NOMINATIM = "https://nominatim.openstreetmap.org";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q?.trim()) {
    return NextResponse.json({ error: "q required" }, { status: 400 });
  }

  const params = new URLSearchParams({
    format: "json",
    addressdetails: "1",
    q: q.trim(),
  });

  const limit = req.nextUrl.searchParams.get("limit");
  if (limit) params.set("limit", limit);

  const countrycodes = req.nextUrl.searchParams.get("countrycodes");
  if (countrycodes) params.set("countrycodes", countrycodes);

  try {
    const res = await fetchNominatim(`${NOMINATIM}/search?${params}`);
    const data = await readNominatimJson<unknown[]>(res);
    if (!data) {
      return NextResponse.json([], { status: res.ok ? 200 : res.status });
    }
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=120" },
    });
  } catch {
    return NextResponse.json([], { status: 502 });
  }
}
