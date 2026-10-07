import visaGatesData from "@/src/data/visa-gates.json";
import { findOccupationRecord, getEligibleSkilledSubclasses, getSkilledListMembership } from "@/lib/readiness/occupation-eligibility";

import type { Locale, ReadinessInput } from "./types";
import { NOMINATION_BONUS } from "./pathway-scores";
import { gateFailureKind, type GateFailureKind } from "./visa-gate-kinds";
import { GATED_VISAS, T, type GateResult, type GateStatus, type PathwayGateStatus, type PathwayGates } from "./visa-gate-text";

export * from "./visa-gate-text";

/**
 * The sourced hard-gate matrix per visa (src/data/visa-gates.json, scripts/generate-visa-gates.ts) evaluated against
 * the intake. Each gate is met / not_met / unknown, or "future" for a step that comes after lodging an EOI
 * (invitation, nomination, sponsorship). A pathway with any not_met gate is "Not eligible now" and is never
 * recommended; with unknown gates (and no not_met) it is "Conditional"; otherwise "eligible to pursue".
 * A gate that depends on something the form does not collect is unknown by design; so are the employer-sponsorship
 * gates on reports made before the intake asked about sponsorship.
 */

type GateRow = {
  id: string;
  visa: string;
  stream: string | null;
  kind: "gate" | "future_step";
  requirement: string;
  source: string;
  page: number;
  quote: string;
  numeric?: { name: string; value: number; unit: string; effectiveFrom?: string };
  intakeFields: string[];
};

const GATES = (visaGatesData as { gates: GateRow[] }).gates;
const THRESHOLDS = (visaGatesData as { thresholds: { CSIT: { value: number }; SSIT: { value: number } } }).thresholds;
export const VISA_GATES_LAST_VERIFIED = (visaGatesData as { _provenance: { last_verified: string } })._provenance.last_verified;

export type GateContext = {
  /** pointsEstimate.estimatedPoints / potentialPoints (Tier 2 of the two-tier status). */
  estimatedPoints?: number;
  potentialPoints?: number;
  /**
   * The most the applicant's own boosters (English, experience, study, ... -- not nomination) can add. A points
   * shortfall no more than this is actionable; without it a shortfall is treated as structural.
   */
  boosterGain?: number;
  /** The total as if the English test were taken at Competent (the engine zeroes the estimate without a valid test). */
  pointsIfEnglishMet?: number;
  /** 189 / 190 / 491: the score to compare with the recent invitation benchmark (nomination included for 190 / 491). */
  invitation?: Partial<Record<"189" | "190" | "491", { score: number; benchmark: number | null }>>;
  /**
   * How a points shortfall closes: the smallest (quickest, then fewest actions) combination of the factors the
   * closable ceiling (boosterGain) is computed from. Undefined when nothing closes it.
   */
  closurePlan?: (short: number) => PointsClosurePlan | undefined;
  /**
   * 190 / 491: how many states are open to the applicant, and which open states are left out only because a sourced
   * stream condition (employment / study in the state) is unmet. No open state and at least one such blocked state =
   * the nomination gate is not met, with the condition as its step.
   */
  nomination?: Partial<Record<"190" | "491", { open: number; blocked: Array<{ code: string; reason: string; step: string }> }>>;
};

/** One factor of a points closure plan; the gain is its points in that combination (experience: net of age). */
export type PointsClosureFactor = {
  id: "english_proficient" | "english_superior" | "experience" | "education" | "australian_study" | "specialist_education" | "community_language" | "professional_year" | "regional_study" | "partner_skills" | "partner_english";
  gain: number;
  /** experience: the further years of skilled experience. */
  years?: number;
};

export type PointsClosurePlan = {
  factors: PointsClosureFactor[];
  /** Roughly how long the plan takes, from the factors with a stated duration (experience years, 2 years of study). */
  years: number;
  /** Factors whose duration is not stated in the sources (a further qualification, a Professional Year). */
  openDuration: PointsClosureFactor["id"][];
  /** Multi-year actions the plan relies on. */
  multiYear: PointsClosureFactor["id"][];
};

// ── requirement labels (en / tr / zh-Hans) ───────────────────────────────────────────────────────────────────────
const LABELS: Record<string, [string, string, string]> = {
  skills_assessment: ["A suitable (positive) skills assessment", "Uygun (olumlu) bir beceri değerlendirmesi", "合适的（正面）技能评估"],
  occupation_list: ["Occupation on the relevant skilled occupation list", "Mesleğin ilgili nitelikli meslek listesinde olması", "职业在相关技术职业清单上"],
  age45: ["Under 45 when invited", "Davet tarihinde 45 yaşından küçük olmak", "获邀时未满 45 岁"],
  english: ["At least Competent English", "En az Competent English", "至少具备 Competent English"],
  points: ["At least 65 points", "En az 65 puan", "至少 65 分"],
  invitation: ["An invitation to apply (after submitting an EOI)", "Başvuru daveti (EOI verdikten sonra)", "获得递交申请的邀请（提交 EOI 之后）"],
  nomination190: ["Nomination by a state or territory", "Eyalet veya bölge adaylığı", "获得州或领地提名"],
  nomination491: ["Nomination by a state or territory, or sponsorship by an eligible relative", "Eyalet/bölge adaylığı veya uygun bir akraba sponsorluğu", "获得州或领地提名，或合资格亲属担保"],
  "186.age": ["Under 45 when applying (unless exempt)", "Başvuru tarihinde 45 yaşından küçük olmak (muafiyet yoksa)", "递交申请时未满 45 岁（除非获豁免）"],
  "186.csol": ["Nominated occupation on the Core Skills Occupation List (CSOL)", "Aday gösterilen mesleğin Core Skills Occupation List (CSOL) üzerinde olması", "被提名职业在 Core Skills Occupation List (CSOL) 上"],
  "186.experience": ["At least 3 years of relevant work experience (unless exempt)", "En az 3 yıl ilgili iş deneyimi (muafiyet yoksa)", "至少 3 年相关工作经验（除非获豁免）"],
  "186.skills": ["A positive skills assessment before lodging (unless exempt)", "Başvurudan önce olumlu beceri değerlendirmesi (muafiyet yoksa)", "递交前获得正面技能评估（除非获豁免）"],
  "186.salary": ["Nominated salary at or above the Core Skills Income Threshold (CSIT)", "Aday gösterilen maaşın Core Skills Income Threshold (CSIT) değerinde veya üzerinde olması", "被提名薪资不低于 Core Skills Income Threshold (CSIT)"],
  "186.employer": ["Nomination by an approved Australian employer", "Onaylı bir Avustralya işvereni tarafından aday gösterilmek", "获得澳大利亚经批准雇主的提名"],
  "186trt.hold": ["Currently hold a subclass 457 / 482 (or eligible bridging) visa", "Şu anda 457 / 482 (veya uygun bridging) vizesine sahip olmak", "目前持有 457 / 482（或合资格过渡）签证"],
  "186trt.employment": ["2 years of full-time eligible sponsored employment in the last 3 years", "Son 3 yılda 2 yıl tam zamanlı uygun sponsorlu istihdam", "过去 3 年内有 2 年全职合资格担保雇佣"],
  "186trt.employer": ["Nomination by the employer who sponsored your temporary visa", "Geçici vizenizi sponsor eden işveren tarafından aday gösterilmek", "获得担保您临时签证的雇主的提名"],
  "482.csol": ["Nominated occupation on the Core Skills Occupation List (CSOL)", "Aday gösterilen mesleğin Core Skills Occupation List (CSOL) üzerinde olması", "被提名职业在 Core Skills Occupation List (CSOL) 上"],
  "482.salary": ["Paid the market salary and no less than the Core Skills Income Threshold (CSIT)", "Piyasa maaşı ve Core Skills Income Threshold (CSIT) değerinden az olmayan maaş", "获支付市场薪资且不低于 Core Skills Income Threshold (CSIT)"],
  "482.experience": ["At least 1 year of relevant work experience", "En az 1 yıl ilgili iş deneyimi", "至少 1 年相关工作经验"],
  "482.skills": ["A skills assessment, where it is mandatory for the occupation", "Meslek için zorunluysa bir beceri değerlendirmesi", "若该职业强制要求，则需技能评估"],
  "482.english": ["The minimum English test result (IELTS 5.0 overall and in each component), unless exempt", "Asgari İngilizce test sonucu (IELTS genel ve her bölümde 5.0), muafiyet yoksa", "达到最低英语成绩（雅思总分及各项均 5.0），除非获豁免"],
  "482.sponsor": ["Nomination by an approved employer sponsor", "Onaylı bir işveren sponsoru tarafından aday gösterilmek", "获得经批准雇主担保人的提名"],
  "485.age": ["35 or under when applying (under 50 with a Masters (research) or PhD)", "Başvuru tarihinde 35 veya altında olmak (Masters (research) veya PhD ile 50'nin altı)", "递交时 35 岁及以下（持研究型硕士或博士学位可放宽至 50 岁以下）"],
  "485.location": ["In Australia when applying", "Başvuru sırasında Avustralya'da bulunmak", "递交申请时在澳大利亚境内"],
  "485.degree": ["An eligible degree (Bachelor or above) awarded in the last 6 months", "Son 6 ayda verilmiş uygun bir derece (Bachelor veya üzeri)", "过去 6 个月内获授的合资格学位（学士及以上）"],
  "485.provider": ["Study with a CRICOS-registered Australian provider", "CRICOS kayıtlı bir Avustralya kurumunda öğrenim", "在 CRICOS 注册的澳大利亚院校学习"],
  "485.english": ["An English test result from the last 12 months (or an eligible passport)", "Son 12 aydan bir İngilizce test sonucu (veya uygun pasaport)", "过去 12 个月内的英语成绩（或合资格护照）"],
  "500.enrolment": ["Enrolment in a course with a valid Confirmation of Enrolment (CoE)", "Geçerli bir Confirmation of Enrolment (CoE) ile bir kursa kayıt", "已注册课程并持有有效的录取确认书（CoE）"],
  "500.oshc": ["Overseas Student Health Cover (OSHC), unless exempt", "Overseas Student Health Cover (OSHC), muafiyet yoksa", "海外学生健康保险（OSHC），除非获豁免"],
  "500.age": ["6 years or older", "6 yaş veya üzeri", "年满 6 岁"],
  "820.relationship": ["A genuine relationship with an Australian citizen, permanent resident or eligible NZ citizen partner", "Avustralya vatandaşı, daimi oturumlu veya uygun bir Yeni Zelanda vatandaşı partnerle gerçek bir ilişki", "与澳大利亚公民、永久居民或合资格新西兰公民伴侣的真实关系"],
  "820.sponsor": ["Sponsorship by that partner", "Bu partner tarafından sponsor olunmak", "由该伴侣担保"],
  "820.location": ["In Australia when applying", "Başvuru sırasında Avustralya'da bulunmak", "递交申请时在澳大利亚境内"],
};

function citation(row: GateRow, locale: Locale): string {
  const doc = row.source.includes("English proficiency") ? "English proficiency (subclass 482)" : `Subclass ${row.visa === "820" ? "820" : row.visa}`;
  return T(locale, `Home Affairs, ${doc} page, p.${row.page}`, `İçişleri Bakanlığı, ${doc} sayfası, s.${row.page}`, `内政部，${doc} 页面，第 ${row.page} 页`);
}

// ── intake facts ─────────────────────────────────────────────────────────────────────────────────────────────────
function facts(input: ReadinessInput) {
  const ageNum = input.age !== undefined && input.age !== "" ? parseInt(input.age, 10) : NaN;
  const off = input.offshoreExperienceYears;
  const on = input.onshoreExperienceYears;
  const record = findOccupationRecord(input.occupation);
  const lists = record ? new Set(getSkilledListMembership(record.anzsco_code)) : undefined;
  const assessment = (input.occupationConfirmed ?? "").trim().toLowerCase();
  const country = (input.currentCountry ?? "").trim().toLowerCase();
  return {
    age: Number.isNaN(ageNum) ? undefined : ageNum,
    experienceEntered: off !== undefined || on !== undefined,
    experience: (off ?? 0) + (on ?? 0),
    onshore: on,
    assessment: assessment === "yes" ? ("yes" as const) : assessment === "no" ? ("no" as const) : undefined,
    salary: typeof input.annualSalaryAud === "number" && Number.isFinite(input.annualSalaryAud) ? input.annualSalaryAud : undefined,
    english: (input.englishLevel ?? "").trim().toLowerCase() || undefined,
    inAustralia: country === "" ? undefined : country === "au" || country.includes("australia") || country.includes("avustralya"),
    hasOccupation: Boolean(record),
    authority: record?.authority,
    onCsol: lists ? lists.has("CSOL") : undefined,
    eligibleSkilled: new Set<string>(getEligibleSkilledSubclasses(input.occupation)),
  };
}

type Verdict = { status: GateStatus; reason: [string, string, string]; kind?: GateFailureKind };
const met = (en: string, tr: string, zh: string): Verdict => ({ status: "met", reason: [en, tr, zh] });
const notMet = (en: string, tr: string, zh: string): Verdict => ({ status: "not_met", reason: [en, tr, zh] });
const unknown = (en: string, tr: string, zh: string): Verdict => ({ status: "unknown", reason: [en, tr, zh] });
const future = (en: string, tr: string, zh: string): Verdict => ({ status: "future", reason: [en, tr, zh] });

const NO_FIELD: [string, string, string] = [
  "The intake does not collect this, so it cannot be checked.",
  "Form bunu toplamadığı için kontrol edilemez.",
  "表单未收集此信息，因此无法核对。",
];
const noField = () => unknown(...NO_FIELD);

function ageGate(f: ReturnType<typeof facts>, limit: number, orUnder = false): Verdict {
  if (f.age === undefined) return unknown("Age was not provided.", "Yaş girilmedi.", "未提供年龄。");
  const ok = orUnder ? f.age <= limit : f.age < limit;
  const want = orUnder ? `${limit} or under` : `under ${limit}`;
  return ok
    ? met(`Age ${f.age}.`, `Yaş ${f.age}.`, `年龄 ${f.age}。`)
    : notMet(`You are ${f.age}; the limit is ${want}.`, `${f.age} yaşındasınız; sınır ${orUnder ? `${limit} veya altı` : `${limit}'in altı`}.`, `您 ${f.age} 岁；年龄上限为${orUnder ? `${limit} 岁及以下` : `未满 ${limit} 岁`}。`);
}

function skillsGate(f: ReturnType<typeof facts>): Verdict {
  if (f.assessment === "yes") return met("You have a positive skills assessment.", "Olumlu bir beceri değerlendirmeniz var.", "您已获得正面技能评估。");
  if (f.assessment === "no") return notMet("You answered that you do not yet have a positive skills assessment.", "Henüz olumlu bir beceri değerlendirmeniz olmadığını belirttiniz.", "您表示尚未获得正面技能评估。");
  return unknown("The skills assessment answer was not provided.", "Beceri değerlendirmesi yanıtı girilmedi.", "未提供技能评估答案。");
}

function englishGate(f: ReturnType<typeof facts>, opts: { noneIsUnknown?: boolean } = {}): Verdict {
  if (!f.english) return unknown("English level was not provided.", "İngilizce seviyesi girilmedi.", "未提供英语水平。");
  if (f.english === "none") {
    return opts.noneIsUnknown
      ? unknown("No English test yet; exemptions exist (e.g. some passports, 5 years of English-medium study).", "Henüz İngilizce testi yok; muafiyetler var (ör. bazı pasaportlar, 5 yıl İngilizce eğitim).", "尚无英语成绩；存在豁免情形（如部分护照、5 年英语授课学习）。")
      : notMet("No valid English test result (at least Competent is required).", "Geçerli bir İngilizce test sonucu yok (en az Competent gerekir).", "没有有效的英语成绩（至少需要 Competent）。");
  }
  return met(`English level: ${f.english}.`, `İngilizce seviyesi: ${f.english}.`, `英语水平：${f.english}。`);
}

function experienceGate(f: ReturnType<typeof facts>, years: number): Verdict {
  if (!f.experienceEntered) return unknown("Work experience was not entered.", "İş deneyimi girilmedi.", "未填写工作经验。");
  const y = Number.isInteger(f.experience) ? String(f.experience) : f.experience.toFixed(1);
  return f.experience >= years
    ? met(`${y} years declared (at least ${years} needed).`, `${y} yıl beyan edildi (en az ${years} gerekir).`, `已申报 ${y} 年（至少需要 ${years} 年）。`)
    : notMet(`${y} years declared; at least ${years} ${years === 1 ? "year is" : "years are"} required.`, `${y} yıl beyan edildi; en az ${years} yıl gerekir.`, `已申报 ${y} 年；至少需要 ${years} 年。`);
}

function salaryGate(f: ReturnType<typeof facts>, threshold: number, name: string): Verdict {
  const fmt = (n: number) => n.toLocaleString("en-AU");
  if (f.salary === undefined) return unknown("No salary was entered.", "Maaş girilmedi.", "未填写薪资。");
  return f.salary >= threshold
    ? met(`AUD ${fmt(f.salary)} is at or above the ${name} of AUD ${fmt(threshold)} (from 1 July 2026).`, `AUD ${fmt(f.salary)}, AUD ${fmt(threshold)} olan ${name} değerinde veya üzerinde (1 Temmuz 2026'dan itibaren).`, `AUD ${fmt(f.salary)} 不低于 ${name} AUD ${fmt(threshold)}（自 2026 年 7 月 1 日起）。`)
    : notMet(`AUD ${fmt(f.salary)} is below the ${name} of AUD ${fmt(threshold)} (from 1 July 2026).`, `AUD ${fmt(f.salary)}, AUD ${fmt(threshold)} olan ${name} değerinin altında (1 Temmuz 2026'dan itibaren).`, `AUD ${fmt(f.salary)} 低于 ${name} AUD ${fmt(threshold)}（自 2026 年 7 月 1 日起）。`);
}

function occupationListGate(f: ReturnType<typeof facts>, visa: "189" | "190" | "491"): Verdict {
  if (!f.hasOccupation) return unknown("The occupation could not be matched to a list.", "Meslek bir listeyle eşleştirilemedi.", "该职业无法匹配到清单。");
  return f.eligibleSkilled.has(visa)
    ? met(`The occupation is on the skilled list for subclass ${visa}.`, `Meslek, subclass ${visa} için nitelikli listede.`, `该职业在 ${visa} 子类的技术职业清单上。`)
    : notMet(`The occupation is not on the skilled occupation list for subclass ${visa}.`, `Meslek, subclass ${visa} nitelikli meslek listesinde değil.`, `该职业不在 ${visa} 子类的技术职业清单上。`);
}

function csolGate(f: ReturnType<typeof facts>): Verdict {
  if (!f.hasOccupation || f.onCsol === undefined) return unknown("The occupation could not be matched to the Core Skills Occupation List.", "Meslek Core Skills Occupation List ile eşleştirilemedi.", "该职业无法匹配到 Core Skills Occupation List。");
  return f.onCsol
    ? met("The occupation is on the Core Skills Occupation List.", "Meslek Core Skills Occupation List üzerinde.", "该职业在 Core Skills Occupation List 上。")
    : notMet("The occupation is not on the Core Skills Occupation List.", "Meslek Core Skills Occupation List üzerinde değil.", "该职业不在 Core Skills Occupation List 上。");
}

/**
 * The 65-point minimum applies to the total including the nomination / sponsorship points the visa requires
 * (+5 for 190, +15 for 491), the same total the invitation benchmark is compared with.
 */
function pointsGate(ctx: GateContext, visa: "189" | "190" | "491", f?: ReturnType<typeof facts>): Verdict {
  const noEnglish = f?.english === "none" && ctx.pointsIfEnglishMet !== undefined;
  const own = noEnglish ? ctx.pointsIfEnglishMet : (ctx.potentialPoints ?? ctx.estimatedPoints);
  if (own === undefined) return unknown("A points estimate could not be calculated.", "Puan tahmini hesaplanamadı.", "无法计算分数估算。");
  const bonus = NOMINATION_BONUS[visa];
  const p = own + bonus;
  const note = ctx.potentialPoints !== undefined && ctx.estimatedPoints !== undefined && ctx.potentialPoints !== ctx.estimatedPoints
    ? [` (potential score ${own}, as if the skills assessment is positive)`, ` (potansiyel puan ${own}; beceri değerlendirmesi olumluymuş gibi)`, `（潜在分数 ${own}，按技能评估为正面计算）`]
    : ["", "", ""];
  const nom = bonus > 0
    ? [` + ${bonus} for the required ${visa === "190" ? "state" : "regional"} nomination or sponsorship = ${p}`, ` + zorunlu ${visa === "190" ? "eyalet" : "bölgesel"} adaylık veya sponsorluk için ${bonus} = ${p}`, ` + 必需的${visa === "190" ? "州" : "地区"}提名或担保 ${bonus} 分 = ${p}`]
    : ["", "", ""];
  if (p >= 65) return met(`Estimated ${own} points${note[0]}${nom[0]}.`, `Tahmini ${own} puan${note[1]}${nom[1]}.`, `预估 ${own} 分${note[2]}${nom[2]}。`);
  const closable = ctx.boosterGain !== undefined && p + ctx.boosterGain >= 65;
  return {
    ...notMet(`Estimated ${own} points${note[0]}${nom[0]}; 65 are needed.`, `Tahmini ${own} puan${note[1]}${nom[1]}; 65 gerekir.`, `预估 ${own} 分${note[2]}${nom[2]}；需要 65 分。`),
    kind: closable ? "actionable" : "structural",
  };
}

function locationGate(f: ReturnType<typeof facts>): Verdict {
  if (f.inAustralia === undefined) return unknown("Your current country was not provided.", "Bulunduğunuz ülke girilmedi.", "未提供您当前所在国家。");
  return f.inAustralia
    ? met("You are in Australia.", "Avustralya'dasınız.", "您在澳大利亚境内。")
    : notMet("You are outside Australia; you must be in Australia when you apply.", "Avustralya dışındasınız; başvuru sırasında Avustralya'da olmanız gerekir.", "您在澳大利亚境外；递交申请时必须在澳大利亚境内。");
}

const SKILLED_ELIGIBLE_DEGREES = ["Bachelor", "Bachelor's Degree", "Master's Degree (Coursework)", "Master's Degree (Research)", "PhD/Doctorate", "PhD"];

type Evaluator = (input: ReadinessInput, f: ReturnType<typeof facts>, ctx: GateContext) => Verdict;
const EVAL: Record<string, Evaluator> = {};
const skilled = (v: "189" | "190" | "491") => {
  EVAL[`${v}.skills_assessment`] = (_i, f) => skillsGate(f);
  EVAL[`${v}.occupation_list`] = (_i, f) => occupationListGate(f, v);
  EVAL[`${v}.age`] = (_i, f) => ageGate(f, 45);
  EVAL[`${v}.english`] = (_i, f) => englishGate(f);
  EVAL[`${v}.points`] = (_i, _f, c) => pointsGate(c, v, _f);
  EVAL[`${v}.invitation`] = () => future("After you submit an EOI you may be invited; this is a later step, not a failure.", "EOI verdikten sonra davet alabilirsiniz; bu sonraki bir adımdır, başarısızlık değildir.", "提交 EOI 后才可能获邀；这是后续步骤，并非不符合条件。");
};
skilled("189");
skilled("190");
skilled("491");
const nominationGate = (visa: "190" | "491"): Evaluator => (_i, _f, c) => {
  const n = c.nomination?.[visa];
  if (n && n.open === 0 && n.blocked.length > 0) {
    const why = n.blocked.map((b) => `${b.code}: ${b.reason}`).join("; ");
    return {
      status: "not_met",
      kind: "actionable",
      reason: [
        `No state is available to you for ${visa} on your answers (${why}).`,
        `Yanıtlarınıza göre ${visa} için size açık bir eyalet yok (${why}).`,
        `根据您的答案，没有州对您开放 ${visa}（${why}）。`,
      ],
    };
  }
  return visa === "190"
    ? future("A state or territory nominates you after your EOI; a later step.", "Eyalet/bölge EOI'nizden sonra aday gösterir; sonraki bir adım.", "州或领地在您提交 EOI 后提名；属后续步骤。")
    : future("A state or territory nominates you (or an eligible relative sponsors you) after your EOI; a later step.", "Eyalet/bölge sizi aday gösterir (veya uygun bir akraba sponsor olur); sonraki bir adım.", "州或领地提名您（或合资格亲属担保）；属后续步骤。");
};
EVAL["190.nomination"] = nominationGate("190");
EVAL["491.nomination"] = nominationGate("491");

EVAL["186DE.age"] = (_i, f) => ageGate(f, 45);
EVAL["186DE.occupation_csol"] = (_i, f) => csolGate(f);
EVAL["186DE.experience"] = (_i, f) => experienceGate(f, 3);
EVAL["186DE.skills_assessment"] = (_i, f) => skillsGate(f);
EVAL["186DE.english"] = (_i, f) => englishGate(f);
EVAL["186DE.salary"] = (_i, f) => salaryGate(f, THRESHOLDS.CSIT.value, "Core Skills Income Threshold (CSIT)");
// Employer sponsorship (intake). Undefined on reports made before the field existed: unknown, exactly as before.
// Having no sponsor is something the applicant can change (find one): actionable, never structural.
const noSponsor = () => notMet("You answered that you have no employer sponsor or job offer.", "İşveren sponsorunuz veya iş teklifiniz olmadığını belirttiniz.", "您表示没有雇主担保或工作邀约。");
const NOMINATION_NOT_COLLECTED = (who: "offer" | "current") =>
  who === "offer"
    ? unknown("You have a job offer from an employer willing to sponsor you; whether they will nominate you for permanent residence is not collected.", "Sizi sponsor etmeye istekli bir işverenden iş teklifiniz var; sizi daimi oturum için aday gösterip göstermeyeceği formda sorulmuyor.", "您已获得愿意担保您的雇主的工作邀约；该雇主是否会为您提名永久居留，表单未收集。")
    : unknown("You are currently sponsored on a 482 / 457; whether your sponsor will nominate you for permanent residence is not collected.", "Şu anda 482 / 457 ile sponsorlusunuz; sponsorunuzun sizi daimi oturum için aday gösterip göstermeyeceği formda sorulmuyor.", "您目前持 482 / 457 获担保；您的担保雇主是否会为您提名永久居留，表单未收集。");
EVAL["482CS.sponsor"] = (i) => {
  if (i.employerSponsorship === undefined) return noField();
  if (i.employerSponsorship === "none") return noSponsor();
  return i.employerSponsorship === "job_offer"
    ? met("You have a job offer from an Australian employer willing to sponsor you.", "Sizi sponsor etmeye istekli bir Avustralya işvereninden iş teklifiniz var.", "您已获得愿意担保您的澳大利亚雇主的工作邀约。")
    : met("You are currently sponsored on a 482 / 457 visa.", "Şu anda 482 / 457 vizesiyle sponsorlusunuz.", "您目前持 482 / 457 签证获得担保。");
};
EVAL["186DE.employer_nomination"] = (i) => {
  if (i.employerSponsorship === undefined) return noField();
  if (i.employerSponsorship === "none") return noSponsor();
  return NOMINATION_NOT_COLLECTED(i.employerSponsorship === "job_offer" ? "offer" : "current");
};
EVAL["186TRT.hold_visa"] = (i) => {
  if (i.employerSponsorship === undefined) return noField();
  return i.employerSponsorship === "sponsored_482"
    ? met("You currently hold a 482 / 457 visa.", "Şu anda 482 / 457 vizeniz var.", "您目前持有 482 / 457 签证。")
    : notMet("You do not currently hold a 482 / 457 visa.", "Şu anda 482 / 457 vizeniz yok.", "您目前未持有 482 / 457 签证。");
};
EVAL["186TRT.sponsored_employment"] = (i, f) => {
  // Sponsored employment happens in Australia: fewer than 2 years of Australian experience rules it out, but
  // 2 or more Australian years do not show it was sponsored -- only the sponsored-position answer can confirm that.
  // Years with the CURRENT sponsor meet the requirement at 2 or more; fewer do not rule it out (earlier sponsored
  // employment with another sponsor also counts).
  const current = i.yearsInSponsoredPosition === undefined && i.employerSponsorship === "sponsored_482" ? i.yearsWithCurrentSponsor : undefined;
  if (current !== undefined && current < 2) {
    return unknown(`${current} years with your current sponsor; sponsored employment with an earlier sponsor also counts toward the 2 years.`, `Mevcut sponsorunuzla ${current} yıl; önceki bir sponsorla sponsorlu istihdam da 2 yıla sayılır.`, `与当前担保雇主共 ${current} 年；此前在其他担保雇主处的担保雇佣也计入 2 年。`);
  }
  const y = i.yearsInSponsoredPosition ?? current ?? (f.onshore !== undefined && f.onshore < 2 ? f.onshore : undefined);
  if (y === undefined) return unknown("Years in a sponsored position were not provided.", "Sponsorlu pozisyondaki yıl girilmedi.", "未提供担保职位的年限。");
  return y >= 2
    ? met(`${y} years declared (2 needed).`, `${y} yıl beyan edildi (2 gerekir).`, `已申报 ${y} 年（需要 2 年）。`)
    : notMet(`${y} years declared; 2 years of eligible sponsored employment are required.`, `${y} yıl beyan edildi; 2 yıl uygun sponsorlu istihdam gerekir.`, `已申报 ${y} 年；需要 2 年合资格担保雇佣。`);
};
EVAL["186TRT.age"] = (_i, f) => ageGate(f, 45);
EVAL["186TRT.english"] = (_i, f) => englishGate(f);
EVAL["186TRT.employer_nomination"] = (i) => {
  if (i.employerSponsorship === undefined) return noField();
  if (i.employerSponsorship === "sponsored_482") return NOMINATION_NOT_COLLECTED("current");
  return i.employerSponsorship === "none"
    ? noSponsor()
    : notMet("The nomination must come from the employer who sponsored your temporary visa; you are not currently sponsored.", "Adaylık, geçici vizenize sponsor olan işverenden gelmelidir; şu anda sponsorlu değilsiniz.", "提名须来自担保您临时签证的雇主；您目前未获担保。");
};

EVAL["482CS.occupation_csol"] = (_i, f) => csolGate(f);
EVAL["482CS.salary"] = (_i, f) => salaryGate(f, THRESHOLDS.CSIT.value, "Core Skills Income Threshold (CSIT)");
EVAL["482CS.experience"] = (_i, f) => experienceGate(f, 1);
EVAL["482CS.skills_assessment"] = () => unknown("Only some occupations need one (IMMI 18/039, not in the sources), so it cannot be checked from the intake.", "Yalnızca bazı meslekler gerektirir (IMMI 18/039, kaynaklarda yok); bu yüzden formdan kontrol edilemez.", "仅部分职业需要（IMMI 18/039，资料中没有），因此无法根据表单核对。");
EVAL["482CS.english"] = (_i, f) => englishGate(f, { noneIsUnknown: true });
EVAL["482SS.salary"] = (_i, f) => salaryGate(f, THRESHOLDS.SSIT.value, "Specialist Skills Income Threshold (SSIT)");

EVAL["485.age"] = (i, f) => {
  const research = i.qualificationLevel === "Master's Degree (Research)" || i.qualificationLevel === "PhD/Doctorate" || i.qualificationLevel === "PhD";
  return ageGate(f, research ? 49 : 35, true);
};
EVAL["485.in_australia"] = (_i, f) => locationGate(f);
EVAL["485.eligible_degree"] = (i) => {
  if (!i.qualificationLevel) return unknown("Education level was not provided.", "Eğitim seviyesi girilmedi.", "未提供学历。");
  return SKILLED_ELIGIBLE_DEGREES.includes(i.qualificationLevel)
    ? met("Your highest qualification is degree level or above.", "En yüksek eğitiminiz lisans veya üzeri.", "您的最高学历为学位或以上。")
    : notMet("Your highest qualification is below degree level; the 485 needs a Bachelor degree or above.", "En yüksek eğitiminiz lisans altı; 485 için Bachelor veya üzeri gerekir.", "您的最高学历低于学位水平；485 需要学士及以上学位。");
};
EVAL["485.australian_provider"] = (i) => {
  if (i.qualificationAwardedInAustralia === undefined || i.qualificationAwardedInAustralia === null) return unknown("Where the qualification was completed was not answered.", "Eğitimin nerede tamamlandığı yanıtlanmadı.", "未回答学历在何处完成。");
  return i.qualificationAwardedInAustralia
    ? met("Completed at an Australian institution.", "Avustralya kurumunda tamamlandı.", "在澳大利亚院校完成。")
    : notMet("Not completed at an Australian institution; the 485 needs study with a CRICOS-registered Australian provider.", "Avustralya kurumunda tamamlanmadı; 485 için CRICOS kayıtlı bir Avustralya kurumunda öğrenim gerekir.", "并非在澳大利亚院校完成；485 需要在 CRICOS 注册的澳大利亚院校学习。");
};
EVAL["485.english"] = () => noField();

EVAL["500.enrolment"] = () => noField();
EVAL["500.oshc"] = () => noField();
EVAL["500.age"] = (_i, f) => (f.age === undefined ? unknown("Age was not provided.", "Yaş girilmedi.", "未提供年龄。") : f.age >= 6 ? met(`Age ${f.age}.`, `Yaş ${f.age}.`, `年龄 ${f.age}。`) : notMet(`You are ${f.age}; the minimum is 6.`, `${f.age} yaşındasınız; asgari 6.`, `您 ${f.age} 岁；最低 6 岁。`));
EVAL["820.relationship"] = () => noField();
EVAL["820.sponsor"] = () => noField();
EVAL["820.in_australia"] = (_i, f) => locationGate(f);

/** Gate id -> its label key. */
const LABEL_KEY: Record<string, string> = {
  "skills_assessment": "skills_assessment",
  "occupation_list": "occupation_list",
  "age": "age45",
  "english": "english",
  "points": "points",
  "invitation": "invitation",
  "nomination": "nomination",
  "186DE.age": "186.age",
  "186DE.occupation_csol": "186.csol",
  "186DE.experience": "186.experience",
  "186DE.skills_assessment": "186.skills",
  "186DE.english": "english",
  "186DE.salary": "186.salary",
  "186DE.employer_nomination": "186.employer",
  "186TRT.hold_visa": "186trt.hold",
  "186TRT.sponsored_employment": "186trt.employment",
  "186TRT.age": "186.age",
  "186TRT.english": "english",
  "186TRT.employer_nomination": "186trt.employer",
  "482CS.occupation_csol": "482.csol",
  "482CS.salary": "482.salary",
  "482CS.experience": "482.experience",
  "482CS.skills_assessment": "482.skills",
  "482CS.english": "482.english",
  "482CS.sponsor": "482.sponsor",
  "482SS.salary": "482.salary",
  "485.age": "485.age",
  "485.in_australia": "485.location",
  "485.eligible_degree": "485.degree",
  "485.australian_provider": "485.provider",
  "485.english": "485.english",
  "500.enrolment": "500.enrolment",
  "500.oshc": "500.oshc",
  "500.age": "500.age",
  "820.relationship": "820.relationship",
  "820.sponsor": "820.sponsor",
  "820.in_australia": "820.location",
};

function labelFor(row: GateRow, locale: Locale): string {
  const short = row.id.replace(/^(189|190|491)\./, "");
  const key = LABEL_KEY[row.id] ?? (row.id.startsWith("190.nomination") || row.id.startsWith("491.nomination") ? undefined : LABEL_KEY[short]) ?? row.id;
  const lk = row.id === "190.nomination" ? "nomination190" : row.id === "491.nomination" ? "nomination491" : key;
  const l = LABELS[lk] ?? [row.requirement, row.requirement, row.requirement];
  return T(locale, l[0], l[1], l[2]);
}

function evaluateGate(row: GateRow, input: ReadinessInput, f: ReturnType<typeof facts>, ctx: GateContext, locale: Locale): GateResult {
  const evaluator = EVAL[row.id];
  const verdict = evaluator ? evaluator(input, f, ctx) : noField();
  const kind = verdict.status === "not_met" ? (verdict.kind ?? gateFailureKind(row.id)) : undefined;
  const step = kind === "actionable" ? stepFor(row, input, f, ctx, locale) : undefined;
  return {
    id: row.id,
    visa: row.visa,
    stream: row.stream,
    status: verdict.status,
    label: labelFor(row, locale),
    reason: T(locale, ...verdict.reason),
    citation: citation(row, locale),
    quote: row.quote,
    ...(kind ? { kind } : {}),
    ...(step ? { step } : {}),
  };
}

/** The action that resolves an actionable not-met gate. */
function stepFor(row: GateRow, input: ReadinessInput, f: ReturnType<typeof facts>, ctx: GateContext, locale: Locale): string | undefined {
  const key = row.id.replace(/^[0-9A-Z]+\./, "");
  if (key === "skills_assessment" && row.visa === "482") {
    return T(locale, "Complete a skills assessment (mandatory for some occupations) before the nomination", "Nominasyondan önce bir beceri değerlendirmesi tamamlayın (bazı meslekler için zorunlu)", "在提名前完成技能评估（部分职业强制要求）");
  }
  if (key === "skills_assessment") {
    const body = f.authority?.trim();
    return T(
      locale,
      `Complete a positive skills assessment with ${body || "the assessing authority for your occupation"}`,
      `${body || "Mesleğiniz için yetkili değerlendirme kurumu"} ile olumlu bir beceri değerlendirmesi tamamlayın`,
      `向${body || "您职业的评估机构"}完成正面技能评估`
    );
  }
  if (key === "english" && row.visa === "482") {
    return T(locale, "Take an English test and reach the minimum result (IELTS 5.0 overall and in each component)", "Bir İngilizce testi alın ve asgari sonuca ulaşın (genel ve her bölümde IELTS 5.0)", "参加英语考试并达到最低成绩（雅思总分及各项均 5.0）");
  }
  if (key === "english" && row.visa === "485") {
    return T(locale, "Take an English test and obtain a result from the last 12 months", "Bir İngilizce testi alın ve son 12 aydan bir sonuç edinin", "参加英语考试并取得过去 12 个月内的成绩");
  }
  if (key === "english") {
    return T(locale, "Take an English test and reach at least Competent English", "Bir İngilizce testi alın ve en az Competent seviyesine ulaşın", "参加英语考试并至少达到 Competent 水平");
  }
  if (key === "points") {
    const noEnglish = f.english === "none" && ctx.pointsIfEnglishMet !== undefined;
    const own = (noEnglish ? ctx.pointsIfEnglishMet : (ctx.potentialPoints ?? ctx.estimatedPoints)) ?? 0;
    const bonus = NOMINATION_BONUS[row.visa as "189" | "190" | "491"];
    const total = own + bonus;
    const short = Math.max(65 - total, 0);
    const inc = bonus > 0
      ? [`, including ${bonus} for the required nomination or sponsorship`, `, zorunlu adaylık veya sponsorluk için ${bonus} puan dahil`, `，含必需的提名或担保 ${bonus} 分`]
      : ["", "", ""];
    const basis = noEnglish ? [", counting Competent English", ", Competent İngilizce sayılarak", "，按 Competent 英语计算"] : ["", "", ""];
    const plan = short > 0 ? ctx.closurePlan?.(short) : undefined;
    const how = plan ? closurePlanText(plan, short, locale) : undefined;
    return T(
      locale,
      `Raise your points from ${total} to at least 65 (currently ${short} short${inc[0]}${basis[0]}${how ? `; ${how}` : ""}; see the points improvement tips)`,
      `Puanınızı ${total} değerinden en az 65'e çıkarın (şu anda ${short} puan eksik${inc[1]}${basis[1]}${how ? `; ${how}` : ""}; puan iyileştirme ipuçlarına bakın)`,
      `将分数从 ${total} 分提高到至少 65 分（目前差 ${short} 分${inc[2]}${basis[2]}${how ? `；${how}` : ""}；见提分建议）`
    );
  }
  if (key === "nomination") {
    const blocked = ctx.nomination?.[row.visa as "190" | "491"]?.blocked ?? [];
    return blocked.length ? [...new Set(blocked.map((b) => b.step))].join("; ") : undefined;
  }
  if (key === "sponsor" || key === "employer_nomination") {
    return T(locale, "Find an employer willing to sponsor you", "Sizi sponsor etmeye istekli bir işveren bulun", "找到愿意担保您的雇主");
  }
  if (key === "experience" || key === "sponsored_employment") {
    const need = row.numeric?.value ?? (row.id === "186DE.experience" ? 3 : row.id === "482CS.experience" ? 1 : 2);
    const have = key === "experience" ? f.experience : (input.yearsInSponsoredPosition ?? f.onshore ?? 0);
    const more = Math.max(need - have, 0);
    const m = Number.isInteger(more) ? String(more) : more.toFixed(1);
    const what = key === "experience" ? "" : " sponsored";
    return T(
      locale,
      `Gain ${m} more year${more === 1 ? "" : "s"} of relevant${what} work experience (${need} required)`,
      `${m} yıl daha ilgili${key === "experience" ? "" : " sponsorlu"} iş deneyimi kazanın (${need} yıl gerekir)`,
      `再积累 ${m} 年相关${key === "experience" ? "" : "担保"}工作经验（需要 ${need} 年）`
    );
  }
  return undefined;
}

const FACTOR_LABEL: Record<Exclude<PointsClosureFactor["id"], "experience">, [string, string, string]> = {
  english_proficient: ["Proficient English", "Proficient İngilizce", "Proficient 英语"],
  english_superior: ["Superior English", "Superior İngilizce", "Superior 英语"],
  education: ["a further qualification", "ek bir yükseköğretim derecesi", "更高一级的学历"],
  australian_study: ["the Australian study requirement (at least 2 academic years of study in Australia)", "Avustralya eğitim şartı (Avustralya'da en az 2 akademik yıl eğitim)", "澳大利亚学习要求（在澳大利亚至少学习 2 个学年）"],
  specialist_education: ["specialist education (an Australian research masters or doctorate in STEM)", "uzmanlık eğitimi (STEM alanında Avustralya araştırma yüksek lisansı veya doktorası)", "专业教育（澳大利亚 STEM 研究型硕士或博士）"],
  community_language: ["a credentialled community language (NAATI)", "onaylı topluluk dili (NAATI)", "社区语言认证（NAATI）"],
  professional_year: ["a Professional Year program", "Mesleki Yıl (Professional Year) programı", "职业年（Professional Year）项目"],
  regional_study: ["study in regional Australia", "Avustralya'nın bölgesel bir alanında eğitim", "在澳大利亚偏远地区学习"],
  partner_skills: ["your partner's skills", "partnerinizin becerileri", "伴侣的技能"],
  partner_english: ["your partner's Competent English", "partnerinizin Competent İngilizcesi", "伴侣的 Competent 英语"],
};

/**
 * How the gap closes and roughly how long it takes, naming only the factors of the plan (the same factors the
 * closable ceiling uses): "closes with Proficient English (+10) and 3 more years of skilled experience (+5), about 3 years".
 */
export function closurePlanText(plan: PointsClosurePlan, short: number, locale: Locale): string {
  const li = locale === "tr" ? 1 : locale === "zh-Hans" ? 2 : 0;
  const part = (f: PointsClosureFactor) => {
    const label =
      f.id === "experience"
        ? [`${f.years} more year${f.years === 1 ? "" : "s"} of skilled experience`, `${f.years} yıl daha nitelikli iş deneyimi`, `再积累 ${f.years} 年技术工作经验`][li]
        : FACTOR_LABEL[f.id][li];
    return `${label} (+${f.gain})`;
  };
  const parts = plan.factors.map(part);
  const joined = [
    parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0],
    parts.length > 1 ? `${parts.slice(0, -1).join(", ")} ve ${parts[parts.length - 1]}` : parts[0],
    parts.join("、"),
  ][li];
  const open = plan.openDuration.map((id) => FACTOR_LABEL[id as Exclude<PointsClosureFactor["id"], "experience">][li]);
  const time =
    plan.years === 0 && open.length === 0
      ? ["no waiting time needed", "beklemeye gerek yok", "无需等待"][li]
      : plan.years > 0
        ? [`about ${plan.years} year${plan.years === 1 ? "" : "s"}`, `yaklaşık ${plan.years} yıl`, `约 ${plan.years} 年`][li]
        : "";
  const openText = open.length > 0 ? [`plus the time to complete ${open.join(" and ")}`, `artı ${open.join(" ve ")} için gereken süre`, `另加完成${open.join("和")}所需时间`][li] : "";
  const MULTI: Record<string, [string, string, string]> = {
    experience: ["skilled experience accrual", "nitelikli iş deneyimi birikimi", "技术工作经验积累"],
    australian_study: ["Australian study", "Avustralya'da eğitim", "澳大利亚学习"],
    regional_study: ["regional study", "bölgesel eğitim", "偏远地区学习"],
    specialist_education: ["specialist education", "uzmanlık eğitimi", "专业教育"],
    education: ["a further qualification", "ek bir derece", "更高学历"],
  };
  const multi = plan.multiYear.map((id) => MULTI[id]?.[li]).filter(Boolean);
  const multiText = multi.length > 0 ? [`relies on multi-year actions (${multi.join(", ")})`, `çok yıllık adımlara dayanır (${multi.join(", ")})`, `依赖多年期行动（${multi.join("、")}）`][li] : "";
  const tail = [time, openText, multiText].filter(Boolean);
  // The shortfall itself is already stated just before this text in the step sentence.
  void short;
  return [
    `closes with ${joined}${tail.length ? `, ${tail.join(", ")}` : ""}`,
    `açık şununla kapanır: ${joined}${tail.length ? `, ${tail.join(", ")}` : ""}`,
    `可通过${joined}补足${tail.length ? `，${tail.join("，")}` : ""}`,
  ][li];
}

function combine(visa: string, gates: GateResult[], streamsConsidered?: string[]): PathwayGates {
  const notMetList = gates.filter((g) => g.status === "not_met");
  const unknownList = gates.filter((g) => g.status === "unknown");
  const structural = notMetList.filter((g) => g.kind !== "actionable");
  const steps = Array.from(new Set(notMetList.filter((g) => g.kind === "actionable" && g.step).map((g) => g.step as string)));
  return {
    visa,
    status: structural.length > 0 ? "not_eligible_now" : notMetList.length > 0 ? "next_step_required" : unknownList.length > 0 ? "conditional" : "eligible",
    gates,
    notMet: notMetList,
    unknown: unknownList,
    future: gates.filter((g) => g.status === "future"),
    steps: structural.length > 0 ? [] : steps,
    stepsRemaining: structural.length > 0 ? 0 : notMetList.length,
    ...(streamsConsidered ? { streamsConsidered } : {}),
  };
}

function pathwayFor(rows: GateRow[], visa: string, input: ReadinessInput, f: ReturnType<typeof facts>, ctx: GateContext, locale: Locale): PathwayGates {
  return combine(visa, rows.map((r) => evaluateGate(r, input, f, ctx, locale)));
}

function streamRows(visa: string, stream: string): GateRow[] {
  return GATES.filter((g) => g.visa === visa && g.stream === stream);
}

/** A published requirement of a visa (one row of the sourced matrix), in the report's language, without any evaluation. */
export type PublishedRequirement = {
  id: string;
  visa: string;
  stream: string | null;
  kind: "gate" | "future_step";
  /** The requirement, in the report's language. */
  label: string;
  /** "Home Affairs, Subclass 186 page, p.7" (localized). */
  citation: string;
  page: number;
  /** The intake fields the requirement refers to (empty: the form does not collect it). */
  intakeFields: string[];
};

/**
 * The published requirements of a visa (and stream), exactly as the matrix lists them -- no evaluation, nothing depends on
 * the applicant. `stream` null = every row of the visa (189 / 190 / 491 / 485 / 500 / 820 have no streams).
 */
export function publishedRequirements(visa: string, stream: string | null, locale: Locale): PublishedRequirement[] {
  return GATES.filter((g) => g.visa === visa && (stream === null || g.stream === stream)).map((g) => ({
    id: g.id,
    visa: g.visa,
    stream: g.stream,
    kind: g.kind,
    label: labelFor(g, locale),
    citation: citation(g, locale),
    page: g.page,
    intakeFields: g.intakeFields,
  }));
}

/**
 * Evaluates every visa's gates against the intake. 186 combines its two streams: it is "not eligible now" only when
 * BOTH Direct Entry and Temporary Residence Transition have a not-met gate (or, when the intake names a stream, that
 * stream does); the failed gates of the streams that are out are listed.
 */
export function evaluateVisaGates(input: ReadinessInput, ctx: GateContext, locale: Locale): Record<string, PathwayGates> {
  const f = facts(input);
  const out: Record<string, PathwayGates> = {};
  for (const v of ["189", "190", "491"] as const) {
    const pw = pathwayFor(GATES.filter((g) => g.visa === v), v, input, f, ctx, locale);
    const inv = ctx.invitation?.[v];
    // Every gate met but the score is below the recent invitation benchmark: eligible, not competitive.
    out[v] = pw.status === "eligible" && inv && inv.benchmark !== null && inv.score < inv.benchmark ? { ...pw, belowBenchmark: { score: inv.score, benchmark: inv.benchmark } } : pw;
  }

  const de = pathwayFor(streamRows("186", "Direct Entry"), "186", input, f, ctx, locale);
  const trt = pathwayFor(streamRows("186", "Temporary Residence Transition"), "186", input, f, ctx, locale);
  const chosen = input.nominationStream === "direct_entry" ? [de] : input.nominationStream === "trt" ? [trt] : [de, trt];
  const viable = chosen.filter((s) => s.status !== "not_eligible_now").sort((x, y) => x.stepsRemaining - y.stepsRemaining);
  const all186 = chosen.flatMap((s) => s.gates);
  const streamName = (s: PathwayGates) => (s === de ? "Direct Entry" : "Temporary Residence Transition");
  const pick = viable.length > 0 ? viable : chosen;
  const gates186 = viable.length > 0 ? viable.flatMap((s) => s.gates) : all186;
  // With at least one open stream the pathway is not shut down: a closed stream's failed gates are not the pathway's.
  out["186"] = {
    ...combine("186", gates186, pick.map(streamName)),
    closedStreams: viable.length > 0 ? chosen.filter((s) => s.status === "not_eligible_now").map((s) => ({ stream: streamName(s), notMet: s.notMet })) : [],
  };

  const core = pathwayFor(streamRows("482", "Core Skills"), "482", input, f, ctx, locale);
  out["482"] = core;
  out["485"] = pathwayFor(GATES.filter((g) => g.visa === "485"), "485", input, f, ctx, locale);
  out["500"] = pathwayFor(GATES.filter((g) => g.visa === "500"), "500", input, f, ctx, locale);
  out["820"] = pathwayFor(GATES.filter((g) => g.visa === "820"), "820", input, f, ctx, locale);
  return out;
}

/** The Specialist Skills salary gate (the only sourced Specialist gate), for the matrix and tests. */
export function specialistSkillsSalaryGate(input: ReadinessInput, locale: Locale): GateResult {
  const row = GATES.find((g) => g.id === "482SS.salary")!;
  return evaluateGate(row, input, facts(input), {}, locale);
}

