import assessingBodies from "@/src/data/assessing-bodies.json";
import imgData from "@/src/data/health-registration/img-pathways.json";
import { IMG_PATHWAYS_SOURCE } from "@/lib/health-registration/img-pathways";
import { ANMAC_FEES_SOURCE } from "@/lib/health-registration/anmac-fees";
import { translationOf, type AdminStateData } from "@/lib/admin-data/types";
import { researchText } from "@/lib/marketing/research-journey";
import { authorityDisplayName, resolveAssessingAuthority } from "@/lib/skills-assessment/resolve-authority";
import type { AuthorityFee, LocalizedString } from "@/lib/skills-assessment/types";
import { HOME_AFFAIRS_SOL_URL, OCCUPATION_DATASET_DATE, type OccupationPageContent } from "./page-content";
import { stateListRows } from "./richness";
import { deriveSubclasses, type OccupationRecord } from "./seo";

/**
 * The fact rows of an occupation page (docs/seo-occupation-audit.md 8.1). Every row is `value | source name + link | date the data was verified`; a
 * row without a source or a date is not produced. Nothing is inferred: a figure the held source does not state is shown as "not stated", never as a number.
 */
export type FactGroup = "identity" | "assessment" | "lists" | "states" | "registration";
export type FactRow = { id: string; group: FactGroup; label: string; value: string; sourceName: string; sourceUrl?: string; verified: string };

export const ABS_ANZSCO_URL = "https://www.abs.gov.au/statistics/classifications/anzsco-australian-and-new-zealand-standard-classification-occupations";
export const AHPRA_URL = "https://www.ahpra.gov.au/";
export const NMBA_URL = "https://www.nursingmidwiferyboard.gov.au/";

const ymd = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : null);
const aud = (n: number) => `AUD ${n.toLocaleString("en-AU")}`;

function textOf(v: LocalizedString | undefined, locale: string): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  return (locale === "tr" ? v.tr : locale === "zh-Hans" ? v["zh-Hans"] : v.en) || v.en;
}

const LIST_NAMES: Record<string, string> = {
  MLTSSL: "Medium and Long-term Strategic Skills List (MLTSSL)",
  STSOL: "Short-term Skilled Occupation List (STSOL)",
  ROL: "Regional Occupation List (ROL)",
  RSOL: "Regional Skilled Occupation List (RSOL)",
  CSOL: "Core Skills Occupation List (CSOL)",
};

export function buildFactRows(record: OccupationRecord, c: OccupationPageContent, snapshot: AdminStateData): FactRow[] {
  const locale = c.locale;
  const t = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  const rows: FactRow[] = [];
  const add = (r: Omit<FactRow, "verified"> & { verified: string | null | undefined }) => {
    if (r.verified) rows.push({ ...r, verified: r.verified });
  };
  const datasetDate = OCCUPATION_DATASET_DATE;

  // 1. Identity (ABS ANZSCO).
  add({ id: "code", group: "identity", label: t("ANZSCO code", "ANZSCO kodu", "ANZSCO 代码"), value: c.code, sourceName: t("ABS ANZSCO", "ABS ANZSCO", "ABS ANZSCO"), sourceUrl: ABS_ANZSCO_URL, verified: datasetDate });
  add({ id: "title", group: "identity", label: t("Occupation title", "Meslek adı", "职业名称"), value: c.displayName, sourceName: t("ABS ANZSCO", "ABS ANZSCO", "ABS ANZSCO"), sourceUrl: ABS_ANZSCO_URL, verified: datasetDate });
  if (c.duties[0] && !c.research) add({ id: "description", group: "identity", label: t("Description (first ANZSCO task)", "Tanım (ilk ANZSCO görevi)", "描述（ANZSCO 首项任务）"), value: c.duties[0], sourceName: t("ABS ANZSCO 2013 v1.3", "ABS ANZSCO 2013 v1.3", "ABS ANZSCO 2013 v1.3"), sourceUrl: ABS_ANZSCO_URL, verified: datasetDate });

  // 2. Skills assessment (registry).
  const resolved = resolveAssessingAuthority(c.code);
  const auth = c.richness.authority ? resolved.authority : null;
  if (auth) {
    const key = ({ EA: "Engineers Australia", CPA: "CPAA", "CA-ANZ": "ICAA" } as Record<string, string>)[resolved.authorityId] ?? resolved.authorityId;
    const website = (assessingBodies.assessingBodies as Record<string, { website: string }>)[key]?.website;
    const src = { sourceName: auth.sourceDocument, sourceUrl: website, verified: ymd(auth.lastVerified) };
    add({ id: "authority", group: "assessment", label: t("Assessing authority", "Değerlendirme kurumu", "评估机构"), value: authorityDisplayName(resolved), ...src });
    const pathways = auth.pathways.length ? auth.pathways : (auth.services ?? []).flatMap((s) => s.pathways ?? []);
    const feeOf = (f: AuthorityFee) => ((f.amountAUD ?? f.amountCAD) != null && !f.estimated ? `${textOf(f.label, locale)}: ${f.amountAUD != null ? aud(f.amountAUD) : `CAD ${f.amountCAD}`}` : null);
    const authorityFees = (auth.fees ?? []).map(feeOf).filter((x): x is string => Boolean(x));
    pathways.slice(0, 6).forEach((p, i) => {
      const fees = [...authorityFees, ...p.fees.map(feeOf).filter((x): x is string => Boolean(x))];
      add({ id: `fee-${i}`, group: "assessment", label: `${t("Published fee", "Yayımlanmış ücret", "公布费用")} · ${textOf(p.name, locale)}`, value: fees.length ? fees.join("; ") : t("No figure stated in the held source", "Elimizdeki kaynakta tutar belirtilmemiş", "所持来源未列明金额"), ...src });
      const pt = p.processingTimeWeeks;
      const time = pt ? (pt.label ? textOf(pt.label, locale) : `${pt.standard} ${t("weeks (as the authority states it)", "hafta (kurumun belirttiği gibi)", "周（按机构所述）")}`) : p.processingNotStated ? textOf(p.processingNotStated, locale) : t("Not stated in the held source", "Elimizdeki kaynakta belirtilmemiş", "所持来源未说明");
      add({ id: `time-${i}`, group: "assessment", label: `${t("Processing time", "İşlem süresi", "处理时间")} · ${textOf(p.name, locale)}`, value: time, ...src });
    });
    if (resolved.alsoAssessedBy?.length) add({ id: "also", group: "assessment", label: t("Also assessed by", "Ayrıca değerlendiren", "同时受理评估的机构"), value: resolved.alsoAssessedBy.map((a) => `${a.authorityName} (${a.authorityId})`).join("; "), ...src });
  }

  // 3. National lists (the held dataset) and the LogiVisa list-to-subclass mapping.
  const tokens = record.visa_lists ?? [];
  if (tokens.length) {
    add({ id: "lists", group: "lists", label: t("National skilled occupation lists", "Ulusal nitelikli meslek listeleri", "国家技术职业清单"), value: tokens.map((x) => LIST_NAMES[x] ?? x).join("; "), sourceName: t("LogiVisa occupation dataset; Home Affairs lists", "LogiVisa meslek veri seti; İçişleri (Home Affairs) listeleri", "LogiVisa 职业数据集；内政部清单"), sourceUrl: HOME_AFFAIRS_SOL_URL, verified: datasetDate });
    const subs = deriveSubclasses(record);
    if (subs.length && !c.research?.lists.subclasses) add({ id: "subclasses", group: "lists", label: t("Subclasses mapped to those lists (LogiVisa mapping)", "Bu listelere eşlenen alt sınıflar (LogiVisa eşlemesi)", "与这些清单对应的子类（LogiVisa 对应表）"), value: subs.join(", "), sourceName: t("LogiVisa list-to-subclass mapping", "LogiVisa liste-alt sınıf eşlemesi", "LogiVisa 清单—子类对应表"), sourceUrl: HOME_AFFAIRS_SOL_URL, verified: datasetDate });
  }

  // 4. State and territory program information: from the admin state data (the snapshot the reports use), with its verified date.
  for (const row of stateListRows(record, snapshot.occupationLists)) {
    const program = snapshot.programs[row.state];
    if (!program) continue;
    const list = snapshot.occupationLists?.[row.state];
    const verified = ymd(program.lastVerifiedAt);
    const listed = row.subclasses.join(" + ");
    const level = row.level === "unit-group" ? t("unit-group level", "birim grubu düzeyi", "单元组层级") : t("occupation level", "meslek düzeyi", "职业层级");
    const status = program.status;
        // Only a reviewed translation is shown to customers (docs/admin-data-design.md D5); otherwise the English text.
    const conds = program.conditions.slice(0, 3).map((x) => { const tr = translationOf(x.text, locale); return tr?.reviewed ? tr.text : x.text.en; }).filter(Boolean);
    const value = [`${t("Listed for subclass", "Listelenen alt sınıf", "已列入的子类")} ${listed} (${level})`, `${t("Program status in the held data", "Kayıtlı verideki program durumu", "所存数据中的项目状态")}: ${status}`, program.programYear ? `${t("Program year", "Program yılı", "项目年度")}: ${program.programYear}` : "", ...conds.map((x) => `· ${x}`)].filter(Boolean).join(" | ");
    add({ id: `state-${row.state}`, group: "states", label: `${program.stateName} (${row.state})`, value, sourceName: list?.sourceUrl ? t("Official occupation list and program page", "Resmî meslek listesi ve program sayfası", "官方职业清单与项目页面") : t("Official program page and state occupation list as held", "Resmî program sayfası ve kayıtlı eyalet meslek listesi", "官方项目页面及所存州职业清单"), sourceUrl: list?.sourceUrl ?? program.officialUrl ?? undefined, verified });
  }

  // 5. Registration that is separate from the skills assessment (8.4).
  if (resolved.authorityId === "AHPRA") {
    const item = (id: string) => imgData.ahpraFeeSchedule.items.find((r) => r.id === id);
    const app = item("application-fee-for-general-registration");
    const reg = item("registration-fee-for-general-registration");
    const note = t("Registration with the Medical Board is a separate step from the skills assessment.", "Tıp Kurulu (Medical Board) kaydı, beceri değerlendirmesinden ayrı bir adımdır.", "医学委员会注册与技能评估是相互独立的步骤。");
    const sourceName = `${imgData.ahpraFeeSchedule.title}`;
    const verified = ymd(IMG_PATHWAYS_SOURCE.extractedDate);
    if (app) add({ id: "reg-app", group: "registration", label: t("Medical Board application fee (general registration)", "Medical Board başvuru ücreti (genel kayıt)", "医学委员会申请费（普通注册）"), value: `${aud(app.nationalFeeAud)} · ${note}`, sourceName, sourceUrl: AHPRA_URL, verified });
    if (reg) add({ id: "reg-fee", group: "registration", label: t("Medical Board registration fee (general registration)", "Medical Board kayıt ücreti (genel kayıt)", "医学委员会注册费（普通注册）"), value: aud(reg.nationalFeeAud), sourceName, sourceUrl: AHPRA_URL, verified });
  } else if (resolved.authorityId === "ANMAC") {
    add({
      id: "reg-nmba",
      group: "registration",
      label: t("Nursing and Midwifery Board registration", "Hemşirelik ve Ebelik Kurulu (NMBA) kaydı", "护士与助产士委员会（NMBA）注册"),
      value: t("A separate step from the ANMAC skills assessment. The held source names the NMBA application and registration fees for international applicants but states no amount.", "ANMAC beceri değerlendirmesinden ayrı bir adımdır. Elimizdeki kaynak, uluslararası başvurucular için NMBA başvuru ve kayıt ücretlerini anar ancak tutar belirtmez.", "与 ANMAC 技能评估相互独立。所持来源提到国际申请人的 NMBA 申请费和注册费，但未列明金额。"),
      sourceName: ANMAC_FEES_SOURCE.title,
      sourceUrl: NMBA_URL,
      verified: ymd(ANMAC_FEES_SOURCE.extractedDate),
    });
  }
  return rows;
}

export const FACT_GROUP_ORDER: FactGroup[] = ["identity", "assessment", "lists", "states", "registration"];
