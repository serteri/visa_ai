import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const origin = process.env.MARKETING_ORIGIN || "http://localhost:3100";
const output =
  process.env.MARKETING_BROWSER_OUTPUT || "scratch/marketing-sprint/browser";
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
await context.route(/google-analytics\.com|googletagmanager\.com/, (route) =>
  route.abort(),
);
await context.addInitScript(() => {
  window.dataLayer = [];
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const routes = [
  "/",
  "/occupations/331212-carpenter",
  "/occupations/351311-chef",
  "/occupations/261313-software-engineer",
  "/tools/skills-assessment?q=351311",
  "/tools/state-nomination",
  "/visas/500",
];
const records = [];
for (const width of [1440, 820, 390]) {
  await page.setViewportSize({ width, height: 1000 });
  for (const path of routes) {
    const response = await page.goto(origin + path, {
      waitUntil: "networkidle",
      timeout: 90000,
    });
    assert.equal(response.status(), 200, path);
    const dimensions = await page.evaluate(() => ({
      viewport: innerWidth,
      body: document.documentElement.scrollWidth,
    }));
    assert(
      dimensions.body <= width + 1,
      `${path} overflows at ${width}: ${dimensions.body}`,
    );
    assert.equal(
      await page.locator("h1").count(),
      1,
      `${path} must have exactly one h1`,
    );
    const label =
      path.replaceAll("/", "_").replaceAll("?", "_").replaceAll("=", "_") ||
      "home";
    await page.screenshot({
      path: `${output}/${width}${label}.png`,
      fullPage: true,
    });
    records.push({ path, width, status: response.status(), overflow: false });
  }
}
await page.goto(origin + "/", { waitUntil: "networkidle" });
await page.getByLabel("Occupation name or ANZSCO code").fill("331212");
await page
  .getByRole("button", { name: "Search occupations", exact: true })
  .click();
await page.waitForURL("**/tools/anzsco-finder?q=331212");
assert.match(await page.locator("main").last().innerText(), /Carpenter/);
await page.goto(origin + "/tools/skills-assessment?q=351311", {
  waitUntil: "networkidle",
});
assert.match(
  await page.locator("main").last().innerText(),
  /Trades Recognition Australia/,
);
assert.match(
  await page.locator("main").last().innerText(),
  /OSAP|Offshore Skills Assessment/,
);
await page.goto(origin + "/tools/skills-assessment?q=241213", {
  waitUntil: "networkidle",
});
assert.match(await page.locator("main").last().innerText(), /coverage gap/);
assert.equal(
  await page
    .locator("main")
    .last()
    .getByText("Tertiary Education Quality and Standards Agency", {
      exact: true,
    })
    .count(),
  0,
);
await page.goto(origin + "/tools/state-nomination", {
  waitUntil: "networkidle",
});
await page.getByLabel("ANZSCO code (optional)").fill("331212");
assert.match(
  await page.locator("main").last().innerText(),
  /Historical reference data/,
);
assert.equal(await page.locator("input[type=number]").count(), 0);
await page.goto(origin + "/occupations/261313-software-engineer", {
  waitUntil: "networkidle",
});
await page.waitForTimeout(700);
await page.evaluate(() =>
  document
    .querySelector('a[data-tool-destination="visa_comparison"]')
    .addEventListener("click", (event) => event.preventDefault(), {
      once: true,
    }),
);
await page
  .locator('a[data-tool-destination="visa_comparison"]')
  .first()
  .click();
const toolEvents = await page.evaluate(() =>
  window.dataLayer.filter(
    (value) => value[0] === "event" && value[1] === "occupation_tool_click",
  ),
);
assert.equal(toolEvents.length, 1, "exactly one event per tool click");
assert.deepEqual(toolEvents[0][2], {
  occupation_code: "261313",
  locale: "en",
  destination: "visa_comparison",
});
await page.evaluate(() => {
  const link = document.querySelector("a[data-professional-help]");
  link.addEventListener("click", (event) => event.preventDefault(), {
    once: true,
  });
  link.removeAttribute("target");
});
await page.locator("a[data-professional-help]").click();
const helpEvents = await page.evaluate(() =>
  window.dataLayer.filter(
    (value) => value[0] === "event" && value[1] === "professional_help_click",
  ),
);
assert.equal(helpEvents.length, 1);
assert.deepEqual(helpEvents[0][2], {
  locale: "en",
  source_page_type: "occupation",
  source_page_id: "261313",
});
for (const path of [
  "/tr",
  "/zh-Hans",
  "/tr/occupations/233211-civil-engineer",
  "/zh-Hans/tools/skills-assessment?q=351311",
]) {
  const response = await page.goto(origin + path, {
    waitUntil: "networkidle",
    timeout: 90000,
  });
  assert.equal(response.status(), 200);
  assert.equal(await page.locator("h1").count(), 1);
  assert(
    (await page.evaluate(() => document.documentElement.scrollWidth)) <=
      390 + 1,
  );
  records.push({ path, width: 390, status: 200, overflow: false });
}
// Long occupation name (a listed route, not a fabricated slug).
const sitemap = await (await fetch(origin + "/sitemap.xml")).text();
const candidates = [
  ...sitemap.matchAll(/<loc>([^<]*\/occupations\/[^<]+)<\/loc>/g),
]
  .map((m) => new URL(m[1]).pathname)
  .filter((p) => !/^\/(tr|zh-Hans)\//.test(p));
const longest = candidates.sort((a, b) => b.length - a.length)[0];
await page.goto(origin + longest, { waitUntil: "networkidle", timeout: 90000 });
assert(
  (await page.evaluate(() => document.documentElement.scrollWidth)) <= 391,
);
await page.screenshot({
  path: `${output}/390-long-occupation.png`,
  fullPage: true,
});
records.push({ path: longest, width: 390, status: 200, overflow: false });
assert.deepEqual(errors, [], "no uncaught browser errors");
const result = {
  origin,
  records,
  heroSearch: true,
  chefTra: true,
  unresolvedMappingIsCoverageGap: true,
  statePredictionsRemoved: true,
  toolEvents,
  helpEvents,
  browserErrors: errors,
};
fs.writeFileSync(`${output}/results.json`, JSON.stringify(result, null, 2));
console.log(
  JSON.stringify({
    responsiveChecks: records.length,
    heroSearch: true,
    chefTra: true,
    toolEvents: toolEvents.length,
    helpEvents: helpEvents.length,
    browserErrors: errors,
  }),
);
await browser.close();
