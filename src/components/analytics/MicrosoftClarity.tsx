import Script from "next/script";

/**
 * Loads Microsoft Clarity (session recordings + heatmaps) for the public site.
 * The project ID comes from Admin → Settings → SEO. Renders nothing when unset.
 * Accepts either the raw project ID or a full pasted snippet (the ID is extracted).
 */
function extractClarityId(raw?: string): string {
  const val = (raw || "").trim();
  if (!val) return "";
  // If the admin pasted the whole Clarity snippet, pull the ID from clarity(..., "<id>")
  const match = val.match(/"clarity",\s*"script",\s*"([^"]+)"/);
  return (match ? match[1] : val).trim();
}

export default function MicrosoftClarity({ clarityId }: { clarityId?: string }) {
  const id = extractClarityId(clarityId);
  if (!id) return null;

  return (
    <Script id="microsoft-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${id}");`}
    </Script>
  );
}
