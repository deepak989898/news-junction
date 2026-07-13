/**
 * Safe offline test — parses Google Trends RSS only (no article generation).
 * Run: npx tsx scripts/test-google-trends-rss.ts
 */
import { fetchGoogleTrendsRss, inferGoogleCategory, normalizeTrendTitle } from "../src/lib/google-trends/rss-fetcher";

async function main() {
  console.log("Google Trends RSS Test (India)\n" + "=".repeat(50));
  console.log("Source: official RSS export — NOT HTML scraping\n");

  const items = await fetchGoogleTrendsRss("IN", 8);
  console.log(`Fetched ${items.length} trends\n`);

  for (const item of items) {
    console.log(`Title: ${item.title}`);
    console.log(`  Normalized: ${normalizeTrendTitle(item.title)}`);
    console.log(`  Category: ${item.category} (inferred: ${inferGoogleCategory(item.title, "")})`);
    console.log(`  Volume: ${item.searchVolume}`);
    console.log(`  Related news headlines: ${item.relatedNews.length}`);
    item.relatedNews.slice(0, 2).forEach((n) => console.log(`    - ${n.title}`));
    console.log("");
  }

  console.log("NOTE: Related headlines are hints only — NOT used as article sources.");
  console.log("Articles require verified trusted RSS sources from admin Sources.");
}

main().catch((e) => {
  console.error("Test failed:", e.message);
  process.exit(1);
});
