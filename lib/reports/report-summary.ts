/**
 * The Professional Summary: roughly one page, placed straight after the cover, so a migration professional can see in 60-90 seconds
 * what was entered, what was not, which published areas the report covers and what remains to be verified independently.
 * It restates the supplied facts as they are; it assesses nothing, scores nothing and recommends nothing.
 */
import type { Locale, ReadinessReport } from "@/lib/readiness/types";
import { resolveAssessingAuthority } from "@/lib/skills-assessment/resolve-authority";
import type { Block } from "./report-blocks";
import { countryName, toPassportLocale } from "@/lib/intake/passport";
import { factLabel, T } from "./report-text";
import { longDate } from "./public-sources";
import type { StateInfo } from "./report-states";

type Facts = Map<string, string | null>;

/** The supplied facts shown first, in this order, when entered. */
const SUPPLIED_ORDER = ["occupation", "age", "englishLevel", "qualificationLevel", "qualificationAwardedInAustralia", "occupationConfirmed", "currentCountry", "passportCountry", "residenceState", "preferredState", "offshoreExperienceYears", "onshoreExperienceYears", "sponsorOrFamily", "annualSalaryAud"];

export type SummaryArgs = {
  report: ReadinessReport;
  facts: Facts;
  l: Locale;
  occupationRaw: string | undefined;
  targetVisaLine: string;
  states: StateInfo[];
  /** Visa entries in the report (for the count of the published-data area). */
  visaCount: number;
};

/** The facts a reader would expect to see entered, with the label printed in the "not entered" list. */
function missingItems(facts: Facts, l: Locale): string[] {
  const out: string[] = [];
  const none = (...fields: string[]) => fields.every((f) => (facts.get(f) ?? null) === null);
  if (none("offshoreExperienceYears", "onshoreExperienceYears")) out.push(T(l, "Employment history (outside Australia and in Australia)", "Çalışma geçmişi (Avustralya dışında ve Avustralya'da)", "工作经历（澳大利亚境外和境内）"));
  else if (none("offshoreExperienceYears")) out.push(factLabel("offshoreExperienceYears", l));
  else if (none("onshoreExperienceYears")) out.push(factLabel("onshoreExperienceYears", l));
  if (none("sponsorOrFamily")) out.push(T(l, "Partner details", "Partner bilgileri", "伴侣信息"));
  if (none("annualSalaryAud")) out.push(factLabel("annualSalaryAud", l));
  if (none("preferredState")) out.push(factLabel("preferredState", l));
  if (none("occupationConfirmed")) out.push(T(l, "Skills assessment status", "Beceri değerlendirmesi durumu", "技能评估状态"));
  for (const f of ["qualificationLevel", "englishLevel", "age", "occupation", "currentCountry", "passportCountry"]) if (none(f)) out.push(factLabel(f, l));
  return out;
}

export function buildProfessionalSummary(a: SummaryArgs): Block[] {
  const { report, facts, l } = a;
  const blocks: Block[] = [
    {
      kind: "text",
      text: T(
        l,
        "A structured summary of the information supplied and the published information researched. It is general information, not migration advice, and it does not assess the person's situation.",
        "Sağlanan bilgilerin ve araştırılan yayımlanmış bilgilerin yapılandırılmış özeti. Genel bilgidir; göçmenlik tavsiyesi değildir ve kişinin durumunu değerlendirmez.",
        "对所提供信息及所研究公开信息的结构化摘要。属于一般信息，并非移民代理服务，也不评估个人情况。",
      ),
    },
  ];

  // 1. Client-supplied information.
  const supplied: Array<[string, string]> = [[T(l, "Destination country", "Hedef ülke", "目的地国家"), T(l, "Australia", "Avustralya", "澳大利亚")]];
  supplied.push([T(l, "Target visa", "Hedef vize", "目标签证"), a.targetVisaLine.replace(/^[^:]*:\s*/, "")]);
  for (const f of SUPPLIED_ORDER) {
    const v = facts.get(f);
    if (v === null || v === undefined) continue;
    if (f === "offshoreExperienceYears" || f === "onshoreExperienceYears" || f === "sponsorOrFamily" || f === "annualSalaryAud") continue; // listed under "not entered" when absent; shown here only when entered
    const shown = f === "currentCountry" || f === "passportCountry" ? countryName(v, toPassportLocale(l)) : v;
    supplied.push([f === "occupationConfirmed" ? T(l, "Skills assessment completed", "Beceri değerlendirmesi tamamlandı", "技能评估已完成") : factLabel(f, l), shown]);
  }
  for (const f of ["offshoreExperienceYears", "onshoreExperienceYears", "sponsorOrFamily", "annualSalaryAud"]) {
    const v = facts.get(f);
    if (v !== null && v !== undefined) supplied.push([factLabel(f, l), v]);
  }
  const pe = report.pointsEstimate;
  if (pe && typeof pe.estimatedPoints === "number") {
    supplied.push([T(l, "Points from these entries", "Bu girdilerden puan", "根据这些填写计算的积分"), T(l, `${pe.estimatedPoints} (published points table; see the Points section)`, `${pe.estimatedPoints} (yayımlanmış puan tablosu; Puanlar bölümüne bakın)`, `${pe.estimatedPoints}（已公布积分表；见“积分”部分）`)]);
  }
  blocks.push({ kind: "heading", text: T(l, "Client-supplied information", "Sağlanan bilgiler", "客户提供的信息") }, { kind: "kv", rows: supplied });

  // 2. Missing / not entered.
  const missing = missingItems(facts, l);
  blocks.push({ kind: "heading", text: T(l, "Not entered", "Girilmeyenler", "未填写的信息") });
  blocks.push({
    kind: "lines",
    lines: [
      ...(missing.length ? missing.map((m) => `• ${m}`) : [T(l, "Every field the form asks for was entered.", "Formun istediği her alan girildi.", "表单要求的所有字段均已填写。")]),
      `• ${T(l, "Evidence the form does not collect", "Formun toplamadığı kanıtlar", "表单不收集的证明材料")}: ${T(l, "English test result and date; skills assessment outcome letter and its dates; employment evidence (references, payslips, contracts)", "İngilizce sınav sonucu ve tarihi; beceri değerlendirmesi sonuç mektubu ve tarihleri; çalışma kanıtları (referans, bordro, sözleşme)", "英语成绩及日期；技能评估结果信及日期；工作证明（证明人信函、工资单、合同）")}`,
    ],
  });

  // 3. Published-data areas covered.
  const authority = a.occupationRaw ? resolveAssessingAuthority(a.occupationRaw).authority : undefined;
  const checkedDates = a.states.map((s) => s.checked).filter(Boolean).sort();
  const covered: string[] = [];
  if (pe && typeof pe.estimatedPoints === "number") covered.push(T(l, "Points: the published points table applied to the entered information, factor by factor", "Puanlar: yayımlanmış puan tablosunun girilen bilgilere faktör faktör uygulanması", "积分：将已公布积分表逐项应用于所填信息"));
  covered.push(
    authority
      ? T(l, `Skills assessment: the assessing authority for the occupation entered (${authority.authorityName}), its fees and processing time as it publishes them`, `Beceri değerlendirmesi: girilen meslek için değerlendirme kurumu (${authority.authorityName}), yayımladığı ücretler ve işlem süresi`, `技能评估：所填职业的评估机构（${authority.authorityName}）及其公布的费用和处理时间`)
      : T(l, "Skills assessment: the assessing authority for the occupation entered, where one is recorded", "Beceri değerlendirmesi: girilen meslek için kayıtlı değerlendirme kurumu", "技能评估：所填职业的评估机构（如有记录）"),
  );
  covered.push(T(l, `Visa information: ${a.visaCount} visa entries with published requirements, charges and processing information`, `Vize bilgileri: yayımlanmış gereklilikler, ücretler ve işlem bilgisiyle ${a.visaCount} vize`, `签证信息：${a.visaCount} 种签证的已公布要求、费用和处理信息`));
  covered.push(T(l, "Employer-sponsored pathways: subclass 482 and subclass 186 (Direct Entry and Temporary Residence Transition) requirements", "İşveren sponsorlu yollar: subclass 482 ve subclass 186 (Direct Entry ve Temporary Residence Transition) gereklilikleri", "雇主担保路径：482 子类及 186 子类（Direct Entry 和 Temporary Residence Transition）的要求"));
  if (a.states.length) covered.push(T(l, `State and territory nomination: ${a.states.length} jurisdictions, with program status, occupation-list placement and published conditions${checkedDates.length ? `, checked ${longDate(checkedDates[0], l)} to ${longDate(checkedDates.at(-1)!, l)}` : ""}`, `Eyalet ve bölge adaylığı: ${a.states.length} yargı alanı; program durumu, meslek listesi ve yayımlanmış koşullar${checkedDates.length ? `, ${longDate(checkedDates[0], l)} – ${longDate(checkedDates.at(-1)!, l)} arasında kontrol edildi` : ""}`, `州和领地提名：${a.states.length} 个辖区的项目状态、职业清单情况和已公布条件${checkedDates.length ? `，核对日期 ${longDate(checkedDates[0], l)} 至 ${longDate(checkedDates.at(-1)!, l)}` : ""}`));
  covered.push(T(l, "Costs: published visa application charges and assessing-authority fees", "Maliyetler: yayımlanmış vize başvuru ücretleri ve değerlendirme kurumu ücretleri", "费用：已公布的签证申请费和评估机构费用"));
  covered.push(T(l, "Sources: every source with its organisation, page and date checked (last section)", "Kaynaklar: her kaynak, kurumu, sayfası ve kontrol tarihiyle (son bölüm)", "来源：每个来源的机构、页面和核对日期（最后一部分）"));
  blocks.push({ kind: "heading", text: T(l, "Published-data areas covered", "Kapsanan yayımlanmış veri alanları", "涵盖的公开数据领域") }, { kind: "lines", lines: covered.map((c) => `• ${c}`) });

  // 4. Items for independent verification.
  const verify = [
    T(l, "Occupation classification: whether the work described matches the published ANZSCO description and the assessing authority's criteria", "Meslek sınıflandırması: anlatılan işin yayımlanmış ANZSCO tanımına ve değerlendirme kurumunun ölçütlerine uyup uymadığı", "职业分类：所述工作是否符合已公布的 ANZSCO 描述及评估机构的标准"),
    T(l, "Skills assessment: the occupation it covers and its validity period", "Beceri değerlendirmesi: kapsadığı meslek ve geçerlilik süresi", "技能评估：所涵盖的职业及有效期"),
    T(l, "Work-experience evidence: dates, hours and relevance to the occupation", "Çalışma deneyimi kanıtı: tarihler, saatler ve meslekle ilgisi", "工作经验证明：日期、工时及与职业的相关性"),
    T(l, "English evidence: test type, date and result", "İngilizce kanıtı: sınav türü, tarihi ve sonucu", "英语证明：考试类型、日期和成绩"),
    ...([T(l, "State and territory program conditions: the current official pages, against the date checked shown on each entry", "Eyalet ve bölge program koşulları: her bölümde gösterilen kontrol tarihine karşı güncel resmi sayfalar", "各州和领地项目条件：对照各条目所示核对日期查看现行官方页面")]),
    T(l, "Visa charges and settings: the effective dates stated with each figure", "Vize ücretleri ve ayarlar: her rakamla belirtilen geçerlilik tarihleri", "签证费用及设置：各数字所注明的生效日期"),
  ];
  blocks.push({ kind: "heading", text: T(l, "Items for independent verification", "Bağımsız olarak doğrulanacak noktalar", "有待独立核实的事项") }, { kind: "lines", lines: verify.map((v) => `• ${v}`) });
  return blocks;
}
