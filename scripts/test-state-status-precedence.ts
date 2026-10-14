/**
 * The admin row is the state's data and always wins (docs/admin-data-design.md A.1). There is no date comparison with any other source:
 * the report (State Nomination Tracker, state section), the AI assistant and the chat facts all show the status the admin saved, whatever
 * the dates are. Database-free: the admin rows are an in-memory store, the snapshot is built from them.
 *
 *   npx tsx scripts/test-state-status-precedence.ts
 */
import "./lib/stub-request-context";

import { seedStatePrograms, saveStateProgram } from "../lib/admin-data/service";
import { toSnapshot, seedStateData, withPrograms } from "../lib/admin-data/snapshot";
import { memoryStore } from "../lib/admin-data/store";
import { stateStatusLabel } from "../lib/admin-data/statuses";
import { retrieveStateContext } from "../lib/ai/retrieve-state-context";
import { buildEngineFacts } from "../lib/chat/engine-facts";
import { buildStateInfos } from "../lib/reports/report-states";
import { runReadinessEngine } from "../src/lib/readiness-engine";
import type { ReadinessInput } from "../lib/readiness/types";

let failures = 0;
const ok = (m: string) => console.log(`  ✅ ${m}`);
const fail = (m: string) => {
  failures++;
  console.error(`  ❌ ${m}`);
};
const t = (label: string, cond: boolean, detail = "") => (cond ? ok(label) : fail(`${label}${detail ? ` -- ${detail}` : ""}`));

const ACTOR = { id: "u-1", email: "admin@example.com", label: "admin@example.com" };
const baseProfile: ReadinessInput = {
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

const statusIn = (input: Partial<ReadinessInput>, code: string) => runReadinessEngine({ ...baseProfile, ...input } as ReadinessInput).stateNominationTracker?.states.find((s) => s.code === code);

async function main() {
  console.log("seeded rows, then an admin edit saved with an OLD verification date");
  const store = memoryStore();
  const seeded = await seedStatePrograms(store, ACTOR, new Date("2026-10-15T00:00:00Z"));
  t("the seed inserts all eight states", seeded.inserted.length === 8, JSON.stringify(seeded));
  const before = toSnapshot(Object.fromEntries((await store.list()).map((p) => [p.stateCode, p])), "db", "now");
  t("a seeded NT is 'Closed with exceptions' and TAS is spelled 'Open (Onshore only)'", before.rules.NT.status === "Closed with exceptions" && before.rules.TAS.status === "Open (Onshore only)");

  const act = (await store.get("ACT"))!;
  const edited = await saveStateProgram(store, ACTOR, { ...act, status: "Suspended / Closed" }, new Date("2026-10-16T00:00:00Z"));
  t("the edit saves", edited.ok === true);
  const snap = toSnapshot(Object.fromEntries((await store.list()).map((p) => [p.stateCode, p])), "db", "now");
  // Make the stored row look older than the seed's own verification date: the status must still be the admin's.
  const older = withPrograms(snap, { ACT: { lastVerifiedAt: "2020-01-01T00:00:00.000Z" } });

  for (const [name, data] of [["fresh row", snap], ["row verified in 2020", older]] as const) {
    const tracker = statusIn({ stateData: data }, "ACT");
    t(`[${name}] the report's State Nomination Tracker shows the admin's status and does not count ACT as open`, tracker?.status === "Suspended / Closed" && tracker.isOpen === false, JSON.stringify([tracker?.status, tracker?.isOpen]));
    const infos = buildStateInfos(runReadinessEngine({ ...baseProfile, stateData: data }), "261313", "en", new Date("2026-10-20"), null, data);
    t(`[${name}] the report's state section shows it`, infos.find((s) => s.code === "ACT")?.status === "Suspended / Closed");
    const assistant = await retrieveStateContext("Which states are open for 190 or 491 state nomination?", "en", data);
    t(`[${name}] the AI assistant shows it`, assistant.find((s) => s.code === "ACT")?.status === "Suspended / Closed");
    t(`[${name}] the chat facts show it`, new RegExp("Australian Capital Territory \\(ACT\\): published status Suspended / Closed").test(buildEngineFacts({ stateData: data })));
  }

  console.log("a state the admin set open counts as open, whatever the old rule said");
  {
    const data = withPrograms(seedStateData(), { QLD: { status: "Open (Onshore & Offshore)" } });
    const qld = statusIn({ stateData: data }, "QLD");
    t("QLD (seeded closed) set open by the admin is open in the report", qld?.status === "Open (Onshore & Offshore)" && qld.isOpen === true, JSON.stringify([qld?.status, qld?.isOpen]));
  }

  console.log("without any rows the bundled seed is used (the same data the admin starts from)");
  {
    const a = statusIn({}, "NT");
    const b = statusIn({ stateData: seedStateData() }, "NT");
    t("no stateData = the seed", a?.status === "Closed with exceptions" && b?.status === a?.status && a?.isOpen === false);
  }

  console.log("the new statuses");
  {
    const cases: Array<[string, boolean]> = [
      ["Closed with exceptions", false],
      ["Not yet published", false],
      ["Check official page", false],
      ["Suspended / Closed", false],
      ["Open (Onshore & Offshore)", true],
    ];
    for (const [status, open] of cases) {
      const s = statusIn({ stateData: withPrograms(seedStateData(), { SA: { status } }) }, "SA");
      t(`SA set to "${status}": ${open ? "open" : "not open"}`, s?.isOpen === open && s?.status === status, JSON.stringify([s?.status, s?.isOpen]));
    }
    const onshoreOnly = withPrograms(seedStateData(), { SA: { status: "Open (Onshore only)" } });
    t("'Open (Onshore only)' is open to someone in Australia and not to someone abroad", statusIn({ stateData: onshoreOnly }, "SA")?.isOpen === true && statusIn({ stateData: onshoreOnly, currentCountry: "Turkey" }, "SA")?.isOpen === false);
    t("the report prints the status in the reader's language", stateStatusLabel("Closed with exceptions", "tr") === "Kapalı, istisnalarla" && stateStatusLabel("Not yet published", "zh-Hans") === "尚未公布" && stateStatusLabel("Open (Onshore Only)", "en") === "Open (Onshore only)");
  }

  console.log(failures === 0 ? "\n✅ ALL CHECKS PASSED" : `\n❌ ${failures} CHECK(S) FAILED`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
