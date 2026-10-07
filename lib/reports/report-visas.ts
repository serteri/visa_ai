/**
 * One block of published information per visa, in a fixed order (500, 485, 482, 186 Direct Entry, 186 Temporary Residence
 * Transition, 189, 190, 491, 820/801); the visa the visitor selected comes first and is marked. Nothing here evaluates the applicant:
 * every published requirement is listed with its source and page, next to what the applicant entered for it (a status of the
 * information, never of the outcome).
 */
import feeProvenance from "@/src/data/fee-provenance.json";
import subclass186 from "@/src/data/visas/subclass-186.json";
import visaDetails from "@/src/data/visa-details.json";
import visaFees from "@/src/data/visa-fees.json";
import { publishedRequirements } from "@/lib/readiness/visa-gates";
import type { Locale, ReadinessReport } from "@/lib/readiness/types";
import type { TargetVisa } from "@/lib/readiness/target-visa";
import { FactTag, RequirementStatus, T, factLabel, money, statusLabel } from "./report-text";

export type VisaKey = "500" | "485" | "482" | "186DE" | "186TRT" | "189" | "190" | "491" | "820";
export const VISA_ORDER: VisaKey[] = ["500", "485", "482", "186DE", "186TRT", "189", "190", "491", "820"];

const SPEC: Record<VisaKey, { gate: string; stream: string | null; detail?: string; name: [string, string, string] }> = {
  "500": { gate: "500", stream: null, detail: "500", name: ["Student visa (subclass 500)", "Öğrenci vizesi (subclass 500)", "学生签证（500 子类）"] },
  "485": { gate: "485", stream: null, detail: "485", name: ["Temporary Graduate visa (subclass 485)", "Geçici Mezun vizesi (subclass 485)", "临时毕业生签证（485 子类）"] },
  "482": { gate: "482", stream: null, detail: "482", name: ["Skills in Demand visa (subclass 482)", "Skills in Demand vizesi (subclass 482)", "紧缺技能签证（482 子类）"] },
  "186DE": { gate: "186", stream: "Direct Entry", name: ["Employer Nomination Scheme visa (subclass 186), Direct Entry stream", "İşveren Aday Gösterme Programı vizesi (subclass 186), Direct Entry akışı", "雇主提名签证（186 子类），Direct Entry 通道"] },
  "186TRT": { gate: "186", stream: "Temporary Residence Transition", name: ["Employer Nomination Scheme visa (subclass 186), Temporary Residence Transition stream", "İşveren Aday Gösterme Programı vizesi (subclass 186), Temporary Residence Transition akışı", "雇主提名签证（186 子类），Temporary Residence Transition 通道"] },
  "189": { gate: "189", stream: null, detail: "189", name: ["Skilled Independent visa (subclass 189)", "Skilled Independent vizesi (subclass 189)", "独立技术移民签证（189 子类）"] },
  "190": { gate: "190", stream: null, detail: "190", name: ["Skilled Nominated visa (subclass 190)", "Skilled Nominated vizesi (subclass 190)", "州担保技术移民签证（190 子类）"] },
  "491": { gate: "491", stream: null, detail: "491", name: ["Skilled Work Regional (Provisional) visa (subclass 491)", "Skilled Work Regional (Provisional) vizesi (subclass 491)", "偏远地区技术工作（临时）签证（491 子类）"] },
  "820": { gate: "820", stream: null, detail: "820", name: ["Partner visa (subclasses 820/801)", "Partner vizesi (subclass 820/801)", "伴侣签证（820/801 子类）"] },
};

export const visaName = (k: VisaKey, l: Locale) => T(l, ...SPEC[k].name);

/** Which blocks are the visitor's selected visa. */
export function selectedKeys(target: TargetVisa): VisaKey[] {
  switch (target) {
    case "186":
      return ["186DE", "186TRT"];
    case "820_801":
      return ["820"];
    case "not_sure":
      return [];
    default:
      return [target as VisaKey];
  }
}

/** The blocks' order: the selected visa first (marked), the rest in the fixed order. Never any other ordering. */
export function orderedKeys(target: TargetVisa): VisaKey[] {
  const first = selectedKeys(target);
  return [...first, ...VISA_ORDER.filter((k) => !first.includes(k))];
}

// ── fees ──────────────────────────────────────────────────────────────────────────────────────────

type FeeFact = { id: string; last_verified?: string | null };
const FEE_FACTS = (feeProvenance as unknown as { facts: FeeFact[] }).facts;
const FEES_GENERATED_ON = (visaFees as unknown as { generated_on: string }).generated_on;
type Vac = { main: number; partner_18_plus?: number; child_under_18?: number; secondInstalmentEnglish?: number; secondInstalment?: number };
const VAC = (visaFees as unknown as { visas: Record<string, { vac: Vac; vac_note?: string }> }).visas;

export type VisaCharge = { main: number | null; partner: number | null; child: number | null; second: number | null; verified: string; note: string };

/** The published charges of a visa and the date they were verified (the provenance entry, else the fee file's date). */
export function visaCharge(k: VisaKey): VisaCharge {
  const gate = SPEC[k].gate;
  if (gate === "186") {
    const stream = k === "186DE" ? "186_direct_entry" : "186_trt";
    const row = (subclass186 as unknown as Array<{ subclass: string; fee?: number; secondInstallmentFee?: number }>).find((s) => s.subclass === stream);
    return { main: row?.fee ?? null, partner: null, child: null, second: row?.secondInstallmentFee ?? null, verified: "", note: "" };
  }
  const key = gate;
  const v = VAC[key]?.vac;
  const fact = FEE_FACTS.find((f) => f.id === `vac_${key}`) ?? FEE_FACTS.find((f) => f.id === `vac_additional_adult_${key}`);
  return { main: v?.main ?? null, partner: v?.partner_18_plus ?? null, child: v?.child_under_18 ?? null, second: v?.secondInstalmentEnglish ?? v?.secondInstalment ?? null, verified: fact?.last_verified ?? FEES_GENERATED_ON, note: VAC[key]?.vac_note ?? "" };
}

export function chargeLines(k: VisaKey, l: Locale): string[] {
  const c = visaCharge(k);
  if (c.main === null) return [];
  const checked = c.verified ? ` (${T(l, "checked", "kontrol", "核对")} ${c.verified})` : "";
  const lines = [T(l, `Base application charge, main applicant: AUD ${money(c.main)}${checked}`, `Temel başvuru ücreti, ana başvuru sahibi: AUD ${money(c.main)}${checked}`, `基本申请费，主申请人：AUD ${money(c.main)}${checked}`)];
  if (c.partner !== null && c.main > 0) lines.push(T(l, `Additional applicant aged 18+: AUD ${money(c.partner)}`, `18 yaş üstü ek başvuru sahibi: AUD ${money(c.partner)}`, `18 岁以上附加申请人：AUD ${money(c.partner)}`));
  if (c.child !== null && c.main > 0) lines.push(T(l, `Additional applicant under 18: AUD ${money(c.child)}`, `18 yaş altı ek başvuru sahibi: AUD ${money(c.child)}`, `18 岁以下附加申请人：AUD ${money(c.child)}`));
  if (c.second !== null) lines.push(T(l, `Second instalment (applicants 18+ without functional English): AUD ${money(c.second)}`, `İkinci taksit (işlevsel İngilizcesi olmayan 18 yaş üstü başvuru sahipleri): AUD ${money(c.second)}`, `第二期费用（无功能性英语的 18 岁以上申请人）：AUD ${money(c.second)}`));
  if (k === "820") lines.push(T(l, "The charge covers both the 820 and the 801 stages.", "Ücret hem 820 hem 801 aşamasını kapsar.", "该费用涵盖 820 和 801 两个阶段。"));
  if (k === "186DE" || k === "186TRT") lines.push(T(l, "Figure from the subclass 186 data file for this stream.", "Bu akış için subclass 186 veri dosyasındaki tutar.", "该通道在 186 子类数据文件中的金额。"));
  return lines;
}

// ── descriptions, type, processing, progression ──────────────────────────────────────────────────

type Detail = { subclass: string; type?: string; description?: string; description_tr?: string; description_zh?: string; processingTime?: string; processingTime_tr?: string; processingTime_zh?: string };
const DETAILS = visaDetails as unknown as Detail[];
const detailOf = (k: VisaKey) => DETAILS.find((d) => d.subclass === SPEC[k].detail);

const STATIC_OVERVIEW: Partial<Record<VisaKey, [string, string, string]>> = {
  "186DE": ["An employer-sponsored permanent visa for skilled workers nominated by an approved employer under the Direct Entry stream.", "Onaylı bir işveren tarafından Direct Entry akışıyla aday gösterilen nitelikli çalışanlar için işveren sponsorlu kalıcı vize.", "面向由获批雇主通过 Direct Entry 通道提名的技术工人的雇主担保永久签证。"],
  "186TRT": ["An employer-sponsored permanent visa for holders of certain temporary employer-sponsored visas under the Temporary Residence Transition stream.", "Belirli geçici işveren sponsorlu vizelere sahip kişiler için Temporary Residence Transition akışıyla işveren sponsorlu kalıcı vize.", "面向持有特定临时雇主担保签证者的 Temporary Residence Transition 通道雇主担保永久签证。"],
};

function typeText(raw: string, l: Locale): string {
  if (l === "en") return raw;
  const map: Array<[RegExp, string, string]> = [
    [/^Permanent$/, "Kalıcı", "永久"],
    [/^Temporary/, "Geçici", "临时"],
    [/^Provisional/, "Geçici (provisional)", "临时"],
  ];
  for (const [re, tr, zh] of map) if (re.test(raw)) return raw.replace(/^(Permanent|Temporary|Provisional)/, l === "tr" ? tr : zh).replace("years", l === "tr" ? "yıl" : "年").replace("course duration", l === "tr" ? "kurs süresi" : "课程时长");
  return raw;
}

const PROGRESSION: Partial<Record<VisaKey, [string, string, string]>> = {
  "500": ["Students who complete a qualification may apply for the Temporary Graduate visa (subclass 485); skilled visas are separate applications.", "Bir yeterlilik tamamlayan öğrenciler Geçici Mezun vizesine (subclass 485) başvurabilir; nitelikli göç vizeleri ayrı başvurulardır.", "完成学历的学生可申请临时毕业生签证（485 子类）；技术移民签证为单独申请。"],
  "485": ["Holders may later apply for skilled visas (189, 190, 491) or employer-sponsored visas as separate applications.", "Vize sahipleri daha sonra nitelikli göç (189, 190, 491) veya işveren sponsorlu vizelere ayrı başvurular yapabilir.", "持有人之后可另行申请技术移民（189、190、491）或雇主担保签证。"],
  "482": ["A 482 holder may be nominated for the permanent Employer Nomination Scheme visa (subclass 186), including the Temporary Residence Transition stream.", "482 sahibi, Temporary Residence Transition akışı dahil, kalıcı İşveren Aday Gösterme Programı vizesi (subclass 186) için aday gösterilebilir.", "482 持有人可被提名申请永久雇主提名签证（186 子类），包括 Temporary Residence Transition 通道。"],
  "491": ["After at least 3 years living and working in a designated regional area, with ATO notices of assessment for three income years, holders may apply for the permanent subclass 191 visa.", "Belirlenmiş bir bölgesel alanda en az 3 yıl yaşayıp çalıştıktan ve üç gelir yılı için ATO değerlendirme bildirimlerini sunduktan sonra, vize sahipleri kalıcı subclass 191 vizesine başvurabilir.", "在指定偏远地区生活和工作至少 3 年，并提供三个收入年度的 ATO 评税通知后，持有人可申请永久 191 子类签证。"],
  "820": ["The 820 (temporary) stage is followed by the 801 (permanent) stage; one application charge covers both.", "820 (geçici) aşamasını 801 (kalıcı) aşaması izler; tek bir başvuru ücreti her ikisini kapsar.", "820（临时）阶段之后是 801（永久）阶段；一次申请费涵盖两个阶段。"],
};

export function processingText(k: VisaKey, l: Locale): string {
  const d = detailOf(k);
  const raw = l === "tr" ? d?.processingTime_tr : l === "zh-Hans" ? d?.processingTime_zh : d?.processingTime;
  if (raw && !/consult|see processing|varies|Programı kontrol|参考处理/i.test(raw)) return raw;
  const sub = k === "186DE" || k === "186TRT" ? "186" : k === "820" ? "820/801" : k;
  return T(l, `Processing times vary; the Department of Home Affairs publishes a processing time guide for subclass ${sub}.`, `İşlem süreleri değişir; İçişleri Bakanlığı (Department of Home Affairs) subclass ${sub} için bir işlem süresi rehberi yayımlar.`, `处理时间因案而异；澳大利亚内政部公布 ${sub} 子类的处理时间指南。`);
}

// ── requirement rows ──────────────────────────────────────────────────────────────────────────────

export type RequirementRow = { requirement: string; entered: string; source: string; status: RequirementStatus; statusLabel: string };

export function requirementRows(k: VisaKey, facts: Map<string, string | null>, l: Locale): RequirementRow[] {
  const spec = SPEC[k];
  const rows = publishedRequirements(spec.gate, spec.stream, l);
  const seen = new Set<string>();
  const out: RequirementRow[] = [];
  for (const g of rows) {
    const label = k === "482" && g.stream ? `[${g.stream}] ${g.label}` : g.label;
    const key = `${label}|${g.citation}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const values = g.intakeFields.map((f) => ({ f, v: facts.get(f) ?? null }));
    const entered = values.length
      ? values.map(({ f, v }) => `${factLabel(f, l)}: ${v ?? T(l, "not provided", "girilmedi", "未提供")}`).join("; ")
      : T(l, "Not collected by the form", "Formda toplanmıyor", "表单未收集");
    let status: RequirementStatus;
    if (g.kind === "future_step" || values.length === 0) status = "cannot_determine";
    else {
      const given = values.filter((x) => x.v !== null).length;
      status = given === values.length ? "provided" : given === 0 ? "not_provided" : "cannot_determine";
    }
    out.push({ requirement: label, entered, source: g.citation, status, statusLabel: statusLabel(status, l) });
  }
  return out;
}

// ── a visa block ──────────────────────────────────────────────────────────────────────────────────

export type VisaInfo = {
  key: VisaKey;
  selected: boolean;
  title: string;
  overview: Array<[string, string]>;
  requirements: RequirementRow[];
  tags: Array<[string, FactTag]>;
};

export type VisaLabels = {
  type: string;
  about: string;
  pointsTest: string;
  fees: string;
  processing: string;
  invitation: string;
  progression: string;
};

export const visaLabels = (l: Locale): VisaLabels => ({
  type: T(l, "Type", "Tür", "类型"),
  about: T(l, "Overview", "Genel bakış", "概述"),
  pointsTest: T(l, "Points test", "Puan testi", "积分测试"),
  fees: T(l, "Published charges", "Yayımlanmış ücretler", "已公布的费用"),
  processing: T(l, "Typical processing information", "Tipik işlem bilgisi", "典型处理信息"),
  invitation: T(l, "Recent invitation level in our data", "Verilerimizdeki son davet seviyesi", "我们数据中的近期邀请分"),
  progression: T(l, "Progression pattern", "İlerleme örüntüsü", "常见衔接路径"),
});

export function buildVisaInfos(report: ReadinessReport, target: TargetVisa, facts: Map<string, string | null>, l: Locale): VisaInfo[] {
  const labels = visaLabels(l);
  const selected = new Set(selectedKeys(target));
  const asOf = report.premiumSections?.historicalInvitationTrends?.dataAsOf;
  return orderedKeys(target).map((k): VisaInfo => {
    const d = detailOf(k);
    const raw = d ? (l === "tr" ? d.description_tr : l === "zh-Hans" ? d.description_zh : d.description) ?? d.description : undefined;
    const description = raw ?? (STATIC_OVERVIEW[k] ? T(l, ...STATIC_OVERVIEW[k]!) : "");
    const typeRaw = d?.type ?? (k === "186DE" || k === "186TRT" ? "Permanent" : "");
    const pointsTested = k === "189" || k === "190" || k === "491";
    const overview: Array<[string, string]> = [];
    if (typeRaw) overview.push([labels.type, typeText(typeRaw, l)]);
    if (description) overview.push([labels.about, description]);
    overview.push([labels.pointsTest, pointsTested ? T(l, "Yes: minimum 65 points", "Evet: asgari 65 puan", "是：最低 65 分") : T(l, "No", "Hayır", "否")]);
    const fees = chargeLines(k, l);
    if (fees.length) overview.push([labels.fees, fees.join("\n")]);
    overview.push([labels.processing, processingText(k, l)]);
    if (pointsTested) {
      const b = report.pathwayScores?.[k as "189" | "190" | "491"]?.benchmark;
      overview.push([labels.invitation, b === null || b === undefined ? T(l, "Not available in our data", "Verilerimizde mevcut değil", "我们的数据中暂无") : `${b}${asOf ? ` (${T(l, "data as of", "veri tarihi", "数据截至")} ${asOf})` : ""}`]);
    }
    if (PROGRESSION[k]) overview.push([labels.progression, T(l, ...PROGRESSION[k]!)]);
    return { key: k, selected: selected.has(k), title: visaName(k, l), overview, requirements: requirementRows(k, facts, l), tags: [] };
  });
}
