import fs from "node:fs";
import * as cheerio from "cheerio";
import assert from "node:assert/strict";
const origin = process.env.MARKETING_ORIGIN || "https://logivisa.com";
const paths = [
  "/",
  "/occupations/331212-carpenter",
  "/occupations/351311-chef",
  "/occupations/341111-electrician-general",
  "/occupations/261313-software-engineer",
  "/occupations/261312-developer-programmer",
  "/occupations/233211-civil-engineer",
  "/tools/points-calculator/australia",
  "/tools/anzsco-finder",
  "/tools/skills-assessment",
  "/tools/visa-comparison",
  "/tools/state-nomination",
  "/tools/document-checklist-2026",
  "/visas/189",
  "/visas/190",
  "/visas/491",
  "/visas/482",
  "/visas/500",
  "/sitemap.xml",
  "/robots.txt",
];
const phase = process.argv[2] || "before";
const dir = `scratch/marketing-sprint/${phase}`;
fs.mkdirSync(dir, { recursive: true });
const results = [];
for (let i = 0; i < paths.length; i += 5) {
  await Promise.all(
    paths.slice(i, i + 5).map(async (path) => {
      try {
        const response = await fetch(origin + path, {
          signal: AbortSignal.timeout(60000),
        });
        const html = await response.text();
        const $ = cheerio.load(html);
        const record = {
          path,
          status: response.status,
          finalUrl: response.url,
          title: $("title").text(),
          h1: $("h1").text(),
          canonical: $("link[rel=canonical]").attr("href"),
          robots: $("meta[name=robots]").attr("content"),
          hreflang: $("link[hreflang]")
            .map((_, el) => ({
              lang: $(el).attr("hreflang"),
              href: $(el).attr("href"),
            }))
            .get(),
          ga: html.includes("googletagmanager.com"),
          headings: $("h2")
            .map((_, el) => $(el).text())
            .get(),
          researchLinks: $("main a,section a")
            .map((_, el) => ({
              text: $(el).text().trim().slice(0, 90),
              href: $(el).attr("href"),
            }))
            .get()
            .filter((x) =>
              /tools|occupations|mara|professional/.test(x.href || ""),
            ),
        };
        if (path === "/sitemap.xml")
          record.urls = [...html.matchAll(/<loc>([^<]+)/g)].map((x) => x[1]);
        if (path === "/robots.txt") record.text = html;
        fs.writeFileSync(
          `${dir}/${path.replaceAll("/", "_") || "home"}.html`,
          html,
        );
        results.push(record);
      } catch (error) {
        results.push({ path, error: error.message });
      }
    }),
  );
}
results.sort((a, b) => paths.indexOf(a.path) - paths.indexOf(b.path));
if (phase === "after") {
  for (const result of results) {
    assert.equal(result.status, 200, `${result.path} must answer 200`);
    if (result.path.endsWith(".xml") || result.path.endsWith(".txt")) continue;
    assert.equal(
      result.canonical?.replace(/\/$/, ""),
      result.finalUrl.replace(/\/$/, ""),
      `${result.path}: self canonical must be the final URL`,
    );
    assert.equal(
      result.hreflang.length,
      4,
      `${result.path}: complete hreflang`,
    );
    assert.equal(
      (result.title.match(/LogiVisa/g) || []).length,
      1,
      `${result.path}: brand once`,
    );
  }
  assert.match(results[0].h1, /Australian visa and occupation research/);
  assert.match(
    results.find((r) => r.path === "/tools/state-nomination").h1,
    /State nomination references/,
  );
  const sitemap = results.find((r) => r.path === "/sitemap.xml").urls;
  for (const p of [
    "/tools/points-calculator/australia",
    "/tools/skills-assessment",
    "/tools/visa-comparison",
    "/tools/state-nomination",
    "/tools/document-checklist-2026",
  ])
    assert(
      sitemap.includes(`https://www.logivisa.com${p}`),
      `sitemap must include ${p}`,
    );
  assert.equal(sitemap.length, new Set(sitemap).size);
  assert(sitemap.every((url) => !url.includes("/en/")));
}
fs.writeFileSync(`${dir}/results.json`, JSON.stringify(results, null, 2));
console.log(
  JSON.stringify(
    results.map(({ researchLinks, hreflang, urls, ...r }) => ({
      ...r,
      hreflang: hreflang?.length,
      ...(urls ? { urlCount: urls.length } : {}),
    })),
    null,
    2,
  ),
);
