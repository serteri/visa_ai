import visaGatesData from "@/src/data/visa-gates.json";
import { findOccupationRecord, getEligibleSkilledSubclasses, getSkilledListMembership } from "@/lib/readiness/occupation-eligibility";

import type { Locale, ReadinessInput } from "./types";
import { GATED_VISAS, T, type GateResult, type GateStatus, type PathwayGateStatus, type PathwayGates } from "./visa-gate-text";

export * from "./visa-gate-text";

/**
 * The sourced hard-gate matrix per visa (src/data/visa-gates.json, scripts/generate-visa-gates.ts) evaluated against
 * the intake. Each gate is met / not_met / unknown, or "future" for a step that comes after lodging an EOI
 * (invitation, nomination, sponsorship). A pathway with any not_met gate is "Not eligible now" and is never
 * recommended; with unknown gates (and no not_met) it is "Conditional"; otherwise "eligible to pursue".
 * No intake field is added: a gate that depends on something the form does not collect (employer sponsor, ...) is
 * unknown by design.
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
    onCsol: lists ? lists.has("CSOL") : undefined,
    eligibleSkilled: new Set<string>(getEligibleSkilledSubclasses(input.occupation)),
  };
}

type Verdict = { status: GateStatus; reason: [string, string, string] };
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

function pointsGate(ctx: GateContext): Verdict {
  const p = ctx.potentialPoints ?? ctx.estimatedPoints;
  if (p === undefined) return unknown("A points estimate could not be calculated.", "Puan tahmini hesaplanamadı.", "无法计算分数估算。");
  const note = ctx.potentialPoints !== undefined && ctx.estimatedPoints !== undefined && ctx.potentialPoints !== ctx.estimatedPoints
    ? [` (potential score ${p}, as if the skills assessment is positive)`, ` (potansiyel puan ${p}; beceri değerlendirmesi olumluymuş gibi)`, `（潜在分数 ${p}，按技能评估为正面计算）`]
    : ["", "", ""];
  return p >= 65
    ? met(`Estimated ${p} points${note[0]}.`, `Tahmini ${p} puan${note[1]}.`, `预估 ${p} 分${note[2]}。`)
    : notMet(`Estimated ${p} points${note[0]}; 65 are needed.`, `Tahmini ${p} puan${note[1]}; 65 gerekir.`, `预估 ${p} 分${note[2]}；需要 65 分。`);
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
  EVAL[`${v}.points`] = (_i, _f, c) => pointsGate(c);
  EVAL[`${v}.invitation`] = () => future("After you submit an EOI you may be invited; this is a later step, not a failure.", "EOI verdikten sonra davet alabilirsiniz; bu sonraki bir adımdır, başarısızlık değildir.", "提交 EOI 后才可能获邀；这是后续步骤，并非不符合条件。");
};
skilled("189");
skilled("190");
skilled("491");
EVAL["190.nomination"] = () => future("A state or territory nominates you after your EOI; a later step.", "Eyalet/bölge EOI'nizden sonra aday gösterir; sonraki bir adım.", "州或领地在您提交 EOI 后提名；属后续步骤。");
EVAL["491.nomination"] = () => future("A state or territory nominates you (or an eligible relative sponsors you) after your EOI; a later step.", "Eyalet/bölge sizi aday gösterir (veya uygun bir akraba sponsor olur); sonraki bir adım.", "州或领地提名您（或合资格亲属担保）；属后续步骤。");

EVAL["186DE.age"] = (_i, f) => ageGate(f, 45);
EVAL["186DE.occupation_csol"] = (_i, f) => csolGate(f);
EVAL["186DE.experience"] = (_i, f) => experienceGate(f, 3);
EVAL["186DE.skills_assessment"] = (_i, f) => skillsGate(f);
EVAL["186DE.english"] = (_i, f) => englishGate(f);
EVAL["186DE.salary"] = (_i, f) => salaryGate(f, THRESHOLDS.CSIT.value, "Core Skills Income Threshold (CSIT)");
EVAL["186DE.employer_nomination"] = () => noField();
EVAL["186TRT.hold_visa"] = () => noField();
EVAL["186TRT.sponsored_employment"] = (i, f) => {
  // Sponsored employment happens in Australia: fewer than 2 years of Australian experience rules it out, but
  // 2 or more Australian years do not show it was sponsored -- only the sponsored-position answer can confirm that.
  const y = i.yearsInSponsoredPosition ?? (f.onshore !== undefined && f.onshore < 2 ? f.onshore : undefined);
  if (y === undefined) return unknown("Years in a sponsored position were not provided.", "Sponsorlu pozisyondaki yıl girilmedi.", "未提供担保职位的年限。");
  return y >= 2
    ? met(`${y} years declared (2 needed).`, `${y} yıl beyan edildi (2 gerekir).`, `已申报 ${y} 年（需要 2 年）。`)
    : notMet(`${y} years declared; 2 years of eligible sponsored employment are required.`, `${y} yıl beyan edildi; 2 yıl uygun sponsorlu istihdam gerekir.`, `已申报 ${y} 年；需要 2 年合资格担保雇佣。`);
};
EVAL["186TRT.age"] = (_i, f) => ageGate(f, 45);
EVAL["186TRT.english"] = (_i, f) => englishGate(f);
EVAL["186TRT.employer_nomination"] = () => noField();

EVAL["482CS.occupation_csol"] = (_i, f) => csolGate(f);
EVAL["482CS.salary"] = (_i, f) => salaryGate(f, THRESHOLDS.CSIT.value, "Core Skills Income Threshold (CSIT)");
EVAL["482CS.experience"] = (_i, f) => experienceGate(f, 1);
EVAL["482CS.skills_assessment"] = () => unknown("Only some occupations need one (IMMI 18/039, not in the sources), so it cannot be checked from the intake.", "Yalnızca bazı meslekler gerektirir (IMMI 18/039, kaynaklarda yok); bu yüzden formdan kontrol edilemez.", "仅部分职业需要（IMMI 18/039，资料中没有），因此无法根据表单核对。");
EVAL["482CS.english"] = (_i, f) => englishGate(f, { noneIsUnknown: true });
EVAL["482CS.sponsor"] = () => noField();
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
  return {
    id: row.id,
    visa: row.visa,
    stream: row.stream,
    status: verdict.status,
    label: labelFor(row, locale),
    reason: T(locale, ...verdict.reason),
    citation: citation(row, locale),
    quote: row.quote,
  };
}

function combine(visa: string, gates: GateResult[], streamsConsidered?: string[]): PathwayGates {
  const notMetList = gates.filter((g) => g.status === "not_met");
  const unknownList = gates.filter((g) => g.status === "unknown");
  return {
    visa,
    status: notMetList.length > 0 ? "not_eligible_now" : unknownList.length > 0 ? "conditional" : "eligible",
    gates,
    notMet: notMetList,
    unknown: unknownList,
    future: gates.filter((g) => g.status === "future"),
    ...(streamsConsidered ? { streamsConsidered } : {}),
  };
}

function pathwayFor(rows: GateRow[], visa: string, input: ReadinessInput, f: ReturnType<typeof facts>, ctx: GateContext, locale: Locale): PathwayGates {
  return combine(visa, rows.map((r) => evaluateGate(r, input, f, ctx, locale)));
}

function streamRows(visa: string, stream: string): GateRow[] {
  return GATES.filter((g) => g.visa === visa && g.stream === stream);
}

/**
 * Evaluates every visa's gates against the intake. 186 combines its two streams: it is "not eligible now" only when
 * BOTH Direct Entry and Temporary Residence Transition have a not-met gate (or, when the intake names a stream, that
 * stream does); the failed gates of the streams that are out are listed.
 */
export function evaluateVisaGates(input: ReadinessInput, ctx: GateContext, locale: Locale): Record<string, PathwayGates> {
  const f = facts(input);
  const out: Record<string, PathwayGates> = {};
  for (const v of ["189", "190", "491"] as const) out[v] = pathwayFor(GATES.filter((g) => g.visa === v), v, input, f, ctx, locale);

  const de = pathwayFor(streamRows("186", "Direct Entry"), "186", input, f, ctx, locale);
  const trt = pathwayFor(streamRows("186", "Temporary Residence Transition"), "186", input, f, ctx, locale);
  const chosen = input.nominationStream === "direct_entry" ? [de] : input.nominationStream === "trt" ? [trt] : [de, trt];
  const viable = chosen.filter((s) => s.status !== "not_eligible_now");
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

