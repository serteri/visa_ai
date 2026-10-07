/**
 * The remaining sections: SkillSelect invitation history (observed data only), the typical process of each pathway family with
 * published timeframes, the documents commonly requested, general factual points, and the sources register with dates.
 */
import eoiRounds from "@/src/data/eoi-rounds.json";
import feeProvenance from "@/src/data/fee-provenance.json";
import occupationsData from "@/src/data/occupations.json";
import visaFees from "@/src/data/visa-fees.json";
import visaGatesData from "@/src/data/visa-gates.json";
import visaTrends from "@/src/data/visa-trends.json";
import { ENGLISH_TEST_VALIDITY_YEARS } from "@/lib/readiness/constants";
import { publishedRequirements } from "@/lib/readiness/visa-gates";
import type { Locale, ReadinessReport } from "@/lib/readiness/types";
import { resolveAssessingAuthority } from "@/lib/skills-assessment/resolve-authority";
import { resolveLocalized } from "@/lib/skills-assessment/i18n";
import { VISA_ORDER, VisaKey, visaCharge } from "./report-visas";
import type { StateInfo } from "./report-states";
import { T, money } from "./report-text";

// ── invitation history ─────────────────────────────────────────────────────────────────────────────

type Round = { id: string; date: string; visaSubclass: string; visaName: string; invitations: number | null; lowestPoints: number | null; notes: string | null; isEstimated: boolean; source: string };
const ROUNDS = (eoiRounds as unknown as { lastUpdated: string; rounds: Round[] });

export type InvitationInfo = { intro: string; headers: string[]; rows: string[][]; stateNote: string; note: string };

export function buildInvitationInfo(l: Locale): InvitationInfo {
  const rows = ROUNDS.rounds
    .filter((r) => !r.isEstimated)
    .sort((a, b) => (a.date === b.date ? a.visaSubclass.localeCompare(b.visaSubclass) : a.date.localeCompare(b.date)))
    .map((r) => [
      r.date,
      T(l, `Subclass ${r.visaSubclass}`, `Subclass ${r.visaSubclass}`, `${r.visaSubclass} 子类`),
      r.invitations === null ? "—" : r.invitations.toLocaleString("en-AU"),
      r.lowestPoints === null ? T(l, "not recorded", "kaydedilmedi", "未记录") : String(r.lowestPoints),
      r.notes ?? "—",
      `${r.source}; ${T(l, "data dated", "veri tarihi", "数据日期")} ${ROUNDS.lastUpdated}`,
    ]);
  return {
    intro: T(l, "SkillSelect invitation rounds recorded in our data, as published by the Department of Home Affairs. Only observed rounds are listed: no forecast, estimate or waiting time is shown.", "Verilerimizde kayıtlı SkillSelect davet turları, İçişleri Bakanlığı tarafından yayımlandığı şekliyle. Yalnızca gözlenen turlar listelenir: tahmin, öngörü veya bekleme süresi gösterilmez.", "我们数据中记录的 SkillSelect 邀请轮次，按澳大利亚内政部公布内容。仅列出已观察到的轮次：不显示预测、估算或等待时间。"),
    headers: [T(l, "Round date", "Tur tarihi", "轮次日期"), T(l, "Visa", "Vize", "签证"), T(l, "Invitations", "Davet sayısı", "邀请数"), T(l, "Lowest points invited", "Davet edilen en düşük puan", "最低受邀分数"), T(l, "Notes", "Notlar", "备注"), T(l, "Source and date", "Kaynak ve tarih", "来源与日期")],
    rows,
    stateNote: T(l, "State and territory invitation, allocation and registration information is listed with each state or territory above.", "Eyalet ve bölge davet, kontenjan ve kayıt bilgileri yukarıda her eyalet veya bölgenin altında listelenmiştir.", "各州和领地的邀请、配额和登记信息列于上方各州或领地条目下。"),
    note: T(l, "The recent invitation level shown for each points-tested visa is the figure recorded in our data for the occupation entered, with its data date.", "Her puan testli vize için gösterilen son davet seviyesi, girilen meslek için verilerimizde kayıtlı rakamdır ve veri tarihiyle verilmiştir.", "每种积分测试签证所示的近期邀请分是我们数据中为所填职业记录的数字，并附数据日期。"),
  };
}

// ── typical process by pathway family ───────────────────────────────────────────────────────────────

export type ProcessFamily = { title: string; applies: string; rows: Array<[string, string, string]> };

export function buildProcessInfo(report: ReadinessReport, occupationRaw: string | undefined, l: Locale): ProcessFamily[] {
  const cite = (visa: string, suffix: string) => publishedRequirements(visa, null, l).find((g) => g.id.endsWith(suffix))?.citation ?? publishedRequirements(visa, null, l)[0]?.citation ?? "Home Affairs";
  const resolved = occupationRaw ? resolveAssessingAuthority(occupationRaw) : undefined;
  const auth = resolved?.authority;
  const pathway = auth?.pathways?.find((p) => p.processingTimeWeeks || p.processingNotStated);
  const procText = pathway?.processingTimeWeeks?.label ? resolveLocalized(pathway.processingTimeWeeks.label, l) : pathway?.processingTimeWeeks?.standard !== undefined ? T(l, `${pathway.processingTimeWeeks.standard} weeks`, `${pathway.processingTimeWeeks.standard} hafta`, `${pathway.processingTimeWeeks.standard} 周`) : T(l, "not stated by the authority", "kurum tarafından belirtilmemiş", "机构未说明");
  const skills = (visa: string): [string, string, string] => [
    T(l, "Skills assessment", "Beceri değerlendirmesi", "技能评估"),
    auth
      ? T(l, `Carried out by ${auth.authorityName} for the occupation entered. Processing time as the authority states it: ${procText}.`, `Girilen meslek için ${auth.authorityName} tarafından yapılır. Kurumun belirttiği işlem süresi: ${procText}.`, `由 ${auth.authorityName} 针对所填职业进行。机构说明的处理时间：${procText}。`)
      : T(l, "Carried out by the assessing authority for the occupation; its published processing time applies.", "Meslek için değerlendirme kurumu tarafından yapılır; kurumun yayımladığı işlem süresi geçerlidir.", "由该职业的评估机构进行；适用机构公布的处理时间。"),
    auth?.sourceDocument ? `${auth.authorityName}: ${auth.sourceDocument}` : cite(visa, "skills_assessment"),
  ];
  const english = (visa: string): [string, string, string] => [
    T(l, "English language test", "İngilizce dil sınavı", "英语语言考试"),
    T(l, "An approved test result in the bands the visa uses (Competent, Proficient, Superior). The accepted tests and how long a result counts are set by the Department of Home Affairs.", "Vizenin kullandığı bantlarda onaylı bir sınav sonucu (Competent, Proficient, Superior). Kabul edilen sınavlar ve sonucun geçerlilik süresi İçişleri Bakanlığı tarafından belirlenir.", "达到签证所用等级（Competent、Proficient、Superior）的认可考试成绩。认可的考试及成绩有效期由澳大利亚内政部规定。"),
    cite(visa, "english"),
  ];
  const healthPolice = (): [string, string, string] => [
    T(l, "Police certificates and health examination", "Adli sicil belgeleri ve sağlık muayenesi", "无犯罪记录证明与体检"),
    T(l, "The Australian Federal Police certificate is processed online within 15 business days and is valid for 12 months; overseas police certificates take 4-12 weeks. The health examination is through Bupa Medical Visa Services; results are valid for 12 months, and 6-12 months longer where extra chest monitoring is required.", "Avustralya Federal Polisi (AFP) belgesi 15 iş günü içinde çevrimiçi işlenir ve 12 ay geçerlidir; yurt dışı adli sicil belgeleri 4-12 hafta sürer. Sağlık muayenesi Bupa Medical Visa Services aracılığıyla yapılır; sonuçlar 12 ay geçerlidir, ek akciğer takibi gerekirse 6-12 ay daha uzayabilir.", "澳大利亚联邦警察（AFP）证明在线办理，15 个工作日内完成，有效期 12 个月；海外无犯罪记录证明需 4-12 周。体检通过 Bupa Medical Visa Services 进行，结果有效期 12 个月；如需额外胸部复查，可能再延长 6-12 个月。"),
    "Home Affairs; Australian Federal Police; Bupa Medical Visa Services",
  ];
  const decision = (visa: string): [string, string, string] => [
    T(l, "Decision", "Karar", "审理决定"),
    T(l, "Processing times vary; the Department of Home Affairs publishes a processing time guide for each visa.", "İşlem süreleri değişir; İçişleri Bakanlığı her vize için bir işlem süresi rehberi yayımlar.", "处理时间因案而异；澳大利亚内政部为每种签证公布处理时间指南。"),
    cite(visa, ""),
  ];
  const lodge = (visa: VisaKey, extra: string): [string, string, string] => {
    const c = visaCharge(visa);
    const charge = c.main === null ? "" : T(l, `Base application charge: AUD ${money(c.main)}. `, `Temel başvuru ücreti: AUD ${money(c.main)}. `, `基本申请费：AUD ${money(c.main)}。`);
    return [T(l, "Visa application", "Vize başvurusu", "递交签证申请"), `${charge}${extra}`.trim(), cite(visa === "820" ? "820" : visa === "186DE" || visa === "186TRT" ? "186" : visa, "")];
  };

  return [
    {
      title: T(l, "Points-tested skilled pathways (189, 190, 491)", "Puan testli nitelikli göç yolları (189, 190, 491)", "积分测试技术移民路径（189、190、491）"),
      applies: "189, 190, 491",
      rows: [
        skills("189"),
        [T(l, "Expression of Interest (EOI)", "İlgi Beyanı (EOI)", "意向书（EOI）"), T(l, "An EOI in SkillSelect records the details the points test uses. Invitations are issued in rounds.", "SkillSelect'teki bir EOI, puan testinin kullandığı bilgileri kaydeder. Davetler turlar halinde verilir.", "SkillSelect 中的 EOI 记录积分测试所用信息。邀请按轮次发出。"), cite("189", "invitation")],
        [T(l, "State or territory nomination (190, 491)", "Eyalet veya bölge adaylığı (190, 491)", "州或领地提名（190、491）"), T(l, "A state or territory nominates through its own program, with its own conditions (see the state and territory section).", "Eyalet veya bölge, kendi koşullarına sahip kendi programı aracılığıyla aday gösterir (bkz. eyalet ve bölge bölümü).", "州或领地通过其自身项目和条件提名（见州和领地部分）。"), cite("491", "nomination")],
        lodge("189", T(l, "The application is lodged within 60 days of the invitation.", "Başvuru, davetten sonraki 60 gün içinde yapılır.", "须在获邀后 60 天内递交申请。")),
      ],
    },
    {
      title: T(l, "Employer-sponsored pathways (482, 186)", "İşveren sponsorlu yollar (482, 186)", "雇主担保路径（482、186）"),
      applies: "482, 186",
      rows: [
        [T(l, "Employer sponsorship and nomination", "İşveren sponsorluğu ve adaylığı", "雇主担保与提名"), T(l, "The employer is approved as a sponsor and nominates the position; the published requirements are in each visa's entry above.", "İşveren sponsor olarak onaylanır ve pozisyonu aday gösterir; yayımlanmış gereklilikler yukarıda her vizenin altında listelenmiştir.", "雇主获批成为担保方并提名该职位；已公布的要求见上方各签证条目。"), cite("482", "sponsor")],
        skills("482"),
        lodge("482", T(l, "Subclass 186 has its own charge, listed with its entry.", "Subclass 186'nın kendi ücreti vardır ve kendi bölümünde listelenmiştir.", "186 子类有其单独费用，列于其条目中。")),
      ],
    },
    {
      title: T(l, "Student and graduate pathways (500, 485)", "Öğrenci ve mezun yolları (500, 485)", "学生与毕业生路径（500、485）"),
      applies: "500, 485",
      rows: [
        [T(l, "Enrolment (500)", "Kayıt (500)", "入学（500）"), T(l, "A Confirmation of Enrolment (CoE) from the education provider, and Overseas Student Health Cover (OSHC) unless exempt.", "Eğitim sağlayıcısından Kayıt Teyidi (CoE) ve muafiyet yoksa Yurt Dışı Öğrenci Sağlık Sigortası (OSHC).", "教育机构出具的录取确认书（CoE），以及海外学生健康保险（OSHC），除非获豁免。"), cite("500", "enrolment")],
        lodge("500", ""),
        [T(l, "Study completed (485)", "Eğitimin tamamlanması (485)", "完成学业（485）"), T(l, "An eligible qualification from a CRICOS-registered Australian provider, awarded in the period Home Affairs sets.", "CRICOS kayıtlı bir Avustralya sağlayıcısından, İçişleri Bakanlığı'nın belirlediği dönemde verilmiş uygun bir yeterlilik.", "来自 CRICOS 注册澳大利亚院校、在内政部规定期限内取得的合资格学历。"), cite("485", "eligible_degree")],
        lodge("485", ""),
      ],
    },
    {
      title: T(l, "Partner pathway (820/801)", "Partner yolu (820/801)", "伴侣路径（820/801）"),
      applies: "820/801",
      rows: [
        [T(l, "Relationship and sponsorship", "İlişki ve sponsorluk", "关系与担保"), T(l, "The partner sponsors the application; the published requirements are in the entry above. This report does not assess a relationship.", "Partner başvuruya sponsor olur; yayımlanmış gereklilikler yukarıdaki bölümdedir. Bu rapor bir ilişkiyi değerlendirmez.", "伴侣为申请提供担保；已公布的要求见上方条目。本报告不评估关系。"), cite("820", "sponsor")],
        lodge("820", T(l, "The charge covers both the 820 and the 801 stages.", "Ücret hem 820 hem 801 aşamasını kapsar.", "该费用涵盖 820 和 801 两个阶段。")),
      ],
    },
    {
      title: T(l, "Steps common to every pathway", "Tüm yollar için ortak adımlar", "各路径共同步骤"),
      applies: "189, 190, 491, 482, 186, 485, 500, 820/801",
      rows: [english("189"), healthPolice(), decision("189")],
    },
  ];
}

// ── documents and general points ───────────────────────────────────────────────────────────────────

export type DocumentsInfo = { headers: string[]; rows: string[][]; extraHeaders: string[]; extra: string[][]; pointsTitle: string; pointsHeaders: string[]; points: string[][] };

export function buildDocumentsInfo(report: ReadinessReport, l: Locale): DocumentsInfo {
  const appliesTo = ["189, 190, 491, 482, 500, 485, 820/801", "189, 190, 491, 482, 500, 485", "189, 190, 491, 482, 485", "189, 190, 491, 482, 500, 485, 820/801"];
  const checklist = (report.documentChecklist ?? []).filter((d) => !/^\s*(CRITICAL|KRİTİK|关键|PRIORITY|WARNING)/i.test(d.category));
  const rows = checklist.map((d, i) => [d.category, d.items.join("; "), appliesTo[i] ?? "—", T(l, "Department of Home Affairs and assessing-authority requirements", "İçişleri Bakanlığı ve değerlendirme kurumu gereklilikleri", "澳大利亚内政部及评估机构要求")]);
  const extra: string[][] = [
    ["189, 190, 491", T(l, "Skills assessment outcome letter; SkillSelect EOI and invitation reference", "Beceri değerlendirmesi sonuç mektubu; SkillSelect EOI ve davet referansı", "技能评估结果信；SkillSelect EOI 及邀请编号"), "Home Affairs"],
    ["482, 186", T(l, "Employer nomination and sponsorship documents; skills assessment where required", "İşveren adaylık ve sponsorluk belgeleri; gerekiyorsa beceri değerlendirmesi", "雇主提名与担保文件；如需要，技能评估"), "Home Affairs"],
    ["500", T(l, "Confirmation of Enrolment (CoE); Overseas Student Health Cover (OSHC) evidence", "Kayıt Teyidi (CoE); Yurt Dışı Öğrenci Sağlık Sigortası (OSHC) kanıtı", "录取确认书（CoE）；海外学生健康保险（OSHC）凭证"), "Home Affairs"],
    ["485", T(l, "Evidence of the completed qualification and its award date; English test result", "Tamamlanan yeterliliğin ve verilme tarihinin kanıtı; İngilizce sınav sonucu", "已完成学历及授予日期的证明；英语成绩"), "Home Affairs"],
    ["820/801", T(l, "The relationship and sponsorship documents are listed on the Department of Home Affairs Partner visa pages; this report does not list or assess evidence of a relationship.", "İlişki ve sponsorluk belgeleri İçişleri Bakanlığı Partner vizesi sayfalarında listelenir; bu rapor bir ilişkiye ait kanıtları listelemez veya değerlendirmez.", "关系与担保文件列于澳大利亚内政部伴侣签证页面；本报告不列出或评估关系证据。"), "Home Affairs"],
  ];
  const years = ENGLISH_TEST_VALIDITY_YEARS.AU;
  const points: string[][] = [
    [T(l, "The invitation-to-application window is 60 days; the deadline cannot be extended.", "Davetten başvuruya kadar süre 60 gündür; son tarih uzatılamaz.", "从邀请到递交申请的期限为 60 天，不能延长。"), "Home Affairs, skilled visa invitations"],
    [T(l, `The English test result must have been taken within the ${years} years before the visa application is lodged.`, `İngilizce sınav sonucu, vize başvurusunun yapılmasından önceki ${years} yıl içinde alınmış olmalıdır.`, `英语成绩须在递交签证申请前 ${years} 年内取得。`), publishedRequirements("189", null, l).find((g) => g.id.endsWith("english"))?.citation ?? "Home Affairs"],
    [T(l, "A skills assessment cannot have been issued more than 3 years before the application; an assessment obtained for a subclass 485 visa is not accepted for subclass 186.", "Beceri değerlendirmesi başvurudan 3 yıldan daha önce verilmiş olamaz; 485 vizesi için alınan değerlendirme subclass 186 için kabul edilmez.", "技能评估的签发时间不得早于申请前 3 年；为 485 签证取得的评估不被 186 子类接受。"), "Home Affairs, Subclass 186 page"],
    [T(l, "Health examinations are accepted only from panel physicians approved by the Department of Home Affairs.", "Sağlık muayeneleri yalnızca İçişleri Bakanlığı tarafından onaylı panel hekimlerinden kabul edilir.", "仅接受澳大利亚内政部认可的指定医生所做的体检。"), "Department of Home Affairs, health examinations"],
    [T(l, "Subclasses 189, 190 and 491 have no federal settlement-funds requirement; some state programs state funds guidance of their own (see the state entries).", "Subclass 189, 190 ve 491 için federal yerleşim fonu şartı yoktur; bazı eyalet programları kendi fon rehberliğini belirtir (bkz. eyalet bölümleri).", "189、190、491 子类没有联邦层面的安家资金要求；部分州项目有自己的资金指引（见各州条目）。"), "Home Affairs; state program documents"],
    [T(l, "Providing false or misleading information or documents can lead to refusal under the public interest criteria.", "Yanlış veya yanıltıcı bilgi ya da belge sunmak, kamu yararı kriterleri uyarınca reddedilmeye yol açabilir.", "提供虚假或误导性信息或文件，可能依据公共利益标准导致拒签。"), "Department of Home Affairs, public interest criterion 4020"],
  ];
  return {
    headers: [T(l, "Category", "Kategori", "类别"), T(l, "Documents commonly requested", "Sık istenen belgeler", "常见所需文件"), T(l, "Applies to", "Geçerli olduğu vizeler", "适用签证"), T(l, "Source", "Kaynak", "来源")],
    rows,
    extraHeaders: [T(l, "Pathway", "Yol", "路径"), T(l, "Additional documents commonly requested", "Ek olarak sık istenen belgeler", "另常见所需文件"), T(l, "Source", "Kaynak", "来源")],
    extra,
    pointsTitle: T(l, "General points, stated as published", "Genel noktalar, yayımlandığı şekliyle", "一般事项（按已公布内容）"),
    pointsHeaders: [T(l, "Statement", "İfade", "内容"), T(l, "Source", "Kaynak", "来源")],
    points,
  };
}

// ── sources register ──────────────────────────────────────────────────────────────────────────────

export type SourceRow = [string, string, string];

export function buildSources(report: ReadinessReport, occupationRaw: string | undefined, states: StateInfo[], l: Locale): SourceRow[] {
  const gates = (visaGatesData as unknown as { _provenance: { last_verified: string; documents: Record<string, string> } })._provenance;
  const feeFacts = (feeProvenance as unknown as { facts: Array<{ id: string; last_verified?: string | null }> }).facts;
  const feeDate = feeFacts.filter((f) => f.id.startsWith("vac_") && f.last_verified).map((f) => f.last_verified as string).sort().at(-1) ?? "";
  const auth = occupationRaw ? resolveAssessingAuthority(occupationRaw).authority : undefined;
  const out: SourceRow[] = [];
  out.push([T(l, "Visa requirements: Department of Home Affairs visa pages (subclasses 189, 190, 491, 482, 485, 500, 186, 820/801)", "Vize gereklilikleri: İçişleri Bakanlığı vize sayfaları (subclass 189, 190, 491, 482, 485, 500, 186, 820/801)", "签证要求：内政部签证页面（189、190、491、482、485、500、186、820/801 子类）"), T(l, "Visa information, requirement maps", "Vize bilgileri, gereklilik tabloları", "签证信息、要求对照"), gates.last_verified]);
  out.push([T(l, "Visa application charges: Department of Home Affairs fee schedule effective 1 July 2026 (our fee data)", "Vize başvuru ücretleri: 1 Temmuz 2026 itibarıyla İçişleri Bakanlığı ücret tarifesi (ücret verilerimiz)", "签证申请费：自 2026 年 7 月 1 日起生效的内政部收费表（我们的费用数据）"), T(l, "Government charges, sums", "Devlet ücretleri, toplamlar", "政府费用、合计"), feeDate || (visaFees as unknown as { generated_on: string }).generated_on]);
  out.push([T(l, "Cost estimates (English tests, health, police, translations, professional services): our cost data", "Maliyet tahminleri (İngilizce sınavları, sağlık, adli sicil, çeviri, profesyonel hizmetler): maliyet verilerimiz", "费用估算（英语考试、体检、无犯罪记录、翻译、专业服务）：我们的费用数据"), T(l, "Other listed items", "Listelenen diğer kalemler", "其他列出的项目"), (visaFees as unknown as { generated_on: string }).generated_on]);
  if (auth) out.push([`${auth.authorityName}: ${auth.sourceDocument ?? ""}`.trim(), T(l, "Assessing authority fees and processing time", "Değerlendirme kurumu ücretleri ve işlem süresi", "评估机构费用与处理时间"), auth.lastVerified ?? "—"]);
  for (const s of states) out.push([`${s.name}: ${s.sources}`, T(l, "State and territory program information", "Eyalet ve bölge programı bilgileri", "各州和领地项目信息"), s.checked || "—"]);
  out.push([T(l, "SkillSelect invitation rounds: Department of Home Affairs (our round data)", "SkillSelect davet turları: İçişleri Bakanlığı (tur verilerimiz)", "SkillSelect 邀请轮次：内政部（我们的轮次数据）"), T(l, "Invitation history", "Davet geçmişi", "邀请历史"), ROUNDS.lastUpdated]);
  const trends = visaTrends as unknown as { generated_on: string; methodology_note: string };
  out.push([T(l, `Recent invitation levels by occupation: our trend data (the data file describes them as estimates derived from 2025-2026 trend patterns)`, `Mesleğe göre son davet seviyeleri: eğilim verilerimiz (veri dosyası bunları 2025-2026 eğilim örüntülerinden türetilmiş tahminler olarak tanımlar)`, `按职业的近期邀请分：我们的趋势数据（数据文件将其描述为根据 2025-2026 趋势推导的估算）`), T(l, "Recent invitation level in each points-tested visa entry", "Her puan testli vize bölümündeki son davet seviyesi", "各积分测试签证条目中的近期邀请分"), trends.generated_on]);
  out.push([T(l, "Occupation lists: our occupation dataset (list placement should be re-validated against the current legislative instrument)", "Meslek listeleri: meslek veri setimiz (liste yerleşimi güncel mevzuat belgesine karşı yeniden doğrulanmalıdır)", "职业清单：我们的职业数据集（清单归属应对照现行法律文书重新核对）"), T(l, "Occupation-list results", "Meslek listesi sonuçları", "职业清单结果"), (occupationsData as unknown as { generated_on: string }).generated_on]);
  void report;
  return out;
}

export const sourcesHeaders = (l: Locale): string[] => [T(l, "Source", "Kaynak", "来源"), T(l, "Used for", "Kullanıldığı yer", "用途"), T(l, "Data date", "Veri tarihi", "数据日期")];

export const agentStatement = (l: Locale) =>
  T(
    l,
    "This report is general information from published sources. It does not assess the applicant's own situation. For advice on your own situation, consult a registered migration agent or an Australian legal practitioner.",
    "Bu rapor, yayımlanmış kaynaklardan genel bilgidir. Başvuru sahibinin kendi durumunu değerlendirmez. Kendi durumunuza ilişkin tavsiye için kayıtlı bir göçmenlik danışmanına (registered migration agent) veya bir Avustralya hukuk uzmanına başvurun.",
    "本报告是来自公开来源的一般信息，不评估申请人自身的情况。如需针对您自身情况的建议，请咨询注册移民代理或澳大利亚执业法律人士。",
  );
