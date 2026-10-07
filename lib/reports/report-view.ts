/**
 * The customer-facing report as DATA, information first: shared by the PDF (lib/readiness/pdf-report-v2.ts) and the
 * result page (app/[locale]/(main)/full-check/result), so the two cannot drift apart. A presentation layer only: every
 * figure, label and sentence comes from the report the engine already produced or from a sourced data file. Nothing
 * here scores, gates, prices, ranks or recommends anything.
 *
 *   1 cover      name, date, occupation, the Target visa picked, one notice line
 *   2 target     the Target visa: profile facts supplied (labelled), the requirement map for that visa
 *                (published requirement | what you entered | source | status: provided / not provided / cannot determine /
 *                not applicable), information not provided.  "Not sure": the Pathway Overview replaces the map.
 *   3 points     the points calculation (arithmetic), the published minimum and the latest published invitation score,
 *                combined scenarios as arithmetic only  (points-tested visas, and "Not sure")
 *   4 others     the other visas, side by side, same columns, in a fixed order -- never ordered by the applicant's data
 *   5 states     state and territory program information (published status, list entry, published conditions, source, date)
 *   6 process    typical process and published timeframes for the target (generic steps; no personal dated plan)
 *   7 costs      one table (item, amount, in total, source) with independent registration rows kept visible
 *   8 appendix   documents, official resources, sources, disclaimer
 *
 * Every line carries a label: supplied by you | calculation | published requirement | published program or historical
 * data | unknown.
 */
import visaGatesData from "@/src/data/visa-gates.json";
import visaFees from "@/src/data/visa-fees.json";
import visaDetails from "@/src/data/visa-details.json";
import feeProvenance from "@/src/data/fee-provenance.json";
import subclass186 from "@/src/data/visas/subclass-186.json";
import { getResourcesSection } from "@/lib/readiness/pdf-content/resources";
import { computeEstimatedTotalAud, computePartnerTotalAud, formatEstimatedTotalLine, formatPartnerTotalLine, formatSecondInstalmentLine } from "@/lib/readiness/financial-roadmap-totals";
import { POINTS_TESTED, isPointsTestedTarget, targetGateKey, targetVisaName, targetVisaOf, type TargetVisa } from "@/lib/readiness/target-visa";
import type { PathwayScore, PathwaySubclass } from "@/lib/readiness/pathway-scores";
import { localizeStateNote } from "@/lib/state-nomination/state-note-translations";
import { matchOccupationToState } from "@/lib/state-nomination/occupation-match";
import { getStateRule } from "@/lib/state-nomination/state-rules-config";
import { authorityDisplayName, resolveAssessingAuthority } from "@/lib/skills-assessment/resolve-authority";
import { resolveOccupationDisplayName } from "@/lib/readiness/occupation-eligibility";
import type { FinancialRoadmapItem, Locale, ReadinessInput, ReadinessReport, StateNominationState } from "@/lib/readiness/types";
import type { GateResult, PathwayGates } from "@/lib/readiness/visa-gate-text";

const T = (l: Locale, en: string, tr: string, zh: string) => (l === "tr" ? tr : l === "zh-Hans" ? zh : en);

/** The label every line carries. */
export type FactTag = "supplied" | "calculation" | "published_requirement" | "published_program" | "unknown";
export type RequirementStatus = "provided" | "not_provided" | "cannot_determine" | "not_applicable";

/** The profile fields the view reads -- the PDF's userInputSummary and the result page's input carry the same ones. */
export type ReportViewProfile = {
  name?: string;
  occupation?: string;
  /** The occupation as entered (with its ANZSCO code); the assessing authority is resolved from it. */
  occupationRaw?: string;
  englishLevel?: string;
  mainGoal?: string;
  age?: string;
  currentCountry?: string;
  migrationGoals?: string[];
  isAustralianQualification?: boolean | null;
};

/** Title-cases a proper-noun field ("steve" -> "Steve", "USA" stays), as the PDF does for the name on the cover. */
function toDisplayCase(value: string): string {
  return value
    .trim()
    .split(/(\s+|[-/])/)
    .map((token) => {
      if (/^\s+$/.test(token) || token === "-" || token === "/") return token;
      if (token.length <= 3 && /[A-Z]/.test(token) && token === token.toUpperCase()) return token;
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join("");
}

/** The profile the view reads, built from a stored report's input exactly as the PDF route builds its summary. */
export function reportViewProfile(input: Partial<ReadinessInput>, fullName: string | null | undefined, locale: Locale): ReportViewProfile {
  return {
    name: fullName ? toDisplayCase(fullName) : undefined,
    occupation: input.occupation ? resolveOccupationDisplayName(input.occupation, locale) : input.occupation,
    occupationRaw: input.occupation,
    englishLevel: input.englishLevel,
    mainGoal: input.mainGoal,
    age: input.age,
    currentCountry: input.currentCountry ? toDisplayCase(input.currentCountry) : input.currentCountry,
    migrationGoals: input.migrationGoals,
    isAustralianQualification: input.qualificationAwardedInAustralia,
  };
}

export type ReportViewArgs = {
  report: ReadinessReport;
  locale: Locale;
  profile: ReportViewProfile;
  /** The date shown on the cover and the result page ("Last updated <date>" / the generation date). */
  dateText: string;
};

export type RequirementRow = { requirement: string; entered: string; source: string; status: RequirementStatus; statusLabel: string };

export type ReportView = {
  locale: Locale;
  targetVisa: TargetVisa;
  isNotSure: boolean;
  titles: { target: string; points: string; others: string; states: string; process: string; costs: string; appendix: string };
  /** The five labels (supplied | calculation | published requirement | published program or historical data | unknown). */
  tags: Record<FactTag, string>;
  cover: { name: string; dateText: string; occupation: string; targetLine: string; title: string; label: string; subtitle: string; notice: string };
  target: {
    subjectLine: string;
    suppliedTitle: string;
    suppliedHeaders: [string, string, string];
    supplied: Array<[string, string, string]>;
    requirementsTitle: string;
    requirementsHeaders: [string, string, string, string];
    requirements: RequirementRow[];
    statusLegend: string;
    notApplicableNote: string;
    notProvidedTitle: string;
    notProvided: string[];
    notProvidedNone: string;
  };
  points: {
    applicable: boolean;
    intro: string;
    headers: [string, string, string, string];
    rows: string[][];
    totalsTitle: string;
    totalsHeaders: string[];
    totalsNote: string;
    totals: string[][];
    scenariosTitle: string;
    scenariosHeaders: [string, string, string];
    scenarios: Array<[string, string, string]>;
    scenariosNote: string;
    stageNote: string;
  };
  others: { title: string; intro: string; headers: string[]; rows: string[][]; note: string };
  states: { applicable: boolean; title: string; intro: string; headers: string[]; rows: string[][]; note: string };
  process: { applicable: boolean; title: string; intro: string; headers: [string, string, string]; rows: Array<[string, string, string]> };
  costs: {
    headers: [string, string, string, string];
    rows: Array<{ item: string; amount: string; included: boolean; source: string }>;
    yes: string;
    no: string;
    note: string;
    totalLines: string[];
    skillsDoneNote: string;
    /** The authority's own fee explanation and the registration steps that are separate from the assessment. */
    notes: string[];
    livingLine: string;
  };
  appendix: {
    documentsTitle: string;
    documents: Array<{ category: string; items: string }>;
    resourcesTitle: string;
    resources: Array<{ heading: string; links: Array<{ label: string; url: string }> }>;
    sourcesTitle: string;
    sources: string[];
    disclaimerTitle: string;
    disclaimer: string;
  };
};

// ── labels ────────────────────────────────────────────────────────────────────────────────────────

const tagsFor = (l: Locale): Record<FactTag, string> => ({
  supplied: T(l, "Supplied by you", "Sizin girdiğiniz", "您提供"),
  calculation: T(l, "Calculation", "Hesaplama", "计算"),
  published_requirement: T(l, "Published requirement", "Yayımlanmış gereklilik", "已公布的要求"),
  published_program: T(l, "Published program / historical data", "Yayımlanmış program / geçmiş veri", "已公布的项目 / 历史数据"),
  unknown: T(l, "Unknown", "Bilinmiyor", "未知"),
});

const statusLabel = (s: RequirementStatus, l: Locale) =>
  s === "provided"
    ? T(l, "Provided", "Girildi", "已提供")
    : s === "not_provided"
      ? T(l, "Not provided", "Girilmedi", "未提供")
      : s === "cannot_determine"
        ? T(l, "Cannot determine", "Belirlenemiyor", "无法判断")
        : T(l, "Not applicable", "Geçerli değil", "不适用");

const FACT_LABEL: Record<string, [string, string, string]> = {
  occupation: ["Occupation", "Meslek", "职业"],
  age: ["Age", "Yaş", "年龄"],
  englishLevel: ["English level", "İngilizce düzeyi", "英语水平"],
  qualificationLevel: ["Highest qualification", "En yüksek eğitim", "最高学历"],
  qualificationAwardedInAustralia: ["Qualification awarded in Australia", "Eğitim Avustralya'da alındı", "学历在澳大利亚取得"],
  offshoreExperienceYears: ["Employment outside Australia", "Avustralya dışındaki çalışma", "澳大利亚境外工作经验"],
  onshoreExperienceYears: ["Employment in Australia", "Avustralya'daki çalışma", "澳大利亚境内工作经验"],
  sponsorOrFamily: ["Partner status", "Partner durumu", "伴侣情况"],
  occupationConfirmed: ["Skills assessment completed", "Beceri değerlendirmesi tamamlandı", "技能评估已完成"],
  annualSalaryAud: ["Annual salary", "Yıllık maaş", "年薪"],
  currentCountry: ["Current country", "Bulunduğunuz ülke", "当前所在国家"],
  passportCountry: ["Passport country", "Pasaport ülkesi", "护照国家"],
  residenceState: ["State of residence", "İkamet edilen eyalet", "居住的州"],
  preferredState: ["State of interest", "İlgilenilen eyalet", "感兴趣的州"],
  yearsInSponsoredPosition: ["Years under an approved sponsor", "Onaylı sponsor altında yıl", "在获批担保方名下的年数"],
};
const factLabel = (field: string, l: Locale) => {
  const f = FACT_LABEL[field];
  return f ? T(l, f[0], f[1], f[2]) : field;
};

/** Facts shown in "profile facts supplied": the ones that apply to every visa, then the ones a target adds. */
const COMMON_FACTS = ["occupation", "age", "englishLevel", "qualificationLevel", "qualificationAwardedInAustralia", "offshoreExperienceYears", "onshoreExperienceYears", "sponsorOrFamily", "occupationConfirmed", "currentCountry", "passportCountry", "residenceState"];

const GATES = (visaGatesData as unknown as { gates: Array<{ id: string; intakeFields: string[] }> }).gates;
const intakeFieldsOf = (gateId: string): string[] => GATES.find((g) => g.id === gateId)?.intakeFields ?? [];

// ── requirement map ───────────────────────────────────────────────────────────────────────────────

function requirementRows(pw: PathwayGates | undefined, facts: Map<string, string | null>, locale: Locale): RequirementRow[] {
  if (!pw) return [];
  const considered = pw.streamsConsidered;
  const seen = new Set<string>();
  const out: RequirementRow[] = [];
  for (const g of pw.gates) {
    const key = `${g.label}|${g.citation}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const fields = intakeFieldsOf(g.id);
    const values = fields.map((f) => ({ f, v: facts.get(f) ?? null }));
    const entered = fields.length
      ? values.map(({ f, v }) => `${factLabel(f, locale)}: ${v ?? T(locale, "not provided", "girilmedi", "未提供")}`).join("; ")
      : T(locale, "Not collected by the form", "Formda toplanmıyor", "表单未收集");
    let status: RequirementStatus;
    if (g.stream && considered && !considered.some((s) => g.stream && s.toLowerCase().includes(g.stream.toLowerCase().split(" ")[0]))) status = "not_applicable";
    else if (g.status === "future" || fields.length === 0) status = "cannot_determine";
    else {
      const given = values.filter((x) => x.v !== null).length;
      status = given === values.length ? (g.status === "unknown" ? "cannot_determine" : "provided") : given === 0 ? "not_provided" : "cannot_determine";
    }
    out.push({ requirement: g.label, entered, source: g.citation, status, statusLabel: statusLabel(status, locale) });
  }
  return out;
}

// ── other visas: fixed order, same columns ────────────────────────────────────────────────────────

const OVERVIEW_ORDER = ["500", "485", "482", "189", "190", "491", "820_801", "186"] as const;

const money = (n: number) => n.toLocaleString("en-AU", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });

type FeeFact = { id: string; value: number; last_verified?: string | null };
const FEE_FACTS = (feeProvenance as unknown as { facts: FeeFact[] }).facts;
const FEES_GENERATED_ON = (visaFees as unknown as { generated_on: string }).generated_on;

/** The base application charge and the date it was verified: the provenance entry for the subclass, else the next-best dated entry, else the file date. */
function baseCharge(visa: string): { amount: number | null; verified: string } {
  const key = visa === "820" ? "820" : visa;
  if (key === "186") {
    const de = (subclass186 as unknown as Array<{ parentSubclass?: string; fee?: number }>).find((s) => s.parentSubclass === "186" && typeof s.fee === "number");
    return { amount: de?.fee ?? null, verified: "" };
  }
  const amount = (visaFees as unknown as { visas: Record<string, { vac: { main: number } }> }).visas[key]?.vac.main ?? null;
  const fact = FEE_FACTS.find((f) => f.id === `vac_${key}`) ?? FEE_FACTS.find((f) => f.id === `vac_additional_adult_${key}`);
  return { amount, verified: fact?.last_verified ?? FEES_GENERATED_ON };
}

const detailType = (visa: string): string => (visaDetails as unknown as Array<{ subclass: string; type?: string }>).find((v) => v.subclass === visa)?.type ?? (visa === "186" ? "Permanent" : "");
const TYPE_TEXT: Record<string, [string, string, string]> = {
  Permanent: ["Permanent", "Kalıcı", "永久"],
  Temporary: ["Temporary", "Geçici", "临时"],
};
function typeText(raw: string, l: Locale): string {
  const first = raw.split(/[ (]/)[0];
  const t = TYPE_TEXT[first];
  if (t) return T(l, raw, raw.replace(first, t[1]), raw.replace(first, t[2]));
  if (/^Provisional/.test(raw)) return T(l, raw, raw.replace("Provisional", "Geçici (provisional)").replace("years", "yıl"), raw.replace("Provisional", "临时").replace("years", "年"));
  return raw;
}

function overviewRow(visaKey: (typeof OVERVIEW_ORDER)[number], report: ReadinessReport, locale: Locale): string[] {
  const gateKey = visaKey === "820_801" ? "820" : visaKey;
  const pw = report.visaGates?.[gateKey];
  const charge = baseCharge(gateKey);
  const requirements = [...new Set((pw?.gates ?? []).map((g) => g.label))].slice(0, 4).join("; ") || "—";
  const sources = [...new Set((pw?.gates ?? []).map((g) => g.citation))].slice(0, 2).join("; ") || "—";
  const pointsTest = (POINTS_TESTED as readonly string[]).includes(gateKey) ? T(locale, "Yes — minimum 65 points", "Evet — asgari 65 puan", "是——最低 65 分") : T(locale, "No", "Hayır", "否");
  const chargeText = charge.amount === null ? "—" : `AUD ${money(charge.amount)}${charge.verified ? ` (${T(locale, "checked", "kontrol", "核对")} ${charge.verified})` : gateKey === "186" ? ` (${T(locale, "Direct Entry stream", "Direct Entry akışı", "Direct Entry 通道")})` : ""}`;
  return [targetVisaName(visaKey === "820_801" ? "820_801" : (visaKey as TargetVisa), locale), typeText(detailType(visaKey === "820_801" ? "820" : visaKey), locale) || "—", pointsTest, chargeText, requirements, sources];
}

// ── process (typical steps, published timeframes) ─────────────────────────────────────────────────

function authorityProcessing(occupationRaw: string | undefined, locale: Locale): { name: string; text: string; source: string } | null {
  if (!occupationRaw) return null;
  const resolved = resolveAssessingAuthority(occupationRaw);
  const a = resolved.authority;
  if (!a) return null;
  const p = a.pathways?.find((x) => x.processingTimeWeeks || x.processingNotStated);
  const label = p?.processingTimeWeeks?.label
    ? (typeof p.processingTimeWeeks.label === "string" ? p.processingTimeWeeks.label : (p.processingTimeWeeks.label as Record<string, string>)[locale === "zh-Hans" ? "zh-Hans" : locale])
    : p?.processingTimeWeeks?.standard !== undefined
      ? T(locale, `${p.processingTimeWeeks.standard} weeks`, `${p.processingTimeWeeks.standard} hafta`, `${p.processingTimeWeeks.standard} 周`)
      : T(locale, "not stated by the authority", "kurum tarafından belirtilmemiş", "机构未说明");
  return { name: authorityDisplayName(resolved), text: label, source: a.sourceDocument ? `${a.authorityName}: ${a.sourceDocument}` : a.authorityName };
}

function processRows(target: TargetVisa, report: ReadinessReport, occupationRaw: string | undefined, locale: Locale): Array<[string, string, string]> {
  const key = targetGateKey(target);
  if (!key) return [];
  const pw = report.visaGates?.[key];
  const cite = (suffix: string) => pw?.gates.find((g) => g.id.endsWith(suffix))?.citation ?? pw?.gates[0]?.citation ?? "—";
  const charge = baseCharge(key);
  const chargeText = charge.amount === null ? "" : T(locale, `Base application charge: AUD ${money(charge.amount)}.`, `Temel başvuru ücreti: AUD ${money(charge.amount)}.`, `基本申请费：AUD ${money(charge.amount)}。`);
  const auth = authorityProcessing(occupationRaw, locale);
  const rows: Array<[string, string, string]> = [];
  const skills = (): [string, string, string] => [
    T(locale, "Skills assessment", "Beceri değerlendirmesi", "技能评估"),
    auth
      ? T(locale, `Carried out by ${auth.name}. Processing time as the authority states it: ${auth.text}.`, `${auth.name} tarafından yapılır. Kurumun belirttiği işlem süresi: ${auth.text}.`, `由 ${auth.name} 进行。机构说明的处理时间：${auth.text}。`)
      : T(locale, "Carried out by the assessing authority for the occupation; its published processing time applies.", "Meslek için değerlendirme kurumu tarafından yapılır; kurumun yayımladığı işlem süresi geçerlidir.", "由该职业的评估机构进行；适用机构公布的处理时间。"),
    auth?.source ?? cite("skills_assessment"),
  ];
  const english = (): [string, string, string] => [
    T(locale, "English language test", "İngilizce dil sınavı", "英语语言考试"),
    T(locale, "An approved test result in the bands used by the visa (Competent, Proficient, Superior). Accepted tests and how long a result counts are set by Home Affairs.", "Vizenin kullandığı bantlarda onaylı bir sınav sonucu (Competent, Proficient, Superior). Kabul edilen sınavlar ve sonucun geçerlilik süresini İçişleri Bakanlığı belirler.", "达到签证所用等级（Competent、Proficient、Superior）的认可考试成绩。认可的考试及成绩有效期由内政部规定。"),
    cite("english"),
  ];
  const healthPolice = (): [string, string, string] => [
    T(locale, "Police certificates and health examination", "Adli sicil belgeleri ve sağlık muayenesi", "无犯罪记录证明与体检"),
    T(
      locale,
      "The Australian Federal Police certificate is processed online within 15 business days and is valid for 12 months; overseas police certificates take 4-12 weeks. The health examination is through Bupa Medical Visa Services; results are valid for 12 months, and 6-12 months longer where extra chest monitoring is required.",
      "Avustralya Federal Polisi (AFP) belgesi 15 iş günü içinde çevrimiçi işlenir ve 12 ay geçerlidir; yurt dışı adli sicil belgeleri 4-12 hafta sürer. Sağlık muayenesi Bupa Medical Visa Services aracılığıyla yapılır; sonuçlar 12 ay geçerlidir, ek akciğer takibi gerekirse 6-12 ay daha uzayabilir.",
      "澳大利亚联邦警察（AFP）证明在线办理，15 个工作日内完成，有效期 12 个月；海外无犯罪记录证明需 4-12 周。体检通过 Bupa Medical Visa Services 进行，结果有效期 12 个月；如需额外胸部复查，可能再延长 6-12 个月。",
    ),
    "Home Affairs; Australian Federal Police; Bupa Medical Visa Services",
  ];
  const decision = (): [string, string, string] => [
    T(locale, "Decision", "Karar", "审理决定"),
    T(locale, "Processing times vary; Home Affairs publishes a processing time guide for each visa.", "İşlem süreleri değişir; İçişleri Bakanlığı her vize için bir işlem süresi rehberi yayımlar.", "处理时间因案而异；内政部为每种签证公布处理时间指南。"),
    cite(""),
  ];
  const lodge = (extra = ""): [string, string, string] => [
    T(locale, "Visa application", "Vize başvurusu", "递交签证申请"),
    `${chargeText} ${extra}`.trim(),
    cite(""),
  ];

  if (isPointsTestedTarget(target)) {
    rows.push(skills(), english());
    rows.push([
      T(locale, "Expression of Interest (EOI)", "İlgi Beyanı (EOI)", "意向书（EOI）"),
      T(locale, "An EOI in SkillSelect records the details the points test uses. Invitations are issued in rounds.", "SkillSelect'teki bir EOI, puan testinin kullandığı bilgileri kaydeder. Davetler turlar halinde verilir.", "SkillSelect 中的 EOI 记录积分测试所用信息。邀请按轮次发出。"),
      cite("invitation"),
    ]);
    if (target === "190" || target === "491") {
      rows.push([
        T(locale, "State or territory nomination", "Eyalet veya bölge adaylığı", "州或领地提名"),
        T(locale, "A state or territory nominates through its own program, with its own conditions (see the state and territory section).", "Eyalet veya bölge, kendi koşullarına sahip kendi programı aracılığıyla aday gösterir (bkz. eyalet ve bölge bölümü).", "州或领地通过其自身项目和条件提名（见州和领地部分）。"),
        cite("nomination"),
      ]);
    }
    rows.push(lodge(T(locale, "The application is lodged within 60 days of the invitation.", "Başvuru, davetten sonraki 60 gün içinde yapılır.", "须在获邀后 60 天内递交申请。")), healthPolice(), decision());
  } else if (target === "482" || target === "186") {
    rows.push([
      T(locale, "Employer nomination / sponsorship", "İşveren adaylığı / sponsorluğu", "雇主提名 / 担保"),
      T(locale, "The employer is approved as a sponsor and nominates the position; the published requirements are in the map above.", "İşveren sponsor olarak onaylanır ve pozisyonu aday gösterir; yayımlanmış gereklilikler yukarıdaki haritadadır.", "雇主获批成为担保方并提名该职位；已公布的要求见上方对照表。"),
      cite(target === "482" ? "sponsor" : "employer_nomination"),
    ], skills(), english(), lodge(), healthPolice(), decision());
  } else if (target === "485") {
    rows.push([
      T(locale, "Study completed", "Eğitimin tamamlanması", "完成学业"),
      T(locale, "An eligible qualification from a CRICOS-registered Australian provider, awarded in the period Home Affairs sets.", "CRICOS kayıtlı bir Avustralya sağlayıcısından, İçişleri Bakanlığı'nın belirlediği dönemde verilmiş uygun bir yeterlilik.", "来自 CRICOS 注册澳大利亚院校、在内政部规定期限内取得的合资格学历。"),
      cite("eligible_degree"),
    ], english(), lodge(), healthPolice(), decision());
  } else if (target === "500") {
    rows.push([
      T(locale, "Enrolment", "Kayıt", "入学"),
      T(locale, "A Confirmation of Enrolment (CoE) from the education provider.", "Eğitim sağlayıcısından Kayıt Teyidi (CoE).", "教育机构出具的录取确认书（CoE）。"),
      cite("enrolment"),
    ], [
      T(locale, "Health cover", "Sağlık sigortası", "医疗保险"),
      T(locale, "Overseas Student Health Cover (OSHC), unless exempt.", "Yurt Dışı Öğrenci Sağlık Sigortası (OSHC), muafiyet yoksa.", "海外学生健康保险（OSHC），除非获豁免。"),
      cite("oshc"),
    ], lodge(), healthPolice(), decision());
  } else {
    rows.push([
      T(locale, "Relationship and sponsorship", "İlişki ve sponsorluk", "关系与担保"),
      T(locale, "The partner sponsors the application; the published requirements are in the map above. This report does not assess a relationship.", "Partner başvuruya sponsor olur; yayımlanmış gereklilikler yukarıdaki haritadadır. Bu rapor bir ilişkiyi değerlendirmez.", "伴侣为申请提供担保；已公布的要求见上方对照表。本报告不评估关系。"),
      cite("sponsor"),
    ], lodge(T(locale, "The charge covers both the 820 and the 801 stages.", "Ücret hem 820 hem 801 aşamasını kapsar.", "该费用涵盖 820 和 801 两个阶段。")), healthPolice(), decision());
  }
  return rows;
}

/** A short form of a sentence: whole when short, else cut at the last comma / semicolon before max (closed with a full stop), else at a word. */
function shorten(text: string, max: number): string {
  if (text.length <= max) return text;
  const head = text.slice(0, max);
  const clause = Math.max(head.lastIndexOf(","), head.lastIndexOf(";"), head.lastIndexOf("，"), head.lastIndexOf("；"), head.lastIndexOf(". "));
  if (clause > max * 0.5) return `${head.slice(0, clause)}${/[一-鿿]/.test(head) ? "。" : "."}`;
  return `${head.replace(/\s+\S*$/, "")}…`;
}

// ── states ────────────────────────────────────────────────────────────────────────────────────────

function stateRows(report: ReadinessReport, locale: Locale, occupationRaw?: string): string[][] {
  const tracker = report.stateNominationTracker;
  if (!tracker) return [];
  const code = (occupationRaw ?? "").match(/\d{6}/)?.[0];
  // Fixed order (by code), never by the applicant's data.
  return [...tracker.states].sort((a, b) => a.code.localeCompare(b.code)).map((s: StateNominationState) => {
    const rule = getStateRule(s.code);
    // NSW publishes at unit-group level only: the occupation's 4-digit unit group against that list.
    const nsw = s.code === "NSW" && code ? (["190", "491"] as const).map((sub) => matchOccupationToState(code, "NSW", sub)) : [];
    const nswListed = nsw.flatMap((m) => (m.type === "UNIT_GROUP_ONLY" && m.onUnitGroupList ? [m.subclass] : []));
    const list =
      s.code === "NSW" && nsw.length > 0
        ? nswListed.length > 0
          ? T(locale, `On the unit-group list: ${nswListed.join(", ")}`, `Birim grubu listesinde: ${nswListed.join(", ")}`, `在单元组清单上：${nswListed.join("、")}`)
          : T(locale, "Not on the published unit-group list", "Yayımlanmış birim grubu listesinde yok", "不在已公布的单元组清单上")
        : s.occupationListStatus === "confirmed"
        ? T(locale, `On the list: ${(s.listedFor ?? []).join(", ") || "—"}`, `Listede: ${(s.listedFor ?? []).join(", ") || "—"}`, `在清单上：${(s.listedFor ?? []).join("、") || "—"}`)
        : s.occupationListStatus === "not_listed"
          ? T(locale, "Not on the published list", "Yayımlanmış listede yok", "不在已公布的清单上")
          : T(locale, "Not confirmed (no occupation-level list in our data)", "Teyit edilmedi (verilerimizde meslek düzeyinde liste yok)", "未确认（我们的数据中没有职业级别清单）");
    const note = [rule?.note ? localizeStateNote(locale, rule.note) : "", ...(s.streamNotes ?? [])].filter(Boolean).join(" ");
    const checked = (s.lastVerifiedAt ?? rule?.lastVerified ?? "").slice(0, 10);
    const firstDoc = (rule?.sourceDocument ?? "").split(";")[0].trim();
    const doc = firstDoc ? firstDoc.split("/").pop()?.replace(/\.(pdf|png)$/i, "") ?? firstDoc : "";
    return [`${s.name} (${s.code}): ${s.status}`, list, note || "—", `${doc}${checked ? ` — ${T(locale, "checked", "kontrol", "核对")} ${checked}` : ""}`.trim()];
  });
}

// ── costs ─────────────────────────────────────────────────────────────────────────────────────────

function sourceOfItem(item: FinancialRoadmapItem, locale: Locale): string {
  const kindLabel =
    item.estimateType === "official_fee"
      ? T(locale, "official fee", "resmi ücret", "官方费用")
      : item.estimateType === "variable"
        ? T(locale, "varies by case", "duruma göre değişir", "因个案而异")
        : T(locale, "indicative estimate", "tahmini", "参考估算");
  let who = "";
  if (item.kind === "vac" || item.kind === "vac_additional") who = T(locale, "Department of Home Affairs", "İçişleri Bakanlığı (Department of Home Affairs)", "内政部 (Department of Home Affairs)");
  else if (item.kind === "skills_assessment") who = item.category.replace(/^[^—-]*[—-]\s*/, "").trim();
  else if (item.kind === "english_test") who = T(locale, "test provider", "sınav kuruluşu", "考试机构");
  else if (item.kind === "medical") who = T(locale, "eMedical panel provider", "eMedical panel sağlayıcısı", "eMedical 指定机构");
  else if (item.kind === "police") who = T(locale, "issuing authorities", "ilgili makamlar", "签发机构");
  return who ? `${who}; ${kindLabel}` : kindLabel;
}

/** Engine sentences that point at content the report no longer has ("see occupation-specific matrix below"). */
const DANGLING = /(?:occupation-specific matrix|mesleğe özel matris|职业特定矩阵|aşağıdaki[^.。]*matris|下方职业)/i;
function withoutDanglingReferences(text: string): string {
  return text
    .split(/(?<=[.。!?])\s+/)
    .filter((sentence) => !DANGLING.test(sentence))
    .join(" ")
    .replace(/\s+—\s*$/, "")
    .trim();
}


// ── scenarios: the engine's labels are phrased as actions ("Obtain ...", "Reach ..."); the report states them as
// arithmetic inputs. A part that is not recognised drops the whole scenario rather than showing an instruction.
const SCENARIO_PARTS: Array<{ re: RegExp; text: (m: RegExpMatchArray, l: Locale) => string }> = [
  { re: /Partner skills|Partner nitelikleri|伴侣技能/, text: (_m, l) => T(l, "Partner with Competent English and a positive skills assessment", "Competent İngilizceli ve olumlu beceri değerlendirmeli partner", "伴侣具备胜任英语且技能评估为正面") },
  { re: /Partner English|Partner İngilizcesi|伴侣英语/, text: (_m, l) => T(l, "Partner with Competent English only", "Yalnızca Competent İngilizceli partner", "伴侣仅具备胜任英语") },
  { re: /NAATI/, text: (_m, l) => T(l, "NAATI credentialled community language (CCL)", "NAATI toplum dili (CCL) sertifikası", "NAATI 社区语言（CCL）认证") },
  { re: /Professional Year|Mesleki Yıl|职业年/, text: (_m, l) => T(l, "Australian Professional Year", "Avustralya Mesleki Yıl (Professional Year)", "澳大利亚职业年（Professional Year）") },
  { re: /(?:Reach (\d+) years? of skilled overseas)|(?:Yurt dışı nitelikli istihdamda (\d+) yıl)|(?:累计海外技术工作经验达到 (\d+) 年)/, text: (m, l) => { const n = m[1] ?? m[2] ?? m[3]; return T(l, `${n} years of skilled overseas employment`, `Yurt dışında ${n} yıl nitelikli istihdam`, `海外技术工作经验 ${n} 年`); } },
  { re: /(?:Reach (\d+) years? of skilled Australian)|(?:Avustralya'da nitelikli istihdamda (\d+) yıl)|(?:累计澳大利亚技术工作经验达到 (\d+) 年)/, text: (m, l) => { const n = m[1] ?? m[2] ?? m[3]; return T(l, `${n} years of skilled Australian employment`, `Avustralya'da ${n} yıl nitelikli istihdam`, `澳大利亚技术工作经验 ${n} 年`); } },
  { re: /Complete an Australian qualification|Avustralya'da bir yeterlilik tamamlayın|在澳大利亚完成一项学历/, text: (_m, l) => T(l, "Australian qualification (at least 2 academic years of study in Australia)", "Avustralya'da yeterlilik (Avustralya'da en az 2 akademik yıl eğitim)", "澳大利亚学历（在澳大利亚至少学习 2 个学年）") },
  { re: /designated regional campus|bölgesel kampüste|偏远地区校区/, text: (_m, l) => T(l, "Study at a designated regional campus in Australia", "Avustralya'da belirlenmiş bölgesel kampüste eğitim", "在澳大利亚指定的偏远地区校区学习") },
  { re: /English test result to Superior|Superior seviyesine|Superior 级|优秀级别/, text: (_m, l) => T(l, "English test result at Superior level", "Superior düzeyinde İngilizce sınav sonucu", "英语成绩达到 Superior 级") },
  { re: /doctorate \(PhD\)|Doktora derecesi|取得博士学位/i, text: (_m, l) => T(l, "Doctorate (PhD)", "Doktora (PhD)", "博士学位") },
  { re: /^Positive skills assessment|^Olumlu beceri değerlendirmesi|^获得正面技能评估/, text: (_m, l) => T(l, "Positive skills assessment", "Olumlu beceri değerlendirmesi", "正面技能评估") },
];

function neutralScenarioLabel(label: string, locale: Locale): string | null {
  const parts = label.split(" + ");
  const out: string[] = [];
  for (const raw of parts) {
    const part = raw.trim();
    const hit = SCENARIO_PARTS.map((p) => ({ p, m: part.match(p.re) })).find((x) => x.m);
    if (!hit || !hit.m) return null;
    out.push(hit.p.text(hit.m, locale));
  }
  return [...new Set(out)].join(" + ");
}

// ── points ────────────────────────────────────────────────────────────────────────────────────────

function pointsSection(report: ReadinessReport, locale: Locale, target: TargetVisa, tags: Record<FactTag, string>): ReportView["points"] {
  const pe = report.pointsEstimate;
  const applicable = (isPointsTestedTarget(target) || target === "not_sure") && report.country !== "CA" && !!pe && (pe.breakdown?.length ?? 0) > 0;
  const rows = (pe?.breakdown ?? []).map((b) =>
    // A factor the visitor entered nothing for is "not assessed", never a 0.
    b.status === "not_assessed"
      ? [b.label, T(locale, "not assessed", "değerlendirilmedi", "未评估"), b.max !== undefined ? String(b.max) : "", b.note || "—"]
      : [b.label, String(b.points), b.max !== undefined ? String(b.max) : "", b.max !== undefined && b.points >= b.max ? "—" : b.note || "—"],
  );
  const scores = report.pathwayScores;
  const evaluated = new Set(report.detectedSubclasses ?? ["189", "190", "491"]);
  const subs = (isPointsTestedTarget(target) ? [target] : (POINTS_TESTED as readonly string[])).filter((s) => evaluated.has(s) || isPointsTestedTarget(target)) as PathwaySubclass[];
  const asOf = report.premiumSections?.historicalInvitationTrends?.dataAsOf;
  const totals: string[][] = [];
  for (const sc of subs) {
    const s: PathwayScore | undefined = scores?.[sc];
    if (!s) continue;
    const nomination = s.nominationBonus;
    totals.push([
      T(locale, `Subclass ${sc}`, `Subclass ${sc}`, `${sc} 子类`),
      String(s.baseScore),
      sc === "189" ? "—" : `+${nomination}`,
      String(s.baseScore + nomination),
      "65",
      s.benchmark === null || s.benchmark === undefined ? T(locale, "not available", "mevcut değil", "暂无") : `${s.benchmark}${asOf ? ` (${asOf})` : ""}`,
    ]);
  }
  const scenarios = (report.pointsBoosterSimulator?.scenarios ?? [])
    .filter((s) => / \+ /.test(s.label) && Number.isFinite(s.resultingEstimate))
    .map((s) => ({ s, label: neutralScenarioLabel(s.label, locale) }))
    .filter((x): x is { s: (typeof x)["s"]; label: string } => x.label !== null)
    .slice(0, 3)
    .map(({ s, label }): [string, string, string] => [
      s.onlyForSubclass ? `${label} (${T(locale, "subclass", "subclass", "子类")} ${s.onlyForSubclass})` : label,
      `+${s.estimatedChange}`,
      String(s.resultingEstimate),
    ]);
  const stage = report.country === "CA" ? undefined : report.applicationStage;
  return {
    applicable,
    intro: `${tags.calculation}: ${T(locale, "the points test table applied to the details you entered.", "puan testi tablosunun girdiğiniz bilgilere uygulanması.", "将积分测试表应用于您填写的信息。")}`,
    headers: [T(locale, "Category", "Kategori", "类别"), T(locale, "Points", "Puan", "分数"), T(locale, "Max", "En çok", "上限"), T(locale, "Note", "Not", "说明")],
    rows,
    totalsTitle: T(locale, "Totals and published reference points", "Toplamlar ve yayımlanmış referans puanlar", "总分与已公布的参考分"),
    totalsHeaders: [
      T(locale, "Visa", "Vize", "签证"),
      T(locale, "From your entries", "Girdiklerinizden", "根据您的填写"),
      T(locale, "Nomination points", "Adaylık puanı", "提名加分"),
      T(locale, "Total with nomination", "Adaylıkla toplam", "含提名总分"),
      T(locale, "Published minimum", "Yayımlanmış asgari", "已公布最低分"),
      T(locale, "Latest published invitation score", "Yayımlanmış son davet puanı", "最近公布的邀请分"),
    ],
    totalsNote: `${T(locale, "Columns 2 and 4", "2. ve 4. sütunlar", "第 2、4 栏")}: ${tags.calculation}. ${T(locale, "Columns 3 and 5", "3. ve 5. sütunlar", "第 3、5 栏")}: ${tags.published_requirement}. ${T(locale, "Column 6", "6. sütun", "第 6 栏")}: ${tags.published_program}.`,
    totals,
    scenariosTitle: T(locale, "Combined scenarios (arithmetic only)", "Birleşik senaryolar (yalnızca aritmetik)", "组合方案（仅算术）"),
    scenariosHeaders: [T(locale, "Scenario", "Senaryo", "方案"), T(locale, "Points added", "Eklenen puan", "增加的积分"), T(locale, "New total", "Yeni toplam", "新总分")],
    scenarios,
    scenariosNote: T(locale, "Arithmetic from the published points table: the total if these entries were different. It is not a suggestion.", "Yayımlanmış puan tablosundan aritmetik: bu girdiler farklı olsaydı toplam. Bir öneri değildir.", "按已公布积分表计算：若这些填写项不同，总分将是多少。这不是建议。"),
    stageNote: stage === "invited" ? T(locale, "You told us you have been invited or nominated; the points above are those you entered.", "Davet aldığınızı veya aday gösterildiğinizi belirttiniz; yukarıdaki puanlar girdiğiniz bilgilere dayanır.", "您表示已获邀请或提名；上述积分基于您填写的信息。") : stage === "eoi_submitted" ? T(locale, "You told us an EOI is submitted; the points above are those you entered now.", "Bir EOI sunduğunuzu belirttiniz; yukarıdaki puanlar şimdi girdiğiniz bilgilere dayanır.", "您表示已提交 EOI；上述积分基于您现在填写的信息。") : "",
  };
}

// ── main ──────────────────────────────────────────────────────────────────────────────────────────

export function buildReportView(args: ReportViewArgs): ReportView {
  const { report, locale, profile, dateText } = args;
  const tags = tagsFor(locale);
  const target = targetVisaOf({ targetVisa: report.targetVisa });
  const isNotSure = target === "not_sure";
  const gateKey = targetGateKey(target);

  // Facts: from the report (recomputed with it); an older stored report without them lists the profile fields it has.
  const factList = report.suppliedFacts ?? [
    { field: "occupation", value: profile.occupation ?? null },
    { field: "age", value: profile.age ?? null },
    { field: "englishLevel", value: profile.englishLevel ?? null },
    { field: "currentCountry", value: profile.currentCountry ?? null },
  ];
  const facts = new Map(factList.map((f) => [f.field, f.value]));
  const factOrder = [...COMMON_FACTS, ...(target === "186" || target === "482" ? ["annualSalaryAud", "yearsInSponsoredPosition"] : []), ...(target === "190" || target === "491" || isNotSure ? ["preferredState"] : [])];
  const unknown = T(locale, "Not provided", "Girilmedi", "未提供");
  const supplied = factOrder
    .filter((f) => facts.has(f))
    .map((f): [string, string, string] => {
      const v = facts.get(f) ?? null;
      return [factLabel(f, locale), v ?? unknown, v === null ? tags.unknown : tags.supplied];
    });
  const notProvided = factOrder.filter((f) => facts.has(f) && facts.get(f) === null).map((f) => factLabel(f, locale));
  for (const row of report.pointsEstimate?.breakdown ?? []) if (row.status === "not_assessed" && !notProvided.includes(row.label)) notProvided.push(`${row.label} (${T(locale, "not assessed", "değerlendirilmedi", "未评估")})`);

  const requirements = gateKey ? requirementRows(report.visaGates?.[gateKey], facts, locale) : [];

  const others = (OVERVIEW_ORDER as readonly string[]).filter((v) => isNotSure || v !== target).map((v) => overviewRow(v as (typeof OVERVIEW_ORDER)[number], report, locale));

  // Costs: one table. Skills-assessment fee of a completed assessment is not a cost item, except where that row is a
  // registration that is separate from the assessment (AHPRA): it stays, with a note saying so.
  const items = report.financialRoadmap ?? [];
  const total = computeEstimatedTotalAud(items);
  const skillsDone = report.assessmentState?.fieldsPresent?.skillsAssessment === true;
  const completed = new Set(total?.completedKinds ?? []);
  const skillsFeeCompleted = skillsDone || completed.has("skills_assessment");
  const authority = profile.occupationRaw ? resolveAssessingAuthority(profile.occupationRaw) : undefined;
  const registrationIsSeparate = authority?.authorityId === "AHPRA";
  const includedKinds = new Set(total?.includedKinds ?? []);
  const costRows = items
    .filter((i) => !(i.kind === "skills_assessment" && skillsFeeCompleted && !registrationIsSeparate))
    .map((i) => ({ item: i.category, amount: i.amountLabel, included: i.kind !== undefined && includedKinds.has(i.kind), source: sourceOfItem(i, locale) }));
  const separateNote = T(
    locale,
    "This registration step is separate from the skills assessment: completing the assessment does not remove it.",
    "Bu kayıt adımı beceri değerlendirmesinden ayrıdır: değerlendirmenin tamamlanması bu adımı ortadan kaldırmaz.",
    "此注册步骤独立于技能评估：完成评估并不会免除该步骤。",
  );
  const notes: string[] = [];
  items.forEach((i, idx) => {
    const isSkills = i.kind === "skills_assessment";
    const follows = i.kind === undefined && i.estimateType === "variable" && items[idx - 1]?.kind === "skills_assessment";
    if ((isSkills && (!skillsFeeCompleted || registrationIsSeparate)) || follows) {
      if (i.explanation) notes.push(`${i.category}: ${withoutDanglingReferences(i.explanation)}`);
      if (follows || (isSkills && registrationIsSeparate)) notes.push(`${i.category}: ${separateNote}`);
    }
  });
  const totalLine = total ? formatEstimatedTotalLine({ ...total, completedKinds: [] }, locale) : "";
  const totalLines: string[] = [];
  if (totalLine) totalLines.push(totalLine);
  const partner = computePartnerTotalAud(items);
  if (partner && total) for (const line of [formatPartnerTotalLine(partner, locale), formatSecondInstalmentLine(partner, locale)]) if (line) totalLines.push(line);
  const city = report.premiumSections?.livingCostProjection;
  const isCA = report.country === "CA";
  const livingKnown = !isCA && city && /[(（]/.test(city.city);
  const livingLine = livingKnown
    ? T(locale, `Living cost, ${city!.city}: about ${city!.currency} ${city!.monthly.total.toLocaleString("en-AU")} per month (${city!.familyProfile}).`, `Yaşam maliyeti, ${city!.city}: ayda yaklaşık ${city!.currency} ${city!.monthly.total.toLocaleString("en-AU")} (${city!.familyProfile}).`, `生活成本，${city!.city}：每月约 ${city!.currency} ${city!.monthly.total.toLocaleString("en-AU")}（${city!.familyProfile}）。`)
    : "";

  const resourcesSrc = getResourcesSection(locale, isCA ? "CA" : "AU");
  const showStatesForSources = !isCA && (target === "190" || target === "491" || isNotSure);
  const sources = collectSources(report, locale, costRows.length > 0, profile.occupationRaw ?? profile.occupation, !showStatesForSources);

  const states = stateRows(report, locale, profile.occupationRaw ?? profile.occupation);
  const showStates = !isCA && states.length > 0 && (target === "190" || target === "491" || isNotSure);
  const procRows = processRows(target, report, profile.occupationRaw ?? profile.occupation, locale);

  const subjectName = targetVisaName(target, locale);
  return {
    locale,
    targetVisa: target,
    isNotSure,
    titles: {
      target: T(locale, "Your target visa", "Hedef vizeniz", "您的目标签证"),
      points: T(locale, "Your points", "Puanlarınız", "您的积分"),
      others: isNotSure ? T(locale, "Pathway Overview", "Vize Yolu Genel Bakışı", "路径概览") : T(locale, "Other visas, side by side", "Diğer vizeler, yan yana", "其他签证并列对比"),
      states: T(locale, "State and territory program information", "Eyalet ve bölge programı bilgileri", "各州和领地项目信息"),
      process: T(locale, "Typical process and published timeframes", "Tipik süreç ve yayımlanmış süreler", "典型流程与已公布的时间"),
      costs: T(locale, "Costs", "Maliyetler", "费用"),
      appendix: T(locale, "Appendix", "Ekler", "附录"),
    },
    tags,
    cover: {
      name: profile.name ?? "",
      dateText,
      occupation: profile.occupation ?? "",
      targetLine: `${T(locale, "Target visa", "Hedef vize", "目标签证")}: ${subjectName}`,
      title: T(locale, "LogiVisa Visa Information Report", "LogiVisa Vize Bilgi Raporu", "LogiVisa 签证信息报告"),
      label: T(locale, "Information report", "Bilgi raporu", "信息报告"),
      subtitle: T(locale, "An information report based on the details you entered and published sources", "Girdiğiniz bilgilere ve yayımlanmış kaynaklara dayalı bir bilgi raporu", "基于您填写的信息和公开来源的信息报告"),
      notice: T(
        locale,
        "General information from published sources. It is not migration advice, does not assess your situation and has not been reviewed by a migration agent.",
        "Yayımlanmış kaynaklardan genel bilgi. Göçmenlik danışmanlığı değildir, durumunuzu değerlendirmez ve bir göçmenlik danışmanı tarafından incelenmemiştir.",
        "来自公开来源的一般信息。不构成移民建议，不评估您的情况，也未经移民代理审阅。",
      ),
    },
    target: {
      subjectLine: `${T(locale, "Target visa", "Hedef vize", "目标签证")}: ${subjectName}`,
      suppliedTitle: T(locale, "Profile facts supplied", "Girilen profil bilgileri", "已填写的个人信息"),
      suppliedHeaders: [T(locale, "Fact", "Bilgi", "项目"), T(locale, "Value", "Değer", "内容"), T(locale, "Label", "Etiket", "标签")],
      supplied,
      requirementsTitle: T(locale, "Requirement map", "Gereklilik haritası", "要求对照表"),
      requirementsHeaders: [
        `${T(locale, "Published requirement", "Yayımlanmış gereklilik", "已公布的要求")}`,
        `${T(locale, "What you entered", "Girdiğiniz", "您填写的内容")}`,
        T(locale, "Source", "Kaynak", "来源"),
        T(locale, "Status", "Durum", "状态"),
      ],
      requirements,
      statusLegend: T(
        locale,
        "Status describes the information, not the outcome. Provided: you entered the information this requirement refers to. Not provided: you did not. Cannot determine: this report cannot determine it from what was entered (documents, a later step or a decision by Home Affairs or a state). Not applicable: the requirement belongs to a stream you did not choose.",
        "Durum, sonucu değil bilgiyi anlatır. Girildi: bu gerekliliğin atıfta bulunduğu bilgiyi girdiniz. Girilmedi: girmediniz. Belirlenemiyor: bu rapor, girilenlerden bunu belirleyemez (belgeler, sonraki bir adım veya İçişleri Bakanlığı ya da bir eyaletin kararı). Geçerli değil: gereklilik seçmediğiniz bir akışa aittir.",
        "状态描述的是信息，而非结果。已提供：您填写了该要求所涉及的信息。未提供：您未填写。无法判断：本报告无法根据所填内容判断（取决于文件、后续步骤或内政部/州的决定）。不适用：该要求属于您未选择的通道。",
      ),
      notApplicableNote: isNotSure ? T(locale, "You chose Not sure, so no single visa's requirement map is shown. The Pathway Overview below lists every visa in the same columns.", "Emin değilim seçtiniz; bu nedenle tek bir vizenin gereklilik haritası gösterilmiyor. Aşağıdaki Vize Yolu Genel Bakışı her vizeyi aynı sütunlarda listeler.", "您选择了“不确定”，因此不显示单一签证的要求对照表。下方路径概览以相同栏目列出每一种签证。") : "",
      notProvidedTitle: T(locale, "Information not provided", "Girilmeyen bilgiler", "未提供的信息"),
      notProvided,
      notProvidedNone: T(locale, "Every field this report reads was entered.", "Bu raporun okuduğu her alan girildi.", "本报告所读取的每个字段均已填写。"),
    },
    points: pointsSection(report, locale, target, tags),
    others: {
      title: isNotSure ? T(locale, "Pathway Overview", "Vize Yolu Genel Bakışı", "路径概览") : T(locale, "Other visas, side by side", "Diğer vizeler, yan yana", "其他签证并列对比"),
      intro: T(locale, "The same columns for every visa, in a fixed order that does not depend on your details. 189, 190 and 491 are separate rows.", "Her vize için aynı sütunlar, bilgilerinize bağlı olmayan sabit bir sırayla. 189, 190 ve 491 ayrı satırlardır.", "每种签证使用相同栏目，按与您的信息无关的固定顺序排列。189、190、491 分别单列。"),
      headers: [
        T(locale, "Visa", "Vize", "签证"),
        T(locale, "Type", "Tür", "类型"),
        T(locale, "Points test", "Puan testi", "积分测试"),
        T(locale, "Base application charge", "Temel başvuru ücreti", "基本申请费"),
        T(locale, "Published requirements", "Yayımlanmış gereklilikler", "已公布的要求"),
        T(locale, "Source", "Kaynak", "来源"),
      ],
      rows: others,
      note: `${tags.published_requirement}; ${tags.published_program}.`,
    },
    states: {
      applicable: showStates,
      title: T(locale, "State and territory program information", "Eyalet ve bölge programı bilgileri", "各州和领地项目信息"),
      intro: T(locale, "Published information for every state and territory, as recorded in our sources. The occupation column matches the occupation you entered against each published list (supplied by you); no state is filtered out or ranked.", "Her eyalet ve bölge için, kaynaklarımızda kayıtlı yayımlanmış bilgiler. Meslek sütunu, girdiğiniz mesleği her yayımlanmış listeyle eşleştirir (sizin girdiğiniz); hiçbir eyalet elenmez veya sıralanmaz.", "各州和领地的公开信息，按我们的资料记录。职业栏将您填写的职业与各州已公布清单比对（由您提供）；不筛除或排序任何州。"),
      headers: [
        T(locale, "State / territory: program status in our sources", "Eyalet / bölge: kaynaklarımızdaki program durumu", "州 / 领地：资料中的项目状态"),
        T(locale, "Occupation on its list (190 / 491)", "Meslek listede (190 / 491)", "职业是否在清单上（190 / 491）"),
        T(locale, "Published conditions", "Yayımlanmış koşullar", "已公布的条件"),
        T(locale, "Source and date checked", "Kaynak ve kontrol tarihi", "来源与核对日期"),
      ],
      rows: states,
      note: `${tags.published_program}. ${T(locale, "A list entry is published information, not a nomination.", "Liste kaydı yayımlanmış bilgidir, bir adaylık değildir.", "清单收录是已公布的信息，并非提名。")}`,
    },
    process: {
      applicable: procRows.length > 0,
      title: T(locale, "Typical process and published timeframes", "Tipik süreç ve yayımlanmış süreler", "典型流程与已公布的时间"),
      intro: T(locale, "The usual steps for this visa and what the sources publish about each. It is generic: it has no dates for you.", "Bu vize için olağan adımlar ve kaynakların her biri hakkında yayımladıkları. Geneldir: size özel tarih içermez.", "该签证的常见步骤及资料对每一步的公开说明。内容为通用信息，不含针对您的日期。"),
      headers: [T(locale, "Step", "Adım", "步骤"), T(locale, "Published information", "Yayımlanmış bilgi", "已公布的信息"), T(locale, "Source", "Kaynak", "来源")],
      rows: procRows,
    },
    costs: {
      headers: [T(locale, "Item", "Kalem", "项目"), T(locale, "Amount", "Tutar", "金额"), T(locale, "In total", "Toplamda", "计入总额"), T(locale, "Source", "Kaynak", "来源")],
      rows: costRows,
      yes: T(locale, "Yes", "Evet", "是"),
      no: T(locale, "No", "Hayır", "否"),
      note: totalLine ? T(locale, "The estimated total is the sum of the items marked Yes.", "Tahmini toplam, Evet işaretli kalemlerin toplamıdır.", "预计总额等于标记为“是”的项目之和。") : "",
      totalLines,
      skillsDoneNote: skillsFeeCompleted ? T(locale, "Your skills assessment is already done; its fee is not a cost item.", "Beceri değerlendirmeniz zaten tamamlandı; ücreti bir maliyet kalemi değildir.", "您的技能评估已完成；其费用不再是成本项目。") : "",
      notes,
      livingLine,
    },
    appendix: {
      documentsTitle: T(locale, "Document types commonly requested", "Sık istenen belge türleri", "常见所需文件类型"),
      documents: (report.documentChecklist ?? []).filter((d) => !/^\s*(CRITICAL|PRIORITY|WARNING)/i.test(d.category)).map((d) => ({ category: d.category, items: d.items.join("; ") })),
      resourcesTitle: T(locale, "Official resources", "Resmi kaynaklar", "官方资源"),
      resources: resourcesSrc.sections.map((s) => ({ heading: s.heading, links: s.links.map((l) => ({ label: l.label, url: l.url })) })),
      sourcesTitle: T(locale, "Sources", "Kaynaklar", "资料来源"),
      sources,
      disclaimerTitle: T(locale, "Disclaimer", "Yasal uyarı", "免责声明"),
      disclaimer: report.disclaimer ?? "",
    },
  };
}

function collectSources(report: ReadinessReport, locale: Locale, hasCosts: boolean, occupation: string | undefined, includeStates: boolean): string[] {
  const out: string[] = [];
  const add = (s: string | undefined) => {
    const v = (s ?? "").trim();
    if (v && !out.includes(v)) out.push(v);
  };
  const gates: GateResult[] = Object.values(report.visaGates ?? {}).flatMap((p) => p.gates);
  gates.forEach((g) => add(g.citation));
  add(T(locale, `Visa requirement text: Home Affairs visa pages, extracted ${(visaGatesData as unknown as { _provenance: { last_verified: string } })._provenance.last_verified}`, `Vize gereklilik metni: İçişleri Bakanlığı vize sayfaları, tarih ${(visaGatesData as unknown as { _provenance: { last_verified: string } })._provenance.last_verified}`, `签证要求文本：内政部签证页面，核对于 ${(visaGatesData as unknown as { _provenance: { last_verified: string } })._provenance.last_verified}`));
  const asOf = report.premiumSections?.historicalInvitationTrends?.dataAsOf;
  if (asOf) add(T(locale, `Latest published invitation scores: SkillSelect invitation rounds, data as of ${asOf}`, `Yayımlanmış son davet puanları: SkillSelect davet turları, veri tarihi ${asOf}`, `最近公布的邀请分：SkillSelect 邀请轮次，数据截至 ${asOf}`));
  for (const s of includeStates ? (report.stateNominationTracker?.states ?? []) : []) {
    const doc = getStateRule(s.code)?.sourceDocument;
    if (doc) add(`${s.name}: ${doc.split("/").pop()?.replace(/\.pdf$/i, "") ?? doc}`);
  }
  if (hasCosts && occupation) {
    const auth = resolveAssessingAuthority(occupation).authority;
    if (auth?.sourceDocument) add(`${auth.authorityName}: ${auth.sourceDocument}`);
  }
  return groupSourcePages(out);
}


/** "X, p.7" / "X, p.15" -> "X, pp.7, 15" (en) / "X, s.7, 15" (tr) / "X，第 7、15 页" (zh); other entries unchanged. */
function groupSourcePages(list: string[]): string[] {
  const groups = new Map<string, { head: string; kind: "en" | "tr" | "zh"; pages: number[] }>();
  const out: string[] = [];
  for (const entry of list) {
    const m = entry.match(/^(.*?)[,，]\s*(p\.|s\.|第\s*)(\d+)(\s*页)?$/);
    if (!m) {
      out.push(entry);
      continue;
    }
    const kind = m[2].startsWith("p") ? "en" : m[2].startsWith("s") ? "tr" : "zh";
    const key = `${m[1]}|${kind}`;
    const g = groups.get(key);
    if (g) g.pages.push(Number(m[3]));
    else {
      groups.set(key, { head: m[1], kind, pages: [Number(m[3])] });
      out.push(`\u0000${key}`);
    }
  }
  return out.map((e) => {
    if (!e.startsWith("\u0000")) return e;
    const g = groups.get(e.slice(1))!;
    const pages = [...new Set(g.pages)].sort((a, b) => a - b);
    if (g.kind === "zh") return `${g.head}，第 ${pages.join("、")} 页`;
    return `${g.head}, ${g.kind === "en" ? (pages.length > 1 ? "pp." : "p.") : "s."}${pages.join(", ")}`;
  });
}
