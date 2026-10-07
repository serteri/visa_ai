/**
 * The single Target visa the visitor picks (required). It decides the report's primary subject: the target visa's
 * requirement map is the report's first section; "not_sure" gets the Pathway Overview instead. Pure; no verdicts.
 */
import type { Locale } from "./types";

export const TARGET_VISAS = ["500", "485", "482", "186", "189", "190", "491", "820_801", "not_sure"] as const;
export type TargetVisa = (typeof TARGET_VISAS)[number];

/** The report's gate key for a target ("820_801" -> "820"); undefined for "not_sure". */
export function targetGateKey(target: TargetVisa): string | undefined {
  return target === "not_sure" ? undefined : target === "820_801" ? "820" : target;
}

/** The points-tested skilled visas. */
export const POINTS_TESTED = ["189", "190", "491"] as const;
export const isPointsTestedTarget = (t: TargetVisa) => t === "189" || t === "190" || t === "491";

/** A form value or an older stored `preferredPathway` -> a TargetVisa, or undefined when it is none of them. */
export function normalizeTargetVisa(value: string | undefined | null): TargetVisa | undefined {
  const v = (value ?? "").trim().toLowerCase().replace(/[\s/]+/g, "_");
  if (v === "820" || v === "801" || v === "820_801" || v === "820_and_801") return "820_801";
  if (v === "not_sure" || v === "notsure") return "not_sure";
  return (TARGET_VISAS as readonly string[]).includes(v) ? (v as TargetVisa) : undefined;
}

/** The target of a report's input: the explicit field, else a single recognised pathway of an older report, else "not_sure". */
export function targetVisaOf(input: { targetVisa?: string; preferredPathway?: string }): TargetVisa {
  return normalizeTargetVisa(input.targetVisa) ?? normalizeTargetVisa(input.preferredPathway) ?? "not_sure";
}

const L = (l: Locale, en: string, tr: string, zh: string) => (l === "tr" ? tr : l === "zh-Hans" ? zh : en);

const NAMES: Record<Exclude<TargetVisa, "not_sure">, [string, string, string]> = {
  "500": ["Student visa (subclass 500)", "Öğrenci vizesi (subclass 500)", "学生签证（500 子类）"],
  "485": ["Temporary Graduate visa (subclass 485)", "Geçici Mezun vizesi (subclass 485)", "临时毕业生签证（485 子类）"],
  "482": ["Skills in Demand visa (subclass 482)", "Skills in Demand vizesi (subclass 482)", "紧缺技能签证（482 子类）"],
  "186": ["Employer Nomination Scheme visa (subclass 186)", "İşveren Aday Gösterme Programı vizesi (subclass 186)", "雇主提名签证（186 子类）"],
  "189": ["Skilled Independent visa (subclass 189)", "Skilled Independent vizesi (subclass 189)", "独立技术移民签证（189 子类）"],
  "190": ["Skilled Nominated visa (subclass 190)", "Skilled Nominated vizesi (subclass 190)", "州担保技术移民签证（190 子类）"],
  "491": ["Skilled Work Regional (Provisional) visa (subclass 491)", "Skilled Work Regional (Provisional) vizesi (subclass 491)", "偏远地区技术工作（临时）签证（491 子类）"],
  "820_801": ["Partner visa (subclasses 820/801)", "Partner vizesi (subclass 820/801)", "伴侣签证（820/801 子类）"],
};

export function targetVisaName(target: TargetVisa, locale: Locale): string {
  if (target === "not_sure") return L(locale, "Not sure", "Emin değilim", "不确定");
  const n = NAMES[target];
  return L(locale, n[0], n[1], n[2]);
}

/** Form option label for the Target visa select. */
export function targetVisaOption(target: TargetVisa, locale: Locale): string {
  return target === "not_sure" ? L(locale, "Not sure (show the Pathway Overview)", "Emin değilim (Vize Yolu Genel Bakışı gösterilsin)", "不确定（显示路径概览）") : targetVisaName(target, locale);
}
