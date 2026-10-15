/**
 * "Update from official source": quote validation, rejection of values the text does not state, partial approval, the audit trail (source URL and date,
 * last verified = the date entered), replacement of the state's chat knowledge, file extraction and the occupation-list diff. Database-free: an in-memory
 * store, an in-memory knowledge index and a stubbed proposer.
 *
 *   npx tsx scripts/test-source-update.ts
 */
import "./lib/stub-request-context";

import { readFileSync } from "node:fs";

import { strToU8, zipSync } from "fflate";
import * as XLSX from "xlsx";

import { seedStatePrograms } from "../lib/admin-data/service";
import { memoryStore } from "../lib/admin-data/store";
import { extractUpload, MAX_UPLOAD_BYTES } from "../lib/admin-data/source-update/extract";
import { ADMIN_SOURCE_ORIGIN, memoryKnowledgeIndex, stateSourcePattern } from "../lib/admin-data/source-update/knowledge";
import { bundledOccupationList, diffOccupationLists, parseOccupationSheets } from "../lib/admin-data/source-update/occupations";
import { quoteInSource, verifyProposals, type RawProposal } from "../lib/admin-data/source-update/propose";
import { approveSourceUpdate, createSourceUpdate, discardSourceUpdate } from "../lib/admin-data/source-update/update";
import { matchOccupationToState } from "../lib/state-nomination/occupation-match";
import { translationOf } from "../lib/admin-data/types";
import { buildSeedPrograms } from "../lib/admin-data/seed";

let failures = 0;
const t = (label: string, cond: boolean, detail = "") => {
  if (cond) console.log(`  ✅ ${label}`);
  else {
    failures++;
    console.error(`  ❌ ${label}${detail ? ` -- ${detail}` : ""}`);
  }
};
const section = (s: string) => console.log(`\n${s}`);

const ADMIN = { id: "u-1", email: "admin@logivisa.test", label: "admin@logivisa.test" };
const NOW = new Date("2026-10-16T09:00:00Z");

const SOURCE = [
  "Migration Tasmania — program update",
  "The 2026-27 allocation for subclass 190 is 1,350 places and the allocation for subclass 491 is 800 places.",
  "The program will open to new registrations on 3 November 2026.",
  "Applications for the Overseas Skilled Occupation Profiles pathway are now closed: sufficient applications have been received.",
  "The Tasmanian Established Resident pathway requires 2 years living in Tasmania.",
  "The nomination service fee is AUD 400 (AUD 440 incl. GST).",
].join("\n");

const raw = (over: Partial<RawProposal>): RawProposal => ({ field: "allocation", subclass: "190", conditionId: null, value: "1350", exceptionSubclass: null, exceptionAppliesTo: null, exceptionDeadline: null, conditionKind: null, conditionResidenceRule: null, conditionSubclasses: null, quote: "The 2026-27 allocation for subclass 190 is 1,350 places", ...over });

async function fresh() {
  const store = memoryStore();
  await seedStatePrograms(store, ADMIN, NOW);
  return store;
}

async function main() {
  const program = buildSeedPrograms().TAS;

  section("1. a proposal is kept only if its quote is in the text");
  t("a quote found with other spacing, case and typographic quotes is accepted", quoteInSource("the  PROGRAM will open to new registrations on 3 November 2026", SOURCE) && quoteInSource("Migration Tasmania - program update", SOURCE));
  t("a quote that is not in the text is rejected", (() => { const r = verifyProposals([raw({ quote: "The allocation for subclass 190 has been raised to 1,350 places" })], program, SOURCE); return r.accepted.length === 0 && /not in the source/.test(r.rejected[0].reason); })());
  t("a very short quote is not enough", !quoteInSource("1,350", SOURCE));
  t("a verified allocation is kept with its quote, current and proposed value", (() => { const r = verifyProposals([raw({})], program, SOURCE); return r.accepted.length === 1 && r.accepted[0].proposed === "1350" && r.accepted[0].current === "1250" && /1,350/.test(r.accepted[0].quote); })());

  section("2. a value the text does not state is rejected");
  const rej = (over: Partial<RawProposal>, re: RegExp, p = program) => { const r = verifyProposals([raw(over)], p, SOURCE); return r.accepted.length === 0 && re.test(r.rejected[0]?.reason ?? ""); };
  t("an allocation that is not in its quote (900 vs 1,350)", rej({ value: "900" }, /900 is not stated/));
  t("an opening date that the quote does not state", rej({ field: "openingDate", subclass: null, value: "2026-11-04", quote: "The program will open to new registrations on 3 November 2026" }, /2026-11-04/));
  t("a closing date taken from nowhere", rej({ field: "closingDate", subclass: null, value: "2027-06-30", quote: "The program will open to new registrations on 3 November 2026" }, /2027-06-30/));
  t("a status the quote does not support (Open from a 'closed' sentence)", rej({ field: "status", subclass: null, value: "Open (Onshore & Offshore)", quote: "Applications for the Overseas Skilled Occupation Profiles pathway are now closed" }, /does not say/));
  t("a status that is not one of the statuses", rej({ field: "status", subclass: null, value: "Mostly open", quote: "sufficient applications have been received" }, /not one of/));
  t("a program year the quote does not contain", rej({ field: "programYear", subclass: null, value: "2027-28", quote: "The 2026-27 allocation for subclass 190 is 1,350 places" }, /2027-28/));
  t("a note that introduces a figure the source does not have", (() => { const r = verifyProposals([raw({ field: "note", subclass: null, value: "Tasmania has 3,000 places this year.", quote: "The 2026-27 allocation for subclass 190 is 1,350 places" })], program, SOURCE); return r.accepted.length === 0 && /3,000/.test(r.rejected[0].reason); })());
  t("a note whose figures are all in the source is kept", verifyProposals([raw({ field: "note", subclass: null, value: "Tasmania's 2026-27 allocation is 1,350 places for subclass 190 and 800 for subclass 491.", quote: "The 2026-27 allocation for subclass 190 is 1,350 places" })], program, SOURCE).accepted.length === 1);
  t("a residence tag on a sentence that states no residence requirement", rej({ field: "condition_add", subclass: null, value: "Documents must be certified.", conditionKind: "residence", conditionResidenceRule: "required", quote: "The nomination service fee is AUD 400 (AUD 440 incl. GST)" }, /figures|residence/));
  t("a residence tag on a sentence that does state it is kept", (() => { const r = verifyProposals([raw({ field: "condition_add", subclass: null, value: "The Tasmanian Established Resident pathway requires 2 years living in Tasmania.", conditionKind: "residence", conditionResidenceRule: "required", conditionSubclasses: [], quote: "The Tasmanian Established Resident pathway requires 2 years living in Tasmania." })], program, SOURCE); return r.accepted.length === 1 && (r.accepted[0].value as { residenceRule: string }).residenceRule === "required"; })());
  t("an exception deadline that the quote does not state", rej({ field: "exceptions", subclass: null, value: "Onshore applicants may apply.", exceptionDeadline: "2027-09-30", quote: "The program will open to new registrations on 3 November 2026" }, /2027-09-30/));
  t("an edit of a condition that does not exist", rej({ field: "condition_edit", subclass: null, conditionId: "c99", value: "x", quote: "The program will open to new registrations on 3 November 2026" }, /no such condition/));
  t("a value equal to the current one is not a proposal", verifyProposals([raw({ value: "1250", quote: "The 2026-27 allocation for subclass 190 is 1,350 places" })], program, "The 2026-27 allocation for subclass 190 is 1,250 places").accepted.length === 0);

  section("3. partial approval, the audit trail, last verified");
  const store = await fresh();
  const knowledge = memoryKnowledgeIndex([
    { source: "TAS user-confirmed program settings (checked 2026-10-13).md", category: "2026-27", content: "old tas" },
    { source: "TAS Migration Tasmania skilled migration.md", category: "2026-27", content: "old tas 2" },
    { source: "NSW Skilled Nominated visa (subclass 190).md", category: "2026-27", content: "nsw" },
    { source: "ACS Skills assessment fees.pdf", category: "Skill Assessments", content: "acs" },
    { source: "TAS Skills Assessment note.pdf", category: "Skill Assessments", content: "must survive" },
    { source: "Subclass 190 skilled nominated visa.pdf", category: "visas", content: "visa" },
  ]);
  const proposer = async () => [
    raw({}),
    raw({ field: "openingDate", subclass: null, value: "2026-11-03", quote: "The program will open to new registrations on 3 November 2026" }),
    raw({ field: "status", subclass: null, value: "Suspended / Closed", quote: "Applications for the Overseas Skilled Occupation Profiles pathway are now closed: sufficient applications have been received" }),
    raw({ value: "900", subclass: "491" }),
    raw({ quote: "The allocation was invented" }),
  ];
  const created = await createSourceUpdate({ store, knowledge, proposer }, ADMIN, { stateCode: "TAS", sourceUrl: "https://www.migration.tas.gov.au/skilled_migration", checkedOn: "2026-10-15", fileName: null, kind: "text", text: SOURCE, truncated: false }, NOW);
  t("the update is created with 3 verified proposals and 2 rejected", created.ok && created.record.proposals.length === 3 && created.record.rejected.length === 2, JSON.stringify(created.ok ? created.record.rejected : created));
  if (!created.ok) throw new Error("cannot continue");
  t("the review lists the documents that approval would remove, and only this state's sources (not a skills assessment, not another state)", (() => { const names = created.record.knowledge.remove.map((d) => d.source); return names.length === 2 && names.every((n) => n.startsWith("TAS ") && !/Skills Assessment/.test(n)); })());
  t("the extracted source text is kept with the update record", (store.audits.find((a) => a.id === created.id)?.newValue as { text: string }).text === SOURCE);
  const before = (await store.get("TAS"))!;
  const ids = created.record.proposals.map((p) => p.id);
  const part = await approveSourceUpdate({ store, knowledge }, ADMIN, { updateId: created.id, proposalIds: [ids[0], ids[1]] }, NOW);
  const after = (await store.get("TAS"))!;
  t("approving two of three saves exactly those two", part.ok && after.subclasses.find((s) => s.subclass === "190")!.allocation === 1350 && after.openingDate === "2026-11-03" && after.status === before.status && after.status !== "Suspended / Closed", JSON.stringify(part));
  t("the unapproved change is not saved", after.status === "Open (Onshore only)");
  t("last verified is the date entered (not the save time), by the admin", after.lastVerifiedAt.startsWith("2026-10-15") && after.lastVerifiedBy === ADMIN.label);
  const logged = store.audits.filter((a) => a.action === "source_update" && a.entityType === "state_program");
  t("every saved field is logged with the source URL, date and the quote, under the admin's identity", logged.length >= 2 && logged.every((a) => a.actorEmail === ADMIN.email && /migration\.tas\.gov\.au/.test(a.note ?? "") && /2026-10-15/.test(a.note ?? "")) && logged.some((a) => a.fieldPath === "subclasses.190" && /1,350 places/.test(a.note ?? "")) && logged.some((a) => a.fieldPath === "openingDate"), JSON.stringify(logged.map((a) => [a.fieldPath, a.note])));
  t("the history of the state does not show the (large) source records", (await store.history("TAS", 50)).every((a) => a.entityType === "state_program"));
  const again = await approveSourceUpdate({ store, knowledge }, ADMIN, { updateId: created.id, proposalIds: [ids[2]] }, NOW);
  t("an update that was decided cannot be approved again", !again.ok && /already decided/.test(again.issues.join()));

  section("4. the chat knowledge is replaced, never mixed");
  t("the approval removed the state's old source chunks and added the new source", part.ok && part.knowledge.ok === true && part.knowledge.removedChunks === 2 && part.knowledge.addedChunks >= 1);
  const names = knowledge.chunks.map((c) => c.source);
  t("TAS old sources are gone; NSW, the skills assessment documents and the visa document are untouched", !names.includes("TAS user-confirmed program settings (checked 2026-10-13).md") && names.includes("NSW Skilled Nominated visa (subclass 190).md") && names.includes("TAS Skills Assessment note.pdf") && names.includes("ACS Skills assessment fees.pdf") && names.includes("Subclass 190 skilled nominated visa.pdf"));
  t("the new source is tagged with the state, the origin and the date", knowledge.chunks.some((c) => c.state === "TAS" && c.origin === ADMIN_SOURCE_ORIGIN && /2026-10-15/.test(c.source)));
  const second = await createSourceUpdate({ store, knowledge, proposer: async () => [raw({ value: "1400", quote: "The 2026-27 allocation for subclass 190 is 1,400 places" })] }, ADMIN, { stateCode: "TAS", sourceUrl: null, checkedOn: "2026-10-16", fileName: "tas.docx", kind: "docx", text: "The 2026-27 allocation for subclass 190 is 1,400 places. Updated 16 October 2026 by Migration Tasmania.", truncated: false }, NOW);
  if (!second.ok) throw new Error("second update failed");
  t("a second update lists the first update's chunks for removal", second.record.knowledge.remove.some((d) => /admin source update 2026-10-15/.test(d.source)));
  const secondApproved = await approveSourceUpdate({ store, knowledge }, ADMIN, { updateId: second.id, proposalIds: ["p1"] }, NOW);
  t("approving it leaves only the newest admin source of the state in the index", secondApproved.ok && knowledge.chunks.filter((c) => c.state === "TAS" && c.origin === ADMIN_SOURCE_ORIGIN).every((c) => /2026-10-16/.test(c.source)) && !knowledge.chunks.some((c) => /2026-10-15\.txt/.test(c.source)));
  const failing = { ...knowledge, async replace() { throw new Error("embedding service down"); } };
  const third = await createSourceUpdate({ store, knowledge: failing, proposer: async () => [raw({ value: "1500", quote: "The 2026-27 allocation for subclass 190 is 1,500 places" })] }, ADMIN, { stateCode: "TAS", sourceUrl: null, checkedOn: "2026-10-16", fileName: null, kind: "text", text: "The 2026-27 allocation for subclass 190 is 1,500 places. A fresh update from Migration Tasmania.", truncated: false }, NOW);
  if (!third.ok) throw new Error("third update failed");
  const chunksBefore = knowledge.chunks.length;
  const thirdApproved = await approveSourceUpdate({ store, knowledge: failing }, ADMIN, { updateId: third.id, proposalIds: ["p1"] }, NOW);
  t("if indexing fails the data is saved, the failure is reported and no chunk was removed", thirdApproved.ok && thirdApproved.knowledge.ok === false && /embedding service down/.test((thirdApproved.knowledge as { error: string }).error) && knowledge.chunks.length === chunksBefore && (await store.get("TAS"))!.subclasses[0].allocation === 1500);
  const fourth = await createSourceUpdate({ store, knowledge, proposer }, ADMIN, { stateCode: "TAS", sourceUrl: null, checkedOn: "2026-10-16", fileName: null, kind: "text", text: SOURCE, truncated: false }, NOW);
  if (!fourth.ok) throw new Error("fourth update failed");
  const chunksBefore2 = knowledge.chunks.map((c) => c.source).join("|");
  const dis = await discardSourceUpdate({ store }, ADMIN, fourth.id, NOW);
  const afterDiscard = await approveSourceUpdate({ store, knowledge }, ADMIN, { updateId: fourth.id, proposalIds: ["p1"] }, NOW);
  t("Discard saves nothing, indexes nothing and the update cannot be approved afterwards", dis.ok && !afterDiscard.ok && knowledge.chunks.map((c) => c.source).join("|") === chunksBefore2);
  t("approving nothing is refused", !(await approveSourceUpdate({ store, knowledge }, ADMIN, { updateId: (await createSourceUpdate({ store, knowledge, proposer }, ADMIN, { stateCode: "TAS", sourceUrl: null, checkedOn: "2026-10-16", fileName: null, kind: "text", text: SOURCE, truncated: false }, NOW) as { id: string }).id, proposalIds: [] }, NOW)).ok);
  t("a proposal whose current value changed since (edited meanwhile) is refused", await (async () => {
    const s = await fresh();
    const c = await createSourceUpdate({ store: s, knowledge: memoryKnowledgeIndex(), proposer: async () => [raw({})] }, ADMIN, { stateCode: "TAS", sourceUrl: null, checkedOn: "2026-10-15", fileName: null, kind: "text", text: SOURCE, truncated: false }, NOW);
    if (!c.ok) return false;
    const p = (await s.get("TAS"))!;
    p.subclasses[0].allocation = 1111;
    await s.save(p, [], ADMIN, NOW);
    const r = await approveSourceUpdate({ store: s, knowledge: memoryKnowledgeIndex() }, ADMIN, { updateId: c.id, proposalIds: ["p1"] }, NOW);
    return !r.ok && /changed since/.test(r.issues.join());
  })());
  t("an unknown change id is refused", await (async () => { const r = await approveSourceUpdate({ store, knowledge }, ADMIN, { updateId: "nope", proposalIds: ["p1"] }, NOW); return !r.ok; })());

  section("5. English that changes drops the translations; fee figures are approved as a pair");
  const s5 = await fresh();
  const k5 = memoryKnowledgeIndex();
  const noteSrc = "Tasmania update: the 2026-27 allocation for subclass 190 is 1,350 places and for subclass 491 is 800 places.";
  const c5 = await createSourceUpdate({ store: s5, knowledge: k5, proposer: async () => [raw({ field: "note", subclass: null, value: "Tasmania's 2026-27 allocation is 1,350 places for subclass 190 and 800 for subclass 491.", quote: "the 2026-27 allocation for subclass 190 is 1,350 places and for subclass 491 is 800 places" })] }, ADMIN, { stateCode: "TAS", sourceUrl: null, checkedOn: "2026-10-15", fileName: null, kind: "text", text: noteSrc, truncated: false }, NOW);
  if (!c5.ok) throw new Error("c5 failed");
  const had = (await s5.get("TAS"))!.notes;
  const a5 = await approveSourceUpdate({ store: s5, knowledge: k5 }, ADMIN, { updateId: c5.id, proposalIds: ["p1"] }, NOW);
  const noteNow = (await s5.get("TAS"))!.notes;
  t("the note changes and its old Turkish / Chinese translations are removed (customers see English until re-reviewed)", a5.ok && Boolean(translationOf(had, "tr")) && !translationOf(noteNow, "tr") && !translationOf(noteNow, "zh-Hans") && a5.droppedTranslations.includes("note"));
  const feeSrc = "The nomination service fee is AUD 400 (AUD 440 incl. GST) for subclass 190.";
  const feeRaw = [raw({ field: "feeExclGst", value: "400", quote: "The nomination service fee is AUD 400 (AUD 440 incl. GST)" }), raw({ field: "feeInclGst", value: "440", quote: "The nomination service fee is AUD 400 (AUD 440 incl. GST)" })];
  const cf = await createSourceUpdate({ store: s5, knowledge: k5, proposer: async () => feeRaw }, ADMIN, { stateCode: "TAS", sourceUrl: null, checkedOn: "2026-10-15", fileName: null, kind: "text", text: feeSrc, truncated: false }, NOW);
  if (!cf.ok) throw new Error("fee update failed");
  const onlyOne = await approveSourceUpdate({ store: s5, knowledge: k5 }, ADMIN, { updateId: cf.id, proposalIds: ["p1"] }, NOW);
  t("approving only one of the two fee figures is refused (the other would be out of date)", !onlyOne.ok && /together/.test(onlyOne.issues.join()));
  const both = await approveSourceUpdate({ store: s5, knowledge: k5 }, ADMIN, { updateId: cf.id, proposalIds: ["p1", "p2"] }, NOW);
  const feeNow = (await s5.get("TAS"))!.subclasses[0];
  t("both together are saved: 400 excl. / 440 incl. GST", both.ok && feeNow.feeExclGst === 400 && feeNow.feeInclGst === 440, JSON.stringify(feeNow));
  const sNew = await fresh();
  const cs = await createSourceUpdate({ store: sNew, knowledge: memoryKnowledgeIndex(), proposer: async () => [raw({ field: "status", subclass: null, value: "Suspended / Closed", quote: "Applications are now closed: sufficient applications have been received" })] }, ADMIN, { stateCode: "TAS", sourceUrl: null, checkedOn: "2026-10-15", fileName: null, kind: "text", text: "Tasmania update. Applications are now closed: sufficient applications have been received. Thank you.", truncated: false }, NOW);
  if (!cs.ok) throw new Error("status update failed");
  const as = await approveSourceUpdate({ store: sNew, knowledge: memoryKnowledgeIndex() }, ADMIN, { updateId: cs.id, proposalIds: ["p1"] }, NOW);
  const tas = (await sNew.get("TAS"))!;
  t("a new status brings the scoring inputs with it (closed / closed, closed quota pressure) and passes the same validation as a manual save", as.ok && tas.status === "Suspended / Closed" && tas.scoring.onshoreAvailability === "closed" && tas.scoring.offshoreAvailability === "closed" && tas.scoring.offshoreQuotaPressure === "closed", JSON.stringify(as));

  section("6. files: PDF / DOCX / XLSX / CSV, 10 MB, admin only");
  const xml = `<?xml version="1.0"?><w:document xmlns:w="x"><w:body><w:p><w:r><w:t>The 2026-27 allocation is 1,350 &amp; more.</w:t></w:r></w:p><w:p><w:r><w:t>Second paragraph.</w:t></w:r></w:p></w:body></w:document>`;
  const docx = zipSync({ "word/document.xml": strToU8(xml), "[Content_Types].xml": strToU8("<Types/>") });
  const d = await extractUpload("update.docx", docx);
  t("DOCX: paragraphs and entities are read", d.kind === "docx" && /allocation is 1,350 & more\.\nSecond paragraph\./.test(d.text), d.text);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Fee", "AUD"], ["Nomination", "400"]]), "Fees");
  const xlsxBytes = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer);
  const x = await extractUpload("fees.xlsx", xlsxBytes);
  t("XLSX: every sheet becomes text with its name", x.kind === "xlsx" && /## Fees\nFee\tAUD\nNomination\t400/.test(x.text));
  const csv = await extractUpload("fees.csv", strToU8("Fee,AUD\nNomination,400\n"));
  t("CSV is read", csv.kind === "csv" && /Nomination\t400/.test(csv.text));
  let renamed = "";
  try { await extractUpload("fake.pdf", strToU8("not a pdf at all")); } catch (e) { renamed = (e as Error).message; }
  t("a file whose bytes are not the type its name says is refused", /not a PDF/.test(renamed));
  let big = "";
  try { await extractUpload("big.csv", new Uint8Array(MAX_UPLOAD_BYTES + 1).fill(65)); } catch (e) { big = (e as Error).message; }
  t("a file over 10 MB is refused", /10 MB/.test(big));
  let other = "";
  try { await extractUpload("a.exe", strToU8("MZ")); } catch (e) { other = (e as Error).message; }
  t("other file types are refused", /Only PDF, DOCX, XLSX and CSV/.test(other));

  section("7. occupation lists (XLSX / CSV): codes per subclass, the diff, approved changes feed the occupation match");
  const act = bundledOccupationList("ACT")!;
  const sheetRows: string[][] = [["ANZSCO", "Occupation", "190", "491"], ...act.slice(0, 6).map((r, i) => [r.anzscoCode, r.occupationTitle, i === 0 ? "" : r.subclass190 ? "Y" : "", i === 0 ? "Y" : r.subclass491 ? "Y" : ""]), ["999998", "Software and Applications Programmers nec", "Y", "Y"]];
  const parsed = parseOccupationSheets([{ name: "ACT list", rows: sheetRows }])!;
  t("the codes are found per subclass from the 190 / 491 columns", parsed.subclassSource === "columns" && parsed.rows.length === 7 && parsed.rows.find((r) => r.anzscoCode === "999998")?.subclass190 === true);
  const diff = diffOccupationLists(act, parsed.rows);
  t("the diff against the current ACT list: 1 added, many removed (not in the file), 1 changed (subclass)", diff.added.length === 1 && diff.removed.length === act.length - 6 && diff.changed.length >= 1);
  t("a list that does not say its subclass needs the admin's choice, nothing is assumed", parseOccupationSheets([{ name: "List", rows: sheetRows.map((r) => r.slice(0, 2)) }])!.subclassSource === "none" && parseOccupationSheets([{ name: "List", rows: sheetRows.map((r) => r.slice(0, 2)) }], ["491"])!.rows.every((r) => r.subclass491 && !r.subclass190));
  t("a sheet that is not an occupation list is not parsed as one", parseOccupationSheets([{ name: "Fees", rows: [["Fee", "AUD"], ["Nomination", "400"]] }]) === null);
  const so = await fresh();
  const occCreated = await createSourceUpdate({ store: so, knowledge: memoryKnowledgeIndex(), proposer: async () => { throw new Error("the model must not read an occupation list"); } }, ADMIN, { stateCode: "ACT", sourceUrl: "https://www.act.gov.au/migration", checkedOn: "2026-10-15", fileName: "act-list.xlsx", kind: "xlsx", text: sheetRows.map((r) => r.join("\t")).join("\n"), truncated: false, sheets: [{ name: "ACT list", rows: sheetRows }] }, NOW);
  t("an occupation list is compared by the parser (no model call)", occCreated.ok && occCreated.record.occupation !== null && occCreated.record.proposals.length === 0, JSON.stringify(occCreated.ok ? "" : occCreated));
  if (!occCreated.ok) throw new Error("occupation update failed");
  const picked = [`add:999998`, ...diff.changed.map((c) => `change:${c.anzscoCode}`)];
  const occApproved = await approveSourceUpdate({ store: so, knowledge: memoryKnowledgeIndex() }, ADMIN, { updateId: occCreated.id, proposalIds: [], occupationIds: picked }, NOW);
  const saved = await so.getOccupationList("ACT");
  t("only the approved changes are applied: the new code and the changed rows; the rows missing from the file stay", occApproved.ok && saved !== null && saved.rows.length === act.length + 1 && saved.rows.some((r) => r.anzscoCode === "999998"));
  t("the occupation-list change is in the audit log with the source", so.audits.some((a) => a.entityType === "state_occupation_list" && a.entityKey === "ACT" && /act\.gov\.au/.test(a.note ?? "")));
  t("the occupation match uses the approved list (999998 now MATCHes for ACT 190); without it the bundled list says NOT_ON_LIST", matchOccupationToState("999998", "ACT", "190", { ACT: { rows: saved!.rows } }).type === "MATCH" && matchOccupationToState("999998", "ACT", "190").type === "NOT_ON_LIST");
  t("the first row of the file moved from 190 to 491 only in the approved list", (() => { const code = act[0].anzscoCode; const r = saved!.rows.find((x) => x.anzscoCode === code)!; return r.subclass491 && !r.subclass190; })());

  section("8. the page and the actions");
  const actions = readFileSync("app/[locale]/(portal)/admin/crm/states/actions.ts", "utf8");
  const fnBody = (name: string) => actions.slice(actions.indexOf(`export async function ${name}`), actions.indexOf(`export async function ${name}`) + 600);
  t("the three source-update actions check for an ADMIN user first", ["proposeSourceUpdateAction", "approveSourceUpdateAction", "discardSourceUpdateAction"].every((n) => /await requireAdminActor\(\)/.test(fnBody(n))));
  t("the page shows the panel above the editor", /SourceUpdatePanel[\s\S]*<StateEditor/.test(readFileSync("app/[locale]/(portal)/admin/crm/states/[code]/page.tsx", "utf8")));
  t("the upload limit is 10 MB in the server action configuration", /bodySizeLimit: "10mb"/.test(readFileSync("next.config.ts", "utf8")));
  t("the state file-name pattern never matches a skills-assessment authority", (() => { const re = new RegExp(stateSourcePattern("SA")!, "i"); return re.test("SA Skilled Migration.md") && !re.test("ACS Skills assessment.pdf") && !re.test("SAMPLE.pdf"); })());

  console.log(failures === 0 ? "\n✅ ALL CHECKS PASSED" : `\n❌ ${failures} CHECK(S) FAILED`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
