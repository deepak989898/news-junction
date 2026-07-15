import Script from "next/script";

/**
 * Loads Google Analytics 4 (gtag.js) for the whole public site.
 * The measurement ID (G-XXXXXXXXXX) comes from Admin → Settings → SEO.
 * Renders nothing when no valid ID is configured.
 */
export default function GoogleAnalytics({ gaId }: { gaId?: string }) {
  const id = (gaId || "").trim();
  if (!id.startsWith("G-")) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');`}
      </Script>
    </>
  );
}
