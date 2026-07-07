type Props = {
  measurementId: string;
};

/** Snippet gtag.js en <head> (HTML inicial) para verificación y medición GA4. */
export function GoogleAnalyticsHead({ measurementId }: Props) {
  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${measurementId}');
`,
        }}
      />
    </>
  );
}
