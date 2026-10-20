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
export const scenarioRows = (v: ReportView): string[][] => (section(v, "pointsExamples")?.blocks ?? []).flatMap((b, i, all) => (b.kind === "table" && i > 0 && all[i - 1]?.kind === "heading" ? b.rows : []));

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

const MONTHS: Record<string, number> = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12, ocak: 1, "şubat": 2, mart: 3, nisan: 4, "mayıs": 5, haziran: 6, temmuz: 7, "ağustos": 8, "eylül": 9, ekim: 10, "kasım": 11, "aralık": 12 };
/** "13 October 2026" / "13 Ekim 2026" / "2026年10月13日" -> "2026-10-13"; anything else unchanged. */
export function isoOfLongDate(text: string): string {
  const zh = /(\d{4})年(\d{1,2})月(\d{1,2})日/.exec(text);
  if (zh) return `${zh[1]}-${zh[2].padStart(2, "0")}-${zh[3].padStart(2, "0")}`;
  const m = /(\d{1,2}) ([A-Za-zçğıöşüÇĞİÖŞÜ]+) (\d{4})/.exec(text);
  const mo = m ? MONTHS[m[2].toLowerCase()] : undefined;
  return m && mo ? `${m[3]}-${String(mo).padStart(2, "0")}-${m[1].padStart(2, "0")}` : text;
}

/** A state's card as the old row shape: [heading, occupation-list result, conditions (key and additional), source + checked date (ISO)]. */
export function stateRow(v: ReportView, code: string): string[] | null {
  const rows = blockAfterHeading(v, "states", `(${code})`);
  if (rows.length === 0) return null;
  const list = rows.find(([k]) => /Occupation-list status|Meslek listesi durumu|职业清单情况/.test(k))?.[1] ?? "";
  const checked = isoOfLongDate(rows.find(([k]) => /Data checked|Veri kontrol|数据核对/.test(k))?.[1] ?? "");
  const source = rows.find(([k]) => /^(Official source|Resmi kaynak|官方来源)$/.test(k))?.[1] ?? "";
  const detailBlocks = section(v, "stateDetail")?.blocks ?? [];
  const di = detailBlocks.findIndex((b) => b.kind === "heading" && b.text.includes(`(${code})`));
  const extra = di >= 0 && detailBlocks[di + 1]?.kind === "lines" ? (detailBlocks[di + 1] as { lines: string[] }).lines.join(" ") : "";
  return [`(${code})`, list, `${rows.map(([, x]) => x).join(" ")} ${extra}`, `${source} ${checked}`];
}

export const stateCount = (v: ReportView): number => (section(v, "states")?.blocks ?? []).filter((b) => b.kind === "heading").length;
