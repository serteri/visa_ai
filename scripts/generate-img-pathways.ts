/**
 * Regenerates src/data/health-registration/img-pathways.json from the Medical Board of Australia / Ahpra
 * document "Pathways to registration for international medical graduates" (81 pages) in
 * data/knowledge/Skill Assessments/Pathways to registration for international medical graduates/.
 *
 * data/knowledge is gitignored, so this script and the JSON it writes are the only way the report sees this
 * data (same pattern as scripts/generate-state-occupation-lists.ts). Everything below is PARSED from the PDF's
 * own text structure (page-by-page text, the web page's "<question>? / Collapse" accordion headings, bullet
 * glyphs, the fee table's three numeric columns) -- nothing is hand-transcribed. The parser fails loudly when
 * an expected pathway, section or fee row is missing, so a changed source document can't silently produce a
 * thinner file.
 *
 * Usage:
 *   npx tsx scripts/generate-img-pathways.ts           writes the JSON
 *   npx tsx scripts/generate-img-pathways.ts --check   exits 1 if the committed JSON differs from a fresh parse
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PDFParse } from "pdf-parse";

export const SOURCE_DOCUMENT =
  "data/knowledge/Skill Assessments/Pathways to registration for international medical graduates/Pathways to registration for international medical graduates.pdf";
export const OUT_FILE = "src/data/health-registration/img-pathways.json";
export const PROVENANCE_FILE = "src/data/health-registration/provenance.json";
// Pinned, not "today": the extraction date is part of the committed file, so a regenerate on another day must
// not show up as drift. Bump it when the source document is replaced and the file is regenerated on purpose.
const EXTRACTED_DATE = "2026-09-23";

type Line = { text: string; page: number };

// ── text → lines ─────────────────────────────────────────────────────────────────────────────────────
function toLines(pages: Array<{ num: number; text: string }>): Line[] {
  const out: Line[] = [];
  for (const p of pages) {
    for (const raw of p.text.split(/\r?\n/)) {
      const text = raw.replace(/\s+/g, " ").replace(/&nndash;/g, "–").trim();
      if (text) out.push({ text, page: p.num });
    }
  }
  return out;
}

// Web-page chrome that the PDF export kept: the step navigator and accordion controls.
const NAV_NOISE = new Set([
  "1. Find",
  "Find your pathway",
  "2. Gather",
  "Gather your documents",
  "3. Apply",
  "Apply for registration",
  "the following content related to step",
  "Expand all | Collapse all",
]);
// Group headers that sit directly above an "Expand all | Collapse all" control.
const GROUP_HEADERS = new Set([
  "About this pathway",
  "Eligibility for this pathway",
  "Preparing for this pathway",
  "What documents do I need for",
  "registration",
  "registration?",
  "How to apply for registration",
  "Next steps while registered",
]);

type Section = { heading: string; body: Line[]; pages: number[] };

/** Splits a pathway's lines into its accordion sections: a heading is the line(s) directly above "Collapse". */
function splitSections(lines: Line[]): { intro: Line[]; sections: Section[] } {
  const noise = new Array(lines.length).fill(false);
  lines.forEach((l, i) => {
    if (NAV_NOISE.has(l.text)) noise[i] = true;
    if (l.text === "Expand all | Collapse all") {
      for (let j = i - 1; j >= Math.max(0, i - 2); j--) {
        if (GROUP_HEADERS.has(lines[j].text)) noise[j] = true;
        else break;
      }
    }
  });

  const headingStarts: Array<{ start: number; collapse: number }> = [];
  lines.forEach((l, i) => {
    if (l.text !== "Collapse") return;
    let start = i - 1;
    // A wrapped heading ("...and the requirements" / "while registered on this pathway?"): its continuation
    // line starts lowercase, so keep walking up only while the current top line does (max 3 lines).
    while (
      start - 1 >= 0 &&
      i - start < 3 &&
      /^[a-z]/.test(lines[start].text) &&
      !noise[start - 1] &&
      lines[start - 1].text !== "Collapse" &&
      !(headingStarts.length && start - 1 <= headingStarts[headingStarts.length - 1].collapse)
    ) {
      start--;
    }
    headingStarts.push({ start, collapse: i });
  });

  const clean = (from: number, to: number) => lines.slice(from, to).filter((_, k) => !noise[from + k] && lines[from + k].text !== "Collapse");
  const intro = clean(0, headingStarts.length ? headingStarts[0].start : lines.length);
  const sections: Section[] = headingStarts.map((h, k) => {
    const end = k + 1 < headingStarts.length ? headingStarts[k + 1].start : lines.length;
    const body = clean(h.collapse + 1, end);
    const headingLines = lines.slice(h.start, h.collapse);
    return {
      heading: headingLines.map((l) => l.text).join(" "),
      body,
      pages: [...new Set([...headingLines, ...body].map((l) => l.page))],
    };
  });
  return { intro, sections };
}

// ── body helpers ─────────────────────────────────────────────────────────────────────────────────────
type Block = { kind: "paragraph" | "bullet"; text: string };

// A capitalised line right after a finished bullet ("...criteria." / "Eligible specialist IMGs ...") starts a new
// paragraph -- except these sentence openers, which in this document only ever continue the same bullet
// ("... PSV of your qualifications." / "Contact the AMC for fee information."). Checked against every such
// break in the 81 pages: no other capitalised line continues a bullet.
const BULLET_CONTINUATION = /^(Contact|See|The AMC use|This includes)\b/;

/** The body as ordered paragraph / bullet blocks (wrapped lines joined), so lists and the text between them keep their order. */
function blocksOf(body: Line[]): Block[] {
  const blocks: Block[] = [];
  let current: Block | null = null;
  const close = () => {
    if (current) blocks.push({ kind: current.kind, text: current.text.replace(/\s+/g, " ").trim() });
    current = null;
  };
  body.forEach(({ text }, i) => {
    if (text.startsWith("●")) {
      close();
      current = { kind: "bullet", text: text.replace(/^●\s*/, "") };
    } else if (current?.kind === "bullet") {
      // New paragraph after a bullet: a capitalised line after a finished sentence, or -- after an
      // unpunctuated link-style bullet ("Supervised practice plan - Section G") -- a line opening a sentence.
      const capitalised = /^[A-Z]/.test(text) && !BULLET_CONTINUATION.test(text);
      if (capitalised && (/[.:]$/.test(current.text) || /^(The|When|If|You|We|Once)\b/.test(text))) {
        close();
        current = { kind: "paragraph", text };
      } else {
        current.text += ` ${text}`;
      }
    } else if (current) {
      current.text += ` ${text}`;
    } else {
      current = { kind: "paragraph", text };
    }
    // A paragraph ends at a sentence end, unless the next line carries on in lowercase
    // ("... not on the list Expedited Specialist Pathway:" / "accepted qualifications list:").
    const next = body[i + 1]?.text;
    if (current?.kind === "paragraph" && /[.:]$/.test(current.text) && !(next && /^[a-z]/.test(next))) close();
  });
  close();
  return blocks;
}

/** Paragraphs before the first bullet, the bullets, and any paragraphs after the first bullet. */
function bulletsOf(body: Line[]): { lead: string[]; bullets: string[]; trailing: string[] } {
  const blocks = blocksOf(body);
  const first = blocks.findIndex((b) => b.kind === "bullet");
  const lead = (first < 0 ? blocks : blocks.slice(0, first)).map((b) => b.text);
  const after = first < 0 ? [] : blocks.slice(first);
  return {
    lead,
    bullets: after.filter((b) => b.kind === "bullet").map((b) => b.text),
    trailing: after.filter((b) => b.kind === "paragraph").map((b) => b.text),
  };
}

function paragraphs(body: Line[]): string[] {
  const out: string[] = [];
  let para: string[] = [];
  for (const { text } of body) {
    para.push(text);
    if (/[.:]$/.test(text)) {
      out.push(para.join(" "));
      para = [];
    }
  }
  if (para.length) out.push(para.join(" "));
  return out;
}

function tableStart(body: Line[]): number {
  const i = body.findIndex((l) => l.text === "Timeframe Requirement");
  return i < 0 ? body.length : i;
}

/** "Timeframe Requirement" tables: rows start with "<n> months" / "<n>-<m> months". */
function timeframesOf(body: Line[]): Array<{ timeframe: string; requirement: string }> {
  const i = body.findIndex((l) => l.text === "Timeframe Requirement");
  if (i < 0) return [];
  const rows: Array<{ timeframe: string; requirement: string }> = [];
  for (const { text } of body.slice(i + 1)) {
    const m = text.match(/^(\d+(?:-\d+)? months)\s+(.*)$/);
    // Everything up to the next "<n> months" row belongs to the current row (wrapped text, sub-bullets).
    if (m) rows.push({ timeframe: m[1], requirement: m[2] });
    else if (rows.length) rows[rows.length - 1].requirement += ` ${text.replace(/^●\s*/, "")}`;
  }
  return rows.map((r) => ({ timeframe: r.timeframe, requirement: r.requirement.replace(/\s+/g, " ").trim() }));
}

/** Numbered step lists; the number resetting to 1 starts a new group, whose title is the text above it. */
function numberedGroupsOf(body: Line[]): Array<{ title: string; steps: string[] }> {
  const groups: Array<{ title: string; steps: string[] }> = [];
  let title: string[] = [];
  let current: { title: string; steps: string[] } | null = null;
  let lastEnded = true;
  for (const { text } of body) {
    const m = text.match(/^(\d+)\.\s+(.*)$/);
    if (m) {
      if (m[1] === "1" || !current) {
        current = { title: title.join(" ").trim(), steps: [] };
        groups.push(current);
        title = [];
      }
      current.steps.push(m[2]);
      lastEnded = /[.)]$/.test(m[2]) && !/\($/.test(m[2]);
    } else if (current && !lastEnded) {
      current.steps[current.steps.length - 1] += ` ${text}`;
      lastEnded = /\.$/.test(text);
    } else {
      title.push(text);
      if (current) lastEnded = true;
    }
  }
  return groups.map((g) => ({ title: g.title, steps: g.steps.map((s) => s.replace(/\s+/g, " ").trim()) }));
}

// ── fees ─────────────────────────────────────────────────────────────────────────────────────────────
type FeeOrganisation =
  | "AMC"
  | "ECFMG"
  | "Ahpra / Medical Board of Australia"
  | "Specialist medical college"
  | "CPD home"
  | "Workplace-based assessment (SIMG pays)"
  | "Other assessments on this pathway";

function feeOrganisation(text: string): FeeOrganisation {
  if (/^The AMC charges/.test(text)) return "AMC";
  if (/^ECFMG charges?/.test(text)) return "ECFMG";
  if (/^Ahpra and the Medical Board/.test(text)) return "Ahpra / Medical Board of Australia";
  if (/^(The specialist medical colleges|If you choose to get fellowship)/.test(text)) return "Specialist medical college";
  if (/^(Continuing professional development \(CPD\) homes|CPD homes)/.test(text)) return "CPD home";
  if (/^There are fees for workplace-based assessments/.test(text)) return "Workplace-based assessment (SIMG pays)";
  if (/^There (may be additional fees|are fees for assessments)/.test(text)) return "Other assessments on this pathway";
  throw new Error(`unclassified fee bullet: "${text}"`);
}

/** The sentence(s) that send the reader elsewhere for the amount ("Contact the AMC for fee information."). */
function deferralOf(text: string): string | null {
  const sentences = text.match(/[^.]+\./g) ?? [];
  const deferral = sentences.map((s) => s.trim()).filter((s) => /^(Contact|See)\b/.test(s));
  return deferral.length ? deferral.join(" ") : null;
}

function registrationTypesOf(ahpraBullet: string): string[] {
  const m = ahpraBullet.match(/fee for (.*?) registration\./) ?? ahpraBullet.match(/fee for (registration)\./);
  if (!m) throw new Error(`no registration type in Ahpra fee bullet: "${ahpraBullet}"`);
  const phrase = m[1];
  if (phrase === "registration") return ["registration (type depends on the qualification route)"];
  return (["provisional", "limited", "general", "specialist"] as const).filter((t) => new RegExp(`\\b${t}\\b`).test(phrase));
}

// ── pathways ─────────────────────────────────────────────────────────────────────────────────────────
type PathwaySpec = { id: string; name: string; title: string[] };
const PATHWAYS: PathwaySpec[] = [
  { id: "competent-authority", name: "Competent Authority pathway", title: ["Competent Authority pathway"] },
  { id: "standard", name: "Standard pathway", title: ["Standard pathway"] },
  { id: "expedited-specialist", name: "Expedited Specialist pathway", title: ["Expedited Specialist pathway"] },
  { id: "specialist-recognition", name: "Specialist pathway – specialist recognition", title: ["Specialist pathway - specialist", "recognition"] },
  { id: "specialist-area-of-need", name: "Specialist pathway – area of need", title: ["Specialist pathway - area of need"] },
  { id: "short-term-training", name: "Short-term training in a medical specialty pathway", title: ["Short-term training in a medical", "specialty pathway"] },
  {
    id: "au-nz-graduates-overseas-specialist",
    name: "Australian and NZ medical graduates with overseas specialist qualifications",
    title: ["Australian and NZ medical", "graduates with overseas", "specialist qualifications"],
  },
];
const SIMG_OVERVIEW_TITLE = ["Specialist international", "medical graduates", "(SIMGs)"];
const FEE_SECTION_START = /^Registration fees fund the work of Ahpra/;

function findTitle(lines: Line[], title: string[]): number {
  const hits: number[] = [];
  for (let i = 0; i + title.length <= lines.length; i++) {
    if (title.every((t, k) => lines[i + k].text === t)) hits.push(i);
  }
  if (hits.length !== 1) throw new Error(`title ${JSON.stringify(title)} found ${hits.length} times (expected exactly 1)`);
  return hits[0];
}

function section(sections: Section[], pathwayId: string, patterns: RegExp[], required = true): Section | undefined {
  const hit = sections.find((s) => patterns.some((p) => p.test(s.heading)));
  if (!hit && required) throw new Error(`${pathwayId}: no section matching ${patterns.map(String).join(" | ")} (headings: ${sections.map((s) => s.heading).join(" / ")})`);
  return hit;
}

function buildPathway(spec: PathwaySpec, lines: Line[], titleIndex: number, end: number) {
  const slice = lines.slice(titleIndex + spec.title.length, end);
  const { intro, sections } = splitSections(slice);
  const pages = [...new Set(lines.slice(titleIndex, end).map((l) => l.page))];

  const whoFor = section(sections, spec.id, [/^Who is this pathway for\?/]);
  const leadsTo = section(sections, spec.id, [/^What type of registration does (this pathway|it) lead to\?/]);
  const eligible = section(sections, spec.id, [/^Who is eligible for this pathway\?/]);
  const before = section(sections, spec.id, [/^Before you apply for registration/, /^What is the process to apply\?/]);
  const fees = section(sections, spec.id, [/^What are the fees (on|for IMGs on|for) this pathway\?/]);
  const regType = section(sections, spec.id, [/^What type of registration do I need to apply for( first)?\?/]);
  const whileRegistered = section(sections, spec.id, [/^What are the requirements while registered on this pathway\?/], false);
  const supervision = section(sections, spec.id, [/^What supervision arrangements and PDF forms do I need\?/, /^Supervision arrangements and forms/], false);
  const whenToApply = section(sections, spec.id, [/^When do I submit my application/], false);
  const cpd = section(sections, spec.id, [/^What are the CPD requirements/], false);
  const processOptions = section(sections, spec.id, [/^What is the process to apply for registration and the requirements/], false);
  const areaOfNeed = section(sections, spec.id, [/^How is a position declared an ‘area of need’ position\?/], false);

  const feeParts = bulletsOf(fees!.body);
  if (feeParts.bullets.length < 3) throw new Error(`${spec.id}: only ${feeParts.bullets.length} fee bullets`);
  const feeItems = feeParts.bullets.map((text) => ({ organisation: feeOrganisation(text), text, deferral: deferralOf(text) }));
  const ahpraBullet = feeItems.find((f) => f.organisation === "Ahpra / Medical Board of Australia");
  if (!ahpraBullet) throw new Error(`${spec.id}: no Ahpra/Medical Board fee bullet`);

  return {
    id: spec.id,
    name: spec.name,
    sourcePages: [pages[0], pages[pages.length - 1]],
    summary: paragraphs(intro),
    whoFor: paragraphs(whoFor!.body).join(" "),
    leadsTo: paragraphs(leadsTo!.body),
    eligibility: blocksOf(eligible!.body),
    // Ordered: the steps are the bullets; paragraphs between them are conditions ("If your specialist
    // qualification is on the ... list:") that the following steps depend on.
    processBeforeRegistration: { heading: before!.heading, blocks: blocksOf(before!.body) },
    registrationToApplyFor: blocksOf(regType!.body),
    ...(processOptions ? { registrationOptions: numberedGroupsOf(processOptions.body) } : {}),
    ...(whileRegistered
      ? {
          whileRegistered: {
            summary: blocksOf(whileRegistered.body.slice(0, tableStart(whileRegistered.body))),
            timeframes: timeframesOf(whileRegistered.body),
          },
        }
      : {}),
    ...(supervision ? { supervisedPractice: blocksOf(supervision.body) } : {}),
    ...(whenToApply ? { applicationTiming: paragraphs(whenToApply.body) } : {}),
    ...(cpd ? { cpd: paragraphs(cpd.body) } : {}),
    ...(areaOfNeed ? { areaOfNeedDeclarationProcess: numberedGroupsOf(areaOfNeed.body).map((g) => g.steps).flat() } : {}),
    fees: {
      heading: fees!.heading,
      pages: fees!.pages,
      intro: feeParts.lead.join(" "),
      items: feeItems,
    },
    ahpraRegistrationTypes: registrationTypesOf(ahpraBullet.text),
  };
}

// ── fee schedule ─────────────────────────────────────────────────────────────────────────────────────
function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/\(([^)]*)\)/g, " $1 ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildFeeSchedule(lines: Line[], start: number) {
  const slice = lines.slice(start);
  const titleIdx = slice.findIndex((l) => /^Schedule of fees effective /.test(l.text));
  if (titleIdx < 0) throw new Error("fee schedule title not found");
  const title = slice[titleIdx].text;
  const effectiveDate = title.replace(/^Schedule of fees effective /, "");
  const boardIdx = slice.findIndex((l) => l.text === "Medical Board of Australia");
  const headerEnd = slice.findIndex((l, i) => i > titleIdx && l.text === "NSW ($)");
  if (headerEnd < 0) throw new Error("fee schedule header not found");

  const items: Array<{ id: string; item: string; nationalFeeAud: number; nswRebateOrSurchargeAud: number; nswFeeAud: number; footnote: string | null; page: number }> = [];
  let name: string[] = [];
  let i = headerEnd + 1;
  const num = (s: string) => Number(s.replace(/,/g, ""));
  for (; i < slice.length; i++) {
    const { text, page } = slice[i];
    if (/^\*Payment of both/.test(text)) break;
    const m = text.match(/^([\d,]+)\s+([\d,]+)\s+([\d,]+)$/);
    if (m) {
      const full = name.join(" ").replace(/\s+/g, " ").trim();
      const footnote = /\*\*$/.test(full) ? "**" : /\*$/.test(full) ? "*" : null;
      const item = full.replace(/\*+$/, "").trim();
      if (num(m[1]) - num(m[2]) !== num(m[3])) throw new Error(`fee row does not add up: ${item} ${m[0]}`);
      items.push({ id: slug(item), item, nationalFeeAud: num(m[1]), nswRebateOrSurchargeAud: num(m[2]), nswFeeAud: num(m[3]), footnote, page });
      name = [];
    } else {
      name.push(text);
    }
  }
  if (name.length) throw new Error(`unterminated fee row: ${name.join(" ")}`);
  if (new Set(items.map((x) => x.id)).size !== items.length) throw new Error("duplicate fee row ids");

  // Footnotes and the "Please note that" list follow the table.
  const rest = slice.slice(i).map((l) => l.text);
  const pleaseNote = rest.indexOf("Please note that:");
  const footnoteText = rest.slice(0, pleaseNote < 0 ? rest.length : pleaseNote).join(" ");
  const footnotes = [...footnoteText.matchAll(/(\*{1,2})\s*([^*]+)/g)].map((m) => ({ marker: m[1], text: m[2].replace(/\s+/g, " ").trim() }));
  const notes = pleaseNote < 0 ? { lead: [], bullets: [], trailing: [] } : bulletsOf(rest.slice(pleaseNote + 1).map((text) => ({ text, page: 0 })));

  return {
    title: `${boardIdx >= 0 ? slice[boardIdx].text + " — " : ""}${title}`,
    effectiveDate,
    currency: "AUD",
    pages: [...new Set(slice.slice(titleIdx).map((l) => l.page))],
    columns: {
      nationalFeeAud: "National fee ($)",
      nswRebateOrSurchargeAud: "Rebate or surcharge for NSW registrant ($)",
      nswFeeAud: "Fee for registrants with principal place of practice in NSW ($)",
    },
    fundingStatement: paragraphs(slice.slice(0, boardIdx < 0 ? titleIdx : boardIdx)),
    items,
    footnotes,
    notes: [...notes.lead, ...notes.bullets],
  };
}

// ── main ─────────────────────────────────────────────────────────────────────────────────────────────
export async function buildImgPathways(sourcePath = SOURCE_DOCUMENT) {
  const parser = new PDFParse({ data: readFileSync(sourcePath) });
  const parsed = await parser.getText();
  await parser.destroy();
  const lines = toLines(parsed.pages);

  const starts = PATHWAYS.map((p) => findTitle(lines, p.title));
  const simgOverview = findTitle(lines, SIMG_OVERVIEW_TITLE);
  const feeStart = lines.findIndex((l) => FEE_SECTION_START.test(l.text));
  if (feeStart < 0) throw new Error("fee section not found");
  const boundaries = [...starts, simgOverview, feeStart].sort((a, b) => a - b);
  const endOf = (i: number) => boundaries.find((b) => b > i) ?? lines.length;

  const pathways = PATHWAYS.map((spec, k) => buildPathway(spec, lines, starts[k], endOf(starts[k])));
  const ahpraFeeSchedule = buildFeeSchedule(lines, feeStart);

  const unresolvedFees = pathways.flatMap((p) =>
    p.fees.items
      .filter((f) => f.organisation !== "Ahpra / Medical Board of Australia")
      .map((f) => ({
        pathwayId: p.id,
        organisation: f.organisation,
        text: f.text,
        deferralText: f.deferral,
        status: "needs human verification" as const,
        reason: "This document gives no amount for this fee; it defers to the organisation named.",
      }))
  );

  return {
    sourceDocument: SOURCE_DOCUMENT,
    sourceTitle: lines[0].text === "Pathways to registration" ? "Pathways to registration for international medical graduates" : lines.slice(0, 3).map((l) => l.text).join(" "),
    sourcePageCount: parsed.pages.length,
    extractedDate: EXTRACTED_DATE,
    generatedBy: "scripts/generate-img-pathways.ts",
    documentIntro: paragraphs(lines.slice(3, starts[0]).filter((l) => !/^(Registration self-assessment tool|Which option is right for me\?)$/.test(l.text))),
    specialistOverview: paragraphs(lines.slice(simgOverview + SIMG_OVERVIEW_TITLE.length, endOf(simgOverview))),
    pathways,
    ahpraFeeSchedule,
    unresolvedFees,
  };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function isoDate(text: string): string {
  const m = text.match(/^(\d{1,2}) ([A-Z][a-z]+) (\d{4})$/);
  const month = m ? MONTHS.indexOf(m[2]) : -1;
  if (!m || month < 0) throw new Error(`unparseable date "${text}"`);
  return `${m[3]}-${String(month + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

type Extracted = Awaited<ReturnType<typeof buildImgPathways>>;

/**
 * One provenance fact per extracted item (the fee-provenance.json pattern): every Medical Board fee row and every
 * pathway is "extracted" from this document with its page; every AMC / ECFMG / college / CPD-home / assessment
 * fee is "needs human verification", because the document itself gives no amount and defers elsewhere.
 */
export function buildProvenance(data: Extracted) {
  const effectiveFrom = isoDate(data.ahpraFeeSchedule.effectiveDate);
  const counters = new Map<string, number>();
  return {
    sourceDocument: data.sourceDocument,
    sourceTitle: data.sourceTitle,
    extractedDate: data.extractedDate,
    generatedBy: data.generatedBy,
    facts: [
      ...data.ahpraFeeSchedule.items.map((row) => ({
        id: `mba_fee_${row.id}`,
        description: row.item,
        value: row.nationalFeeAud,
        nswFeeAud: row.nswFeeAud,
        currency: "AUD",
        effective_from: effectiveFrom,
        last_verified: data.extractedDate,
        status: "extracted",
        source: `${data.sourceDocument} p.${row.page} -- "${data.ahpraFeeSchedule.title}", row "${row.item}": national fee ${row.nationalFeeAud}, NSW ${row.nswFeeAud}.`,
      })),
      ...data.pathways.map((p) => ({
        id: `img_pathway_${p.id.replace(/-/g, "_")}`,
        description: `${p.name}: who it is for, eligibility, process, registration type, timeframes, fee responsibilities`,
        value: null,
        last_verified: data.extractedDate,
        status: "extracted",
        source: `${data.sourceDocument} pp.${p.sourcePages[0]}-${p.sourcePages[1]}`,
      })),
      ...data.unresolvedFees.map((f) => {
        const key = `${f.pathwayId}_${f.organisation}`.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
        const n = (counters.get(key) ?? 0) + 1;
        counters.set(key, n);
        const pathway = data.pathways.find((p) => p.id === f.pathwayId)!;
        return {
          id: `deferred_fee_${key}_${n}`,
          description: f.text,
          value: null,
          last_verified: null,
          status: f.status,
          source: `needs human verification -- ${data.sourceDocument} p.${pathway.fees.pages.join("/")} ("${pathway.fees.heading}") names this fee but gives no amount${f.deferralText ? `: "${f.deferralText}"` : "."}`,
        };
      }),
    ],
  };
}

export function serialize(data: unknown): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}

async function main() {
  const check = process.argv.includes("--check");
  if (!existsSync(SOURCE_DOCUMENT)) {
    console.log(`SKIPPED: ${SOURCE_DOCUMENT} is not present (data/knowledge is gitignored) -- nothing to regenerate or check.`);
    return;
  }
  const extracted = await buildImgPathways();
  const out = serialize(extracted);
  const provenance = serialize(buildProvenance(extracted));
  if (check) {
    for (const [file, fresh] of [[OUT_FILE, out], [PROVENANCE_FILE, provenance]] as const) {
      const committed = existsSync(file) ? readFileSync(file, "utf8").replace(/\r\n/g, "\n") : "";
      if (committed !== fresh) {
        console.error(`❌ ${file} drifted from a fresh parse of the source document -- run: npx tsx scripts/generate-img-pathways.ts`);
        process.exitCode = 1;
      } else {
        console.log(`✅ ${file} matches a fresh parse of the source document`);
      }
    }
    return;
  }
  mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, out);
  writeFileSync(PROVENANCE_FILE, provenance);
  const data = JSON.parse(out) as { pathways: unknown[]; ahpraFeeSchedule: { items: unknown[] }; unresolvedFees: unknown[] };
  console.log(`wrote ${OUT_FILE}: ${data.pathways.length} pathways, ${data.ahpraFeeSchedule.items.length} fee-schedule rows, ${data.unresolvedFees.length} deferred fees`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
