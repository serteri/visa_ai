/**
 * Unit tests for lib/state-nomination/occupation-match.ts's matchOccupationToState -- the real
 * occupation <-> state-occupation-list matching built in Phase 2b. Pure data/function tests, no PDF
 * generation, no database (this module never touches Prisma).
 *
 * Usage: npx tsx scripts/test-occupation-match.ts
 */
import { matchOccupationToState, matchOccupationToStateAllSubclasses } from "../lib/state-nomination/occupation-match";
import { occupationMatchLine } from "../src/lib/readiness/localization";

let failures = 0;
function ok(msg: string) {
  console.log(`  ✅ ${msg}`);
}
function fail(msg: string) {
  failures++;
  console.error(`  ❌ ${msg}`);
}

const SOFTWARE_ENGINEER = "261313";
const NT_ONLY_OCCUPATION = "342311"; // Business Machine Mechanic -- on NT's list only, per generated data
const NOWHERE_OCCUPATION = "999999"; // deliberately not a real code -- must miss every list

console.log("==================== Software Engineer (261313) across all 8 states ====================");
{
  const expected: Record<string, { subclass: "190" | "491"; type: string }[]> = {
    ACT: [{ subclass: "190", type: "MATCH" }, { subclass: "491", type: "MATCH" }],
    NT: [{ subclass: "491", type: "NOT_ON_LIST" }],
    QLD: [{ subclass: "190", type: "MATCH" }, { subclass: "491", type: "MATCH" }],
    WA: [{ subclass: "190", type: "NOT_ON_LIST" }, { subclass: "491", type: "NOT_ON_LIST" }],
    NSW: [{ subclass: "190", type: "UNIT_GROUP_ONLY" }, { subclass: "491", type: "UNIT_GROUP_ONLY" }],
    SA: [{ subclass: "190", type: "NO_DATA" }, { subclass: "491", type: "NO_DATA" }],
    TAS: [{ subclass: "190", type: "NOT_APPLICABLE" }, { subclass: "491", type: "NOT_APPLICABLE" }],
    VIC: [{ subclass: "190", type: "NOT_APPLICABLE" }, { subclass: "491", type: "NOT_APPLICABLE" }],
  };

  for (const [state, cases] of Object.entries(expected)) {
    for (const { subclass, type } of cases) {
      const result = matchOccupationToState(SOFTWARE_ENGINEER, state, subclass);
      if (result.type !== type) fail(`${state}/${subclass}: expected ${type}, got ${result.type} (${JSON.stringify(result)})`);
      else ok(`${state}/${subclass}: ${result.type}`);
    }
  }

  // ACT's MATCH must carry the inferred flag (259-row group, per Phase 2a).
  const actResult = matchOccupationToState(SOFTWARE_ENGINEER, "ACT", "190");
  if (actResult.type === "MATCH" && !actResult.inferred) fail("ACT Software Engineer MATCH should carry inferred:true");
  else if (actResult.type === "MATCH") ok("ACT Software Engineer MATCH carries inferred:true");

  // NSW UNIT_GROUP_ONLY must name the real unit group (2613, Software and Applications Programmers).
  const nswResult = matchOccupationToState(SOFTWARE_ENGINEER, "NSW", "190");
  if (nswResult.type === "UNIT_GROUP_ONLY") {
    if (nswResult.unitGroupCode !== "2613") fail(`NSW unit group code: expected 2613, got ${nswResult.unitGroupCode}`);
    else if (nswResult.unitGroupName !== "Software and Applications Programmers") fail(`NSW unit group name: got "${nswResult.unitGroupName}"`);
    else if (!nswResult.onUnitGroupList) fail("NSW unit group 2613 should be on the 190 list");
    else ok(`NSW unit group: ${nswResult.unitGroupCode} (${nswResult.unitGroupName}), on list`);
  }

  // TAS/VIC NOT_APPLICABLE must find Software Engineer on the national list for both subclasses (via the
  // occupations.json visa_subclasses fallback -- it has no row of its own in public/skilled-occupation-list.json).
  for (const state of ["TAS", "VIC"]) {
    const r190 = matchOccupationToState(SOFTWARE_ENGINEER, state, "190");
    const r491 = matchOccupationToState(SOFTWARE_ENGINEER, state, "491");
    if (r190.type === "NOT_APPLICABLE" && !r190.onNationalList) fail(`${state}/190: expected onNationalList true for Software Engineer`);
    else if (r190.type === "NOT_APPLICABLE") ok(`${state}/190: onNationalList true`);
    if (r491.type === "NOT_APPLICABLE" && !r491.onNationalList) fail(`${state}/491: expected onNationalList true for Software Engineer`);
  }
}

console.log("\n==================== an occupation present in exactly one state's list (NT only) ====================");
{
  const nt = matchOccupationToState(NT_ONLY_OCCUPATION, "NT", "491");
  if (nt.type !== "MATCH") fail(`NT: expected MATCH for ${NT_ONLY_OCCUPATION}, got ${nt.type}`);
  else ok(`NT: MATCH for ${NT_ONLY_OCCUPATION} (${nt.occupationTitle})`);

  for (const [state, subclass] of [["ACT", "190"], ["QLD", "190"], ["QLD", "491"], ["WA", "190"], ["WA", "491"]] as const) {
    const r = matchOccupationToState(NT_ONLY_OCCUPATION, state, subclass);
    if (r.type !== "NOT_ON_LIST") fail(`${state}/${subclass}: expected NOT_ON_LIST for the NT-only occupation, got ${r.type}`);
    else ok(`${state}/${subclass}: NOT_ON_LIST (correctly absent elsewhere)`);
  }
}

console.log("\n==================== an occupation on none of the real-data lists ====================");
{
  for (const state of ["ACT", "NT", "QLD", "WA"] as const) {
    const subclasses = state === "NT" ? (["491"] as const) : (["190", "491"] as const);
    for (const subclass of subclasses) {
      const r = matchOccupationToState(NOWHERE_OCCUPATION, state, subclass);
      if (r.type !== "NOT_ON_LIST") fail(`${state}/${subclass}: expected NOT_ON_LIST for a nonexistent code, got ${r.type}`);
    }
  }
  ok("nonexistent ANZSCO code returns NOT_ON_LIST everywhere it could plausibly be checked");

  for (const state of ["TAS", "VIC"] as const) {
    const r = matchOccupationToState(NOWHERE_OCCUPATION, state, "190");
    if (r.type === "NOT_APPLICABLE" && r.onNationalList) fail(`${state}: nonexistent code should not be on the national list`);
  }
  ok("nonexistent ANZSCO code is not on the national list either (TAS/VIC)");
}

console.log("\n==================== ACT 491-only carve-out ====================");
{
  // From the generated act.json: rows with a literal "(491 Only)" suffix in the source title.
  const projectBuilder = matchOccupationToState("133112", "ACT", "491");
  const projectBuilder190 = matchOccupationToState("133112", "ACT", "190");
  if (projectBuilder.type !== "MATCH") fail(`ACT project builder (133112) subclass 491: expected MATCH, got ${projectBuilder.type}`);
  else if (projectBuilder.inferred) fail("ACT project builder (133112) is an explicit (491 Only) row -- must NOT carry inferred:true");
  else ok("ACT project builder (133112): MATCH for 491, not flagged as inferred (explicitly stated in the source)");
  if (projectBuilder190.type !== "NOT_ON_LIST") fail(`ACT project builder (133112) subclass 190: expected NOT_ON_LIST, got ${projectBuilder190.type}`);
  else ok("ACT project builder (133112): NOT_ON_LIST for 190 (explicitly 491-only in the source)");
}

console.log("\n==================== NSW: always UNIT_GROUP_ONLY, never a real occupation-level verdict ====================");
{
  for (const code of [SOFTWARE_ENGINEER, NT_ONLY_OCCUPATION, NOWHERE_OCCUPATION]) {
    const r = matchOccupationToState(code, "NSW", "190");
    if (r.type !== "UNIT_GROUP_ONLY") fail(`NSW/${code}: expected UNIT_GROUP_ONLY always, got ${r.type}`);
  }
  ok("NSW returns UNIT_GROUP_ONLY regardless of the occupation -- never MATCH/NOT_ON_LIST (no per-occupation NSW data exists)");
  const unknown = matchOccupationToState(NOWHERE_OCCUPATION, "NSW", "190");
  if (unknown.type === "UNIT_GROUP_ONLY" && unknown.onUnitGroupList) fail("NSW: a nonexistent unit group must not read as onUnitGroupList");
}

console.log("\n==================== SA: always NO_DATA ====================");
{
  for (const code of [SOFTWARE_ENGINEER, NT_ONLY_OCCUPATION, NOWHERE_OCCUPATION]) {
    for (const subclass of ["190", "491"] as const) {
      const r = matchOccupationToState(code, "SA", subclass);
      if (r.type !== "NO_DATA") fail(`SA/${code}/${subclass}: expected NO_DATA always, got ${r.type}`);
    }
  }
  ok("SA returns NO_DATA regardless of the occupation or subclass -- no SA occupation-list document exists");
}

console.log("\n==================== localized lines (occupationMatchLine): one per result family ====================");
{
  const cases: Array<{ label: string; results: ReturnType<typeof matchOccupationToStateAllSubclasses> }> = [
    { label: "ACT match (both subclasses, inferred)", results: matchOccupationToStateAllSubclasses(SOFTWARE_ENGINEER, "ACT", ["190", "491"]) },
    { label: "NT not-on-list", results: matchOccupationToStateAllSubclasses(SOFTWARE_ENGINEER, "NT", ["491"]) },
    { label: "NSW unit-group-only", results: matchOccupationToStateAllSubclasses(SOFTWARE_ENGINEER, "NSW", ["190", "491"]) },
    { label: "SA no-data", results: matchOccupationToStateAllSubclasses(SOFTWARE_ENGINEER, "SA", ["190", "491"]) },
    { label: "TAS not-applicable", results: matchOccupationToStateAllSubclasses(SOFTWARE_ENGINEER, "TAS", ["190", "491"]) },
  ];
  for (const locale of ["en", "tr", "zh-Hans"] as const) {
    for (const { label, results } of cases) {
      const line = occupationMatchLine(locale, results);
      if (!line || line.length < 10) fail(`${locale}/${label}: line is empty or too short: "${line}"`);
      else ok(`${locale}/${label}: "${line.slice(0, 90)}${line.length > 90 ? "..." : ""}"`);
    }
  }
  // The ACT inference caveat must appear in English only on the inferred (259-row) case, never on the
  // explicit 491-only case.
  const inferredLine = occupationMatchLine("en", matchOccupationToStateAllSubclasses(SOFTWARE_ENGINEER, "ACT", ["190", "491"]));
  const explicitLine = occupationMatchLine("en", matchOccupationToStateAllSubclasses("133112", "ACT", ["190", "491"]));
  if (!/inferred/i.test(inferredLine)) fail(`ACT inferred-row line should mention the inference caveat: "${inferredLine}"`);
  else ok("ACT inferred-row line carries the inference caveat");
  if (/inferred/i.test(explicitLine)) fail(`ACT explicit (491 Only) line should NOT carry the inference caveat: "${explicitLine}"`);
  else ok("ACT explicit (491 Only) line does not carry the inference caveat");
}

console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
process.exitCode = failures === 0 ? 0 : 1;
