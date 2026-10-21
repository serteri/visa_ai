/**
 * The Canada report as DATA: the content model for destination country CA, drawn by the same renderer as the Australian report
 * (lib/readiness/pdf-report-v2.ts). Shared with Australia: the block types, the layout, the tag and status vocabulary. NOT shared: any
 * immigration content. Every program, figure, province, fee, step, document and source below comes from the verified Canadian data
 * (lib/reports/canada/data.ts); nothing is borrowed from the Australian builders (visas, points table, states, costs, process, sources).
 *
 * Like the Australian report it assesses, scores, ranks and recommends nothing. Where the data does not hold something it says so.
 */
import { countryName, toPassportLocale } from "@/lib/intake/passport";
import { getResourcesSection } from "@/lib/readiness/pdf-content/resources";
import type { Locale } from "@/lib/readiness/types";
import type { ReportView, ReportViewArgs } from "@/lib/reports/report-view";
import type { Block, ReportSection } from "../report-blocks";
import { canadaDisclaimer } from "./disclaimer";
import { CANADA_REPORT_LOCALE } from "./locale";
import { longDate } from "../public-sources";
import { reportSectionTitle } from "../report-section-titles";
import { T, statusLabel, tagsFor, type RequirementStatus } from "../report-text";
import { CA_PROGRAM_ORDER, EE, PNP, PROVINCE_NOTES, PROVINCES, PROVINCIAL_FEES, QC_FEDERAL, caVisaDetail, nocFromOccupation, selectedCaPrograms, type CaProgramKey } from "./data";

const table = (headers: string[], rows: string[][], widths: number[]): Block => ({ kind: "table", headers, rows, widths });
const cad = (n: number) => `CAD ${n.toLocaleString("en-CA")}`;
const bullets = (items: string[]): Block => ({ kind: "lines", lines: items.map((i) => `• ${i}`) });

const PROGRAM_NAME: Record<CaProgramKey, [string, string, string]> = {
  cec: ["Canadian Experience Class (CEC)", "Canadian Experience Class (CEC)", "加拿大经验类（CEC）"],
  fsw: ["Federal Skilled Worker Program (FSW)", "Federal Skilled Worker Program (FSW)", "联邦技术移民项目（FSW）"],
  fstp: ["Federal Skilled Trades Program (FSTP)", "Federal Skilled Trades Program (FSTP)", "联邦技工项目（FSTP）"],
  pnp: ["Provincial Nominee Program (non-Express Entry process)", "Provincial Nominee Program (Express Entry dışı süreç)", "省提名计划（非快速通道流程）"],
  aip: ["Atlantic Immigration Program (AIP)", "Atlantic Immigration Program (AIP)", "大西洋移民计划（AIP）"],
  family: ["Family Sponsorship (spouse, partner or child)", "Aile sponsorluğu (eş, partner veya çocuk)", "家庭担保（配偶、伴侣或子女）"],
};
const programName = (k: CaProgramKey, l: Locale) => T(l, ...PROGRAM_NAME[k]);

/** "TEER_0" -> "TEER 0"; "TEER_0_1" -> "TEER 0–1". */
const teerLabel = (s: string) => s.replace(/^TEER_(\d)_(\d)$/, "TEER $1–$2").replace(/_/g, " ");

export function buildCanadaReportView(args: ReportViewArgs): ReportView {
  const { report, profile, dateText } = args;
  // Release decision: the Canada Assessment and report are English-only (lib/reports/canada/locale.ts), so a PDF is never part Turkish or Chinese
  // and part English; the labels below keep their tr / zh-Hans text for when the Canada data is localised.
  const l: Locale = CANADA_REPORT_LOCALE;
  const tags = tagsFor(l);
  const eeChecked = longDate(EE.lastVerified, l);
  const pnpChecked = longDate(PNP.lastVerified, l);
  const programs = selectedCaPrograms(profile.preferredPathway);
  const ordered = [...programs, ...CA_PROGRAM_ORDER.filter((k) => !programs.includes(k))];

  const factList = (report.suppliedFacts ?? []).filter((f) => ["occupation", "age", "englishLevel", "qualificationLevel", "currentCountry", "passportCountry", "offshoreExperienceYears", "onshoreExperienceYears", "qualificationAwardedInAustralia"].includes(f.field));
  const facts = new Map(factList.map((f) => [f.field, f.value]));
  const entered = (f: string) => (facts.get(f) ?? (f === "occupation" ? profile.occupation : f === "age" ? profile.age : f === "englishLevel" ? profile.englishLevel : f === "currentCountry" ? profile.currentCountry : undefined)) ?? null;
  const occupation = entered("occupation");
  const noc = nocFromOccupation(profile.occupationRaw ?? occupation);
  const language = entered("englishLevel");
  // "clb9" (the single legacy value, the lowest of the four abilities) -> "CLB 9 (lowest ability)"
  const languageFigure = language ? (/^none$/i.test(language) ? "Below CLB 4 in at least one ability" : `${language.replace(/^clb\s*/i, "CLB ")} (lowest of the four abilities)`) : null;
  const notEntered = T(l, "Not entered", "Girilmedi", "未填写");
  const selectedNames = programs.map((k) => programName(k, l));
  const topicLine = selectedNames.length ? selectedNames.join("; ") : T(l, "Not selected (all programs listed)", "Seçilmedi (tüm programlar listelenir)", "未选择（列出全部项目）");
  const countryLabel = (code: string | null) => (code ? countryName(code, toPassportLocale(l)) : notEntered);

  const crsInfo = report.pointsEstimate?.crs;
  const crsEntered = crsInfo?.entered ?? [];
  const workOutside = entered("offshoreExperienceYears");
  const workInside = entered("onshoreExperienceYears");
  const ecaAnswer = entered("qualificationAwardedInAustralia");
  const crsStatusValue = !crsInfo || crsInfo.status === "none"
    ? "Not calculated: no CRS answers were entered"
    : crsInfo.status === "complete"
      ? `Calculated from your answers: ${crsInfo.total} of ${EE.crsScore.maxScore}`
      : `No score shown: ${crsInfo.notCalculated.length} factor${crsInfo.notCalculated.length === 1 ? "" : "s"} not calculated (the partial sum of ${crsInfo.partialSum} is not a CRS score)`;

  const sections: ReportSection[] = [];

  // ── 1. Professional summary ──────────────────────────────────────────────────────────────────────────────────────────────────
  const supplied: Array<[string, string]> = [
    [T(l, "Destination country", "Hedef ülke", "目的地国家"), T(l, "Canada", "Kanada", "加拿大")],
    [T(l, "Program or topic selected", "Seçilen program veya konu", "所选项目或主题"), topicLine],
  ];
  const suppliedRow = (label: string, v: string | null) => { if (v) supplied.push([label, v]); };
  suppliedRow(T(l, "Current country", "Bulunduğunuz ülke", "当前所在国家"), entered("currentCountry") ? countryLabel(entered("currentCountry")) : null);
  suppliedRow(T(l, "Passport country", "Pasaport ülkesi", "护照国家"), entered("passportCountry") ? countryLabel(entered("passportCountry")) : null);
  suppliedRow(T(l, "Age", "Yaş", "年龄"), entered("age"));
  const answer = (label: string) => crsEntered.find((a) => a.label === label)?.value ?? null;
  suppliedRow("English test results (CLB, per ability)", answer("First official language results (per ability)") ?? languageFigure);
  suppliedRow("Level of education", answer("Level of education") ?? entered("qualificationLevel"));
  suppliedRow("Skilled work experience in Canada (years)", workInside);
  suppliedRow("Skilled work experience outside Canada (years)", workOutside);
  suppliedRow(T(l, "Occupation", "Meslek", "职业"), occupation);
  if (noc) suppliedRow(T(l, "NOC 2021 code and TEER category", "NOC 2021 kodu ve TEER kategorisi", "NOC 2021 编码及 TEER 类别"), `${noc.code} · TEER ${noc.teer}`);
  supplied.push(["Comprehensive Ranking System (CRS)", crsStatusValue]);
  const missing: string[] = [];
  if (!entered("age")) missing.push("Age");
  if (!occupation) missing.push("Occupation (NOC 2021 code)");
  if (!entered("currentCountry")) missing.push("Current country");
  if (!entered("passportCountry")) missing.push("Passport country");
  for (const f of crsInfo?.notCalculated ?? []) missing.push(`CRS factor not calculated: ${f.label}`);
  if (!crsEntered.length && !language) missing.push("English test results (CLB)");
  const notCollected = "Information the published program requirements use and this report did not receive: job offer details, proof of funds, province or territory of interest, French-language results the programs use";
  sections.push({
    id: "summary",
    title: reportSectionTitle("summary", l, "CA"),
    blocks: [
      {
        kind: "text",
        text: T(
          l,
          "A structured summary of the information supplied and the published Canadian information researched. It is general information, not immigration advice, and it does not assess the person's situation.",
          "Sağlanan bilgilerin ve araştırılan yayımlanmış Kanada bilgilerinin yapılandırılmış özeti. Genel bilgidir; göçmenlik tavsiyesi değildir ve kişinin durumunu değerlendirmez.",
          "对所提供信息及所研究的加拿大公开信息的结构化摘要。属于一般信息，并非移民建议，也不评估个人情况。",
        ),
      },
      { kind: "heading", text: T(l, "Client-supplied information", "Sağlanan bilgiler", "客户提供的信息") },
      { kind: "kv", rows: supplied },
      { kind: "heading", text: T(l, "Not entered", "Girilmeyenler", "未填写的信息") },
      { kind: "lines", lines: [...(missing.length ? missing.map((m) => `• ${m}`) : [T(l, "Every field the form asks for was entered.", "Formun istediği her alan girildi.", "表单要求的所有字段均已填写。")]), `• ${notCollected}`] },
      { kind: "heading", text: T(l, "Published-data areas covered", "Kapsanan yayımlanmış veri alanları", "涵盖的公开数据领域") },
      bullets([
        T(l, "Program information: Express Entry (CEC, FSW, FSTP), the Provincial Nominee Program non-Express Entry process, the Atlantic Immigration Program and Family Sponsorship, with published requirements and sources", "Program bilgileri: Express Entry (CEC, FSW, FSTP), Provincial Nominee Program Express Entry dışı süreç, Atlantic Immigration Program ve aile sponsorluğu; yayımlanmış gereksinimler ve kaynaklar", "项目信息：快速通道（CEC、FSW、FSTP）、省提名计划非快速通道流程、大西洋移民计划与家庭担保，含已公布的要求与来源"),
        T(l, "Comprehensive Ranking System (CRS): the published factors and maximums, and the factors that could be calculated from the entries", "Comprehensive Ranking System (CRS): yayımlanmış faktörler ve üst sınırlar ile girdilerden hesaplanabilen faktörler", "综合排名系统（CRS）：已公布的评分因素及上限，以及可由所填信息计算的因素"),
        T(l, "Provincial and territorial programs: only the Ontario, British Columbia and Alberta streams and the federal stage for Quebec-selected workers that are in the verified data (other provinces and territories are not included)", "Eyalet ve bölge programları: Ontario, British Columbia ve Alberta akışları ile Quebec tarafından seçilen çalışanlar için federal aşama", "省和地区项目：安大略省、不列颠哥伦比亚省和阿尔伯塔省的通道，以及魁北克选定技术工人的联邦阶段"),
        T(l, "Costs, the typical process and the documents commonly requested, as the sources publish them", "Maliyetler, tipik süreç ve yaygın istenen belgeler; kaynakların yayımladığı şekilde", "费用、典型流程及常见所需文件（按来源公布的内容）"),
        T(l, "Sources: every source with its organisation, page and date checked (last section)", "Kaynaklar: her kaynak, kurumu, sayfası ve kontrol tarihiyle (son bölüm)", "来源：每个来源的机构、页面和核对日期（最后一部分）"),
      ]),
      { kind: "heading", text: T(l, "Items for independent verification", "Bağımsız olarak doğrulanacak noktalar", "有待独立核实的事项") },
      bullets([
        T(l, "Occupation: that the work described matches the NOC 2021 unit group's lead statement and main duties on the official NOC pages", "Meslek: anlatılan işin resmi NOC sayfalarındaki NOC 2021 birim grubu tanımına ve ana görevlerine uyduğu", "职业：所述工作是否与官方 NOC 页面上 NOC 2021 单元组的主要说明和职责相符"),
        T(l, "Language results: test type, date (valid for two years) and the result in each of the four abilities", "Dil sonuçları: sınav türü, tarih (iki yıl geçerli) ve dört becerinin her birindeki sonuç", "语言成绩：考试类型、日期（有效期两年）及四项能力各自的成绩"),
        T(l, "Education: whether an Educational Credential Assessment from a designated organisation is needed for the credential", "Eğitim: kimlik bilgisi için belirlenmiş bir kuruluştan Eğitim Denklik Değerlendirmesi gerekip gerekmediği", "学历：该学历是否需要指定机构出具的学历认证"),
        T(l, "Program status, fees and CRS rules: IRCC's current pages, against the date checked shown on each entry", "Program durumu, ücretler ve CRS kuralları: her girişte gösterilen kontrol tarihine karşı IRCC'nin güncel sayfaları", "项目状态、费用及 CRS 规则：对照各条目所示核对日期查看 IRCC 当前页面"),
        T(l, "Provincial and territorial stream conditions: the current official page of each province, against the date checked", "Eyalet ve bölge akışı koşulları: her eyaletin güncel resmi sayfası, kontrol tarihine karşı", "省和地区通道条件：对照核对日期查看各省的当前官方页面"),
      ]),
    ],
  });

  // ── 2. Applicant information ────────────────────────────────────────────────────────────────────────────────────────────────
  const detailLine = (label: string, v: string | null) => `${label}: ${v ?? notEntered}  [${v === null ? tags.unknown : tags.supplied}]`;
  const detailLines = [
    detailLine(T(l, "Occupation", "Meslek", "职业"), occupation),
    ...(noc ? [`${T(l, "NOC 2021 code and TEER category", "NOC 2021 kodu ve TEER kategorisi", "NOC 2021 编码及 TEER 类别")}: ${noc.code}, TEER ${noc.teer}  [${tags.calculation}]`] : []),
    detailLine(T(l, "Age", "Yaş", "年龄"), entered("age")),
    ...(crsEntered.length
      ? crsEntered.map((a) => `${a.label}: ${a.value}  [${tags.supplied}]`)
      : [detailLine("English test results (CLB)", language), detailLine("Highest education", entered("qualificationLevel"))]),
    detailLine("Skilled work experience in Canada (years)", workInside),
    detailLine("Skilled work experience outside Canada (years)", workOutside),
    ...(ecaAnswer ? [detailLine("Educational Credential Assessment (ECA) obtained", ecaAnswer)] : []),
    detailLine(T(l, "Current country", "Bulunduğunuz ülke", "当前所在国家"), entered("currentCountry") ? countryLabel(entered("currentCountry")) : null),
    detailLine(T(l, "Passport country", "Pasaport ülkesi", "护照国家"), entered("passportCountry") ? countryLabel(entered("passportCountry")) : null),
    ...(profile.mainGoal ? [`${T(l, "Main goal", "Ana hedef", "主要目标")}: ${profile.mainGoal}  [${tags.supplied}]`] : []),
  ];
  sections.push({
    id: "details",
    title: reportSectionTitle("details", l, "CA"),
    blocks: [
      { kind: "text", text: `${T(l, "Destination country", "Hedef ülke", "目的地国家")}: ${T(l, "Canada", "Kanada", "加拿大")}  [${tags.supplied}]` },
      { kind: "text", text: `${T(l, "Program or topic selected", "Seçilen program veya konu", "所选项目或主题")}: ${topicLine}  [${tags.supplied}]` },
      { kind: "lines", lines: detailLines },
      { kind: "text", text: T(l, "Each line says whether the value was supplied by you, calculated from what you supplied, or not entered. A value that was not entered is not assumed.", "Her satır, değerin sizin tarafınızdan girildiğini, girdiğiniz bilgiden hesaplandığını veya girilmediğini belirtir. Girilmeyen bir değer varsayılmaz.", "每一行都说明该值是您提供的、由您所填信息计算得出的，还是未填写。未填写的值不会被假定。") },
    ],
  });

  // ── 3. Program information ──────────────────────────────────────────────────────────────────────────────────────────────────
  const fees = EE.fees as { mainApplicant: number; spouse: number; dependentChild: number; lastIncreaseDate: string };
  const reqHeaders = [T(l, "Published requirement", "Yayımlanmış gereklilik", "已公布的要求"), T(l, "What you entered", "Girdiğiniz", "您填写的内容"), T(l, "Source", "Kaynak", "来源"), T(l, "Information status", "Bilgi durumu", "信息状态")];
  const figureHeaders = [T(l, "Published requirement", "Yayımlanmış gereklilik", "已公布的要求"), T(l, "Your figure", "Sizin rakamınız", "您的数字"), T(l, "Published figure", "Yayımlanmış rakam", "已公布数字"), T(l, "Source", "Kaynak", "来源")];
  const eeSource = `IRCC, Express Entry (${eeChecked})`;
  const st = (s: RequirementStatus) => statusLabel(s, l);
  const yesNo = (v: unknown) => (v === true ? T(l, "Required", "Gerekli", "需要") : v === false ? T(l, "Not required", "Gerekli değil", "不需要") : String(v));

  const eeBlock = (k: "cec" | "fsw" | "fstp"): Block[] => {
    const p = EE.programs[k.toUpperCase()] as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    const out: Block[] = [];
    out.push({ kind: "heading", text: programName(k, l), marked: programs.includes(k) ? T(l, "Your selected program", "Seçtiğiniz program", "您选择的项目") : undefined });
    out.push({
      kind: "kv",
      rows: [
        [T(l, "System", "Sistem", "体系"), T(l, "Express Entry (points-ranked pool; invitations are issued in rounds)", "Express Entry (puanla sıralanan havuz; davetler turlar halinde verilir)", "快速通道（按分数排名的候选池；分轮次发出邀请）")],
        [T(l, "Scoring system", "Puanlama sistemi", "评分体系"), k === "fsw" ? T(l, "Comprehensive Ranking System (CRS) for the pool; separate FSW selection-factor grid for eligibility", "Havuz için CRS; uygunluk için ayrı FSW seçim faktörü tablosu", "候选池使用综合排名系统（CRS）；资格另有 FSW 选择因素表") : T(l, "Comprehensive Ranking System (CRS)", "Comprehensive Ranking System (CRS)", "综合排名系统（CRS）")],
        [T(l, "Application fee (main applicant)", "Başvuru ücreti (ana başvuru sahibi)", "申请费（主申请人）"), `${cad(fees.mainApplicant)} (${T(l, "increase effective", "artış tarihi", "上调生效日")} ${longDate(fees.lastIncreaseDate, l)})`],
        [T(l, "Processing time", "İşlem süresi", "处理时间"), T(l, String(EE.processingTimes), "Programa göre değişir", "因项目而异")],
        [T(l, "Data checked", "Veri kontrol tarihi", "数据核对日期"), eeChecked],
        [T(l, "Official source", "Resmi kaynak", "官方来源"), (EE.sourceUrls as string[])[0]],
      ],
    });
    const nocs = k === "fstp" ? (p.workExperience.nocGroups as string[]).join("; ") : (p.workExperience.noc as string[]).map(teerLabel).join(", ");
    const langPublished = k === "cec"
      ? `${teerLabel("TEER_0_1")}: ${p.languageRequirement.TEER_0_1}; ${teerLabel("TEER_2_3")}: ${p.languageRequirement.TEER_2_3}`
      : k === "fsw"
        ? String(p.languageRequirement)
        : T(l, `Speaking and listening ${p.languageRequirement.speakingListening}; reading and writing ${p.languageRequirement.readingWriting}`, `Konuşma ve dinleme ${p.languageRequirement.speakingListening}; okuma ve yazma ${p.languageRequirement.readingWriting}`, `听说 ${p.languageRequirement.speakingListening}；读写 ${p.languageRequirement.readingWriting}`);
    const numeric: string[][] = [[`${T(l, "Language level", "Dil düzeyi", "语言水平")}\n(${T(l, "CLB", "CLB", "CLB")})`, languageFigure ?? notEntered, langPublished, eeSource]];
    out.push(table(figureHeaders, numeric, [0.3, 0.2, 0.32, 0.18]));
    const rows: string[][] = [
      [`${T(l, "Occupation category", "Meslek kategorisi", "职业类别")}: ${nocs}`, noc ? `NOC ${noc.code}, TEER ${noc.teer}` : notEntered, eeSource, st(noc ? "provided" : "not_provided")],
      [`${T(l, "Work experience", "İş deneyimi", "工作经验")}: ${p.workExperience.type}; ${p.workExperience.amount}`, T(l, "Not collected by the form", "Formda toplanmıyor", "表单未收集"), eeSource, st("not_collected")],
      [`${T(l, "Job offer", "İş teklifi", "工作邀约")}: ${yesNo(p.jobOfferRequired)}${p.jobOfferAlternative ? ` (${p.jobOfferAlternative})` : ""}`, T(l, "Not collected by the form", "Formda toplanmıyor", "表单未收集"), eeSource, st("not_collected")],
      [`${T(l, "Education", "Eğitim", "学历")}: ${typeof p.educationRequired === "string" ? p.educationRequired : yesNo(p.educationRequired)}`, answer("Level of education") ?? entered("qualificationLevel") ?? notEntered, eeSource, st(answer("Level of education") ?? entered("qualificationLevel") ? "provided" : "not_provided")],
      [`${T(l, "Proof of funds", "Yeterli fon kanıtı", "资金证明")}: ${yesNo(p.proofOfFundsRequired)}`, T(l, "Not collected by the form", "Formda toplanmıyor", "表单未收集"), eeSource, st("not_collected")],
    ];
    if (k === "fsw") rows.push([`${T(l, "FSW selection factors: maximum", "FSW seçim faktörleri: azami", "FSW 选择因素：满分")} ${p.selectionFactorPointsMax}; ${T(l, "pass mark", "geçme notu", "及格分")} ${p.selectionFactorPassMark}`, T(l, "Not calculated from your entries", "Girdilerinizden hesaplanmadı", "未根据您所填信息计算"), eeSource, st("not_collected")]);
    out.push(table(reqHeaders, rows, [0.34, 0.26, 0.24, 0.16]));
    return out;
  };

  const pnpBlock = (): Block[] => [
    { kind: "heading", text: programName("pnp", l), marked: programs.includes("pnp") ? T(l, "Your selected program", "Seçtiğiniz program", "您选择的项目") : undefined },
    {
      kind: "kv",
      rows: [
        [T(l, "System", "Sistem", "体系"), T(l, "A province or territory nominates; IRCC then decides the permanent residence application", "Eyalet veya bölge aday gösterir; daimi oturum başvurusuna ardından IRCC karar verir", "由省或地区提名；随后由 IRCC 对永久居留申请作出决定")],
        [T(l, "Scoring system", "Puanlama sistemi", "评分体系"), T(l, "Not applicable at federal level (each province sets its own stream criteria)", "Federal düzeyde uygulanmaz (her eyalet kendi akış ölçütlerini belirler)", "联邦层面不适用（各省自行制定通道标准）")],
        [T(l, "Program status", "Program durumu", "项目状态"), String(PNP.status) === "open" ? T(l, "Open", "Açık", "开放") : String(PNP.status)],
        [T(l, "Application fee", "Başvuru ücreti", "申请费"), `${T(l, "from", "başlangıç", "起")} ${cad(PNP.fees.processingFeeFrom)} (${T(l, "increase effective", "artış tarihi", "上调生效日")} ${longDate(PNP.fees.lastIncreaseDate, l)})`],
        [T(l, "Processing time", "İşlem süresi", "处理时间"), T(l, PNP.processingTime.estimate, PNP.processingTime.estimate_tr, PNP.processingTime.estimate_zh)],
        [T(l, "Data checked", "Veri kontrol tarihi", "数据核对日期"), pnpChecked],
        [T(l, "Official source", "Resmi kaynak", "官方来源"), PNP.sourceUrl],
      ],
    },
    { kind: "text", text: T(l, "This record covers the federal process, fees and documents only. Each province's own stream criteria are listed under “Provincial and territorial programs”.", "Bu kayıt yalnızca federal süreci, ücretleri ve belgeleri kapsar. Her eyaletin kendi akış ölçütleri “Eyalet ve bölge programları” altında listelenir.", "本记录仅涵盖联邦层面的流程、费用和文件。各省自己的通道标准列于“省和地区项目”。") },
    { kind: "heading", text: T(l, "Published notices", "Yayımlanmış notlar", "已公布的提示") },
    bullets((PNP.importantCaveats as Array<{ text: string }>).map((c) => c.text)),
  ];

  const detailBlock = (k: "aip" | "family"): Block[] => {
    const d = caVisaDetail(k === "aip" ? "canada-atlantic-immigration-program" : "canada-family-sponsorship")!;
    const rows: Array<[string, string]> = [
      [T(l, "Program status", "Program durumu", "项目状态"), String(d.status)],
      [T(l, "Fees (as published)", "Ücretler (yayımlandığı şekilde)", "费用（按公布内容）"), String(d.fees)],
      [T(l, "Processing time (as published)", "İşlem süresi (yayımlandığı şekilde)", "处理时间（按公布内容）"), String(d.processing_time)],
      [T(l, "Scoring system", "Puanlama sistemi", "评分体系"), T(l, "Not applicable (no CRS ranking)", "Uygulanmaz (CRS sıralaması yok)", "不适用（无 CRS 排名）")],
    ];
    if (k === "aip") rows.push([T(l, "Atlantic provinces", "Atlantik eyaletleri", "大西洋省份"), (d.target_provinces as string[]).join(", ")]);
    if (d.officialUrl) rows.push([T(l, "Official source", "Resmi kaynak", "官方来源"), String(d.officialUrl)]);
    return [
      { kind: "heading", text: programName(k, l), marked: programs.includes(k) ? T(l, "Your selected program", "Seçtiğiniz program", "您选择的项目") : undefined },
      { kind: "text", text: String(d.overview) },
      { kind: "kv", rows },
    ];
  };

  const programBlocks: Block[] = [
    { kind: "text", text: T(l, "Every program is described with the same fields. The program you selected is listed first; the others follow in a fixed order. Where a requirement has a published figure, your figure is shown next to it. Nothing here says whether a requirement is met.", "Her program aynı alanlarla anlatılır. Seçtiğiniz program ilk sırada, diğerleri sabit sırayla gelir. Bir gerekliliğin yayımlanmış bir rakamı varsa sizin rakamınız yanında gösterilir. Burada hiçbir gerekliliğin karşılanıp karşılanmadığı belirtilmez.", "每个项目都使用相同的字段描述。您选择的项目排在最前，其余按固定顺序排列。若某项要求有公布的数字，您的数字会并列显示。此处不说明任何要求是否已满足。") },
  ];
  for (const k of ordered) {
    if (k === "cec" || k === "fsw" || k === "fstp") programBlocks.push(...eeBlock(k));
    else if (k === "pnp") programBlocks.push(...pnpBlock());
    else programBlocks.push(...detailBlock(k));
  }
  sections.push({ id: "visas", title: reportSectionTitle("visas", l, "CA"), blocks: programBlocks });

  // ── 4. CRS ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const crs = EE.crsScore as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const crsBlocks: Block[] = [
    { kind: "text", text: `The Comprehensive Ranking System (CRS) ranks candidates in the Express Entry pool, out of a published maximum of ${crs.maxScore}. It applies to the CEC, FSW and FSTP. It is Not applicable to the Provincial Nominee Program non-Express Entry process, the Atlantic Immigration Program or Family Sponsorship. No score threshold or invitation cut-off is shown here: IRCC publishes the result of each round.` },
  ];
  const noSpouse = crsEntered.some((a) => a.label === "Spouse or partner who will accompany you" && a.value === "No");
  const calculatedIds = new Set((crsInfo?.calculated ?? []).map((f) => f.id));
  if (crsInfo && crsInfo.status === "complete") {
    crsBlocks.push(
      { kind: "heading", text: "CRS score calculated from your answers" },
      { kind: "kv", rows: [["CRS score calculated from your answers", `${crsInfo.total} of ${crs.maxScore}`]] },
      table(["Factor", "Points", "Source"], crsInfo.calculated.map((f) => [f.label, String(f.points), `IRCC CRS criteria (${eeChecked})`]), [0.6, 0.14, 0.26]),
      { kind: "text", text: `Every CRS question was answered, so the factors above add up to a calculated CRS score of ${crsInfo.total}. It is calculated by LogiVisa from your answers under the criteria published by IRCC (checked ${eeChecked}); it is not an IRCC assessment. Verify it with IRCC's official CRS calculator before relying on it. The score in an Express Entry profile also depends on the evidence IRCC accepts for each answer.` },
    );
  } else if (crsInfo && crsInfo.status === "partial") {
    crsBlocks.push(
      { kind: "heading", text: "No CRS score is shown" },
      { kind: "text", text: `A CRS score needs an answer to every factor. ${crsInfo.notCalculated.length} factor${crsInfo.notCalculated.length === 1 ? " was" : "s were"} not answered, so none is claimed here. The factors that could be calculated are listed below for reference only.` },
      table(["Factor calculated from your answers", "Points", "Source"], crsInfo.calculated.map((f) => [f.label, String(f.points), `IRCC CRS criteria (${eeChecked})`]), [0.6, 0.14, 0.26]),
      { kind: "text", text: `Sum of the factors above: ${crsInfo.partialSum}. This is a partial figure, not a CRS score and not an estimate of one.` },
      { kind: "heading", text: "Factors not calculated" },
      table(["Factor", "Reason"], crsInfo.notCalculated.map((f) => [f.label, "Not answered, or depends on an answer that was not given"]), [0.55, 0.45]),
    );
  } else {
    crsBlocks.push({ kind: "text", text: "No CRS factor could be calculated because the CRS questions were not answered. No CRS score is shown." });
  }
  const core = crs.coreHumanCapitalFactors;
  const max = (a: number, b: number) => `${a} / ${b}`;
  crsBlocks.push(
    { kind: "heading", text: T(l, "Published CRS factors and maximums", "Yayımlanmış CRS faktörleri ve üst sınırlar", "已公布的 CRS 因素及上限") },
    table(
      [T(l, "Factor", "Faktör", "因素"), T(l, "Maximum (without / with spouse or partner)", "Üst sınır (eşsiz / eşli veya partnerli)", "上限（无配偶 / 有配偶或伴侣）"), T(l, "Calculated for you", "Sizin için hesaplandı", "已为您计算")],
      [
        [T(l, "Core human capital: total", "Temel beşeri sermaye: toplam", "核心人力资本：合计"), max(core.maxWithoutSpouse, core.maxWithSpouse), "—"],
        [T(l, "Age", "Yaş", "年龄"), max(core.age.maxWithoutSpouse, core.age.maxWithSpouse), calculatedIds.has("age") ? "Yes" : "Not calculated"],
        [T(l, "Level of education", "Eğitim düzeyi", "教育程度"), max(core.education.maxWithoutSpouse, core.education.maxWithSpouse), calculatedIds.has("education") ? "Yes" : "Not calculated"],
        [T(l, "Official languages: first language, per ability", "Resmi diller: birinci dil, beceri başına", "官方语言：第一语言（每项能力）"), max(core.firstOfficialLanguage.maxPerAbilityWithoutSpouse, core.firstOfficialLanguage.maxPerAbilityWithSpouse), calculatedIds.has("firstLanguage") ? "Yes" : "Not calculated"],
        [T(l, "Official languages: second language", "Resmi diller: ikinci dil", "官方语言：第二语言"), max(core.secondOfficialLanguage.maxCombinedWithoutSpouse, core.secondOfficialLanguage.maxCombinedWithSpouse), calculatedIds.has("secondLanguage") ? "Yes" : "Not calculated"],
        [T(l, "Canadian work experience", "Kanada iş deneyimi", "加拿大工作经验"), max(core.canadianWorkExperience.maxWithoutSpouse, core.canadianWorkExperience.maxWithSpouse), calculatedIds.has("canadianWorkExperience") ? "Yes" : "Not calculated"],
        [T(l, "Spouse or partner factors", "Eş veya partner faktörleri", "配偶或伴侣因素"), String(crs.spouseFactors.maxTotal), noSpouse ? "Not applicable (no spouse or partner)" : calculatedIds.has("spouseOrPartnerFactors") ? "Yes" : "Not calculated"],
        [T(l, "Skill transferability factors", "Beceri aktarılabilirliği faktörleri", "技能可转移性因素"), String(crs.skillTransferabilityFactors.maxTotal), calculatedIds.has("skillTransferability") ? "Yes" : "Not calculated"],
        [T(l, "Additional points (e.g. provincial nomination 600, French-language skills, sibling in Canada, Canadian study)", "Ek puanlar (ör. eyalet adaylığı 600, Fransızca, Kanada'da kardeş, Kanada'da eğitim)", "附加分（如省提名 600、法语能力、在加拿大的兄弟姐妹、加拿大学习）"), String(crs.additionalPoints.maxTotal), (calculatedIds.has("siblingInCanada") && calculatedIds.has("frenchLanguage") && calculatedIds.has("canadianStudy") && calculatedIds.has("provincialNomination")) ? "Yes" : "Not calculated"],
      ],
      [0.5, 0.28, 0.22],
    ),
    { kind: "text", text: T(l, `Rule change recorded in the data: from ${longDate(crs.lastRuleChange.date, l)}, job offers no longer score CRS points.`, `Verilerde kayıtlı kural değişikliği: ${longDate(crs.lastRuleChange.date, l)} tarihinden itibaren iş teklifleri CRS puanı vermez.`, `数据中记录的规则变化：自 ${longDate(crs.lastRuleChange.date, l)} 起，工作邀约不再计入 CRS 分数。`) },
    { kind: "text", text: `${T(l, "Pending change published by IRCC's regulatory plan", "IRCC düzenleme planında yayımlanan bekleyen değişiklik", "IRCC 监管计划中公布的待定变更")}: ${String(EE.knownPendingChanges.note).replace(/\s*Re-verify[^.]*\./i, "")}` },
  );
  sections.push({ id: "points", title: reportSectionTitle("points", l, "CA"), blocks: crsBlocks });

  // ── 5. Provincial and territorial programs ──────────────────────────────────────────────────────────────────────────────────
  const provBlocks: Block[] = [
    { kind: "heading", text: "Programs currently covered in LogiVisa's verified data" },
    { kind: "text", text: "This section covers the Ontario, British Columbia and Alberta nominee streams and the federal stage for Quebec-selected workers. It is not a complete list of Canada's provincial and territorial programs: the other provinces and territories are not included in the current dataset. A program missing from this section may exist; check the province or territory's own immigration website." },
    { kind: "text", text: T(l, "Each province and territory runs its own nominee streams, with its own criteria, scoring model and occupation policy. They are listed as each publishes them, with the date checked. A nomination is a provincial decision; the permanent residence application is then decided by IRCC. “Enhanced” streams are linked to Express Entry and the published CRS addition for a nomination is 600.", "Her eyalet ve bölge kendi adaylık akışlarını, ölçütlerini, puanlama modelini ve meslek politikasını yürütür. Her birinin yayımladığı şekilde ve kontrol tarihiyle listelenir. Aday gösterme eyaletin kararıdır; daimi oturum başvurusuna ardından IRCC karar verir. “Enhanced” akışlar Express Entry'ye bağlıdır ve aday gösterme için yayımlanmış CRS eki 600'dür.", "各省和地区运行各自的提名通道，标准、评分模式和职业政策各不相同。此处按各方公布的内容列出并注明核对日期。提名是省级决定，之后永久居留申请由 IRCC 决定。“Enhanced”通道与快速通道挂钩，已公布的提名 CRS 加分为 600。") },
    table(
      [T(l, "Province", "Eyalet", "省份"), T(l, "Stream", "Akış", "通道"), T(l, "Linked to Express Entry", "Express Entry'ye bağlı", "与快速通道挂钩"), T(l, "Language threshold", "Dil eşiği", "语言门槛"), T(l, "Checked", "Kontrol", "核对")],
      PROVINCES.flatMap((p) => p.streams.map((s) => [`${T(l, p.name.en, p.name.tr, p.name.zh)} (${p.code})`, s.streamName, s.isEnhanced ? T(l, "Yes (Enhanced)", "Evet (Enhanced)", "是（Enhanced）") : T(l, "No", "Hayır", "否"), s.languageThreshold, longDate(p.verified, l)])),
      [0.17, 0.33, 0.16, 0.22, 0.12],
    ),
  ];
  const model = (m: string) => (m === "teer-pathway" ? T(l, "TEER pathway", "TEER yolu", "TEER 路径") : m === "points-based-sirs" ? T(l, "Points-based (SIRS)", "Puan tabanlı (SIRS)", "积分制（SIRS）") : m === "signal-based" ? T(l, "Profile-signal based", "Profil sinyaline dayalı", "基于档案信号") : T(l, "Job offer required", "İş teklifi gerekli", "需要工作邀约"));
  for (const p of PROVINCES) {
    provBlocks.push({ kind: "heading", text: `${T(l, p.name.en, p.name.tr, p.name.zh)} (${p.code}) — ${longDate(p.verified, l)}` }, { kind: "text", text: PROVINCE_NOTES[p.code] });
    for (const s of p.streams) {
      provBlocks.push({
        kind: "kv",
        rows: [
          [T(l, "Stream", "Akış", "通道"), s.streamName],
          [T(l, "Scoring model", "Puanlama modeli", "评分模式"), model(s.scoringModel)],
          [T(l, "Language threshold", "Dil eşiği", "语言门槛"), s.languageThreshold],
          [T(l, "Linked to Express Entry", "Express Entry'ye bağlı", "与快速通道挂钩"), s.isEnhanced ? T(l, "Yes (Enhanced): nomination adds 600 CRS points", "Evet (Enhanced): aday gösterme 600 CRS puanı ekler", "是（Enhanced）：提名加 600 CRS 分") : T(l, "No", "Hayır", "否")],
          [T(l, "Published conditions", "Yayımlanmış koşullar", "已公布条件"), s.notes],
        ],
      });
    }
    if (p.unpublished?.length) provBlocks.push({ kind: "text", text: T(l, `Announced, with no published eligibility detail yet: ${p.unpublished.join(", ")}.`, `Duyuruldu, uygunluk ayrıntısı henüz yayımlanmadı: ${p.unpublished.join(", ")}.`, `已宣布但尚未公布资格细节：${p.unpublished.join("、")}。`) });
    provBlocks.push({ kind: "text", text: `${T(l, "Official source", "Resmi kaynak", "官方来源")}: ${p.urls.join("  ·  ")}` });
  }
  provBlocks.push(
    { kind: "heading", text: `${T(l, "Quebec", "Quebec", "魁北克")} — ${longDate(QC_FEDERAL.lastVerified, l)}` },
    { kind: "text", text: T(l, `Quebec selects its own economic immigrants through the Certificat de sélection du Québec (CSQ), issued by the Ministère de l'Immigration, de la Francisation et de l'Intégration. Only the federal stage that follows is held in this report's data: IRCC processing of about 11 months and an application fee from ${cad(QC_FEDERAL.fees.processingFeeFrom)}, once a valid CSQ is held. Quebec's own selection criteria, fees and processing time are not held and are not covered.`, `Quebec, ekonomik göçmenlerini Ministère de l'Immigration, de la Francisation et de l'Intégration tarafından verilen Certificat de sélection du Québec (CSQ) ile kendisi seçer. Bu raporun verisinde yalnızca ardından gelen federal aşama vardır: geçerli bir CSQ'ya sahip olunduğunda yaklaşık 11 aylık IRCC işlemi ve ${cad(QC_FEDERAL.fees.processingFeeFrom)}'den başlayan başvuru ücreti. Quebec'in kendi seçim ölçütleri, ücretleri ve işlem süresi tutulmaz ve kapsanmaz.`, `魁北克通过魁北克移民、法语化与融入部（MIFI）签发的魁北克选择证书（CSQ）自行遴选经济类移民。本报告数据仅涵盖其后的联邦阶段：持有有效 CSQ 后，IRCC 处理约 11 个月，申请费自 ${cad(QC_FEDERAL.fees.processingFeeFrom)} 起。魁北克自己的遴选标准、费用和处理时间不在数据中，也未涵盖。`) },
    { kind: "heading", text: "Not included in the current dataset" },
    { kind: "text", text: `The nominee streams of the other provinces and territories (Manitoba, Saskatchewan, Nova Scotia, New Brunswick, Prince Edward Island, Newfoundland and Labrador, Yukon, the Northwest Territories and Nunavut) are not included in the current dataset, and nothing is stated about them in this report. IRCC's overview of the Provincial Nominee Program: ${PNP.sourceUrl}` },
  );
  sections.push({ id: "provinces", title: reportSectionTitle("provinces", l, "CA"), blocks: provBlocks });

  // ── 6. Costs ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const pof = EE.proofOfFunds as { lastUpdated: string; byFamilySize: Record<string, number>; additionalPersonAmount: number; notRequiredIf: string[] };
  const costBlocks: Block[] = [
    { kind: "heading", text: T(l, "Government application fees", "Devlet başvuru ücretleri", "政府申请费") },
    table(
      [T(l, "Fee", "Ücret", "费用"), T(l, "Amount", "Tutar", "金额"), T(l, "Applies to", "Kimler için", "适用对象"), T(l, "Source and date", "Kaynak ve tarih", "来源与日期")],
      [
        [T(l, "Permanent residence application: main applicant", "Daimi oturum başvurusu: ana başvuru sahibi", "永久居留申请：主申请人"), cad(fees.mainApplicant), "CEC, FSW, FSTP", `IRCC (${eeChecked})`],
        [T(l, "Permanent residence application: spouse or partner", "Daimi oturum başvurusu: eş veya partner", "永久居留申请：配偶或伴侣"), cad(fees.spouse), "CEC, FSW, FSTP", `IRCC (${eeChecked})`],
        [T(l, "Permanent residence application: dependent child", "Daimi oturum başvurusu: bağımlı çocuk", "永久居留申请：受抚养子女"), cad(fees.dependentChild), "CEC, FSW, FSTP", `IRCC (${eeChecked})`],
        [T(l, "Permanent residence application (from)", "Daimi oturum başvurusu (başlangıç)", "永久居留申请（起）"), cad(PNP.fees.processingFeeFrom), T(l, "Provincial Nominee Program, non-Express Entry", "Provincial Nominee Program, Express Entry dışı", "省提名计划，非快速通道"), `IRCC (${pnpChecked})`],
      ],
      [0.38, 0.14, 0.26, 0.22],
    ),
    { kind: "text", text: T(l, `The fee schedule increased on ${longDate(fees.lastIncreaseDate, l)}. IRCC lists further charges that are paid separately, such as the right of permanent residence fee and biometrics. They are not summed here.`, `Ücret tarifesi ${longDate(fees.lastIncreaseDate, l)} tarihinde arttı. IRCC, ayrıca ödenen başka ücretleri de listeler (ör. daimi oturum hakkı ücreti ve biyometri). Burada toplanmamıştır.`, `费用表于 ${longDate(fees.lastIncreaseDate, l)} 上调。IRCC 另列有单独缴纳的费用，如永久居留权费和生物识别费，此处未加总。`) },
    { kind: "heading", text: T(l, "Provincial fees recorded", "Kayıtlı eyalet ücretleri", "已记录的省级费用") },
    table(
      [T(l, "Fee", "Ücret", "费用"), T(l, "Amount", "Tutar", "金额"), T(l, "Checked", "Kontrol", "核对")],
      PROVINCIAL_FEES.map((f) => [T(l, f.en, f.tr, f.zh), f.amount, longDate(f.verified, l)]),
      [0.6, 0.18, 0.22],
    ),
    { kind: "heading", text: T(l, "Settlement funds (proof of funds)", "Yerleşim fonu (yeterli fon kanıtı)", "安家资金（资金证明）") },
    table(
      [T(l, "Family size", "Aile büyüklüğü", "家庭人数"), T(l, "Published amount", "Yayımlanmış tutar", "公布金额")],
      [...Object.entries(pof.byFamilySize).map(([n, v]) => [n, cad(v)]), [T(l, "Each additional person", "Her ek kişi", "每增加一人"), cad(pof.additionalPersonAmount)]],
      [0.4, 0.6],
    ),
    { kind: "text", text: T(l, `Amounts as recorded on ${longDate(pof.lastUpdated, l)}. Proof of funds is required for the FSW and FSTP. It is not required under the CEC, or for an applicant authorised to work in Canada with a valid job offer.`, `Tutarlar ${longDate(pof.lastUpdated, l)} tarihinde kaydedildiği gibidir. Yeterli fon kanıtı FSW ve FSTP için gereklidir. CEC kapsamında veya Kanada'da çalışma izni olup geçerli iş teklifi bulunan başvuru sahibi için gerekli değildir.`, `金额为 ${longDate(pof.lastUpdated, l)} 的记录。FSW 和 FSTP 需要资金证明；CEC 以及在加拿大有工作授权且持有有效工作邀约的申请人不需要。`) },
    { kind: "heading", text: T(l, "Charges paid to third parties", "Üçüncü taraflara ödenen ücretler", "支付给第三方的费用") },
    { kind: "text", text: T(l, "Language tests, Educational Credential Assessments, medical examinations and police certificates are paid to the organisations that provide them, not to IRCC. Their amounts are set by those organisations and are not held in this report's data; check each organisation's current price.", "Dil sınavları, Eğitim Denklik Değerlendirmeleri, sağlık muayeneleri ve sabıka belgeleri IRCC'ye değil, bunları sağlayan kuruluşlara ödenir. Tutarlarını bu kuruluşlar belirler ve bu raporun verisinde yoktur; her kuruluşun güncel fiyatını kontrol edin.", "语言考试、学历认证、体检和无犯罪证明的费用支付给提供服务的机构，而非 IRCC。其金额由这些机构自行确定，不在本报告数据中；请查看各机构当前价格。") },
    { kind: "text", text: T(l, "No total is calculated: the amounts depend on the program, the number of people included and the choices made.", "Toplam hesaplanmamıştır: tutarlar programa, dahil edilen kişi sayısına ve yapılan seçimlere bağlıdır.", "未计算总额：金额取决于项目、包含的人数及所作选择。") },
  ];
  sections.push({ id: "costs", title: reportSectionTitle("costs", l, "CA"), blocks: costBlocks });

  // ── 7. Typical process ──────────────────────────────────────────────────────────────────────────────────────────────────────
  const eeSteps = (caVisaDetail("canada-express-entry")?.steps as string[] | undefined) ?? (EE.howItWorks as string[]);
  const pnpSteps = PNP.processSteps as Array<{ step: number; name: string; name_tr?: string; name_zh?: string; description: string }>;
  const processBlocks: Block[] = [
    { kind: "text", text: T(l, "The usual steps for each pathway family and what the sources publish about each. It is generic: it has no dates for you.", "Her yol ailesi için olağan adımlar ve kaynakların her biri hakkında yayımladıkları. Geneldir: sizin için tarih içermez.", "各路径类别的通常步骤以及来源对各步骤的公布内容。内容为通用信息，不含针对您的日期。") },
    { kind: "heading", text: T(l, "Express Entry (CEC, FSW, FSTP)", "Express Entry (CEC, FSW, FSTP)", "快速通道（CEC、FSW、FSTP）") },
    { kind: "text", text: `${T(l, "Applies to", "Kimler için", "适用对象")}: CEC, FSW, FSTP` },
    table([T(l, "Step", "Adım", "步骤"), T(l, "Published information", "Yayımlanmış bilgi", "已公布的信息"), T(l, "Source", "Kaynak", "来源")], eeSteps.map((s, i) => [String(i + 1), s, `IRCC (${eeChecked})`]), [0.1, 0.68, 0.22]),
    { kind: "heading", text: T(l, "Provincial Nominee Program (non-Express Entry)", "Provincial Nominee Program (Express Entry dışı)", "省提名计划（非快速通道）") },
    { kind: "text", text: `${T(l, "Applies to", "Kimler için", "适用对象")}: ${programName("pnp", l)}. ${T(l, "Processing time", "İşlem süresi", "处理时间")}: ${T(l, PNP.processingTime.estimate, PNP.processingTime.estimate_tr, PNP.processingTime.estimate_zh)}` },
    table([T(l, "Step", "Adım", "步骤"), T(l, "Published information", "Yayımlanmış bilgi", "已公布的信息"), T(l, "Source", "Kaynak", "来源")], pnpSteps.map((s) => [String(s.step), `${T(l, s.name, s.name_tr ?? s.name, s.name_zh ?? s.name)}: ${s.description}`, `IRCC (${pnpChecked})`]), [0.1, 0.68, 0.22]),
    { kind: "heading", text: T(l, "After you apply", "Başvurudan sonra", "申请之后") },
    bullets([
      T(l, `Biometrics: ages ${PNP.afterApply.biometrics.ageRange}, to be given within ${PNP.afterApply.biometrics.deadline.replace("30 days from instruction letter", "30 days of the instruction letter")}.`, `Biyometri: ${PNP.afterApply.biometrics.ageRange} yaş arası; talimat mektubundan itibaren 30 gün içinde verilmelidir.`, `生物识别：年龄 ${PNP.afterApply.biometrics.ageRange} 岁，须在收到指示信后 30 天内完成。`),
      T(l, "Medical examination: required for the applicant and all family members, including those not accompanying.", "Sağlık muayenesi: başvuru sahibi ve eşlik etmeyenler dahil tüm aile üyeleri için gereklidir.", "体检：申请人及所有家庭成员（含不随行者）均需进行。"),
      T(l, "Misrepresentation: the source states it can lead to refusal, an inadmissibility finding and a five-year bar.", "Yanlış beyan: kaynak, bunun ret, kabul edilemezlik kararı ve beş yıllık yasağa yol açabileceğini belirtir.", "虚假陈述：来源指出可能导致拒签、不可入境裁定及五年禁止申请期。"),
    ]),
  ];
  sections.push({ id: "process", title: reportSectionTitle("process", l, "CA"), blocks: processBlocks });

  // ── 8. Documents ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const docLabel: Record<string, [string, string, string]> = {
    passport_or_travel_document: ["Passport or travel document", "Pasaport veya seyahat belgesi", "护照或旅行证件"],
    language_test_results: ["Language test results", "Dil sınavı sonuçları", "语言考试成绩"],
    proof_of_canadian_education_or_ECA: ["Proof of Canadian education, or an Educational Credential Assessment (ECA) for foreign education", "Kanada eğitiminin kanıtı veya yurt dışı eğitim için Eğitim Denklik Değerlendirmesi (ECA)", "加拿大学历证明，或境外学历的学历认证（ECA）"],
    written_job_offer_if_applicable: ["Written job offer, if applicable", "Varsa yazılı iş teklifi", "书面工作邀约（如适用）"],
    proof_of_work_experience: ["Proof of work experience", "İş deneyimi kanıtı", "工作经验证明"],
    certificate_of_qualification_if_trade: ["Certificate of qualification, for a skilled trade", "Vasıflı meslek için yeterlilik belgesi", "技工资格证书（技工类）"],
    proof_of_funds: ["Proof of funds, where required", "Gerekiyorsa yeterli fon kanıtı", "资金证明（如需要）"],
    police_certificates: ["Police certificates", "Sabıka belgeleri", "无犯罪证明"],
    provincial_nomination_if_applicable: ["Provincial nomination, if applicable", "Varsa eyalet adaylığı", "省提名（如适用）"],
  };
  const lt = EE.languageTests as { english: string[]; french: string[]; validityYears: number };
  const eca = EE.educationalCredentialAssessment as { validityYears: number; designatedGeneralOrganizations: string[] };
  const police = EE.policeCertificates as { requiredFor: string; currentCountryCertificateMaxAge: string };
  const docDetail = (key: string): string => {
    if (key === "language_test_results") return `${T(l, "English", "İngilizce", "英语")}: ${lt.english.join(", ")}. ${T(l, "French", "Fransızca", "法语")}: ${lt.french.join(", ")}. ${T(l, `Valid for ${lt.validityYears} years.`, `${lt.validityYears} yıl geçerlidir.`, `有效期 ${lt.validityYears} 年。`)}`;
    if (key === "proof_of_canadian_education_or_ECA") return `${T(l, `ECA valid ${eca.validityYears} years; designated organisations include`, `ECA ${eca.validityYears} yıl geçerlidir; belirlenmiş kuruluşlar arasında`, `ECA 有效期 ${eca.validityYears} 年；指定机构包括`)} ${eca.designatedGeneralOrganizations.join("; ")}.`;
    if (key === "police_certificates") return `${police.requiredFor.charAt(0).toUpperCase()}${police.requiredFor.slice(1)}. ${T(l, "Certificate for the current country of residence", "Mevcut ikamet ülkesi için belge", "现居国家的证明")}: ${police.currentCountryCertificateMaxAge}.`;
    if (key === "proof_of_funds") return T(l, "See “Settlement funds” under Costs.", "Maliyetler altındaki “Yerleşim fonu” bölümüne bakın.", "见“费用”中的“安家资金”。");
    return "";
  };
  const docRows = (EE.documentsRequired as string[]).map((k) => {
    const d = docLabel[k] ?? [k, k, k];
    return [T(l, ...d), docDetail(k) || "—", "Express Entry", `IRCC (${eeChecked})`];
  });
  const pd = PNP.documentsRequired as { fillInPortal: Array<{ form: string; name: string }>; downloadAndUpload: Array<{ form: string; name: string }>; conditionalForms: Array<{ form: string; name: string; condition: string }>; supportingDocuments: string[] };
  const docBlocks: Block[] = [
    table([T(l, "Document", "Belge", "文件"), T(l, "Detail", "Ayrıntı", "详情"), T(l, "Applies to", "Kimler için", "适用对象"), T(l, "Source and date", "Kaynak ve tarih", "来源与日期")], docRows, [0.26, 0.4, 0.14, 0.2]),
    { kind: "heading", text: T(l, "Provincial Nominee Program (non-Express Entry): forms", "Provincial Nominee Program (Express Entry dışı): formlar", "省提名计划（非快速通道）：表格") },
    table(
      [T(l, "Form", "Form", "表格"), T(l, "Name", "Ad", "名称"), T(l, "How it is used", "Kullanımı", "用途")],
      [
        ...pd.fillInPortal.map((f) => [f.form, f.name, T(l, "Completed in the portal", "Portalda doldurulur", "在门户中填写")]),
        ...pd.downloadAndUpload.map((f) => [f.form, f.name, T(l, "Downloaded and uploaded", "İndirilir ve yüklenir", "下载并上传")]),
        ...pd.conditionalForms.map((f) => [f.form, f.name, f.condition]),
      ],
      [0.2, 0.46, 0.34],
    ),
    { kind: "heading", text: T(l, "Supporting documents named by IRCC (non-Express Entry)", "IRCC'nin belirttiği destekleyici belgeler (Express Entry dışı)", "IRCC 列明的支持文件（非快速通道）") },
    { kind: "lines", lines: pd.supportingDocuments.map((d) => `• ${d}`) },
    { kind: "text", text: `${T(l, "Source", "Kaynak", "来源")}: IRCC (${pnpChecked}). ${T(l, "A document not in English or French needs a certified translation; the program pages state the detail.", "İngilizce veya Fransızca olmayan belge için yeminli çeviri gerekir; ayrıntı program sayfalarındadır.", "非英文或法文的文件需附认证翻译；详情见项目页面。")}` },
  ];
  sections.push({ id: "documents", title: reportSectionTitle("documents", l, "CA"), blocks: docBlocks });

  // ── 9. Sources ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const aip = caVisaDetail("canada-atlantic-immigration-program");
  const fam = caVisaDetail("canada-family-sponsorship");
  const sourceRows: string[][] = [
    [`${T(l, "Immigration, Refugees and Citizenship Canada (IRCC) — Express Entry", "Immigration, Refugees and Citizenship Canada (IRCC) — Express Entry", "加拿大移民、难民和公民部（IRCC）— 快速通道")}\n${(EE.sourceUrls as string[])[0]}`, T(l, "CEC, FSW and FSTP requirements, fees, documents, process", "CEC, FSW ve FSTP gereksinimleri, ücretler, belgeler, süreç", "CEC、FSW 和 FSTP 的要求、费用、文件、流程"), eeChecked],
    [`${T(l, "IRCC — CRS criteria", "IRCC — CRS ölçütleri", "IRCC — CRS 标准")}\n${(EE.sourceUrls as string[])[1]}`, T(l, "CRS factors, maximums and the factors calculated for you", "CRS faktörleri, üst sınırlar ve sizin için hesaplanan faktörler", "CRS 因素、上限及为您计算的因素"), eeChecked],
    [`${T(l, "IRCC — Provincial Nominee Program, non-Express Entry process", "IRCC — Provincial Nominee Program, Express Entry dışı süreç", "IRCC — 省提名计划（非快速通道流程）")}\n${PNP.sourceUrl}`, T(l, "Process, fees, forms and notices", "Süreç, ücretler, formlar ve notlar", "流程、费用、表格和提示"), pnpChecked],
    ...PROVINCES.map((p) => [`${T(l, `Government of ${p.name.en}`, `${p.name.tr} hükümeti`, `${p.name.zh}政府`)}\n${p.urls.join("\n")}`, T(l, `${p.name.en} nominee streams`, `${p.name.tr} aday akışları`, `${p.name.zh}提名通道`), longDate(p.verified, l)]),
    [`${T(l, "IRCC — Quebec-selected skilled workers (federal stage)", "IRCC — Quebec tarafından seçilen vasıflı çalışanlar (federal aşama)", "IRCC — 魁北克选定技术工人（联邦阶段）")}`, T(l, "Federal fee and processing time after a CSQ", "CSQ sonrası federal ücret ve işlem süresi", "获得 CSQ 后的联邦费用与处理时间"), longDate(QC_FEDERAL.lastVerified, l)],
    ...(aip?.officialUrl ? [[`${T(l, "IRCC — Atlantic Immigration Program", "IRCC — Atlantic Immigration Program", "IRCC — 大西洋移民计划")}\n${aip.officialUrl}`, T(l, "Program status, fees and processing time", "Program durumu, ücretler ve işlem süresi", "项目状态、费用和处理时间"), "—"]] : []),
    ...(fam?.officialUrl ? [[`${T(l, "IRCC — Sponsor your spouse, partner or child", "IRCC — Eşinizi, partnerinizi veya çocuğunuzu sponsor olun", "IRCC — 为配偶、伴侣或子女担保")}\n${fam.officialUrl}`, T(l, "Program status, fees and processing time", "Program durumu, ücretler ve işlem süresi", "项目状态、费用和处理时间"), "—"]] : []),
  ];
  const resources = getResourcesSection(l, "CA");
  const links = resources.sections.flatMap((s) => s.links.map((k) => `${k.label} — ${k.url}`));
  sections.push({
    id: "sources",
    title: reportSectionTitle("sources", l, "CA"),
    blocks: [
      table([T(l, "Source", "Kaynak", "来源"), T(l, "Used for", "Kullanıldığı yer", "用途"), T(l, "Checked", "Kontrol tarihi", "核对日期")], sourceRows, [0.58, 0.24, 0.18]),
      ...(links.length ? [{ kind: "heading", text: T(l, "Official resources", "Resmi kaynaklar", "官方资源") } as Block, { kind: "lines", lines: links } as Block] : []),
      { kind: "text", text: T(l, "This report is general information from published sources. It does not assess the applicant's own situation. For advice on your own situation, consult a licensed immigration consultant (RCIC) or a Canadian lawyer or paralegal authorised to practise immigration law.", "Bu rapor, yayımlanmış kaynaklardan genel bilgidir. Başvuru sahibinin kendi durumunu değerlendirmez. Kendi durumunuza ilişkin tavsiye için lisanslı bir göçmenlik danışmanına (RCIC) veya göçmenlik hukuku uygulamaya yetkili bir Kanadalı avukata ya da paralegale danışın.", "本报告是来自公开来源的一般信息，不评估申请人自身的情况。如需针对您自身情况的建议，请咨询持牌移民顾问（RCIC）或获授权执业移民法的加拿大律师或律师助理。") },
    ],
  });

  const disclaimer = canadaDisclaimer(l);
  return {
    locale: l,
    targetVisa: "not_sure",
    isNotSure: programs.length === 0,
    cover: {
      name: profile.name ?? "",
      dateText,
      occupation: profile.occupation ?? "",
      targetLine: `${T(l, "Program or topic", "Program veya konu", "项目或主题")}: ${topicLine}`,
      title: T(l, "LogiVisa Canada Immigration Information Report", "LogiVisa Kanada Göçmenlik Bilgi Raporu", "LogiVisa 加拿大移民信息报告"),
      label: T(l, "Information report · Canada", "Bilgi raporu · Kanada", "信息报告 · 加拿大"),
      subtitle: T(l, "Personalised Canadian immigration information report based on official sources", "Resmi kaynaklara dayalı kişiselleştirilmiş Kanada göçmenlik bilgi raporu", "基于官方来源的个性化加拿大移民信息报告"),
      notice: disclaimer,
    },
    sections,
    disclaimer,
  };
}
