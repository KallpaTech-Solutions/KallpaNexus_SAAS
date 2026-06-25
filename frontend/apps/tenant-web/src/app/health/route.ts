export const dynamic = "force-dynamic";

/** Ping público para keep-alive (Render Free, cron externo). Sin auth. */
export function GET() {
  return new Response("OK", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
