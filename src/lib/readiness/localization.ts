import type { Locale } from "@/lib/readiness/types";

const textMap: Record<string, { tr?: string; zh?: string }> = {
  "Identity": { tr: "Kimlik", zh: "身份" },
  "English": { tr: "Dil", zh: "英语" },
  "Skills": { tr: "Mesleki Yeterlilik", zh: "技能" },
  "Spouse/Family": { tr: "Eş/Aile", zh: "配偶/家庭" },
  "CRITICAL": { tr: "KRİTİK", zh: "关键" },
  "Passport (6+ months validity)": { tr: "Pasaport (en az 6 ay geçerli)", zh: "护照（有效期至少 6 个月）" },
  "Birth Certificate (NAATI translated)": { tr: "Doğum belgesi (NAATI çevirili)", zh: "出生证明（NAATI 认证翻译）" },
  "Test Results (Less than 2 years old)": { tr: "Sınav sonucu (2 yıldan eski olmamalı)", zh: "语言成绩（2 年内）" },
  "Degree Certificates": { tr: "Diploma belgeleri", zh: "学历证书" },
  "Academic Transcripts": { tr: "Transkript", zh: "成绩单" },
  "Employment References (aligned with Authority rules)": {
    tr: "İş referansları (inceleme kurumu kurallarıyla uyumlu)",
    zh: "工作证明（符合评估机构规则）",
  },
  "Marriage Certificate": { tr: "Evlilik cüzdanı/belgesi", zh: "结婚证" },
  "Evidence of de-facto (if applicable)": { tr: "Fiili birliktelik kanıtları (varsa)", zh: "事实婚姻证明（如适用）" },
  "Spouse English evidence": { tr: "Eşin dil kanıtı", zh: "配偶英语证明" },
  "English evidence": { zh: "英语能力证明" },
  "Occupation details": { zh: "职业细节" },
  "Skills assessment": { zh: "职业评估" },
  "Identity documents": { zh: "身份证明文件" },
  "Points table position": { zh: "打分项定位" },
  "Relationship evidence": { zh: "关系证明材料" },
  "Sponsor evidence": { zh: "担保人资料" },
  "Government application charge": { zh: "政府签证申请费" },
  "Health checks / police certificates": { zh: "体检与无犯罪证明" },
  "Phase 1: Preparation": { zh: "第一阶段：准备工作" },
  "Phase 2: Assessment": { zh: "第二阶段：职业评估" },
  "Phase 3: EOI and Nomination": { zh: "第三阶段：意向书与提名" },
  "Phase 4: Lodgement": { zh: "第四阶段：递交准备" },
  "Skills-assessment evidence is the primary data variable when occupation data is missing.": {
    tr: "Meslek verisi eksik olduğunda skills-assessment kanıtı birincil veri değişkenidir.",
    zh: "当职业数据缺失时，技能评估证据是主要数据变量。",
  },
  "months": { tr: "ay", zh: "个月" },
  "Trend estimates are analytical planning references only and do not guarantee invitation outcomes.": {
    tr: "Trend tahminleri yalnızca planlama amaçlıdır ve davet sonucu garanti etmez.",
    zh: "趋势估算仅供规划参考，不保证获邀结果。",
  },
  "Express Entry and PNP trend estimates are scenario-based planning references derived from profile signals and timeline assumptions; they are not invitation guarantees.": {
    tr: "Express Entry ve PNP trend tahminleri, profil sinyalleri ile zamanlama varsayımlarından türetilen senaryo bazlı planlama referanslarıdır; davet garantisi vermez.",
    zh: "Express Entry 与 PNP 趋势估算基于档案信号和时间线假设得出，仅为情景规划参考，不保证获邀。",
  },
  "Living cost projections are indicative monthly planning estimates and may vary by suburb and lifestyle.": {
    tr: "Yaşam maliyeti projeksiyonları aylık planlama tahminidir; bölge ve yaşam tarzına göre değişebilir.",
    zh: "生活成本预测为月度规划估算，可能因区域与生活方式而变化。",
  },
  "Canadian monthly cost projection reflects city-level baseline assumptions for rent, groceries, and transport and should be adjusted for neighborhood and lifestyle.": {
    tr: "Kanada aylık maliyet projeksiyonu; kira, market ve ulaşım için şehir düzeyindeki temel varsayımları yansıtır ve semt ile yaşam tarzına göre uyarlanmalıdır.",
    zh: "加拿大月度生活成本预测基于城市层面的租金、食品杂货和交通基线假设，应按社区与生活方式调整。",
  },
  "Monthly estimates for rent, groceries, and transport by city and household profile. Planning context only.": {
    zh: "按城市和家庭类型估算月租、食品杂货和交通成本，仅供规划参考。",
  },
  "Reference data only - pathway eligibility is not yet confirmed (missing profile details or occupation verification).": {
    tr: "Yalnızca referans verisi - yol uygunluğu henüz doğrulanmadı (profil ayrıntıları veya meslek doğrulaması eksik).",
    zh: "仅供参考数据 - 路径资格尚未确认（缺少档案细节或职业核验）。",
  },
  "0-6 months": { tr: "0-6 ay", zh: "0-6 个月" },
  "6-12 months": { tr: "6-12 ay", zh: "6-12 个月" },
  "12+ months": { tr: "12+ ay", zh: "12 个月以上" },
  "Weeks 1-6": { tr: "1-6. haftalar", zh: "第 1-6 周" },
  "Weeks 4-10": { tr: "4-10. haftalar", zh: "第 4-10 周" },
  "Weeks 8-16": { tr: "8-16. haftalar", zh: "第 8-16 周" },
  "Weeks 16-24": { tr: "16-24. haftalar", zh: "第 16-24 周" },
  "Months 1-3": { tr: "1-3. aylar", zh: "第 1-3 个月" },
  "Months 2-5": { tr: "2-5. aylar", zh: "第 2-5 个月" },
  "Months 4-8": { tr: "4-8. aylar", zh: "第 4-8 个月" },
  "Months 8-12": { tr: "8-12. aylar", zh: "第 8-12 个月" },
  "Quarter 1": { tr: "1. çeyrek", zh: "第 1 季度" },
  "Quarter 2": { tr: "2. çeyrek", zh: "第 2 季度" },
  "Quarter 3": { tr: "3. çeyrek", zh: "第 3 季度" },
  "Quarter 4": { tr: "4. çeyrek", zh: "第 4 季度" },
  "Single": { zh: "单人" },
  "Couple": { zh: "夫妻/伴侣" },
  "Family of 4": { zh: "四口之家" },
  "Estimated invitation points and wait windows derived from 2025-2026 trend patterns. For planning context only.": {
    tr: "Tahmini davet puanları ve bekleme pencereleri 2025-2026 trendlerinden türetilmiştir. Yalnızca planlama bağlamındadır.",
    zh: "预计邀请分数与等待窗口基于 2025-2026 趋势推导，仅供规划参考。",
  },
  "ACS deducted experience may reduce claimed skilled years.": {
    tr: "ACS deneyim kesintisi, beyan edilen nitelikli yıl sayısını azaltabilir.",
    zh: "ACS 经验扣减可能减少可申报的技术年限。",
  },
  "VETASSESS assessments are sensitive to direct professional scope alignment; roles diverging from the defined scope may not satisfy assessment criteria.": {
    tr: "VETASSESS incelemeleri doğrudan mesleki kapsam uyumuna duyarlıdır; tanımlı kapsamdan sapan roller inceleme kriterlerini karşılamayabilir.",
    zh: "VETASSESS 评估对职业范围的直接匹配较为敏感；偏离既定范围的岗位可能无法满足评估标准。",
  },
  "English Test Signal Window": { zh: "英语信号时间窗口" },
  "Skills Assessment Evidence Window": { zh: "技能评估证据时间窗口" },
  "EOI and State-Interest Window": { zh: "EOI 与州提名意向窗口" },
  "Application Readiness Window": { zh: "申请准备时间窗口" },
  "English Score Development Window": { zh: "英语分数发展窗口" },
  "Skills Assessment and Experience Window": { zh: "技能评估与经验窗口" },
  "EOI and Nomination Window": { zh: "EOI 与提名窗口" },
  "Application Assembly Window": { zh: "申请材料汇总窗口" },
  "Foundation Window: English and Documentation": { zh: "基础窗口：英语与材料" },
  "Skills Assessment and Career Evidence Window": { zh: "技能评估与职业证据窗口" },
  "EOI and Invitation-Cycle Window": { zh: "EOI 与邀请周期窗口" },
  "Application and Post-Application Window": { zh: "申请及申请后管理窗口" },
  "This period typically captures exam booking, score-cycle timing, and English-result availability as model inputs.": {
    zh: "该时间窗口通常捕捉考试预约、分数周期时间节点和英语成绩可用性等模型输入。",
  },
  "This period usually concentrates reference structure, duties mapping, and qualification documents into the assessment dataset.": {
    zh: "该时间窗口通常将推荐信结构、职责映射和学历文件整合进评估数据集。",
  },
  "This period typically reflects when EOI variables and state-interest signals begin to interact in the comparison model.": {
    zh: "该时间窗口通常反映 EOI 变量与州提名意向信号在比较模型中开始交互的时期。",
  },
  "This period usually captures health, police, and identity-document completeness as readiness variables.": {
    zh: "该时间窗口通常将体检、无犯罪证明和身份文件完整性作为准备度变量纳入。",
  },
  "This window often determines whether higher English-score bands enter the points model.": {
    zh: "该窗口通常决定更高英语分数区间是否进入打分模型。",
  },
  "This window typically consolidates assessment timing with work-history evidence depth and classification.": {
    zh: "该窗口通常将评估时间节点与工作经历证据深度和分类整合。",
  },
  "This window usually captures EOI signal changes, invitation-round movement, and nomination-linked variables.": {
    zh: "该窗口通常捕捉 EOI 信号变化、邀请轮次动态和提名相关变量。",
  },
  "This window generally reflects how quickly the profile can convert into a complete application-ready evidence set.": {
    zh: "该窗口通常反映档案可以多快转化为完整的申请就绪证据集。",
  },
  "This quarter usually establishes the baseline profile and document-control variables used across later comparisons.": {
    zh: "该季度通常建立基础档案和材料管控变量，用于后续比较。",
  },
  "This quarter typically aligns qualification proof and role-scope evidence with assessment-authority criteria.": {
    zh: "该季度通常将学历证明和岗位范围证据与评估机构标准对齐。",
  },
  "This quarter usually captures invitation-cycle movement and state or federal demand signals as comparison inputs.": {
    zh: "该季度通常将邀请周期动态和州或联邦需求信号作为比较输入。",
  },
  "This quarter typically reflects submission completeness and response-readiness variables after application lodgement.": {
    zh: "该季度通常反映申请递交后的递交完整性和响应准备度变量。",
  },
  "Profile Foundation & English": { tr: "Profil Temeli ve Dil", zh: "档案基础与英语" },
  "Skills Validation": { tr: "Yetenek Doğrulama", zh: "技能核验" },
  "EOI Strategy": { tr: "EOI Stratejisi", zh: "EOI 策略" },
  "Visa Lodgement & Processing": { tr: "Vize Başvurusu ve İşlem", zh: "签证递交与审理" },
  "Profile Foundation & 485 Bridge": { tr: "Profil Temeli ve 485 Köprüsü", zh: "档案基础与 485 过渡" },
  "Skills Validation & 485 Work-Experience Window": {
    tr: "Yetenek Doğrulama ve 485 İş Deneyimi Penceresi",
    zh: "技能核验与 485 工作经验窗口",
  },
  "Establish baseline points, finalize highest possible English language testing, and gather core identity documents.": {
    tr: "Temel puan düzeyini belirleyin, ulaşılabilecek en yüksek dil sınav sonucunu hedefleyin ve temel kimlik belgelerini toplayın.",
    zh: "建立基础分数水平，完成可达到的最高英语成绩，并准备核心身份证明材料。",
  },
  "Submit Expression of Interest (EOI) targeting 190 and 491 state nomination pathways based on current quota allocations.": {
    tr: "Mevcut kontenjan dağılımlarına göre 190 ve 491 eyalet adaylığı yollarını hedefleyen EOI başvurusunu gönderin.",
    zh: "根据当前配额分配，提交针对 190 和 491 州提名路径的 EOI。",
  },
  "Finalize character/police clearances and medicals immediately upon receiving an Invitation to Apply (ITA).": {
    tr: "Invitation to Apply (ITA) alır almaz karakter/polis kontrolleri ile sağlık işlemlerini hızla tamamlayın.",
    zh: "收到 Invitation to Apply (ITA) 后，立即完成无犯罪与体检流程。",
  },
  "Bridge to PR (Subclass 485): Utilize your Temporary Graduate Visa timeline (Post-Higher Education or Post-Vocational stream) to accumulate crucial Australian work experience and bridge the gap toward state nomination requirements. Keep English testing and identity documents aligned with the 485-to-190/491 transition plan.": {
    tr: "PR köprüsü (Subclass 485): Geçici Mezun Vizesi sürecinizi (Post-Higher Education veya Post-Vocational) kritik Avustralya iş deneyimi biriktirmek ve eyalet adaylığı şartlarına yaklaşmak için kullanın. Dil sınavı ve kimlik belgelerini 485'ten 190/491'e geçiş planı ile uyumlu tutun.",
    zh: "PR 过渡（Subclass 485）：利用临时毕业生签证周期（Post-Higher Education 或 Post-Vocational）积累关键澳洲工作经验，弥补州提名要求差距；并使英语考试与身份证明材料与 485 至 190/491 过渡计划保持一致。",
  },
  "Lodge formal skills assessment for {occupation} with the relevant Australian assessing authority, accounting for potential deducted years of experience.": {
    tr: "{occupation} için ilgili Avustralya inceleme kurumuna resmi beceri incelemesi başvurusu yapın; olası deneyim yıl kesintilerini planlayın.",
    zh: "为 {occupation} 向对应的澳大利亚评估机构提交正式职业评估，并考虑可能的经验年限扣减。",
  },
  "Use the 485 bridge to strengthen Australian work-history evidence while you lodge the formal skills assessment for {occupation}; this keeps your Q2 activity aligned with a 190/491 nomination pathway rather than treating 485 as a standalone end point.": {
    tr: "{occupation} için resmi beceri incelemesi sürecini yürütürken 485 köprüsünü kullanarak Avustralya iş geçmişi kanıtınızı güçlendirin; böylece 2. çeyrek faaliyetleri 485'i tek başına bir son nokta olarak görmek yerine 190/491 adaylık yoluyla uyumlu kalır.",
    zh: "在为 {occupation} 提交正式职业评估期间，利用 485 过渡强化澳洲工作经历证据；这样你的 Q2 行动将与 190/491 提名路径保持一致，而非把 485 视为终点。",
  },
  "your nominated occupation": {
    tr: "aday gösterilen mesleğiniz",
    zh: "你的提名职业",
  },
};

export function localizeText(locale: Locale, text: string): string {
  if (locale === "en") return text;
  const mapped = textMap[text];
  if (!mapped) return text;
  if (locale === "tr") return mapped.tr ?? text;
  if (locale === "zh-Hans") return mapped.zh ?? text;
  return text;
}

export function localizeWaitWindow(locale: Locale, value: string): string {
  if (locale !== "zh-Hans") return value;
  return value
    .replace(/Weeks?\s+(\d+)-(\d+)/gi, "第 $1-$2 周")
    .replace(/Months?\s+(\d+)-(\d+)/gi, "第 $1-$2 个月")
    .replace(/Quarter\s+(\d+)/gi, "第 $1 季度")
    .replace(/months/gi, "个月")
    .replace(/month/gi, "个月")
    .replace(/\bto\b/gi, "至");
}

export function localizeOccupationWarning(locale: Locale, warning?: string): string | undefined {
  if (!warning) return undefined;
  return localizeText(locale, warning);
}

export function localizeTrendDescription(locale: Locale, description?: string): string | undefined {
  if (!description) return undefined;
  return localizeText(locale, description);
}

export function frictionBandLabel(locale: Locale, score: "LOW" | "MEDIUM" | "HIGH" | "EXTREME"): string {
  if (locale === "zh-Hans") {
    if (score === "EXTREME") return "竞争极高";
    if (score === "HIGH") return "竞争较高";
    if (score === "MEDIUM") return "竞争中等";
    return "竞争较低";
  }

  if (locale === "tr") {
    if (score === "EXTREME") return "Çok Yüksek";
    if (score === "HIGH") return "Yüksek";
    if (score === "MEDIUM") return "Orta";
    return "Düşük";
  }

  return score;
}

/**
 * Per-level meaning of the Friction Level badge -- what LOW/MEDIUM/HIGH/
 * EXTREME actually reflects (mainly the gap between the profile's estimated
 * points and recent invitation benchmarks for points-tested pathways; see
 * buildFrictionItem in src/lib/readiness-engine.ts for the underlying gap
 * thresholds), not just the label word itself.
 */
export function frictionBandDefinition(locale: Locale, score: "LOW" | "MEDIUM" | "HIGH" | "EXTREME"): string {
  if (locale === "zh-Hans") {
    if (score === "EXTREME") return "您的档案与近期获邀参考分数之间存在较大差距——目前有多个不利因素叠加影响该路径。";
    if (score === "HIGH") return "您的档案与近期参考分数之间存在明显差距——很可能需要大量补充材料或显著提升档案。";
    if (score === "MEDIUM") return "您的档案与近期参考分数之间存在中等差距——可能需要补充材料或适度提升。";
    return "您的档案已达到或超过该路径近期的参考分数——只需标准材料，没有明显差距需要弥补。";
  }

  if (locale === "tr") {
    if (score === "EXTREME") return "Profiliniz ile güncel davet referansları arasında ciddi bir fark var — bu yolu şu an olumsuz etkileyen birden fazla faktör bir araya geliyor.";
    if (score === "HIGH") return "Profiliniz ile güncel referans puanlar arasında belirgin bir fark var — önemli ek kanıt veya profil iyileştirmesi muhtemelen gerekli.";
    if (score === "MEDIUM") return "Profiliniz ile güncel referans puanlar arasında orta düzey bir fark var — ek kanıt veya ölçülü bir iyileştirme gerekebilir.";
    return "Profiliniz bu yol için güncel referans puanlara eşit veya üzerinde — standart kanıt yeterli, kapatılması gereken büyük bir açık yok.";
  }

  if (score === "EXTREME") return "A substantial gap exists between your profile and recent invitation benchmarks -- multiple compounding factors currently work against this pathway.";
  if (score === "HIGH") return "A meaningful gap exists between your profile and recent benchmarks -- significant additional evidence or profile improvement is likely required.";
  if (score === "MEDIUM") return "A moderate gap exists between your profile and recent benchmarks -- some additional evidence or a modest improvement may be needed.";
  return "Your profile is at or above recent benchmarks for this pathway -- standard evidence is expected, no major gap to close.";
}

export function t3(locale: Locale, en: string, tr: string, zh: string): string {
  if (locale === "tr") return tr;
  if (locale === "zh-Hans") return zh;
  return en;
}

export function confidenceLevelDefinition(locale: Locale, level: "low" | "medium" | "high"): string {
  if (locale === "zh-Hans") {
    if (level === "high") return "高度匹配；关键档案数据已核验，且满足相关核心标准。";
    if (level === "medium") return "中等匹配；部分档案数据为假定，或需要补充更多细节进行确认。";
    return "匹配度有限；关键档案数据缺失、未核验或不明确。";
  }

  if (locale === "tr") {
    if (level === "high") return "Güçlü uyum; temel profil girdileri doğrulanmış ve ilgili kriterler karşılanmıştır.";
    if (level === "medium") return "Orta düzey uyum; bazı profil girdileri varsayılmıştır veya ek ayrıntı gereklidir.";
    return "Sınırlı uyum; temel profil girdileri eksik, doğrulanmamış veya net değil.";
  }

  if (level === "high") return "Strong alignment; key profile inputs are verified, and relevant criteria are met.";
  if (level === "medium") return "Moderate alignment; some profile inputs are assumed or need additional details.";
  return "Limited alignment; key profile inputs are missing, unverified, or unclear.";
}
