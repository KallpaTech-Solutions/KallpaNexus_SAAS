import { googleTagManagerHeadScript, readGtmId } from "@/lib/gtm";

/** Noscript GTM (justo después de &lt;body&gt;) — solo si hay ID configurado. */
export function GoogleTagManagerNoScript() {
  const gtmId = readGtmId();
  if (!gtmId) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
        height="0"
        width="0"
        title="Google Tag Manager"
        style={{ display: "none", visibility: "hidden" }}
      />
    </noscript>
  );
}

/** Script GTM en &lt;head&gt; (build time / SSR). */
export function GoogleTagManagerHeadScript() {
  const gtmId = readGtmId();
  if (!gtmId) return null;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: googleTagManagerHeadScript(gtmId) }}
    />
  );
}
