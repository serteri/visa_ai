import type { ReportView } from "@/lib/reports/report-view";

type Rgb = { r: number; g: number; b: number };

/**
 * The drawing primitives of generateReadinessPDF that the information-first report uses. Passed in (not imported)
 * because they close over the jsPDF document and the page cursor.
 */
export type ReportV2Helpers = {
  addSectionHeading(symbol: string, heading: string): void;
  addHeading(heading: string): void;
  /** A bold wrapped sub-heading inside a section. */
  addSubHeading(heading: string): void;
  addBody(text: string, indent?: number): void;
  addSmallText(text: string, indent?: number): void;
  addBulletPoints(items: string[]): void;
  addPremiumBulletContainer(title: string, items: string[], accent?: Rgb): void;
  addPremiumKeyValueContainer(title: string, rows: Array<[string, string]>, accent?: Rgb): void;
  drawTable(headers: string[], rows: string[][], columnWidths: number[], getCellColor?: (rowIndex: number, colIndex: number, cell: string) => Rgb | null): void;
  /** The same table, denser (smaller type and padding); no header band when `headers` is empty. */
  drawCompactTable(headers: string[], rows: string[][], columnWidths: number[]): void;
  /** Starts a new page when fewer than this many mm remain (keeps a heading with its table). */
  ensureSpace(mm: number): void;
  /** Starts a new page unless the cursor is already at the top of one. */
  startNewPage(): void;
  /** A hyperlink line (label, then the URL) in the resources list. */
  addLink(label: string, url: string): void;
  COLORS: { accent: Rgb; primary: Rgb; riskHigh: Rgb; riskMedium: Rgb; riskLow: Rgb };
};

/**
 * The customer-facing report body, from the cover's end to the last page: every section of the view (lib/reports/report-view.ts) as
 * neutral blocks. Tables are drawn in one style: no status colours, no scores, no ordering by fit.
 */
export function renderReportV2(h: ReportV2Helpers, view: ReportView): void {
  view.sections.forEach((section, idx) => {
    if (idx === 0) h.startNewPage();
    else h.ensureSpace(60);
    h.addSectionHeading("", section.title);
    for (const b of section.blocks) {
      switch (b.kind) {
        case "heading":
          h.ensureSpace(40);
          h.addSubHeading(b.text);
          if (b.marked) h.addSmallText(`[ ${b.marked} ]`, 0);
          break;
        case "text":
          h.addSmallText(b.text, 0);
          break;
        case "lines":
          b.lines.forEach((line) => h.addSmallText(line, 2));
          break;
        case "kv":
          h.drawCompactTable([], b.rows, [0.27, 0.73]);
          break;
        case "table":
          h.drawCompactTable(b.headers, b.rows, b.widths);
          break;
      }
    }
  });
  // The disclaimer is printed once, by the running footer of the last page (addGlobalFooters).
}
