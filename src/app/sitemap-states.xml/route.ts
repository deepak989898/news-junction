import { getSiteUrl } from "@/lib/seo";
import { getAllStates } from "@/lib/location/states";
import { getAdminDb } from "@/lib/firebase-admin";

function xmlEscape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET() {
  const siteUrl = getSiteUrl();
  const states = getAllStates();
  const stateIdsWithNews = new Set<string>();

  try {
    const snap = await getAdminDb()
      .collection("news")
      .where("status", "==", "published")
      .orderBy("publishedAt", "desc")
      .limit(300)
      .get();
    snap.docs.forEach((d) => {
      const sid = d.data().stateId;
      if (sid) stateIdsWithNews.add(String(sid));
    });
  } catch {
    // index may not exist yet
  }

  const urls = states
    .filter((s) => stateIdsWithNews.has(s.id))
    .map((s) => `${siteUrl}/state/${s.slug}`);

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((loc) => `  <url><loc>${xmlEscape(loc)}</loc></url>`).join("\n")}
</urlset>`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
