import type { ReportView } from "@/lib/reports/report-view";

type Rgb = { r: number; g: number; b: number };

/**
 * The drawing primitives of generateReadinessPDF that the information-first report uses. Passed in (not imported)
 * because they close over the jsPDF document and the page cursor.
 */
export type ReportV2Helpers = {
  addSectionHeading(symbol: string, heading: string): void;
  addHeading(heading: string): void;
  addBody(text: string, indent?: number): void;
  addSmallText(text: string, indent?: number): void;
  addBulletPoints(items: string[]): void;
  addPremiumBulletContainer(title: string, items: string[], accent?: Rgb): void;
  addPremiumKeyValueContainer(title: string, rows: Array<[string, string]>, accent?: Rgb): void;
  drawTable(headers: string[], rows: string[][], columnWidths: number[], getCellColor?: (rowIndex: number, colIndex: number, cell: string) => Rgb | null): void;
  /** Starts a new page when fewer than this many mm remain (keeps a heading with its table). */
  ensureSpace(mm: number): void;
  /** Starts a new page unless the cursor is already at the top of one. */
  startNewPage(): void;
  /** A hyperlink line (label, then the URL) in the resources list. */
  addLink(label: string, url: string): void;
  COLORS: { accent: Rgb; primary: Rgb; riskHigh: Rgb; riskMedium: Rgb; riskLow: Rgb };
};

/**
 * The customer-facing report body, from the cover's end to the last page: the target visa, points, other visas, state
 * and territory information, typical process, costs, appendix (lib/reports/report-view.ts has the data and the order).
 * Tables are drawn in one neutral style: no status colours, no scores, no ordering by fit.
 */
export function renderReportV2(h: ReportV2Helpers, view: ReportView): void {
  const { titles } = view;

  // 2. Target visa (or "Not sure")
  h.startNewPage();
  h.addSectionHeading("", titles.target);
  const t = view.target;
  h.addBody(t.subjectLine);
  h.ensureSpace(55);
    h.addHeading(t.suppliedTitle);
  // One compact line per fact (a table row is 12 mm tall): label, value, and the label that says where it comes from.
  t.supplied.forEach(([fact, value, tag]) => h.addSmallText(`${fact}: ${value}  [${tag}]`, 2));
  if (t.requirements.length > 0) {
    h.ensureSpace(55);
    h.addHeading(t.requirementsTitle);
    h.drawTable([...t.requirementsHeaders], t.requirements.map((r) => [r.requirement, r.entered, r.source, r.statusLabel]), [0.28, 0.32, 0.24, 0.16]);
    h.addSmallText(t.statusLegend, 0);
  } else if (t.notApplicableNote) {
    h.addSmallText(t.notApplicableNote, 0);
  }
  h.ensureSpace(55);
    h.addHeading(t.notProvidedTitle);
  if (t.notProvided.length > 0) h.addSmallText(t.notProvided.join("; "), 0);
  else h.addSmallText(t.notProvidedNone, 0);

  // 3. Points
  const p = view.points;
  if (p.applicable) {
    h.ensureSpace(50);
    h.addSectionHeading("", titles.points);
    h.addSmallText(p.intro, 0);
    if (p.stageNote) h.addSmallText(p.stageNote, 0);
    h.drawTable([...p.headers], p.rows, [0.34, 0.12, 0.1, 0.44]);
    if (p.totals.length > 0) {
      h.ensureSpace(55);
    h.addHeading(p.totalsTitle);
      h.drawTable(p.totalsHeaders, p.totals, [0.15, 0.17, 0.16, 0.16, 0.16, 0.2]);
      h.addSmallText(p.totalsNote, 0);
    }
    if (p.scenarios.length > 0) {
      h.ensureSpace(55);
    h.addHeading(p.scenariosTitle);
      h.drawTable([...p.scenariosHeaders], p.scenarios.map((s) => [...s]), [0.66, 0.17, 0.17]);
      h.addSmallText(p.scenariosNote, 0);
    }
  }

  // 4. Other visas / Pathway Overview
  const o = view.others;
  // Without a state section after it, the comparison starts a page of its own; with one, the two share pages.
  if (view.states.applicable) h.ensureSpace(60);
  else h.startNewPage();
  h.addSectionHeading("", o.title);
  h.addSmallText(o.intro, 0);
  h.drawTable(o.headers, o.rows, [0.16, 0.14, 0.11, 0.15, 0.28, 0.16]);
  h.addSmallText(o.note, 0);

  // 5. State and territory program information
  const s = view.states;
  if (s.applicable) {
    h.ensureSpace(60);
  h.addSectionHeading("", s.title);
    h.addSmallText(s.intro, 0);
    h.drawTable(s.headers, s.rows, [0.19, 0.15, 0.44, 0.22]);
    h.addSmallText(s.note, 0);
  }

  // 6. Typical process and published timeframes
  const pr = view.process;
  if (pr.applicable) {
    h.ensureSpace(60);
  h.addSectionHeading("", pr.title);
    h.addSmallText(pr.intro, 0);
    h.drawTable([...pr.headers], pr.rows.map((r) => [...r]), [0.2, 0.55, 0.25]);
  }

  // 7. Costs
  const c = view.costs;
  h.startNewPage();
  h.addSectionHeading("", titles.costs);
  if (c.rows.length > 0) h.drawTable([...c.headers], c.rows.map((r) => [r.item, r.amount, r.included ? c.yes : c.no, r.source]), [0.3, 0.31, 0.1, 0.29]);
  c.totalLines.forEach((l) => h.addSmallText(l, 0));
  if (c.note) h.addSmallText(c.note, 0);
  c.notes.forEach((n) => h.addSmallText(n, 0));
  if (c.skillsDoneNote) h.addSmallText(c.skillsDoneNote, 0);
  if (c.livingLine) h.addSmallText(c.livingLine, 0);

  // 8. Appendix
  const a = view.appendix;
  h.ensureSpace(60);
  h.addSectionHeading("", titles.appendix);
  if (a.documents.length > 0) {
    h.ensureSpace(55);
    h.addHeading(a.documentsTitle);
    h.addBulletPoints(a.documents.map((d) => `${d.category}: ${d.items}`));
  }
  if (a.resources.length > 0) {
    h.ensureSpace(55);
    h.addHeading(a.resourcesTitle);
    for (const group of a.resources) {
      h.addSmallText(group.heading, 0);
      group.links.forEach((l) => h.addLink(l.label, l.url));
    }
  }
  if (a.sources.length > 0) {
    h.ensureSpace(55);
    h.addHeading(a.sourcesTitle);
    h.addBulletPoints(a.sources);
  }
  // The disclaimer is printed once, by the running footer of the last page (addGlobalFooters).
}
