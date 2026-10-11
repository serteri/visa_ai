/**
 * Passport country by destination, the New Zealand note, and "not entered is never 0" (en / tr / zh-Hans).
 *
 *   1. passport list: ?country=au drops Australia, ?country=ca drops Canada, no country keeps both; current country keeps both;
 *   2. destination switch: choosing a destination clears an already chosen passport equal to it, with a localised note;
 *   3. server: AU->AU and CA->CA are refused with the localised message, no report, no write, no email, no checkout;
 *   4. New Zealand passport: allowed on the Australian form with the fixed note, on the form and in the report's "Your details" (not for Canada);
 *   5. a field that was not entered is never shown as 0 (sponsor years, employment in / outside Australia, salary, age) on the At a glance page, the
 *      visa tables and the points table; an explicit 0 still shows as 0.
 *
 *   npx tsx scripts/test-passport-destination.ts
 */
import "./lib/stub-request-context";

import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects
process.env.RESEND_API_KEY = "re_test_stub_not_a_real_key";
process.env.STRIPE_SECRET_KEY = "sk_test_stub_not_a_real_key";

const writes: string[] = [];
(globalThis as { prisma?: unknown }).prisma = {
  $queryRawUnsafe: async (sql: string) => { writes.push(`q:${sql.slice(0, 40)}`); return []; },
  $executeRawUnsafe: async (sql: string) => { writes.push(`w:${sql.slice(0, 40)}`); return 1; },
  $disconnect: async () => undefined,
  stateAllocation: { findUnique: async () => null, findFirst: async () => null },
  occupation: { findUnique: async () => null, findFirst: async () => null },
  roundCutoff: { findUnique: async () => null, findFirst: async () => null },
  stateIntelligence: { findMany: async () => [] },
  stateNominationConfig: { findMany: async () => [] },
};
let fetches = 0;
globalThis.fetch = (async () => { fetches++; throw new Error("network access is forbidden"); }) as typeof fetch;

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    failures++;
    console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`);
  }
};
const LOCALES = ["en", "tr", "zh-Hans"] as const;

async function main() {
  const pp = await import("../lib/intake/passport");
  const { INTAKE_COUNTRIES } = await import("../lib/intake/fields");
  const codes = (d: string) => pp.passportCountryOptions(d).map((c) => c.code);

  console.log("1. the passport list");
  check(!codes("AU").includes("AU") && codes("AU").includes("CA") && codes("AU").includes("NZ"), "destination AU: Australia is not in the passport list (Canada, New Zealand and the rest are)");
  check(!codes("CA").includes("CA") && codes("CA").includes("AU"), "destination CA: Canada is not in the passport list (Australia is)");
  check(codes("").includes("AU") && codes("").includes("CA") && codes("").length === INTAKE_COUNTRIES.length, "no destination chosen: both appear (the whole list)");
  check(pp.destinationFromParam("au") === "AU" && pp.destinationFromParam("ca") === "CA" && pp.destinationFromParam("Au") === "AU" && pp.destinationFromParam(undefined) === "" && pp.destinationFromParam("nz") === "", "?country=au / ca (any letter case) names the destination; anything else names none");
  const step1 = readFileSync("app/[locale]/(main)/full-check/step-1-personal.tsx", "utf8");
  check(/passportCountryOptions\(destination\)\.map/.test(step1), "the form's passport field uses the filtered list");
  const currentBlock = step1.slice(step1.indexOf('htmlFor="waitlist-current-country"'), step1.indexOf('name="currentCountry"'));
  check(/COUNTRIES\.map/.test(currentBlock) && !/passportCountryOptions/.test(currentBlock), "current country keeps the whole list (Australia and Canada: onshore applicants)");
  const { default: Page } = await import("../app/[locale]/(main)/full-check/page");
  const find = (node: unknown, pred: (p: Record<string, unknown>) => boolean): Record<string, unknown> | null => {
    if (!node || typeof node !== "object") return null;
    const el = node as { props?: Record<string, unknown> };
    if (el.props && pred(el.props)) return el.props;
    const kids = el.props?.children;
    for (const k of Array.isArray(kids) ? kids : [kids]) {
      const r = find(k, pred);
      if (r) return r;
    }
    for (const v of Object.values(el.props ?? {})) {
      if (v && typeof v === "object" && !Array.isArray(v) && "props" in (v as object)) {
        const r = find(v, pred);
        if (r) return r;
      }
    }
    return null;
  };
  for (const [q, want] of [["au", "AU"], ["ca", "CA"], [undefined, ""]] as const) {
    const el = await Page({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve(q ? { country: q } : {}) });
    const props = find(el, (p) => "initialValues" in p && "canadaReportEnabled" in p) as { initialValues: { destination?: string } } | null;
    check(props?.initialValues.destination === want, `/full-check${q ? `?country=${q}` : ""}: the page hands the form the destination "${want}"`, JSON.stringify(props?.initialValues));
  }

  console.log("\n2. choosing a destination clears an equal passport country");
  for (const L of LOCALES) {
    const a = pp.applyDestination("AU", "AU", L);
    const b = pp.applyDestination("CA", "CA", L);
    const keep = pp.applyDestination("TR", "AU", L);
    const keep2 = pp.applyDestination("AU", "CA", L);
    check(a.passport === "" && !!a.note && a.note.includes(pp.countryName("AU", L)) && b.passport === "" && !!b.note?.includes(pp.countryName("CA", L)), `${L}: AU chosen with passport AU (or CA/CA) -> passport cleared, with a note naming the country`, a.note ?? "");
    check(keep.passport === "TR" && keep.note === null && keep2.passport === "AU" && keep2.note === null, `${L}: any other passport is left alone, no note`);
  }
  const form = readFileSync("app/[locale]/(main)/full-check/full-check-waitlist-form.tsx", "utf8");
  check(/applyDestination\(passportCountry, c,/.test(form) && /onCountryChange=\{changeDestination\}/.test(form) && /passportIsDestination\(initialValues\.passportCountry/.test(form), "the form uses it on every destination change and on a pre-filled passport");
  check(/\["waitlist-target-country"/.test(form) && /id="waitlist-target-country"/.test(step1), "no destination chosen: step 1 does not continue (destination required)");

  console.log("\n3. the server refuses AU->AU and CA->CA");
  process.env.CANADA_REPORT_ENABLED = "true";
  const { submitFullCheckWaitlist } = await import("../app/[locale]/(main)/full-check/actions");
  for (const L of LOCALES) {
    for (const dest of ["AU", "CA"] as const) {
      const fd = new FormData();
      fd.set("email", "visitor@example.com");
      fd.set("fullName", "Visitor");
      fd.set("targetCountry", dest);
      fd.set("passportCountry", dest);
      fd.set("routeLocale", L);
      fd.set("visaInterest", dest === "AU" ? "491" : "Express Entry");
      fd.set("mainGoal", "move");
      const before = writes.length;
      const res = await submitFullCheckWaitlist({ status: "idle" }, fd);
      const want = pp.passportSameAsDestinationMessage(dest, L);
      check(res.status === "error" && res.error === want && res.errors?.passportCountry === want && !res.reportId && !res.header, `${L} ${dest}->${dest}: refused with "${want}"`, JSON.stringify(res).slice(0, 160));
      check(writes.length === before && fetches === 0, `${L} ${dest}->${dest}: no report, no write, no email, no checkout (no network call)`);
    }
  }
  check(pp.passportSameAsDestinationMessage("AU", "en") === "Citizens of Australia do not need a visa for Australia. If you hold another passport, select that one.", "the English message is exactly the specified sentence");
  const actionsSrc = readFileSync("app/[locale]/(main)/full-check/actions.ts", "utf8");
  check(actionsSrc.indexOf("passportIsDestination(passportCountry, targetCountry)") > 0 && actionsSrc.indexOf("passportIsDestination(passportCountry, targetCountry)") < actionsSrc.indexOf("createUserReport("), "the check runs before the report is created");

  console.log("\n4. New Zealand passport on the Australian report");
  const NZ_EN = "New Zealand citizens can generally live and work in Australia on a Special Category visa (subclass 444) and have a separate pathway to permanent residence; this report covers other visas only.";
  check(pp.newZealandAustraliaNote("en") === NZ_EN && /444/.test(pp.newZealandAustraliaNote("tr")) && /444/.test(pp.newZealandAustraliaNote("zh-Hans")), "the note is the specified sentence (en) with tr / zh-Hans versions");
  check(pp.isNewZealandPassport("NZ") && pp.isNewZealandPassport("New Zealand") && !pp.isNewZealandPassport("AU") && !pp.isNewZealandPassport(""), "recognised by code or name");
  check(codes("AU").includes("NZ"), "NZ stays selectable on the Australian form");
  check(/isNewZealandPassport\(passportCountry\)/.test(step1) && /data-testid="nz-passport-note"/.test(step1), "the form shows the note when NZ is chosen for Australia");
  const { runReadinessEngine } = await import("../src/lib/readiness-engine");
  const { buildReportView } = await import("../lib/reports/report-view");
  const { sectionStrings } = await import("../lib/reports/report-blocks");
  const { REVIEW_PERSONAS } = await import("./render-persona-pdfs");
  const base = REVIEW_PERSONAS["reference-se-au"] as Record<string, unknown>;
  const viewOf = (over: Record<string, unknown>, L: (typeof LOCALES)[number], drop: string[] = []) => {
    const input = { ...base, ...over, locale: L, targetVisa: "491", preferredPathway: "491" } as Record<string, unknown>;
    for (const k of drop) delete input[k];
    const report = JSON.parse(JSON.stringify(runReadinessEngine(input as never)));
    return buildReportView({ report, locale: L, profile: { name: "Test", occupation: String(input.occupation), occupationRaw: String(input.occupation) }, dateText: "" });
  };
  for (const L of LOCALES) {
    const nz = viewOf({ passportCountry: "NZ" }, L);
    const details = nz.sections.find((s) => s.id === "details")!;
    check(sectionStrings(details).includes(pp.newZealandAustraliaNote(L)), `${L}: the report's "Your details" carries the note for a New Zealand passport`);
    const tr = viewOf({ passportCountry: "TR" }, L);
    check(!JSON.stringify(tr.sections).includes("444"), `${L}: a Turkish passport report has no such note`);
  }

  console.log("\n5. not entered is never 0");
  const ZERO = /(^|[^\d.,])0 (years?|yıl)\b|(^|[^\d])0\s*年(?!\s*\d)|AUD 0\b|\b0 per year|Age: 0\b|Yaş: 0\b|年龄：0\b/;
  const scan = (view: ReturnType<typeof viewOf>, only: string[]) => {
    const out: string[] = [];
    for (const s of view.sections) {
      if (!only.includes(s.id)) continue;
      for (const b of s.blocks) {
        if (b.kind === "table") for (const r of b.rows) for (const c of r) if (ZERO.test(c)) out.push(`${s.id}: ${c.slice(0, 90)}`);
        if (b.kind === "lines") for (const l of b.lines) if (ZERO.test(l)) out.push(`${s.id}: ${l.slice(0, 90)}`);
        if (b.kind === "kv") for (const [, v] of b.rows) if (ZERO.test(v)) out.push(`${s.id}: ${v.slice(0, 90)}`);
      }
    }
    return out;
  };
  const SPONSOR_LABEL = { en: "Years under an approved sponsor", tr: "Onaylı sponsor altında yıl", "zh-Hans": "在经批准的担保方名下的年数" } as const;
  const NOT_ENTERED = { en: "Not entered", tr: "Girilmedi", "zh-Hans": "未填写" } as const;
  for (const L of LOCALES) {
    // the reported bug: onshore experience entered (0 or 1), sponsor years not entered
    for (const on of [0, 1]) {
      const v = viewOf({ onshoreExperienceYears: on, offshoreExperienceYears: 3 }, L, ["yearsInSponsoredPosition", "yearsWithCurrentSponsor"]);
      const text = JSON.stringify(v.sections);
      const sponsorCells = [...text.matchAll(new RegExp(`${SPONSOR_LABEL[L]}[^"\\\\]*`, "g"))].map((m) => m[0]);
      check(sponsorCells.some((c) => c.includes(NOT_ENTERED[L])) && sponsorCells.every((c) => !ZERO.test(c) && !/: 1 (year|yıl)|: 1 年/.test(c)), `${L}, onshore ${on} entered: "${SPONSOR_LABEL[L]}" is "${NOT_ENTERED[L]}" on the glance page and in the 186 / 482 tables (never 0, never borrowed from Australian experience)`, sponsorCells.slice(0, 2).join(" | "));
    }
    // an explicit sponsor answer is shown as entered, including an explicit 0
    const given = viewOf({ yearsInSponsoredPosition: 3 }, L);
    check(JSON.stringify(given.sections).includes(`${SPONSOR_LABEL[L]}: ${L === "en" ? "3 years" : L === "tr" ? "3 yıl" : "3 年"}`), `${L}: an entered sponsor figure is shown as entered`);
    const explicitZero = viewOf({ yearsInSponsoredPosition: 0 }, L);
    check(new RegExp(`${SPONSOR_LABEL[L]}: (0 years|0 yıl|0 年)`).test(JSON.stringify(explicitZero.sections)), `${L}: an explicit 0 still shows as 0`);
    // every numeric field omitted
    const none = viewOf({}, L, ["offshoreExperienceYears", "onshoreExperienceYears", "annualSalaryAud", "yearsInSponsoredPosition", "yearsWithCurrentSponsor"]);
    const offenders = scan(none, ["glance", "visas", "points", "details"]);
    check(offenders.length === 0, `${L}: with employment, sponsor years and salary not entered, no 0 appears on the glance page, the visa tables, the points table or the details`, offenders.slice(0, 3).join(" | "));
    // half entered: the missing part is "not entered", not 0, and no total is made up
    const half = viewOf({ onshoreExperienceYears: 2 }, L, ["offshoreExperienceYears"]);
    const halfText = JSON.stringify(half.sections);
    check(halfText.includes(NOT_ENTERED[L]) && !/\(outside Australia 0|\(Avustralya dışında 0|境外 0/.test(halfText) && !new RegExp(`${L === "en" ? "2 years" : L === "tr" ? "2 yıl" : "2 年"} \\(`).test(halfText.split("Years of work experience")[1] ?? ""), `${L}: only Australian employment entered -> outside Australia is "not entered" and no combined total is shown`);
  }
  const rv = readFileSync("lib/reports/report-visas.ts", "utf8");
  check(!/sp \?\? on/.test(rv), "the sponsor-years comparison no longer falls back to Australian work experience");

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
