/**
 * The report as a list of sections of neutral blocks, drawn identically by the PDF (lib/readiness/pdf-report-v2.ts) and the result
 * page, so the two cannot differ. A block is a heading, a paragraph, a list of lines, a key-value box or a table; nothing in it carries
 * a colour, a score or a rank.
 */
export type Block =
  | { kind: "heading"; text: string; /** True for the one visa the visitor selected: marked, never ranked. */ marked?: string }
  | { kind: "text"; text: string }
  | { kind: "lines"; lines: string[] }
  | { kind: "kv"; rows: Array<[string, string]> }
  | { kind: "table"; headers: string[]; rows: string[][]; widths: number[] };

export type ReportSection = { id: string; title: string; blocks: Block[] };

/** Every string a section prints, in order (tests: banned wording, repeated content). */
export function blockStrings(b: Block): string[] {
  switch (b.kind) {
    case "heading":
      return [b.text, ...(b.marked ? [b.marked] : [])];
    case "text":
      return [b.text];
    case "lines":
      return b.lines;
    case "kv":
      return b.rows.flatMap(([k, v]) => [k, v]);
    case "table":
      return [...b.headers, ...b.rows.flat()];
  }
}

export const sectionStrings = (s: ReportSection): string[] => [s.title, ...s.blocks.flatMap(blockStrings)];
