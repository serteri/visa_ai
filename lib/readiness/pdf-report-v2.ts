import type { ReportView } from "@/lib/reports/report-view";

type Rgb = { r: number; g: number; b: number };

/**
 * The drawing primitives of generateReadinessPDF that the restructured report uses. Passed in (not imported) because
 * they close over the jsPDF document and the page cursor.
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
  /** Starts a new page unless the cursor is already at the top of one. */
  startNewPage(): void;
  /** A hyperlink line (label, then the URL) in the resources list. */
  addLink(label: string, url: string): void;
  COLORS: { accent: Rgb; primary: Rgb; riskHigh: Rgb; riskMedium: Rgb; riskLow: Rgb };
};

const statusColor = (status: string, c: ReportV2Helpers["COLORS"]): Rgb =>
  status === "eligible" ? c.riskLow : status === "not_eligible_now" ? c.riskHigh : c.riskMedium;

/**
 * The customer-facing report body, from the cover's end to the last page: verdict, points, visa by visa, states,
 * action plan, costs, appendix (see lib/reports/report-view.ts for the data and the order).
 */
export function renderReportV2(h: ReportV2Helpers, view: ReportView): void {
  const { titles } = view;

  // 2. Verdict
  h.startNewPage();
  h.addSectionHeading("", titles.verdict);
  const v = view.verdict;
  if (v.best) {
    const rows: Array<[string, string]> = [[v.labels.status, v.best.statusLabel]];
    if (v.why) rows.push([v.labels.why, v.why]);
    h.addPremiumKeyValueContainer(v.best.label, rows, h.COLORS.accent);
  }
  if (v.distance.length > 0) {
    if (v.distanceHasPotential) h.drawTable(v.distanceHeaders, v.distance.map((r) => [r.visa, r.score, r.withAssessment || r.score, r.vsMinimum, r.vsRecent]), [0.1, 0.24, 0.2, 0.2, 0.26]);
    else h.drawTable(v.distanceHeaders, v.distance.map((r) => [r.visa, r.score, r.vsMinimum, r.vsRecent]), [0.13, 0.3, 0.25, 0.32]);
    if (v.benchmarkSentence) h.addSmallText(v.benchmarkSentence, 0);
  }
  if (v.fastestWay) h.addPremiumBulletContainer(v.fastestWay.title, [v.fastestWay.text], h.COLORS.accent);
  if (v.nextActions.length > 0) h.addPremiumBulletContainer(v.nextActionsTitle, v.nextActions, h.COLORS.accent);
  // Cost and time: full-width lines ("Estimated total (primary applicant): AUD ..."), not a label column.
  const facts: string[] = [];
  if (v.costLine) facts.push(`${v.costLine.title}: ${v.costLine.text}`);
  v.extraCostLines.forEach((l) => facts.push(`${l.title}: ${l.text}`));
  if (v.timelineLine) facts.push(`${v.timelineLine.title}: ${v.timelineLine.text}`);
  if (facts.length > 0) h.addPremiumBulletContainer(v.costTimeTitle, facts, h.COLORS.primary);

  // 3. Points
  const p = view.points;
  if (p.rows.length > 0) {
    h.startNewPage();
    h.addSectionHeading("", titles.points);
    if (p.totalLine) h.addBody(p.totalLine);
    if (p.stageNote) h.addSmallText(p.stageNote, 0);
    h.drawTable(p.headers, p.rows, [0.36, 0.12, 0.12, 0.4]);
    if (p.benchmarkSentence) h.addSmallText(p.benchmarkSentence, 0);
    if (p.ways.length > 0 || p.enablingSteps.length > 0) {
      h.addHeading(p.waysTitle);
      p.enablingSteps.forEach((e) => h.addSmallText(e, 0));
      if (p.ways.length > 0) {
        h.drawTable(p.waysHeaders, p.ways.map((w) => [w.action, w.points, w.difficulty, w.note]), [0.4, 0.12, 0.16, 0.32]);
      }
    }
    if (p.scenarios.length > 0) {
      h.addHeading(p.scenariosTitle);
      h.drawTable(p.scenariosHeaders, p.scenarios.map((s) => [...s]), [0.66, 0.17, 0.17]);
    }
  }

  // 4. Visa by visa
  if (view.visas.items.length > 0) {
    h.addSectionHeading("", titles.visas);
    for (const b of view.visas.items) {
      const rows: Array<[string, string]> = [[view.visas.labels.status, b.statusLabel], [b.missingLabel, b.missing.join("; ")]];
      if (b.nextStep) rows.push([view.visas.labels.next, b.nextStep]);
      if (b.after) rows.push([view.visas.labels.after, b.after]);
      if (b.source) rows.push([view.visas.labels.source, b.source]);
      h.addPremiumKeyValueContainer(b.title, rows, statusColor(b.status, h.COLORS));
    }
  }

  // 5. States
  h.addSectionHeading("", titles.states);
  const s = view.states;
  h.addSmallText(s.intro, 0);
  s.availabilityNotes.forEach((n) => h.addSmallText(n, 0));
  if (s.available.length === 0) {
    h.addBody(s.noneAvailable);
  } else {
    for (const a of s.available) {
      const rows: Array<[string, string]> = [[s.labels.reason, a.reason]];
      if (a.conditions.length > 0) rows.push([s.labels.conditions, a.conditions.join(" ")]);
      h.addPremiumKeyValueContainer(`${a.name} (${a.subclasses.join(" / ")})`, rows, h.COLORS.riskLow);
    }
  }
  if (s.unavailable.length > 0) {
    h.addHeading(s.unavailableTitle);
    h.drawTable(s.unavailableHeaders, s.unavailable.map((u) => [u.name, u.reason]), [0.28, 0.72]);
  }

  // 6. Action plan
  h.addSectionHeading("", titles.plan);
  const lodge = view.plan.lodgement;
  if (lodge) {
    h.addHeading(lodge.title);
    h.addBody(lodge.intro);
    h.addBody(lodge.deadline);
    lodge.order.forEach((line) => h.addSmallText(line, 4));
    lodge.leadTimes.forEach((line) => h.addSmallText(line, 4));
  }
  if (view.plan.steps.length > 0) h.drawTable(view.plan.headers, view.plan.steps.map((st) => [st.when, st.what, st.cost]), [0.15, 0.5, 0.35]);

  // 7. Costs
  const c = view.costs;
  h.addSectionHeading("", titles.costs);
  if (c.rows.length > 0) {
    h.drawTable(c.headers, c.rows.map((r) => [r.item, r.amount, r.included ? c.yes : c.no, r.source]), [0.3, 0.31, 0.1, 0.29]);
  }
  if (c.note) h.addSmallText(c.note, 0);
  c.notes.forEach((n) => h.addSmallText(n, 0));
  if (c.skillsDoneNote) h.addSmallText(c.skillsDoneNote, 0);
  if (c.livingLine) h.addSmallText(c.livingLine, 0);

  // 8. Appendix
  h.startNewPage();
  const a = view.appendix;
  h.addSectionHeading("", titles.appendix);
  if (a.beforeLodging.length > 0) {
    h.addHeading(a.beforeLodgingTitle);
    h.addBulletPoints(a.beforeLodging.map((x) => `${x.title} — ${x.detail}`));
  }
  if (a.documents.length > 0) {
    h.addHeading(a.documentsTitle);
    h.addBulletPoints(a.documents.map((d) => `${d.category}: ${d.items}`));
  }
  if (a.pitfalls.length > 0) {
    h.addHeading(a.pitfallsTitle);
    h.addBulletPoints(a.pitfalls.map((x) => `${x.title} — ${x.body}`));
  }
  if (a.resources.length > 0) {
    h.addHeading(a.resourcesTitle);
    for (const group of a.resources) {
      h.addSmallText(group.heading, 0);
      group.links.forEach((l) => h.addLink(l.label, l.url));
    }
  }
  if (a.sources.length > 0) {
    h.addHeading(a.sourcesTitle);
    h.addBulletPoints(a.sources);
  }
  // The disclaimer is printed once, by the running footer of the last page (addGlobalFooters).
}
