import type { Locale } from "@/lib/readiness/types";

const textMap: Record<string, { tr?: string; zh?: string }> = {
  "Identity": { tr: "Kimlik", zh: "身份" },
  "English": { tr: "Ingilizce", zh: "英语" },
  "Skills": { tr: "Mesleki Yeterlilik", zh: "技能" },
  "Spouse/Family": { tr: "Es/Aile", zh: "配偶/家庭" },
  "CRITICAL": { tr: "KRITIK", zh: "关键" },
  "Passport (6+ months validity)": { tr: "Pasaport (en az 6 ay gecerli)", zh: "护照（有效期至少 6 个月）" },
  "Birth Certificate (NAATI translated)": { tr: "Dogum belgesi (NAATI cevirili)", zh: "出生证明（NAATI 认证翻译）" },
  "Test Results (Less than 2 years old)": { tr: "Sinav sonucu (2 yildan eski olmamali)", zh: "语言成绩（2 年内）" },
  "Degree Certificates": { tr: "Diploma belgeleri", zh: "学历证书" },
  "Academic Transcripts": { tr: "Transkript", zh: "成绩单" },
  "Employment References (aligned with Authority rules)": {
    tr: "Is referanslari (degerlendirme kurumu kurallariyla uyumlu)",
    zh: "工作证明（符合评估机构规则）",
  },
  "Marriage Certificate": { tr: "Evlilik cuzdani/belgesi", zh: "结婚证" },
  "Evidence of de-facto (if applicable)": { tr: "Fiili birliktelik kanitlari (varsa)", zh: "事实婚姻证明（如适用）" },
  "Spouse English evidence": { tr: "Esin Ingilizce kaniti", zh: "配偶英语证明" },
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
  "Your documentation strategy must first focus on Skills Assessment evidence.": {
    tr: "Belge stratejiniz once Skills Assessment kanitlarina odaklanmalidir.",
    zh: "你的材料策略应首先聚焦技能评估证据。",
  },
  "months": { tr: "ay", zh: "个月" },
  "Trend estimates are analytical planning references only and do not guarantee invitation outcomes.": {
    tr: "Trend tahminleri yalnizca planlama amaclidir ve davet sonucu garantilemez.",
    zh: "趋势估算仅供规划参考，不保证获邀结果。",
  },
  "Living cost projections are indicative monthly planning estimates and may vary by suburb and lifestyle.": {
    tr: "Yasam maliyeti projeksiyonlari aylik planlama tahminidir; bolge ve yasam tarzina gore degisebilir.",
    zh: "生活成本预测为月度规划估算，可能因区域与生活方式而变化。",
  },
  "Monthly estimates for rent, groceries, and transport by city and household profile. Planning context only.": {
    zh: "按城市和家庭类型估算月租、食品杂货和交通成本，仅供规划参考。",
  },
  "Single": { zh: "单人" },
  "Couple": { zh: "夫妻/伴侣" },
  "Family of 4": { zh: "四口之家" },
  "Estimated invitation points and wait windows derived from 2025-2026 trend patterns. For planning context only.": {
    tr: "Tahmini davet puanlari ve bekleme pencereleri 2025-2026 trendlerinden turetilmistir. Yalnizca planlama baglamindadir.",
    zh: "预计邀请分数与等待窗口基于 2025-2026 趋势推导，仅供规划参考。",
  },
  "ACS deducted experience may reduce claimed skilled years.": {
    tr: "ACS deneyim kesintisi, beyan edilen nitelikli yil sayisini azaltabilir.",
    zh: "ACS 经验扣减可能减少可申报的技术年限。",
  },
  "VETASSESS may reject roles lacking direct professional scope alignment.": {
    tr: "VETASSESS, mesleki kapsam ile dogrudan uyumlu olmayan rolleri reddedebilir.",
    zh: "VETASSESS 可能拒绝与职业范围不直接匹配的岗位。",
  },
  "English Test Preparation + Exam": { zh: "英语备考与考试" },
  "Skills Assessment Evidence Pack": { zh: "技能评估证据包" },
  "EOI Submission + State Interest": { zh: "EOI 递交与州提名意向" },
  "Visa Lodgement Readiness": { zh: "签证递交准备" },
  "English Uplift Strategy": { zh: "英语提升策略" },
  "Skills Assessment + Experience Positioning": { zh: "技能评估与经验定位" },
  "EOI Optimization + Nomination Track": { zh: "EOI 优化与提名路径" },
  "Visa Application Assembly": { zh: "签证申请材料组装" },
  "Foundation Phase: English + Documentation": { zh: "基础阶段：英语与材料" },
  "Skills Assessment + Career Evidence": { zh: "技能评估与职业证据" },
  "EOI + Invitation Cycle Monitoring": { zh: "EOI 与邀请周期监测" },
  "Lodgement and Post-Lodgement Controls": { zh: "递交及递交后管理" },
  "Complete exam booking, target score cycle, and score release planning.": {
    zh: "完成考试预约、目标分数周期安排和出分时间规划。",
  },
  "Finalize authority-ready references, duties mapping, and qualification documents.": {
    zh: "整理符合评估机构要求的推荐信、职责映射和学历文件。",
  },
  "Lodge EOI profile and state pathways aligned to score strategy.": {
    zh: "递交 EOI 档案，并根据分数策略匹配州提名路径。",
  },
  "Prepare health, police, and identity pack for rapid post-invitation lodgement.": {
    zh: "准备体检、无犯罪和身份材料，以便获邀后快速递交。",
  },
  "Schedule multiple attempts if needed to reach competitive score bands.": {
    zh: "必要时安排多次考试，以达到更具竞争力的分数区间。",
  },
  "Sequence assessment submission with experience evidence optimization.": {
    zh: "将评估递交与工作经验证据优化按顺序推进。",
  },
  "Refine points profile, monitor invitation rounds, and activate nomination options.": {
    zh: "优化分数档案，监测邀请轮次，并启动提名选项。",
  },
  "Complete final compliance pack for efficient invitation-to-lodgement turnaround.": {
    zh: "完成最终合规材料包，以提高获邀后递交效率。",
  },
  "Build base profile and document controls for a durable migration pipeline.": {
    zh: "建立基础档案和材料管理机制，为长期移民路径做准备。",
  },
  "Synchronize qualification proof and role scope evidence with authority rules.": {
    zh: "按照评估机构规则同步学历证明和岗位范围证据。",
  },
  "Track invitation movement and tune strategy to state and federal demand signals.": {
    zh: "跟踪邀请变化，并根据州和联邦需求信号调整策略。",
  },
  "Execute submission and maintain readiness for any follow-up requests.": {
    zh: "完成递交，并保持对后续补件请求的准备状态。",
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
    if (score === "EXTREME") return "Cok Yuksek";
    if (score === "HIGH") return "Yuksek";
    if (score === "MEDIUM") return "Orta";
    return "Dusuk";
  }

  return score;
}

export function t3(locale: Locale, en: string, tr: string, zh: string): string {
  if (locale === "tr") return tr;
  if (locale === "zh-Hans") return zh;
  return en;
}
