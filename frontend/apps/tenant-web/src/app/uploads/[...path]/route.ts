import http from "node:http";
import https from "node:https";
import { URL } from "node:url";
import { NextRequest, NextResponse } from "next/server";

import { getKnxApiServerUrl } from "@kallpanexus/env";

const apiBase = getKnxApiServerUrl();

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 16 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 16, rejectUnauthorized: false });

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params;
  const target = `${apiBase}/uploads/${path.join("/")}${req.nextUrl.search}`;

  return new Promise<NextResponse>((resolve, reject) => {
    const url = new URL(target);
    const transport = url.protocol === "https:" ? https : http;
    const upstreamReq = transport.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: "GET",
        agent: url.protocol === "https:" ? httpsAgent : httpAgent,
        rejectUnauthorized: false,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () => {
          const headers = new Headers();
          const ct = res.headers["content-type"];
          if (typeof ct === "string") headers.set("content-type", ct);
          const cache = res.headers["cache-control"];
          if (typeof cache === "string") headers.set("cache-control", cache);
          resolve(
            new NextResponse(Buffer.concat(chunks), {
              status: res.statusCode ?? 502,
              headers,
            })
          );
        });
      }
    );
    upstreamReq.on("error", reject);
    upstreamReq.end();
  });
}
