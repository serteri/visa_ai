/**
 * The complete cost map: government charges per subclass, the assessing authority's fees per pathway (with its GST note), and every
 * other item the cost data lists (English tests, health, police, translations, optional professional services), each with its source
 * and date. Totals are sums of published charges: per subclass for the main applicant, and for the selected visa the engine's total
 * of the items marked "in total". Nothing is recommended and no item is hidden because another step is done (an independent
 * registration stays listed with a note).
 */
import visaFees from "@/src/data/visa-fees.json";
import { computeEstimatedTotalAud, computePartnerTotalAud, formatEstimatedTotalLine, formatPartnerTotalLine, formatSecondInstalmentLine } from "@/lib/readiness/financial-roadmap-totals";
import type { FinancialRoadmapItem, Locale, ReadinessReport } from "@/lib/readiness/types";
import { resolveLocalized } from "@/lib/skills-assessment/i18n";
import { resolveAssessingAuthority } from "@/lib/skills-assessment/resolve-authority";
import { VISA_ORDER, VisaKey, visaCharge, visaName } from "./report-visas";
import { T, money } from "./report-text";

const FEES_GENERATED_ON = (visaFees as unknown as { generated_on: string }).generated_on;

export type CostsInfo = {
  govTitle: string;
  govHeaders: string[];
  gov: string[][];
  govNote: string;
  authorityTitle: string;
  authorityIntro: string;
  authorityHeaders: string[];
  authority: string[][];
  itemsTitle: string;
  itemsHeaders: string[];
  items: string[][];
  sumsTitle: string;
  sumsHeaders: string[];
  sums: string[][];
  selectedTotalLines: string[];
  notes: string[];
  livingLine: string;
};

function sourceOfItem(item: FinancialRoadmapItem, l: Locale): string {
  const kindLabel =
    item.estimateType === "official_fee"
      ? T(l, "official fee", "resmi ücret", "官方费用")
      : item.estimateType === "variable"
        ? T(l, "varies by case", "duruma göre değişir", "因个案而异")
        : T(l, "indicative estimate", "tahmini", "参考估算");
  let who = "";
  if (item.kind === "vac" || item.kind === "vac_additional") who = T(l, "Department of Home Affairs", "İçişleri Bakanlığı (Department of Home Affairs)", "内政部 (Department of Home Affairs)");
  else if (item.kind === "skills_assessment") who = item.category.replace(/^[^—-]*[—-]\s*/, "").trim();
  else if (item.kind === "english_test") who = T(l, "test provider", "sınav kuruluşu", "考试机构");
  else if (item.kind === "medical") who = T(l, "eMedical panel provider", "eMedical panel sağlayıcısı", "eMedical 指定机构");
  else if (item.kind === "police") who = T(l, "issuing authorities", "ilgili makamlar", "签发机构");
  return who ? `${who}; ${kindLabel}` : kindLabel;
}

/** The engine prefixes some roadmap items with a severity word ("High - Second-instalment charge ..."): the report lists the item, not a severity. */
const SEVERITY_PREFIX = /^\s*(?:High|Medium|Low|Yüksek|Orta|Düşük|高|中|低)\s*[-–—]\s*/i;
export const withoutSeverity = (category: string) => category.replace(SEVERITY_PREFIX, "");

const DANGLING = /(?:occupation-specific matrix|mesleğe özel matris|职业特定矩阵|aşağıdaki[^.。]*matris|下方职业)/i;
const cleanNote = (text: string) =>
  text
    .split(/(?<=[.。!?])\s+/)
    .filter((s) => !DANGLING.test(s))
    .join(" ")
    .replace(/\s+—\s*$/, "")
    .trim();

export function buildCostsInfo(report: ReadinessReport, occupationRaw: string | undefined, l: Locale, targetVisa?: string): CostsInfo {
  const items = report.financialRoadmap ?? [];
  const checked = T(l, "checked", "kontrol", "核对");

  // 1. Government charges per subclass.
  const gov = VISA_ORDER.map((k) => {
    const c = visaCharge(k);
    const f = (n: number | null) => (n === null || (c.main === 0 && n === 0) ? "—" : `AUD ${money(n)}`);
    return [visaName(k, l), c.main === null ? "—" : `AUD ${money(c.main)}`, f(c.partner), f(c.child), f(c.second), c.verified || T(l, "per the subclass 186 data file", "subclass 186 veri dosyasına göre", "据 186 子类数据文件")];
  });

  // 2. The assessing authority's fees, one row per pathway, with the amounts the authority states excluding GST and including GST. A figure for
  //    which the authority states neither is shown in its own column; nothing is converted or assumed here.
  const authority: string[][] = [];
  const resolved = occupationRaw ? resolveAssessingAuthority(occupationRaw) : undefined;
  const auth = resolved?.authority;
  const skillsItem = items.find((i) => i.kind === "skills_assessment");
  if (auth) {
    const who = `${auth.authorityName} (${auth.authorityId})`;
    const src = `${auth.sourceDocument ?? ""}${auth.lastVerified ? ` — ${checked} ${auth.lastVerified}` : ""}`.trim() || who;
    for (const p of auth.pathways ?? []) {
      const excl: string[] = [];
      const incl: string[] = [];
      const unstated: string[] = [];
      const notes: string[] = [];
      // A pathway with one fee item needs no item name in the cell (it is the pathway's name).
      const oneItem = new Set((p.fees ?? []).filter((f) => (f.amountAUD ?? f.amountCAD) !== undefined).map((f) => resolveLocalized(f.label, "en"))).size <= 1;
      for (const fee of p.fees ?? []) {
        const amount = fee.amountAUD ?? fee.amountCAD;
        if (amount === undefined) continue;
        const label = resolveLocalized(fee.label, l);
        const noteEn = fee.note ? resolveLocalized(fee.note, "en") : "";
        const pending = fee.estimated ? ` (${T(l, "estimate pending verification", "doğrulama bekleyen tahmin", "估算，待核实")})` : "";
        const line = (n: number) => `${oneItem ? "" : `${label}: `}AUD ${money(n)}${pending}`;
        const inclInNote = noteEn.match(/AUD\s*([\d,]+(?:\.\d+)?)\s*incl\.?\s*GST/i);
        if (/^\s*excl\.?\s*GST/i.test(noteEn)) {
          excl.push(line(amount));
          if (inclInNote) incl.push(line(Number(inclInNote[1].replace(/,/g, ""))));
        } else if (/incl\.?\s*GST/i.test(noteEn)) incl.push(line(amount));
        else unstated.push(line(amount));
        const extra = fee.note ? resolveLocalized(fee.note, l) : "";
        if (extra && !/^\s*(excl|incl)\.?\s*GST/i.test(noteEn) && !notes.includes(extra)) notes.push(extra);
      }
      if (excl.length + incl.length + unstated.length === 0) continue;
      const proc = p.processingTimeWeeks?.label ? resolveLocalized(p.processingTimeWeeks.label, l) : p.processingTimeWeeks?.standard !== undefined ? T(l, `${p.processingTimeWeeks.standard} weeks`, `${p.processingTimeWeeks.standard} hafta`, `${p.processingTimeWeeks.standard} 周`) : p.processingNotStated ? resolveLocalized(p.processingNotStated, l) : T(l, "not stated by the authority", "kurum tarafından belirtilmemiş", "机构未说明");
      const cell = (xs: string[]) => (xs.length ? [...new Set(xs)].join("\n") : "—");
      authority.push([`${who}: ${resolveLocalized(p.name, l)}`, cell(excl), cell(incl), cell(unstated), proc, [...notes, src].join("; ")]);
    }
  }
  // The roadmap's own row (an "indicative estimate" line) is kept only when it says something the pathway rows do not: when its figure already
  // appears in them it is a duplicate and is left out.
  const figuresOf = (t: string) => (t.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((x) => x.replace(/,/g, ""));
  const shown = new Set(authority.flatMap((r) => figuresOf(r.slice(1, 4).join(" "))));
  const skillsFigures = skillsItem ? figuresOf(skillsItem.amountLabel).filter((x) => Number(x) >= 100) : [];
  if (skillsItem && authority.length > 0 && skillsFigures.length > 0 && !skillsFigures.every((x) => shown.has(x)))
    authority.unshift([`${skillsItem.category} — ${T(l, "line in the cost data (occupation and passport as entered)", "maliyet verisindeki satır (girilen meslek ve pasaport)", "费用数据中的条目（按所填职业和护照）")}`, "—", "—", skillsItem.amountLabel, "—", sourceOfItem(skillsItem, l)]);
  if (authority.length === 0 && skillsItem) authority.push([skillsItem.category, "—", "—", skillsItem.amountLabel, "—", [cleanNote(skillsItem.explanation), sourceOfItem(skillsItem, l)].filter(Boolean).join("; ")]);

  // 3. Every other item of the cost data (English tests, health, police, translations, optional professional services, registration steps).
  const itemRows: string[][] = [];
  const registrationNote = T(l, "This registration step is separate from the skills assessment: completing the assessment does not remove it.", "Bu kayıt adımı beceri değerlendirmesinden ayrıdır: değerlendirmenin tamamlanması bu adımı ortadan kaldırmaz.", "此注册步骤独立于技能评估：完成评估并不会免除该步骤。");
  const notes: string[] = [];
  const total0 = computeEstimatedTotalAud(items);
  items.forEach((i, idx) => {
    if (i.kind === "vac" || i.kind === "vac_additional" || i.kind === "skills_assessment") return;
    const follows = i.kind === undefined && i.estimateType === "variable" && items[idx - 1]?.kind === "skills_assessment";
    itemRows.push([withoutSeverity(i.category), i.amountLabel, sourceOfItem(i, l), `${T(l, "cost data dated", "maliyet verisi tarihi", "费用数据日期")} ${FEES_GENERATED_ON}`]);
    if (follows) notes.push(`${withoutSeverity(i.category)}: ${registrationNote}`);
  });
  // The engine's own explanation of the skills-assessment line (it carries passport-specific notes such as the OSAP range), while the assessment is not done.
  const skillsDone = report.assessmentState?.fieldsPresent?.skillsAssessment === true || total0?.completedKinds.includes("skills_assessment");
  if (!skillsDone && skillsItem?.explanation) notes.push(`${skillsItem.category}: ${cleanNote(skillsItem.explanation)}`);
  if (report.assessmentState?.fieldsPresent?.skillsAssessment === true || total0?.completedKinds.includes("skills_assessment"))
    notes.push(T(l, "Your skills assessment is already done; its fee is not a cost item.", "Beceri değerlendirmeniz zaten tamamlandı; ücreti bir maliyet kalemi değildir.", "您的技能评估已完成；其费用不再是成本项目。"));
  if (resolved?.authorityId === "AHPRA" && skillsItem) notes.push(`${skillsItem.category}: ${registrationNote}`);

  // 4. Sums of published charges, per subclass (main applicant), and the engine's total for the items marked "in total".
  const total = computeEstimatedTotalAud(items);
  const included = new Set(total?.includedKinds ?? []);
  const others = items.filter((i) => i.kind !== undefined && i.kind !== "vac" && i.kind !== "vac_additional" && included.has(i.kind));
  const oMin = others.reduce((s, i) => s + (i.amountMin ?? 0), 0);
  const oMax = others.reduce((s, i) => s + (i.amountMax ?? 0), 0);
  const sums = VISA_ORDER.map((k) => {
    const c = visaCharge(k);
    const range = (a: number, b: number) => (a === b ? `AUD ${money(a)}` : `AUD ${money(a)}–${money(b)}`);
    return [visaName(k, l), c.main === null ? "—" : `AUD ${money(c.main)}`, oMax > 0 ? range(oMin, oMax) : "—", c.main === null ? "—" : range(c.main + oMin, c.main + oMax)];
  });
  // The totals the cost data already states (estimate qualifier, partner total, second instalment), stated once.
  const selectedTotalLines: string[] = [];
  // "Not sure": no single visa was selected, so the 189-only estimated total and its partner / second-instalment lines are not shown; the per-subclass sums stay.
  if (total && targetVisa !== "not_sure") {
    const line = formatEstimatedTotalLine({ ...total, completedKinds: [] }, l);
    if (line) selectedTotalLines.push(line);
    const partner = computePartnerTotalAud(items);
    if (partner) for (const extra of [formatPartnerTotalLine(partner, l), formatSecondInstalmentLine(partner, l)]) if (extra) selectedTotalLines.push(extra);
  }

  const city = report.premiumSections?.livingCostProjection;
  const livingKnown = report.country !== "CA" && city && /[(（]/.test(city.city);
  const livingLine = livingKnown
    ? T(l, `Living cost, ${city!.city}: about ${city!.currency} ${city!.monthly.total.toLocaleString("en-AU")} per month (${city!.familyProfile}).`, `Yaşam maliyeti, ${city!.city}: ayda yaklaşık ${city!.currency} ${city!.monthly.total.toLocaleString("en-AU")} (${city!.familyProfile}).`, `生活成本，${city!.city}：每月约 ${city!.currency} ${city!.monthly.total.toLocaleString("en-AU")}（${city!.familyProfile}）。`)
    : "";

  return {
    govTitle: T(l, "Government charges by subclass", "Subclass'a göre devlet ücretleri", "按子类列出的政府费用"),
    govHeaders: [T(l, "Visa", "Vize", "签证"), T(l, "Main applicant", "Ana başvuru", "主申请人"), T(l, "Additional applicant 18+", "18 yaş üstü ek başvuru sahibi", "18 岁以上附加申请人"), T(l, "Additional applicant under 18", "18 yaş altı ek başvuru sahibi", "18 岁以下附加申请人"), T(l, "Second instalment", "İkinci taksit", "第二期费用"), T(l, "Checked", "Kontrol", "核对")],
    gov,
    govNote: T(l, "Source: Department of Home Affairs fee schedule effective 1 July 2026, as recorded in our fee data. The second instalment applies to applicants 18+ without functional English.", "Kaynak: 1 Temmuz 2026 itibarıyla geçerli İçişleri Bakanlığı ücret tarifesi, ücret verilerimizde kayıtlı olduğu şekliyle. İkinci taksit, işlevsel İngilizcesi olmayan 18 yaş üstü başvuru sahipleri için geçerlidir.", "来源：自 2026 年 7 月 1 日起生效的内政部收费表，按我们费用数据中的记录。第二期费用适用于无功能性英语的 18 岁以上申请人。"),
    authorityTitle: T(l, "Assessing authority fees by pathway", "Yolak bazında değerlendirme kurumu ücretleri", "按评估路径列出的评估机构费用"),
    authorityIntro: auth
      ? T(l, `The authority listed for the occupation you entered: ${auth.authorityName}. Fees are as the authority publishes them: one row per pathway, in the column for the GST basis the authority states.`, `Girdiğiniz meslek için listelenen kurum: ${auth.authorityName}. Ücretler kurumun yayımladığı şekliyle verilir: yolak başına bir satır, kurumun belirttiği KDV (GST) esasına göre sütunda.`, `您填写的职业所列评估机构：${auth.authorityName}。费用按机构公布内容列出：每个评估路径一行，按机构所说明的 GST 口径放入相应列。`)
      : T(l, "No assessing authority could be listed for the occupation entered.", "Girilen meslek için bir değerlendirme kurumu listelenemedi.", "无法为所填职业列出评估机构。"),
    authorityHeaders: [T(l, "Authority and pathway", "Kurum ve yolak", "机构与评估路径"), T(l, "Fee excl. GST", "Ücret (KDV hariç, excl. GST)", "费用（不含 GST）"), T(l, "Fee incl. GST", "Ücret (KDV dahil, incl. GST)", "费用（含 GST）"), T(l, "GST not stated by the authority", "KDV durumu kurum tarafından belirtilmemiş", "机构未说明是否含 GST"), T(l, "Processing time", "İşlem süresi", "处理时间"), T(l, "Note and source", "Not ve kaynak", "说明与来源")],
    authority,
    itemsTitle: T(l, "Other listed items", "Listelenen diğer kalemler", "其他列出的项目"),
    itemsHeaders: [T(l, "Item", "Kalem", "项目"), T(l, "Amount", "Tutar", "金额"), T(l, "Type and source", "Tür ve kaynak", "类型与来源"), T(l, "Date", "Tarih", "日期")],
    items: itemRows,
    sumsTitle: T(l, "Sums of published charges by subclass (main applicant)", "Subclass'a göre yayımlanmış ücret toplamları (ana başvuru sahibi)", "按子类汇总的已公布费用（主申请人）"),
    sumsHeaders: [T(l, "Visa", "Vize", "签证"), T(l, "Government charge", "Devlet ücreti", "政府费用"), T(l, "Other listed items marked in total", "Toplamda işaretli diğer kalemler", "其他计入总额的列出项目"), T(l, "Sum", "Toplam", "合计")],
    sums,
    selectedTotalLines,
    notes,
    livingLine,
  };
}
