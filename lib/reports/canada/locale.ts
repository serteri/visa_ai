/**
 * The Canada Assessment and report are English-only in this release.
 *
 * The Canadian program data the report presents (IRCC process steps, provincial stream conditions, the CRS tables' notes) is held in English only, so a
 * Turkish or Chinese Canada report would mix translated labels with English explanatory text. Rather than output a mixed-language paid report, the Canada
 * report is always built and drawn in English (the cover, every section, the footer and the disclaimer), whatever language the page was viewed in, and the
 * Assessment says so when Canada is chosen in another language. When the Canada data is localised, widen this list.
 */
import type { Locale } from "@/lib/readiness/types";

export const CANADA_REPORT_LOCALES: readonly Locale[] = ["en"];
export const CANADA_REPORT_LOCALE: Locale = "en";

/** Shown under the destination selector when Canada is chosen and the page is not in English. */
export const CANADA_ENGLISH_ONLY_NOTICE: Record<Locale, string> = {
  en: "The Canada Assessment and report are available in English.",
  tr: "Kanada Değerlendirmesi ve raporu bu sürümde yalnızca İngilizcedir. Kanada için doldurduğunuz sorular ve indireceğiniz rapor İngilizce olacaktır.",
  "zh-Hans": "本版本的加拿大评估和报告仅提供英文。加拿大部分的问题及您下载的报告均为英文。",
};
