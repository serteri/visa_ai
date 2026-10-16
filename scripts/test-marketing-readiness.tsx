import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import * as cheerio from "cheerio";
import { activeLocales } from "../lib/i18n/config";
import { pageAlternates, publicUrl } from "../lib/seo/urls";
import { buildSitemap } from "../app/sitemap";
import OccupationPage from "../app/[locale]/(main)/occupations/[id]/page";
import {
  buildOccupationSlug,
  findOccupationById,
} from "../lib/occupations/seo";
import { sanitizeParams } from "../lib/analytics/events";
import { getStateNominationSeoContent } from "../lib/seo/state-nomination-content";
import {
  supportedToolMappings,
  UNRESOLVED_TOOL_CODES,
} from "../lib/skills-assessment/tool-coverage";
import assessingData from "../src/data/assessing-bodies.json";
import Module from "node:module";
// Next supplies this marker; the plain Node runner only needs to ignore it.
const originalLoad = (
  Module as unknown as { _load: (...args: unknown[]) => unknown }
)._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load =
  function (request, ...args) {
    if (request === "server-only") return {};
    return originalLoad.call(this, request, ...args);
  };

const routes = [
  ["points-calculator", "/tools/points-calculator"],
  ["points-calculator/australia", "/tools/points-calculator/australia"],
  ["skills-assessment", "/tools/skills-assessment"],
  ["anzsco-finder", "/tools/anzsco-finder"],
  ["visa-comparison", "/tools/visa-comparison"],
  ["state-nomination", "/tools/state-nomination"],
  ["document-checklist-2026", "/tools/document-checklist-2026"],
];
const banned =
  /5[,.]000\+|MARA Compliance Checked|Home Affairs Compliant|states that will nominate you|best visa for you|you qualify for|your strongest visa/i;
async function main() {
  let checks = 0;
  const urls = new Set(buildSitemap().map((entry) => entry.url));
  for (const locale of activeLocales) {
    for (const [modulePath, route] of routes) {
      const page = await import(
        `../app/[locale]/(main)/tools/${modulePath}/page`
      );
      const metadata = await page.generateMetadata({
        params: Promise.resolve({ locale }),
      });
      assert.deepEqual(metadata.alternates, pageAlternates(locale, route));
      assert.equal(metadata.openGraph.url, publicUrl(locale, route));
      assert(
        !String(metadata.title).includes("LogiVisa"),
        "locale title template adds the brand exactly once",
      );
      assert(urls.has(publicUrl(locale, route)), `${route} must be in sitemap`);
      assert(!banned.test(JSON.stringify(metadata)));
      checks++;
    }
    for (const subclass of ["189", "190", "491", "482", "500"]) {
      const page = await import("../app/[locale]/(main)/visas/[subclass]/page");
      const metadata = await page.generateMetadata({
        params: Promise.resolve({ locale, subclass }),
      });
      assert.deepEqual(
        metadata.alternates,
        pageAlternates(locale, `/visas/${subclass}`),
      );
      assert(!String(metadata.title).includes("LogiVisa"));
      checks++;
    }
    for (const code of [
      "331212",
      "351311",
      "341111",
      "261313",
      "261312",
      "233211",
    ]) {
      const occupation = findOccupationById(code)!;
      const html = renderToStaticMarkup(
        await OccupationPage({
          params: Promise.resolve({
            locale,
            id: buildOccupationSlug(occupation),
          }),
        }),
      );
      const $ = cheerio.load(html);
      assert(
        !/<h3[^>]*>\s*<h2/.test(html),
        "section headings must not be nested inside CardTitle h3 elements",
      );
      assert.equal($("h1").length, 1);
      assert(!banned.test($("main").text()));
      for (const destination of [
        "points_calculator",
        "skills_assessment",
        "anzsco_finder",
        "visa_comparison",
      ])
        assert($(`a[data-tool-destination='${destination}']`).length > 0);
      assert(
        $(
          `a[href='${publicUrl(locale, "/tools/skills-assessment").replace("https://www.logivisa.com", "")}?q=${code}']`,
        ).length > 0,
        "occupation context carries to skills finder",
      );
      assert.equal(
        $("a[data-professional-help]").attr("href"),
        "https://portal.mara.gov.au/search-the-register-of-migration-agents/",
      );
      assert($("a[data-official-source]").length > 0);
      checks++;
    }
    assert(!banned.test(JSON.stringify(getStateNominationSeoContent(locale))));
  }
  assert(
    [...urls].every(
      (url) => !/\/en\/|\/admin(?:\/|$)|\/dashboard(?:\/|$)|\/api\//.test(url),
    ),
  );
  assert.deepEqual(
    sanitizeParams({
      occupation_code: "331212",
      destination: "skills_assessment",
      source_page_type: "occupation",
      source_page_id: "331212",
      locale: "en",
      email: "private@example.org",
      free_text: "visa history",
      report: "private",
      health: "private",
    }),
    {
      occupation_code: "331212",
      locale: "en",
      destination: "skills_assessment",
      source_page_type: "occupation",
      source_page_id: "331212",
    },
  );
  assert.deepEqual(
    sanitizeParams({
      occupation_code: "Smith",
      source_page_id: "passport123",
      source_page_type: "email",
      destination: "private-profile",
    }),
    {},
  );
  const stateSource = readFileSync(
    "app/[locale]/(main)/tools/state-nomination/StateNominationClient.tsx",
    "utf8",
  );
  assert(
    !/minimumPointsGeneral|competitionLevel|approvalRate|processingTimeWeeks|scoreA|scoreB/.test(
      stateSource,
    ),
    "stale scoring/ranking must not return",
  );
  assert(/lastVerified/.test(stateSource) && /2025–26/.test(stateSource));
  const supported = supportedToolMappings(assessingData.occupationMapping);
  for (const code of UNRESOLVED_TOOL_CODES)
    assert(
      !(code in supported),
      `unresolved ${code} must not be presented as a verified mapping`,
    );
  assert.equal(supported["351311"], "TRA");
  assert.equal(supported["351411"], "TRA");
  const home = readFileSync("components/home-content.tsx", "utf8");
  assert(!/Testimonials|InstitutionsMarquee|PremiumReportShowcase/.test(home));
  console.log(
    `PASS: ${checks} locale/route/occupation cases; sitemap, trust, state-reference and analytics safety assertions.`,
  );
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
