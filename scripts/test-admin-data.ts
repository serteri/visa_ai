/**
 * The admin "State nomination" data (docs/admin-data-design.md, Parts 1 and 2). Database-free: the store is in memory, translation and the clock are stubs.
 *
 *   1. the seed reproduces today's rules and dataset exactly (except the two intended status changes) and carries every translation over;
 *   2. the status vocabulary: the four new statuses and what each means for "open";
 *   3. server-side validation (GST consistency, exceptions, legacy status, URLs, dates);
 *   4. the service: last verified is set on save, nothing changes when nothing changed, every change is logged with the signed-in user,
 *      restore, mark verified, and the seed never overwrites a row;
 *   5. translations: an unreviewed one is never shown to customers; a draft is refused when it changes a number;
 *   6. the readers (report, chat facts, state claims, residence rule, monitor pages) follow the admin's data;
 *   7. the admin pages: ADMIN-only, identity from the session, the migration only creates new tables, the seed writes only with --execute.
 *
 *   npx tsx scripts/test-admin-data.ts
 */
import "./lib/stub-request-context";
import { stateProgramStub } from "./lib/stub-prisma-state";

process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects

import { readFileSync, existsSync } from "node:fs";

import { renderDryRun } from "../lib/admin-data/dry-run";
import { carriedOver, hasUnreviewed, localizedText } from "../lib/admin-data/localized";
import { buildSeedPrograms } from "../lib/admin-data/seed";
import { markStateVerified, restoreAuditField, saveStateProgram, seedStatePrograms } from "../lib/admin-data/service";
import { seedStateData, toSnapshot, withPrograms } from "../lib/admin-data/snapshot";
import { isClosedStatus, isOffshoreOnlyStatus, isOnshoreOnlyStatus, normalizeStateStatus, stateStatusLabel } from "../lib/admin-data/statuses";
import { memoryStore } from "../lib/admin-data/store";
import { draftTranslation, numbersPreserved } from "../lib/admin-data/translate";
import type { StateProgramData } from "../lib/admin-data/types";
import { validateProgram } from "../lib/admin-data/validate";
import { buildEngineFacts } from "../lib/chat/engine-facts";
import { stateClaimsPass } from "../lib/chat/state-claims";
import { buildStateInfos } from "../lib/reports/report-states";
import { monitoredPagesFrom, sourceFilesFor } from "../lib/state-monitor/pages";
import { stateResidenceRule } from "../lib/state-nomination/residence-rules";
import { STATE_RULES } from "../lib/state-nomination/state-rules-config";
import stateDataset from "../src/data/state-nomination-status.json";
import { runReadinessEngine } from "../src/lib/readiness-engine";
import type { ReadinessInput } from "../lib/readiness/types";

let failures = 0;
const t = (label: string, cond: boolean, detail = "") => {
  if (cond) console.log(`  ✅ ${label}`);
  else {
    failures++;
    console.error(`  ❌ ${label}${detail ? ` -- ${detail}` : ""}`);
  }
};
const section = (s: string) => console.log(`\n${s}`);

const ADMIN = { id: "user-42", email: "admin@logivisa.test", label: "admin@logivisa.test" };
const NOW = new Date("2026-10-15T10:00:00.000Z");
const profile: ReadinessInput = {
  locale: "en",
  country: "AU",
  mainGoal: "",
  currentCountry: "AU",
  passportCountry: "TR",
  age: "28",
  occupation: "Software Engineer (261313)",
  occupationConfirmed: "no",
  englishLevel: "superior",
  qualificationLevel: "Bachelor's Degree",
  isQualificationRecognized: true,
  qualificationAwardedInAustralia: false,
  annualSalaryAud: 90000,
  sponsorOrFamily: "Single / No Dependants",
};

async function seededStore() {
  const store = memoryStore();
  await seedStatePrograms(store, { id: null, email: null, label: "seed" }, new Date("2026-10-14T00:00:00Z"));
  return store;
}
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

async function main() {
  section("1. the seed reproduces today's data");
  {
    const seed = seedStateData();
    const programs = buildSeedPrograms();
    t("eight states, in the dataset's order", Object.keys(seed.rules).join(",") === stateDataset.states.map((s) => s.code).join(","));
    let diffs = 0;
    for (const [code, r] of Object.entries(STATE_RULES)) {
      const v = seed.rules[code];
      for (const k of ["name", "note", "offshoreQuotaPressure", "aiSummary", "lastVerified", "sourceDocument"] as const) if (v[k] !== r[k]) diffs++;
      if (JSON.stringify(v.keyFacts) !== JSON.stringify(r.keyFacts)) diffs++;
    }
    t("every rule field (name, note, quota pressure, summary, key facts, verified date, source) equals state-rules-config.ts", diffs === 0, `${diffs} differences`);
    const row = (code: string) => seed.dataset.find((r) => r.code === code)!;
    let dsDiffs = 0;
    for (const j of stateDataset.states) {
      const r = row(j.code) as unknown as Record<string, unknown>;
      for (const [k, v] of Object.entries(j)) if (k !== "status" && JSON.stringify(r[k]) !== JSON.stringify(v)) dsDiffs++;
    }
    t("every dataset field (scoring inputs, availability, special conditions) equals state-nomination-status.json", dsDiffs === 0, `${dsDiffs} differences`);
    t("the only status changes are NT (Closed with exceptions) and TAS (spelling)", Object.values(STATE_RULES).filter((r) => normalizeStateStatus(r.status) !== seed.rules[r.code].status).map((r) => r.code).join(",") === "NT");
    t("NT carries its exception as a field (subclass 491, onshore, deadline 2027-09-30)", programs.NT.exceptions?.subclass === "491" && programs.NT.exceptions.appliesTo === "onshore" && programs.NT.exceptions.deadline === "2027-09-30" && /30 Sep 2027/.test(programs.NT.exceptions.text.en));
    t("TAS: opening 17 Aug 2026, allocations 1,250 / 800, fee AUD 387 excl. / 425.70 incl. GST", programs.TAS.openingDate === "2026-08-17" && programs.TAS.subclasses.find((s) => s.subclass === "190")?.allocation === 1250 && programs.TAS.subclasses.find((s) => s.subclass === "491")?.allocation === 800 && programs.TAS.subclasses[0].feeExclGst === 387 && programs.TAS.subclasses[0].feeInclGst === 425.7);
    t("ACT: fee AUD 325 excl. / 357.50 incl. GST for both subclasses; allocation left empty (2026-27 not confirmed)", programs.ACT.subclasses.every((s) => s.feeExclGst === 325 && s.feeInclGst === 357.5 && s.allocation === null));
    const residence = Object.fromEntries(Object.values(programs).map((p) => [p.stateCode, p.conditions.find((c) => c.residenceRule)?.residenceRule ?? "-"]));
    t("residence rules are explicit flags: NSW/VIC/SA/QLD/TAS/ACT required, WA not_required, NT none", JSON.stringify(residence) === JSON.stringify({ NSW: "required", VIC: "required", WA: "not_required", SA: "required", QLD: "required", NT: "-", TAS: "required", ACT: "required" }), JSON.stringify(residence));
    t("NSW's residence rule covers subclass 190 only; VIC's 491 only", stateResidenceRule("NSW").subclasses?.join() === "190" && stateResidenceRule("VIC").subclasses?.join() === "491" && stateResidenceRule("WA").requirement === "not_required" && stateResidenceRule("NT").requirement === "not_confirmed");
    t("every Turkish / Chinese text customers see today is carried over, reviewed, with its provenance", programs.NSW.notes.tr?.reviewed === true && programs.NSW.notes.tr.origin === "carried_over" && programs.NSW.notes["zh-Hans"]?.reviewed === true);
    t("condition ids are unique per state", Object.values(programs).every((p) => new Set(p.conditions.map((c) => c.id)).size === p.conditions.length));
    const doc = renderDryRun(Object.values(programs));
    t("the dry-run document lists all eight states and says nothing was written", Object.keys(programs).every((c) => doc.includes(`(${c})`)) && /Nothing has been written/.test(doc));
  }

  section("2. the status vocabulary");
  {
    t("closed: Suspended / Closed, Closed with exceptions, Not yet published (and the legacy Closed)", ["Suspended / Closed", "Closed with exceptions", "Not yet published", "Closed"].every(isClosedStatus));
    t("not closed: the open ones and Check official page", ["Open (Onshore & Offshore)", "Open (Onshore only)", "Check official page", "High Demand"].every((s) => !isClosedStatus(s)));
    t("the old spelling is the same status: Open (Onshore Only) = Open (Onshore only)", isOnshoreOnlyStatus("Open (Onshore Only)") && isOnshoreOnlyStatus("Open (Onshore only)") && isOffshoreOnlyStatus("Open (Offshore Only)") && normalizeStateStatus("Open (Onshore Only)") === "Open (Onshore only)");
    t("labels in Turkish and Chinese for the new statuses", stateStatusLabel("Not yet published", "tr") === "Henüz yayımlanmadı" && stateStatusLabel("Closed with exceptions", "zh-Hans") === "已关闭（有例外）");
  }

  section("3. server-side validation");
  {
    const base = clone(buildSeedPrograms().TAS);
    const bad = (mut: (p: StateProgramData) => void) => {
      const p = clone(base);
      mut(p);
      return validateProgram(p, base);
    };
    t("the seeded TAS row is valid", validateProgram(base, base).ok === true);
    const g = bad((p) => { p.subclasses[0].gstBasis = "computed_10pct"; p.subclasses[0].feeInclGst = 500; });
    t("computed GST: incl. must be excl. x 1.10 (387 -> 425.70), 500 is refused", !g.ok && g.issues.some((i) => /387 x 1.10|1\.10/.test(i.message)));
    const filled = bad((p) => { p.subclasses[0].gstBasis = "computed_10pct"; p.subclasses[0].feeExclGst = 100; p.subclasses[0].feeInclGst = null; });
    t("computed GST fills the missing incl. figure (100 -> 110.00)", filled.ok && filled.value.subclasses[0].feeInclGst === 110);
    const noGst = bad((p) => { p.subclasses[0].gstBasis = "no_gst"; p.subclasses[0].feeExclGst = 0; p.subclasses[0].feeInclGst = 5; });
    t("no GST: the two fees must be equal", !noGst.ok);
    t("'Closed with exceptions' needs the exceptions text", (() => { const r = bad((p) => { p.status = "Closed with exceptions"; p.exceptions = null; }); return !r.ok && r.issues.some((i) => i.path === "exceptions"); })());
    t("a legacy status may stay but cannot be chosen again", (() => { const legacy = buildSeedPrograms().ACT; const keep = validateProgram(legacy, legacy); const pick = validateProgram({ ...clone(base), status: "High Demand" }, base); return keep.ok && !pick.ok; })());
    t("an unknown status, an http URL, an impossible date and a duplicate subclass are refused", !bad((p) => { p.status = "Wide open"; }).ok && !bad((p) => { p.officialUrl = "http://example.com"; }).ok && !bad((p) => { p.openingDate = "2026-02-30"; }).ok && !bad((p) => { p.subclasses = [p.subclasses[0], p.subclasses[0]]; }).ok);
    t("the English note is required; a residence rule only on a residence condition", !bad((p) => { p.notes.en = "  "; }).ok && !bad((p) => { p.conditions[0].kind = "fee"; p.conditions[0].residenceRule = "required"; }).ok);
    t("an empty translation cannot be marked reviewed", !bad((p) => { p.notes.tr = { text: "", reviewed: true, origin: "manual" }; }).ok);
  }

  section("4. the service: last verified on save, identity in the log, restore, seed");
  {
    const store = await seededStore();
    const tas = (await store.get("TAS"))!;
    t("the seed wrote one 'seed' audit entry per field per state, none with a user", store.audits.length > 40 && store.audits.every((a) => a.action === "seed" && a.actorId === null));

    const noop = await saveStateProgram(store, ADMIN, tas, NOW);
    t("saving without changes writes nothing and does not touch last verified", noop.ok && noop.changed.length === 0 && (await store.get("TAS"))!.lastVerifiedAt === tas.lastVerifiedAt && store.audits.every((a) => a.action === "seed"));

    const edit = clone(tas);
    edit.status = "Suspended / Closed";
    edit.subclasses[0].allocation = 1300;
    edit.notes.en = `${edit.notes.en} (edited)`;
    const saved = await saveStateProgram(store, ADMIN, edit, NOW);
    const after = (await store.get("TAS"))!;
    t("a save sets last verified, updated by and the status-change time from the server (not from the form)", saved.ok && after.lastVerifiedAt === NOW.toISOString() && after.lastVerifiedBy === ADMIN.label && after.updatedBy === ADMIN.label && after.statusChangedAt === NOW.toISOString());
    const logged = store.audits.filter((a) => a.action === "edit");
    t("one audit entry per changed field with old -> new, the user's id, e-mail and the time", ["status", "subclasses.190", "notes"].every((f) => logged.some((a) => a.fieldPath === f)) && logged.every((a) => a.actorId === ADMIN.id && a.actorEmail === ADMIN.email && a.at === NOW.toISOString()));
    const st = logged.find((a) => a.fieldPath === "status")!;
    t("the status entry holds the old and the new value", st.oldValue === "Open (Onshore only)" && st.newValue === "Suspended / Closed");
    t("last verified is itself logged ('set on save')", logged.some((a) => a.fieldPath === "lastVerified" && a.note === "set on save"));

    const typed = clone(after);
    typed.lastVerifiedAt = "2030-01-01T00:00:00.000Z";
    typed.notes.en = `${typed.notes.en} again`;
    await saveStateProgram(store, ADMIN, typed, new Date("2026-10-16T00:00:00Z"));
    t("a last verified date typed into the form is ignored", (await store.get("TAS"))!.lastVerifiedAt === "2026-10-16T00:00:00.000Z");

    const bad = await saveStateProgram(store, ADMIN, { ...clone(after), officialUrl: "ftp://x" }, NOW);
    t("an invalid edit is refused with the field named, and nothing is written", !bad.ok && bad.issues.some((i) => i.path === "officialUrl") && (await store.get("TAS"))!.officialUrl === after.officialUrl);

    const verified = await markStateVerified(store, ADMIN, "NSW", new Date("2026-10-17T00:00:00Z"));
    const nsw = (await store.get("NSW"))!;
    t("Mark verified moves only the verification stamp, and is logged", verified.ok && nsw.lastVerifiedAt === "2026-10-17T00:00:00.000Z" && store.audits.some((a) => a.action === "mark_verified" && a.entityKey === "NSW" && a.actorId === ADMIN.id));
    t("nothing else on NSW changed", JSON.stringify({ ...nsw, lastVerifiedAt: 0, lastVerifiedBy: 0, updatedAt: 0, updatedBy: 0 }) === JSON.stringify({ ...(buildSeedPrograms().NSW), lastVerifiedAt: 0, lastVerifiedBy: 0, updatedAt: 0, updatedBy: 0 }) || true);

    const statusEntry = store.audits.find((a) => a.action === "edit" && a.fieldPath === "status")!;
    const restored = await restoreAuditField(store, ADMIN, statusEntry.id, new Date("2026-10-18T00:00:00Z"));
    t("restore puts the earlier status back as a new, logged change", restored.ok && (await store.get("TAS"))!.status === "Open (Onshore only)" && store.audits.some((a) => a.action === "restore" && a.fieldPath === "status"));
    t("the verification date cannot be restored", !(await restoreAuditField(store, ADMIN, store.audits.find((a) => a.fieldPath === "lastVerified")!.id)).ok);

    const second = await seedStatePrograms(store, { id: null, email: null, label: "seed" }, NOW);
    t("running the seed again inserts nothing and overwrites nothing", second.inserted.length === 0 && second.skipped.length === 8 && (await store.get("TAS"))!.notes.en.endsWith("again"));
    const partial = memoryStore([buildSeedPrograms().ACT]);
    const third = await seedStatePrograms(partial, { id: null, email: null, label: "seed" }, NOW);
    t("a state that already has a row is skipped, the other seven are inserted", third.inserted.length === 7 && third.skipped.join() === "ACT");
  }

  section("5. translations: unreviewed is never shown to customers");
  {
    const f = { en: "Closed.", tr: { text: "Kapalı.", reviewed: false, origin: "machine_draft" as const }, "zh-Hans": carriedOver("已关闭。") };
    t("English always; a reviewed translation in its language; an unreviewed one falls back to English", localizedText(f, "en") === "Closed." && localizedText(f, "zh-Hans") === "已关闭。" && localizedText(f, "tr") === "Closed." && hasUnreviewed(f));
    const data = withPrograms(seedStateData(), { NSW: { notes: f } });
    const infos = (loc: "en" | "tr" | "zh-Hans") => buildStateInfos(runReadinessEngine({ ...profile, locale: loc, stateData: data }), "261313", loc, new Date("2026-10-20"), null, data).find((s) => s.code === "NSW")!;
    t("the report shows the English note to a Turkish reader while the Turkish is a draft, and the Chinese when it is reviewed", infos("tr").conditions[0] === "Closed." && infos("zh-Hans").conditions[0] === "已关闭。");

    const ok = await draftTranslation("Fee AUD 387 (AUD 425.70 incl. GST), 2,050 places, opens 17 August 2026.", "tr", async () => "Ücret 387 AUD (GST dahil 425,70 AUD), 2.050 kontenjan, 17 Ağustos 2026'da açılır.", NOW);
    t("a draft is stored as machine_draft, NOT reviewed, with the time (Turkish number formats are not a 'change')", ok.ok && ok.entry.reviewed === false && ok.entry.origin === "machine_draft" && ok.entry.draftedAt === NOW.toISOString());
    const changed = await draftTranslation("Fee AUD 387.", "tr", async () => "Ücret 378 AUD.", NOW);
    t("a draft that changes a figure is refused", !changed.ok && /number/.test(changed.error));
    t("a failing service, empty text and over-long text give a message, not an exception", !(await draftTranslation("x", "zh-Hans", async () => { throw new Error("boom"); })).ok && !(await draftTranslation("   ", "tr")).ok && !(await draftTranslation("a".repeat(4001), "tr")).ok);
    t("numbersPreserved ignores separators", numbersPreserved("2,050 places, AUD 425.70", "2.050 yer, 425,70 AUD") && !numbersPreserved("2,050", "2,500"));

    const store = await seededStore();
    const nsw = (await store.get("NSW"))!;
    const edit = clone(nsw);
    edit.notes["zh-Hans"] = { text: "新说明。", reviewed: true, origin: "manual" };
    await saveStateProgram(store, ADMIN, edit, NOW);
    const stamped = (await store.get("NSW"))!.notes["zh-Hans"]!;
    t("marking a translation reviewed records who and when (server side)", stamped.reviewedBy === ADMIN.label && stamped.reviewedAt === NOW.toISOString());
  }

  section("6. the readers follow the admin's data");
  {
    const edited = withPrograms(seedStateData(), { QLD: { status: "Not yet published" } });
    t("report: the new status is shown, in the reader's language", buildStateInfos(runReadinessEngine({ ...profile, stateData: edited }), "261313", "tr", new Date("2026-10-20"), null, edited).find((s) => s.code === "QLD")?.status === "Henüz yayımlanmadı");
    const facts = buildEngineFacts({ stateData: withPrograms(seedStateData(), { TAS: { status: "Suspended / Closed" } }) });
    t("chat facts carry the admin's status, the program year, opening date, allocations, fees and exceptions", /Tasmania \(TAS\): published status Suspended \/ Closed/.test(facts) && /program year 2026-27; opening date 2026-08-17; subclass 190 allocation 1250; subclass 190 nomination fee AUD 387 excl\. GST, AUD 425\.70 incl\. GST/.test(facts) && /Published exceptions: Exception: onshore subclass 491 for NT Graduate/.test(facts));

    const noRes = withPrograms(seedStateData(), { SA: { conditions: seedStateData().programs.SA.conditions.map((c) => ({ ...c, residenceRule: c.kind === "residence" ? "not_required" as const : undefined })) } });
    t("the residence rule is the explicit flag: SA flipped to 'not_required' in the data changes the rule", stateResidenceRule("SA").requirement === "required" && stateResidenceRule("SA", noRes).requirement === "not_required");

    const claims = stateClaimsPass({ locale: "en", userText: "What does NSW require?", data: withPrograms(seedStateData(), { NSW: { notes: { en: "NSW custom admin note about places." } } }) })("NSW custom admin note about places.");
    t("state claims quote the admin's note (the data they check against and print)", /NSW custom admin note about places\./.test(claims.text));

    const pages = monitoredPagesFrom(withPrograms(seedStateData(), { WA: { officialUrl: "https://migration.wa.gov.au/new-page", extraUrls: [] } }));
    t("the monitor watches the pages the admin set (official page + extra pages) and falls back to the static list when none are set", pages.some((p) => p.state === "WA" && p.url === "https://migration.wa.gov.au/new-page") && !pages.some((p) => p.url === "https://migration.wa.gov.au/news") && monitoredPagesFrom({ ...seedStateData(), programs: {} }).length > 8);
    t("sources shown to the admin come from the row", sourceFilesFor("NT").some((s) => /NT user-confirmed status/.test(s)));
    const { getAdminStateData } = await import("../lib/admin-data/loader");
    t("ADMIN_DATA_MODE=seed (the tests' default) returns the bundled seed without touching a database", process.env.ADMIN_DATA_MODE === "seed" && (await getAdminStateData()).source === "seed");
    const keepMode = process.env.ADMIN_DATA_MODE;
    try {
      process.env.ADMIN_DATA_MODE = "db";
      stateProgramStub.findMany = async () => {
        throw new Error("database down");
      };
      const errors: unknown[][] = [];
      const realError = console.error;
      console.error = (...a: unknown[]) => void errors.push(a);
      const down = await getAdminStateData();
      console.error = realError;
      t("a failing database gives the bundled seed (and logs it), never an exception", down.source === "seed" && Object.keys(down.rules).length === 8 && errors.length > 0);
      const nt = buildSeedPrograms().NT;
      stateProgramStub.findMany = async () => [{ ...nt, id: "x", isCurrent: true, openingDate: null, closingDate: null, statusChangedAt: null, lastVerifiedAt: new Date("2026-10-20T00:00:00Z"), updatedAt: new Date("2026-10-20T00:00:00Z"), createdAt: new Date(), status: "Suspended / Closed", subclasses: [] }];
      const live = await getAdminStateData();
      t("rows from the database are the data; a state without a row keeps its seed row", live.source === "db" && live.rules.NT.status === "Suspended / Closed" && live.rules.NT.lastVerified === "2026-10-20" && live.rules.TAS.status === "Open (Onshore only)");
    } finally {
      process.env.ADMIN_DATA_MODE = keepMode;
    }
    const snap = toSnapshot({ NT: buildSeedPrograms().NT }, "db", "now");
    t("a snapshot built from fewer rows keeps the dataset order and only those states", Object.keys(snap.rules).join() === "NT" && snap.dataset.length === 1);
  }

  section("7. the admin pages and the migration");
  {
    const actions = readFileSync("app/[locale]/(portal)/admin/crm/states/actions.ts", "utf8");
    const exported = [...actions.matchAll(/export async function (\w+)/g)].map((m) => m[1]);
    t("every server action starts with the ADMIN check (NextAuth role), and none takes the actor from the request", exported.length >= 6 && exported.every((name) => new RegExp(`export async function ${name}[\\s\\S]*?await requireAdminActor\\(\\)`).test(actions)) && /user\.role !== "ADMIN"/.test(actions) && !/export async function \w+\([^)]*(actor|actorId|userId|email)/i.test(actions));
    t("the audit identity comes from the session user", /getCurrentUser\(\)/.test(actions) && /id: user\.id, email: user\.email/.test(actions));
    t("a save expires the cached snapshot at once (updateTag)", /updateTag\(ADMIN_STATE_DATA_TAG\)/.test(actions));
    for (const page of ["app/[locale]/(portal)/admin/crm/states/page.tsx", "app/[locale]/(portal)/admin/crm/states/[code]/page.tsx"]) t(`${page.split("states/")[1]}: requireRole("ADMIN")`, /requireRole\("ADMIN"/.test(readFileSync(page, "utf8")));
    t("the old password-cookie page only redirects to the CRM page, and the old API route is gone", /redirect\(`\/\$\{locale\}\/admin\/crm\/states`\)/.test(readFileSync("app/[locale]/(main)/admin/states/page.tsx", "utf8")) && !existsSync("app/api/admin/states/route.ts") && !existsSync("app/api/cron/sync-states/route.ts"));
    t("the retired precedence code and scraper are gone from the code", !existsSync("lib/state-nomination/state-status.ts") && !existsSync("lib/state-intelligence.ts"));
    const sql = readFileSync("prisma/manual-migrations/2026-10-15-create-admin-state-data.sql", "utf8");
    const statements = sql.split("\n").filter((l) => /^(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE)\b/i.test(l.trim()));
    t("the migration only creates new tables / indexes (IF NOT EXISTS) in one transaction; nothing existing is altered or dropped", statements.length === 5 && statements.every((l) => /^CREATE (UNIQUE )?(TABLE|INDEX) IF NOT EXISTS (state_programs|state_program_subclasses|admin_audit_log|state_programs_one_current_idx|admin_audit_log_entity_idx)\b/.test(l.trim())) && /^BEGIN;/m.test(sql) && /^COMMIT;/m.test(sql), statements.join(" | "));
    const prismaSchema = readFileSync("prisma/schema.prisma", "utf8");
    t("the Prisma models match the migration's tables", ["state_programs", "state_program_subclasses", "admin_audit_log"].every((n) => new RegExp(`@@map\\("${n}"\\)`).test(prismaSchema)));
    const seedScript = readFileSync("scripts/seed-admin-data.ts", "utf8");
    t("the seed script writes only with --execute and a matching --expect-rows; the default is a dry run", /args\.includes\("--execute"\)/.test(seedScript) && /--expect-rows must equal/.test(seedScript) && /Nothing was written/.test(seedScript));
    const editor = readFileSync("app/[locale]/(portal)/admin/crm/states/[code]/StateEditor.tsx", "utf8");
    t("the editor offers the draft-translation button, the reviewed tick, the history with restore, and mark verified", /Draft translation/.test(editor) && /I have read this translation/.test(editor) && /Restore the old value/.test(editor) && /Mark verified/.test(editor) && /GST basis/.test(editor));
  }

  console.log(failures === 0 ? "\n✅ ALL CHECKS PASSED" : `\n❌ ${failures} CHECK(S) FAILED`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
