export function researchText(
  locale: string,
  en: string,
  tr: string,
  zh: string,
): string {
  return locale === "tr" ? tr : locale === "zh-Hans" ? zh : en;
}
export type ResearchLink = { label: string; path: string; destination: string };
export function researchLinks(locale: string, code?: string): ResearchLink[] {
  const q = code ? `?q=${encodeURIComponent(code)}` : "";
  return [
    {
      label: researchText(
        locale,
        "Calculate points",
        "Puan hesapla",
        "计算积分",
      ),
      path: "/tools/points-calculator/australia",
      destination: "points_calculator",
    },
    {
      label: researchText(
        locale,
        "Explore skills assessment",
        "Beceri değerlendirmesi",
        "探索技能评估",
      ),
      path: `/tools/skills-assessment${q}`,
      destination: "skills_assessment",
    },
    {
      label: researchText(
        locale,
        "Check ANZSCO details",
        "ANZSCO bilgileri",
        "查看 ANZSCO 详情",
      ),
      path: `/tools/anzsco-finder${q}`,
      destination: "anzsco_finder",
    },
    {
      label: researchText(
        locale,
        "Compare 189 / 190 / 491",
        "189 / 190 / 491 karşılaştır",
        "对比 189 / 190 / 491",
      ),
      path: "/tools/visa-comparison",
      destination: "visa_comparison",
    },
  ];
}
/** Official entry points, not inferred migration.<state>.gov.au hosts. */
export const STATE_RESEARCH_SOURCES = [
  {
    code: "ACT",
    name: "Australian Capital Territory",
    url: "https://www.act.gov.au/migration",
  },
  {
    code: "NSW",
    name: "New South Wales",
    url: "https://www.nsw.gov.au/visas-and-migration/skilled-visas",
  },
  {
    code: "NT",
    name: "Northern Territory",
    url: "https://theterritory.com.au/migrate",
  },
  { code: "QLD", name: "Queensland", url: "https://migration.qld.gov.au/" },
  {
    code: "SA",
    name: "South Australia",
    url: "https://www.migration.sa.gov.au/",
  },
  { code: "TAS", name: "Tasmania", url: "https://www.migration.tas.gov.au/" },
  {
    code: "VIC",
    name: "Victoria",
    url: "https://liveinmelbourne.vic.gov.au/migrate",
  },
  {
    code: "WA",
    name: "Western Australia",
    url: "https://migration.wa.gov.au/",
  },
];
