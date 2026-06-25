import {
  esUrlGoogleMapsPermitida,
  parseGoogleMapsShareLink,
} from "@/lib/google-maps-link";
import { NextRequest, NextResponse } from "next/server";

const UA =
  "Mozilla/5.0 (compatible; KallpaNexus-TenantWeb/1.0; +https://kallpanexus.local)";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url")?.trim();
  if (!raw || !esUrlGoogleMapsPermitida(raw)) {
    return NextResponse.json({ error: "url inválida" }, { status: 400 });
  }

  try {
    const res = await fetch(raw, {
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
    });

    const finalUrl = res.url || raw;
    const parsed = parseGoogleMapsShareLink(finalUrl);

    return NextResponse.json(
      {
        finalUrl,
        lat: parsed.lat ?? null,
        lng: parsed.lng ?? null,
        placeQuery: parsed.placeQuery ?? null,
      },
      { headers: { "Cache-Control": "private, max-age=86400" } }
    );
  } catch {
    return NextResponse.json({ error: "no se pudo resolver el enlace" }, { status: 502 });
  }
}
