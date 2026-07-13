import { getSiteUrl } from "@/lib/seo";
import { INDIA_DISTRICTS } from "@/lib/location/data/india-locations";
import { getStateById } from "@/lib/location/service";
import { getAdminDb } from "@/lib/firebase-admin";

function xmlEscape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET() {
  const siteUrl = getSiteUrl();
  const districtIdsWithNews = new Set<string>();

  try {
    const snap = await getAdminDb()
      .collection("news")
      .where("status", "==", "published")
      .orderBy("publishedAt", "desc")
      .limit(300)
      .get();
    snap.docs.forEach((d) => {
      const did = d.data().districtId;
      if (did) districtIdsWithNews.add(String(did));
    });
  } catch {
    // ignore
  }

  const urls = INDIA_DISTRICTS.filter((d) => districtIdsWithNews.has(d.id)).map((d) => {
    const state = getStateById(d.stateId);
    return `${siteUrl}/state/${state?.slug || d.stateId}/district/${d.slug}`;
  });

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((loc) => `  <url><loc>${xmlEscape(loc)}</loc></url>`).join("\n")}
</urlset>`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
