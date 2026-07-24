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
  "English evidence": { tr: "Dil kanıtı", zh: "英语能力证明" },
  "Occupation details": { tr: "Meslek ayrıntıları", zh: "职业细节" },
  "Skills assessment": { tr: "Yetenek incelemesi", zh: "职业评估" },
  "Identity documents": { tr: "Kimlik belgeleri", zh: "身份证明文件" },
  "Points table position": { tr: "Puan tablosundaki konum", zh: "打分项定位" },
  "Relationship evidence": { tr: "İlişki kanıtları", zh: "关系证明材料" },
  "Sponsor evidence": { tr: "Sponsor kanıtları", zh: "担保人资料" },
  "Government application charge": { tr: "Devlet başvuru ücreti", zh: "政府签证申请费" },
  "Health checks / police certificates": { tr: "Sağlık kontrolleri / polis kayıt belgesi", zh: "体检与无犯罪证明" },
  "Phase 1: Preparation": { tr: "1. Aşama: Hazırlık", zh: "第一阶段：准备工作" },
  "Phase 2: Assessment": { tr: "2. Aşama: Değerlendirme", zh: "第二阶段：职业评估" },
  "Phase 3: EOI and Nomination": { tr: "3. Aşama: EOI ve Aday Gösterme", zh: "第三阶段：意向书与提名" },
  "Phase 4: Lodgement": { tr: "4. Aşama: Başvuru Teslimi", zh: "第四阶段：递交准备" },
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
    tr: "Şehir ve hane profiline göre aylık kira, market ve ulaşım tahminleri. Yalnızca planlama bağlamındadır.",
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
  "Single": { tr: "Tekil", zh: "单人" },
  "Couple": { tr: "Çift", zh: "夫妻/伴侣" },
  "Family of 4": { tr: "4 Kişilik Aile", zh: "四口之家" },
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
  "English Test Signal Window": { tr: "Dil Sınavı Sinyal Penceresi", zh: "英语信号时间窗口" },
  "Skills Assessment Evidence Window": { tr: "Yetenek İncelemesi Kanıt Penceresi", zh: "技能评估证据时间窗口" },
  "EOI and State-Interest Window": { tr: "EOI ve Eyalet İlgisi Penceresi", zh: "EOI 与州提名意向窗口" },
  "Application Readiness Window": { tr: "Başvuru Hazırlık Penceresi", zh: "申请准备时间窗口" },
  "English Score Development Window": { tr: "Dil Puanı Geliştirme Penceresi", zh: "英语分数发展窗口" },
  "Skills Assessment and Experience Window": { tr: "Yetenek İncelemesi ve Deneyim Penceresi", zh: "技能评估与经验窗口" },
  "EOI and Nomination Window": { tr: "EOI ve Aday Gösterme Penceresi", zh: "EOI 与提名窗口" },
  "Application Assembly Window": { tr: "Başvuru Derleme Penceresi", zh: "申请材料汇总窗口" },
  "Foundation Window: English and Documentation": { tr: "Temel Pencere: Dil ve Belgeler", zh: "基础窗口：英语与材料" },
  "Skills Assessment and Career Evidence Window": { tr: "Yetenek İncelemesi ve Kariyer Kanıtı Penceresi", zh: "技能评估与职业证据窗口" },
  "EOI and Invitation-Cycle Window": { tr: "EOI ve Davet Döngüsü Penceresi", zh: "EOI 与邀请周期窗口" },
  "Application and Post-Application Window": { tr: "Başvuru ve Başvuru Sonrası Pencere", zh: "申请及申请后管理窗口" },
  "This period typically captures exam booking, score-cycle timing, and English-result availability as model inputs.": {
    tr: "Bu dönem genellikle sınav randevusu, puan döngüsü zamanlaması ve dil sonucu erişilebilirliğini model girdisi olarak kapsar.",
    zh: "该时间窗口通常捕捉考试预约、分数周期时间节点和英语成绩可用性等模型输入。",
  },
  "This period usually concentrates reference structure, duties mapping, and qualification documents into the assessment dataset.": {
    tr: "Bu dönem genellikle referans yapısını, görev eşlemesini ve nitelik belgelerini inceleme veri setine dahil eder.",
    zh: "该时间窗口通常将推荐信结构、职责映射和学历文件整合进评估数据集。",
  },
  "This period typically reflects when EOI variables and state-interest signals begin to interact in the comparison model.": {
    tr: "Bu dönem genellikle EOI değişkenleri ile eyalet ilgi sinyallerinin karşılaştırma modelinde etkileşime başladığı zamanı yansıtır.",
    zh: "该时间窗口通常反映 EOI 变量与州提名意向信号在比较模型中开始交互的时期。",
  },
  "This period usually captures health, police, and identity-document completeness as readiness variables.": {
    tr: "Bu dönem genellikle sağlık, polis kaydı ve kimlik belgesi tamlığını hazırlık değişkenleri olarak kapsar.",
    zh: "该时间窗口通常将体检、无犯罪证明和身份文件完整性作为准备度变量纳入。",
  },
  "This window often determines whether higher English-score bands enter the points model.": {
    tr: "Bu pencere genellikle daha yüksek dil puanı bantlarının puan modeline girip girmeyeceğini belirler.",
    zh: "该窗口通常决定更高英语分数区间是否进入打分模型。",
  },
  "This window typically consolidates assessment timing with work-history evidence depth and classification.": {
    tr: "Bu pencere genellikle inceleme zamanlamasını iş geçmişi kanıtının derinliği ve sınıflandırmasıyla birleştirir.",
    zh: "该窗口通常将评估时间节点与工作经历证据深度和分类整合。",
  },
  "This window usually captures EOI signal changes, invitation-round movement, and nomination-linked variables.": {
    tr: "Bu pencere genellikle EOI sinyal değişikliklerini, davet turu hareketlerini ve aday göstermeyle bağlantılı değişkenleri kapsar.",
    zh: "该窗口通常捕捉 EOI 信号变化、邀请轮次动态和提名相关变量。",
  },
  "This window generally reflects how quickly the profile can convert into a complete application-ready evidence set.": {
    tr: "Bu pencere genellikle profilin ne kadar hızlı tam bir başvuruya hazır kanıt setine dönüşebileceğini yansıtır.",
    zh: "该窗口通常反映档案可以多快转化为完整的申请就绪证据集。",
  },
  "This quarter usually establishes the baseline profile and document-control variables used across later comparisons.": {
    tr: "Bu çeyrek genellikle sonraki karşılaştırmalarda kullanılan temel profil ve belge kontrol değişkenlerini oluşturur.",
    zh: "该季度通常建立基础档案和材料管控变量，用于后续比较。",
  },
  "This quarter typically aligns qualification proof and role-scope evidence with assessment-authority criteria.": {
    tr: "Bu çeyrek genellikle nitelik kanıtını ve rol kapsamı kanıtını inceleme kurumu kriterleriyle hizalar.",
    zh: "该季度通常将学历证明和岗位范围证据与评估机构标准对齐。",
  },
  "This quarter usually captures invitation-cycle movement and state or federal demand signals as comparison inputs.": {
    tr: "Bu çeyrek genellikle davet döngüsü hareketlerini ve eyalet veya federal talep sinyallerini karşılaştırma girdisi olarak kapsar.",
    zh: "该季度通常将邀请周期动态和州或联邦需求信号作为比较输入。",
  },
  "This quarter typically reflects submission completeness and response-readiness variables after application lodgement.": {
    tr: "Bu çeyrek genellikle başvuru teslim edildikten sonra teslim tamlığını ve yanıt hazırlığı değişkenlerini yansıtır.",
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

export function confidenceLevelLabel(locale: Locale, level: "low" | "medium" | "high"): string {
  if (locale === "tr") {
    return level === "high" ? "Yüksek" : level === "medium" ? "Orta" : "Düşük";
  }
  if (locale === "zh-Hans") {
    return level === "high" ? "较高" : level === "medium" ? "中等" : "有限";
  }
  return level === "high" ? "High" : level === "medium" ? "Medium" : "Low";
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

/** General glossary-level definition of what "Confidence" measures, independent of any single low/medium/high band (see confidenceLevelDefinition for the per-band text shown inline next to a specific rating). */
export function confidenceDefinitionGeneric(locale: Locale): string {
  if (locale === "tr") {
    return "Güven, temel profil girdilerinin ne kadar doğrulandığını ve ilgili kriterleri karşıladığını gösterir -- Düşük/Orta/Yüksek olarak derecelendirilir.";
  }
  if (locale === "zh-Hans") {
    return "置信度表示关键档案数据的核验程度及其满足相关标准的情况——分为低/中/高三档。";
  }
  return "Confidence indicates how well-verified your key profile inputs are and whether they meet the relevant criteria -- rated Low, Medium, or High.";
}

/** General glossary-level definition of what "Friction Level" measures, independent of any single LOW/MEDIUM/HIGH/EXTREME band (see frictionBandDefinition for the per-band text shown inline next to a specific rating). */
export function frictionLevelDefinitionGeneric(locale: Locale): string {
  if (locale === "tr") {
    return "Rekabet Düzeyi (Friction Level), profilinizin puanı ile bu yol için güncel davet referansları arasındaki farkı gösterir -- Düşük/Orta/Yüksek/Çok Yüksek olarak derecelendirilir.";
  }
  if (locale === "zh-Hans") {
    return "竞争激烈度（Friction Level）表示您的档案分数与该路径当前获邀参考分数之间的差距——分为低/中/高/极高四档。";
  }
  return "Friction Level indicates the gap between your profile's points and the current invitation benchmark for this pathway -- rated Low, Medium, High, or Extreme.";
}

export function strengthLabel(locale: Locale, level: "limited" | "moderate" | "strong"): string {
  if (locale === "tr") {
    return level === "strong" ? "Daha güçlü sinyal" : level === "moderate" ? "Orta sinyal" : "Sınırlı sinyal";
  }
  if (locale === "zh-Hans") {
    return level === "strong" ? "匹配度较高" : level === "moderate" ? "匹配度中等" : "匹配度有限";
  }
  return level === "strong" ? "Stronger signal" : level === "moderate" ? "Moderate signal" : "Limited signal";
}

/**
 * What the "Strength" (signal strength) badge on a pathway row actually
 * measures: how closely the profile's inputs match that pathway's typical
 * successful-applicant pattern, distinct from Confidence (data
 * verification) and Friction (points/benchmark gap).
 */
export function strengthDefinition(locale: Locale): string {
  if (locale === "tr") {
    return "Sinyal gücü, profilinizin bu yolu başarıyla tamamlayan başvuru sahiplerinin tipik profiliyle ne kadar örtüştüğünü gösterir -- Güven (veri doğrulaması) veya Rekabet (puan farkı) ile aynı şey değildir.";
  }
  if (locale === "zh-Hans") {
    return "信号强度反映您的档案与该路径典型成功申请人模式的匹配程度——与置信度（数据核验程度）或竞争激烈度（分数差距）是不同的维度。";
  }
  return "Signal strength reflects how closely your profile matches the typical pattern of applicants who succeed on this pathway -- distinct from Confidence (data verification) or Friction (points/benchmark gap).";
}

export function evidenceLoadLabel(locale: Locale, level: "low" | "medium" | "high"): string {
  if (locale === "tr") {
    return level === "high" ? "Yüksek" : level === "medium" ? "Orta" : "Düşük";
  }
  if (locale === "zh-Hans") {
    return level === "high" ? "高" : level === "medium" ? "中" : "低";
  }
  return level === "high" ? "High" : level === "medium" ? "Medium" : "Low";
}

/** What "Evidence load" means: the volume/complexity of documentation this pathway typically demands, separate from whether that evidence has been provided yet (see Evidence status). */
export function evidenceLoadDefinition(locale: Locale): string {
  if (locale === "tr") {
    return "Kanıt yükü, bu yol için tipik olarak gereken belgelerin hacmini ve karmaşıklığını gösterir -- bu belgelerin şu an sağlanıp sağlanmadığını değil (bkz. Kanıt Durumu).";
  }
  if (locale === "zh-Hans") {
    return "证据负荷指该路径通常所需材料的数量与复杂程度——并不代表这些材料目前是否已经提供（见“证据状态”）。";
  }
  return "Evidence load reflects the volume and complexity of documentation this pathway typically requires -- not whether that evidence has been provided yet (see Evidence status).";
}

export function signalConfidenceLabel(locale: Locale, level: "limited" | "moderate" | "stronger"): string {
  if (locale === "tr") {
    return level === "stronger" ? "Daha güçlü" : level === "moderate" ? "Orta" : "Sınırlı";
  }
  if (locale === "zh-Hans") {
    return level === "stronger" ? "较强" : level === "moderate" ? "中等" : "有限";
  }
  return level === "stronger" ? "Stronger" : level === "moderate" ? "Moderate" : "Limited";
}

/**
 * "Signal Confidence" is a separate limited/moderate/stronger scale used in
 * specific comparison tables (distinct from the low/medium/high Confidence
 * scale defined by confidenceLevelDefinition above) -- it rates how much
 * weight the underlying data point should be given, not how well the
 * profile matches the pathway.
 */
export function signalConfidenceDefinition(locale: Locale): string {
  if (locale === "tr") {
    return "Sinyal güveni, bu veri noktasına ne kadar ağırlık verilmesi gerektiğini gösterir -- profilin yolla ne kadar örtüştüğünü değil.";
  }
  if (locale === "zh-Hans") {
    return "信号置信度表示应赋予该数据点多大权重——而非档案与路径的匹配程度。";
  }
  return "Signal confidence indicates how much weight this data point should be given -- not how well the profile matches the pathway.";
}

export function evidenceStatusLabel(locale: Locale, status: "provided" | "missing" | "unclear" | "typically_required"): string {
  if (locale === "tr") {
    if (status === "provided") return "Sağlandı";
    if (status === "missing") return "Eksik";
    if (status === "typically_required") return "Tipik olarak gerekir";
    return "Net değil";
  }
  if (locale === "zh-Hans") {
    if (status === "provided") return "已提供";
    if (status === "missing") return "缺失";
    if (status === "typically_required") return "通常需要";
    return "不明确";
  }
  if (status === "provided") return "Provided";
  if (status === "missing") return "Missing";
  if (status === "typically_required") return "Typically required";
  return "Unclear";
}

/** What "Evidence status" tracks: whether a specific document/proof point has actually been supplied in this profile, as opposed to Evidence load (how much is required overall). */
export function evidenceStatusDefinition(locale: Locale): string {
  if (locale === "tr") {
    return "Kanıt durumu, belirli bir belge veya kanıt noktasının bu profilde şu an sağlanıp sağlanmadığını gösterir -- toplamda ne kadar kanıt gerektiğini değil (bkz. Kanıt Yükü).";
  }
  if (locale === "zh-Hans") {
    return "证据状态表示某项具体文件或证明是否已在该档案中提供——而非总体所需证据的多少（见“证据负荷”）。";
  }
  return "Evidence status shows whether a specific document or proof point has actually been supplied in this profile -- not how much evidence is required overall (see Evidence load).";
}

/** What "Points gap" means wherever it appears in generated prose: the numeric distance between the profile's estimated points and the benchmark a pathway currently requires. */
export function pointsGapDefinition(locale: Locale): string {
  if (locale === "tr") {
    return "Puan farkı, profilinizin tahmini puanı ile bu yolun şu an gerektirdiği eşik arasındaki sayısal mesafedir.";
  }
  if (locale === "zh-Hans") {
    return "分数差距是指您档案的预计分数与该路径当前所需分数门槛之间的数值差距。";
  }
  return "Points gap is the numeric distance between your profile's estimated points and the threshold this pathway currently requires.";
}

/** What a "Hard Gate" is: a binding eligibility rule (age cap, salary floor, points minimum, tenure requirement) that, if breached, makes a pathway ineligible regardless of any other favorable signal. */
export function hardGateDefinition(locale: Locale): string {
  if (locale === "tr") {
    return "Zorunlu Eşik (Hard Gate), yaş sınırı, maaş tabanı, minimum puan veya kıdem şartı gibi bağlayıcı bir uygunluk kuralıdır -- ihlal edildiğinde diğer tüm olumlu sinyallerden bağımsız olarak yolu uygun olmaktan çıkarır.";
  }
  if (locale === "zh-Hans") {
    return "强制性门槛（Hard Gate）是指年龄上限、薪资底线、最低分数或工作年限等具有约束力的资格规则——一旦被突破，无论其他信号多么有利，该路径都将被判定为不符合资格。";
  }
  return "A Hard Gate is a binding eligibility rule -- an age cap, salary floor, points minimum, or tenure requirement -- that, if breached, makes a pathway ineligible regardless of any other favorable signal.";
}
