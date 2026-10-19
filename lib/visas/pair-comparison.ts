/**
 * Side-by-side pair pages: 189 vs 190, 189 vs 491, 190 vs 491, 482 vs 186, 500 vs 485. Neutral tables, the same rows for every pair of a kind, every
 * cell sourced from the repository's data (src/data/visa-details.json, visa-fees.json, visas/subclass-186.json) or from the 189/190/491 table in
 * comparison-content.ts. No result, no quiz, no ranking: a cell the held data does not state says so.
 */
import subclass186 from "@/src/data/visas/subclass-186.json";
import visaDetails from "@/src/data/visa-details.json";
import feeProvenance from "@/src/data/fee-provenance.json";
import visaFees from "@/src/data/visa-fees.json";
import { researchText } from "@/lib/marketing/research-journey";
import { comparisonContent, FEES_CHECKED_ON, formatAud, OFFICIAL_PAGES, PROCESSING_GUIDE_URL, type ComparisonSubclass } from "./comparison-content";

export type PairSlug = "189-vs-190" | "189-vs-491" | "190-vs-491" | "482-vs-186" | "500-vs-485";
export const PAIRS: Array<{ slug: PairSlug; a: string; b: string }> = [
  { slug: "189-vs-190", a: "189", b: "190" },
  { slug: "189-vs-491", a: "189", b: "491" },
  { slug: "190-vs-491", a: "190", b: "491" },
  { slug: "482-vs-186", a: "482", b: "186" },
  { slug: "500-vs-485", a: "500", b: "485" },
];
export const isPairSlug = (v: string): v is PairSlug => PAIRS.some((p) => p.slug === v);

type Details = { subclass: string; type: string; fee: number; minPoints: number | null; officialUrl?: string; requirements?: string[]; csit?: { amount: number; effectiveDate: string }; ageRequirement?: { standardMaxAge: number; extendedMaxAge: number }; secondInstalment?: { amount: number } };
const DETAILS = visaDetails as unknown as Details[];
const detail = (s: string) => DETAILS.find((d) => d.subclass === s);
const ENS = (subclass186 as unknown as Array<Record<string, unknown>>)[0];
const FEES_DATE = (visaFees as unknown as { generated_on: string }).generated_on;
const PROVENANCE = (feeProvenance as unknown as { facts: Array<{ id: string; last_verified: string | null }> }).facts;
/** The date the charge was last verified against its source document: the visa's own fee fact, else its additional-applicant fact (same document), else the fee file date. */
function chargeVerified(subclass: string): string {
  const own = PROVENANCE.find((f) => f.id === `vac_${subclass}`)?.last_verified;
  const sameDoc = PROVENANCE.find((f) => f.id === `vac_additional_adult_${subclass}`)?.last_verified;
  return own ?? sameDoc ?? FEES_DATE;
}

export type PairColumn = { subclass: string; label: string; sourceName: string; sourceUrl: string; verified: string };
export type PairContent = {
  slug: PairSlug;
  title: string;
  description: string;
  subtitle: string;
  feature: string;
  columns: [PairColumn, PairColumn];
  rows: Array<{ label: string; values: [string, string] }>;
  notes: string[];
  processingGuide: { label: string; url: string };
};

const none = (loc: string) => researchText(loc, "Not stated in the held data", "Elimizdeki veride belirtilmemiş", "所存数据未列明");
const nameOf = (loc: string, s: string) =>
  ({
    "189": researchText(loc, "Skilled Independent (189)", "Bağımsız Yetenekli (189)", "独立技术移民（189）"),
    "190": researchText(loc, "Skilled Nominated (190)", "Eyalet Adaylı (190)", "州提名技术移民（190）"),
    "491": researchText(loc, "Skilled Work Regional (491)", "Bölgesel Çalışma (491)", "地区技术工作（491）"),
    "482": researchText(loc, "Skills in Demand (482)", "Talep Üzerine Beceri (482)", "技能需求（482）"),
    "186": researchText(loc, "Employer Nomination Scheme (186)", "İşveren Aday Gösterme (186)", "雇主提名计划（186）"),
    "500": researchText(loc, "Student (500)", "Öğrenci (500)", "学生（500）"),
    "485": researchText(loc, "Temporary Graduate (485)", "Geçici Mezun (485)", "临时毕业生（485）"),
  })[s] ?? s;

function otherColumn(loc: string, s: string): PairColumn {
  if (s === "186") return { subclass: s, label: nameOf(loc, s), sourceName: researchText(loc, "Home Affairs, subclass 186 information as held", "İçişleri Bakanlığı, kayıtlı alt sınıf 186 bilgisi", "内政部 186 子类信息（所存）"), sourceUrl: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/employer-nomination-scheme-186", verified: String(ENS.lastVerified) };
  const d = detail(s)!;
  return { subclass: s, label: nameOf(loc, s), sourceName: researchText(loc, `Home Affairs, subclass ${s}`, `İçişleri Bakanlığı, alt sınıf ${s}`, `内政部，${s} 子类`), sourceUrl: d.officialUrl ?? OFFICIAL_PAGES[s as ComparisonSubclass], verified: chargeVerified(s) };
}

function otherCell(loc: string, s: string) {
  const t = (en: string, tr: string, zh: string) => researchText(loc, en, tr, zh);
  const d = detail(s);
  if (s === "186") {
    const age = Number(ENS.ageLimit);
    return {
      type: t("Permanent", "Kalıcı", "永久") + ` (${String(ENS.stream)} ${t("stream shown; the subclass has other streams", "kategorisi gösterilir; alt sınıfın başka kategorileri de var", "类别；该子类还有其他类别")})`,
      charge: formatAud(Number(ENS.fee)),
      second: `${formatAud(Number(ENS.secondInstallmentFee))} (${String(ENS.secondInstallmentTrigger)})`,
      points: ENS.pointsTestApplies === false ? t("No points test", "Puan testi yok", "无积分测试") : none(loc),
      sponsor: `${t("Employer nomination", "İşveren adaylığı", "雇主提名")}: ${String(ENS.nominationRequirement)}`,
      requirements: [`${t("Skills assessment", "Beceri değerlendirmesi", "技能评估")}: ${(ENS.skillsAssessment as { required: boolean }).required ? t("required", "gerekli", "需要") : t("not required", "gerekli değil", "不需要")}`, String(ENS.workExperience), String(ENS.salaryRequirement), String(ENS.englishRequirement)].filter(Boolean).join("; "),
      age: `${t("Age limit", "Yaş sınırı", "年龄上限")} ${age} (${t("exemptions are listed by the Department", "istisnaları Bakanlık listeler", "例外情形由内政部列明")})`,
    };
  }
  const dd = d!;
  const second = dd.secondInstalment ? formatAud(dd.secondInstalment.amount) : t("None listed in the held data", "Elimizdeki veride listelenmemiş", "所存数据未列出");
  const points = dd.minPoints == null ? t("No points test", "Puan testi yok", "无积分测试") : String(dd.minPoints);
  const req = (dd.requirements ?? []).join("; ") || none(loc);
  if (s === "482") return { type: dd.type, charge: formatAud(dd.fee), second, points, sponsor: `${t("Employer sponsorship required", "İşveren sponsorluğu gerekli", "需要雇主担保")}${dd.csit ? ` (${t("sponsor guarantees annual earnings of at least", "sponsor, yıllık kazancın en az şu tutarda olacağını garanti eder:", "担保方保证年收入不低于")} ${formatAud(dd.csit.amount)}, ${t("from", "başlangıç:", "自")} ${dd.csit.effectiveDate})` : ""}`, requirements: req, age: none(loc) };
  if (s === "485") return { type: dd.type, charge: formatAud(dd.fee), second, points, sponsor: t("No sponsor or nomination listed in the held data", "Elimizdeki veride sponsor veya aday gösterme listelenmemiş", "所存数据未列出担保或提名"), requirements: req, age: dd.ageRequirement ? `${dd.ageRequirement.standardMaxAge} ${t("or under", "veya altı", "及以下")} (${t("up to", "en fazla", "最高")} ${dd.ageRequirement.extendedMaxAge} ${t("in the listed cases", "listelenen durumlarda", "适用于所列情形")})`: none(loc) };
  return { type: dd.type, charge: formatAud(dd.fee), second, points, sponsor: t("Enrolment in a registered (CRICOS) course", "Kayıtlı (CRICOS) bir kursa kayıt", "注册（CRICOS）课程的入学"), requirements: req, age: none(loc) };
}

export function pairContent(slug: PairSlug, locale: string): PairContent {
  const loc = locale === "tr" || locale === "zh-Hans" ? locale : "en";
  const t = (en: string, tr: string, zh: string) => researchText(loc, en, tr, zh);
  const pair = PAIRS.find((p) => p.slug === slug)!;
  const title = t(`${pair.a} vs ${pair.b}: published differences`, `${pair.a} ve ${pair.b}: yayımlanmış farklar`, `${pair.a} 与 ${pair.b}：已公布的差异`);
  const description = t(
    `Subclass ${pair.a} and subclass ${pair.b} side by side: visa type, charge, points test, nomination or sponsorship and listed requirements, each with its source and date. Information only.`,
    `Alt sınıf ${pair.a} ve ${pair.b} yan yana: vize türü, ücret, puan testi, aday gösterme veya sponsorluk ve listelenen koşullar; her biri kaynağı ve tarihiyle. Yalnızca bilgi amaçlıdır.`,
    `${pair.a} 与 ${pair.b} 子类并排对比：签证类型、费用、积分测试、提名或担保以及所列条件，均注明来源与日期。仅供参考。`,
  );
  const feature = t("Feature", "Özellik", "对比项");
  const processingGuide = { label: t("Visa processing times guide (Home Affairs)", "Vize işlem süreleri rehberi (İçişleri Bakanlığı)", "签证处理时间指南（内政部）"), url: PROCESSING_GUIDE_URL };
  const processingValue = t("Not a fixed figure: see the Department's processing time guide", "Sabit bir rakam değil: Bakanlığın işlem süresi rehberine bakın", "无固定数字：请查看内政部处理时间指南");

  if (["189-vs-190", "189-vs-491", "190-vs-491"].includes(slug)) {
    const x = comparisonContent(loc);
    const idx = (s: string) => ["189", "190", "491"].indexOf(s);
    const [ia, ib] = [idx(pair.a), idx(pair.b)];
    const col = (s: string): PairColumn => ({ subclass: s, label: nameOf(loc, s), sourceName: x.officialPages[idx(s)].label, sourceUrl: x.officialPages[idx(s)].url, verified: FEES_CHECKED_ON });
    return {
      slug,
      title,
      description,
      subtitle: x.copy.subtitle,
      feature,
      columns: [col(pair.a), col(pair.b)],
      rows: x.rows.map((r) => ({ label: r.label, values: [r.values[ia], r.values[ib]] as [string, string] })),
      notes: [x.copy.feeNote, x.copy.checked],
      processingGuide: x.processingGuide,
    };
  }

  const a = otherCell(loc, pair.a);
  const b = otherCell(loc, pair.b);
  const rows: PairContent["rows"] = [
    { label: t("Visa type and period", "Vize türü ve süre", "签证类型与期限"), values: [a.type, b.type] },
    { label: t("Visa application charge (main applicant)", "Vize başvuru ücreti (ana başvurucu)", "签证申请费（主申请人）"), values: [a.charge, b.charge] },
    { label: t("Second instalment", "İkinci taksit", "第二期费用"), values: [a.second, b.second] },
    { label: t("Points test", "Puan testi", "积分测试"), values: [a.points, b.points] },
    { label: t("Nomination, sponsorship or enrolment", "Aday gösterme, sponsorluk veya kayıt", "提名、担保或入学"), values: [a.sponsor, b.sponsor] },
    { label: t("Requirements listed in the held data (English)", "Elimizdeki veride listelenen koşullar (İngilizce)", "所存数据列出的条件（英文）"), values: [a.requirements, b.requirements] },
    { label: t("Age", "Yaş", "年龄"), values: [a.age, b.age] },
    { label: t("Processing time", "İşlem süresi", "处理时间"), values: [processingValue, processingValue] },
  ];
  return {
    slug,
    title,
    description,
    subtitle: t("The same rows for both visas. A cell the held data does not state says so; it is never filled with an estimate.", "İki vize için aynı satırlar. Elimizdeki verinin belirtmediği hücre bunu söyler; tahminle doldurulmaz.", "两种签证使用相同的行。所存数据未列明的单元格会注明，不会以估计值填充。"),
    feature,
    columns: [otherColumn(loc, pair.a), otherColumn(loc, pair.b)],
    rows,
    notes: [
      t("Charges are the main-applicant figures held in LogiVisa's fee data (effective 1 July 2026 where the visa page says so). Reduced pricing for some citizenships and additional applicants' charges are not shown.", "Ücretler LogiVisa'nın ücret verisindeki ana başvurucu rakamlarıdır (vize sayfası belirtiyorsa 1 Temmuz 2026'dan itibaren). Bazı vatandaşlıklar için indirimli fiyatlar ve ek başvurucuların ücretleri gösterilmez.", "费用为 LogiVisa 费用数据中的主申请人金额（签证页面注明时自 2026 年 7 月 1 日起生效）。部分国籍的优惠价格及附加申请人费用未列出。"),
      t("Requirement text is shown in English as held; the Department's page is the authority.", "Koşul metni elimizdeki gibi İngilizce gösterilir; esas kaynak Bakanlığın sayfasıdır.", "条件文字按所存英文显示；以内政部页面为准。"),
    ],
    processingGuide,
  };
}

/** Every string a visitor reads on a pair page (for the wording scan and tests). */
export function pairText(slug: PairSlug, locale: string): string {
  const c = pairContent(slug, locale);
  return [c.title, c.description, c.subtitle, c.feature, ...c.columns.flatMap((x) => [x.label, x.sourceName]), ...c.rows.flatMap((r) => [r.label, ...r.values]), ...c.notes, c.processingGuide.label].join("\n");
}
