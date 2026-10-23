/**
 * Tells Bing (and the other IndexNow engines: Yandex, Seznam, Naver) that
 * every URL in the live sitemap is new or changed, so they crawl it soon
 * instead of leaving it "discovered but not crawled".
 * The key is public by design: IndexNow checks it at keyLocation.
 *
 *   node scripts/indexnow.mjs            # whole sitemap
 *   node scripts/indexnow.mjs /blog/x    # just these paths
 */
const HOST = "www.finkoin.com";
const KEY = "4b9a7e459d2aaec57bcce80339df0d47";
const ORIGIN = `https://${HOST}`;

async function sitemapUrls() {
  const res = await fetch(`${ORIGIN}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap.xml: HTTP ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
}

const paths = process.argv.slice(2);
const urls = paths.length
  ? paths.map((p) => new URL(p, ORIGIN).href)
  : await sitemapUrls();
if (urls.length === 0) throw new Error("No URLs to submit");

// One request takes up to 10,000 URLs.
for (let i = 0; i < urls.length; i += 10000) {
  const urlList = urls.slice(i, i + 10000);
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: `${ORIGIN}/${KEY}.txt`,
      urlList,
    }),
  });
  // 200 and 202 both mean accepted.
  if (res.status !== 200 && res.status !== 202) {
    throw new Error(`IndexNow: HTTP ${res.status} ${await res.text()}`);
  }
  console.log(`IndexNow accepted ${urlList.length} URLs (HTTP ${res.status})`);
}
