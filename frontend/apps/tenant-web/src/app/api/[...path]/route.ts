import http from "node:http";
import https from "node:https";
import { URL } from "node:url";
import { NextRequest, NextResponse } from "next/server";

import { getKnxApiServerUrl } from "@kallpanexus/env";

const apiBase = getKnxApiServerUrl();

/** Reutilizar conexión TCP/TLS al API (evita ~100–300 ms por request en dev). */
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 32 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 32, rejectUnauthorized: false });

function upstreamRequest(
  targetUrl: string,
  method: string,
  headers: Record<string, string>,
  body?: Buffer
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const url = new URL(targetUrl);
    const transport = url.protocol === "https:" ? https : http;
    const req = transport.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method,
        headers,
        agent: url.protocol === "https:" ? httpsAgent : httpAgent,
        rejectUnauthorized: false,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 500,
            headers: res.headers,
            body: Buffer.concat(chunks),
          })
        );
      }
    );
    req.on("error", reject);
    if (body?.length) {
      req.write(body);
    }
    req.end();
  });
}

async function proxyRequest(req: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join("/");
  const target = `${apiBase}/api/${path}${req.nextUrl.search}`;

  const headers: Record<string, string> = {};
  const auth = req.headers.get("authorization");
  const tenantSub = req.headers.get("x-tenant-subdomain");
  const contentType = req.headers.get("content-type");
  if (auth) headers.authorization = auth;
  if (tenantSub) headers["x-tenant-subdomain"] = tenantSub;
  if (contentType) headers["content-type"] = contentType;

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const body = hasBody ? Buffer.from(await req.arrayBuffer()) : undefined;

  const upstream = await upstreamRequest(target, req.method, headers, body);

  const responseHeaders = new Headers();
  const upstreamContentType = upstream.headers["content-type"];
  if (typeof upstreamContentType === "string") {
    responseHeaders.set("content-type", upstreamContentType);
  }

  return new NextResponse(new Uint8Array(upstream.body), {
    status: upstream.status,
    headers: responseHeaders,
  });
}

type RouteCtx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxyRequest(req, path);
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxyRequest(req, path);
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxyRequest(req, path);
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxyRequest(req, path);
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxyRequest(req, path);
}
