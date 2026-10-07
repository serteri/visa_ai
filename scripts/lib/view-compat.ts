/**
 * Readers over the rich report view (lib/reports/report-view.ts) for the tests that check one fact in it: the points totals row of a
 * subclass, the invitation level in a visa block, and a state's block.
 */
import type { ReportView } from "../../lib/reports/report-view";

const section = (v: ReportView, id: string) => v.sections.find((s) => s.id === id);

export const hasSection = (v: ReportView, id: string) => !!section(v, id);

/** The points tables, in order: breakdown, totals, single-factor scenarios, combined scenarios. */
export function pointsTables(v: ReportView): string[][][] {
  return (section(v, "points")?.blocks ?? []).flatMap((b) => (b.kind === "table" ? [b.rows] : []));
}

/** The totals row of a subclass: [visa, from entries, nomination points, total with nomination, minimum]. */
export const totalsRows = (v: ReportView): string[][] => pointsTables(v)[1] ?? [];

/** The scenario rows (single-factor then combined): [label, points added, total 189, total 190, total 491]. */
export const scenarioRows = (v: ReportView): string[][] => (section(v, "points")?.blocks ?? []).flatMap((b, i, all) => (b.kind === "table" && i > 2 && all[i - 1]?.kind === "heading" ? b.rows : []));

/** The kv rows of the block that follows the heading containing `needle` (visas and states sections). */
export function blockAfterHeading(v: ReportView, sectionId: string, needle: string): Array<[string, string]> {
  const blocks = section(v, sectionId)?.blocks ?? [];
  const i = blocks.findIndex((b) => b.kind === "heading" && b.text.includes(needle));
  const next = i >= 0 ? blocks[i + 1] : undefined;
  return next?.kind === "kv" ? next.rows : [];
}

/** "Recent invitation level in our data" of a points-tested subclass's visa block (the value, with its data date). */
export function inviteLevel(v: ReportView, sub: string): string {
  const rows = blockAfterHeading(v, "visas", sub);
  return rows.find(([k]) => /invitation level|davet seviyesi|邀请分/i.test(k))?.[1] ?? "";
}

export const NO_LEVEL = /not available|mevcut değil|暂无/i;

/** A state's block as the old row shape: [heading, occupation-list result, conditions, source + checked date]. */
export function stateRow(v: ReportView, code: string): string[] | null {
  const rows = blockAfterHeading(v, "states", `(${code})`);
  if (rows.length === 0) return null;
  const list = rows.find(([k]) => /Occupation on its list|Meslek listede|职业是否在清单/.test(k))?.[1] ?? "";
  const checked = rows.find(([k]) => /Data checked|Veri kontrol|数据核对/.test(k))?.[1] ?? "";
  const source = rows.find(([k]) => /^(Source|Kaynak|来源)$/.test(k))?.[1] ?? "";
  return [`(${code})`, list, rows.map(([, x]) => x).join(" "), `${source} ${checked}`];
}

export const stateCount = (v: ReportView): number => (section(v, "states")?.blocks ?? []).filter((b) => b.kind === "heading").length;
