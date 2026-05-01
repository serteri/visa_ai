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
  "Skills-assessment evidence is the primary data variable when occupation data is missing.": {
    tr: "Meslek verisi eksik oldugunda skills-assessment kaniti birincil veri degiskenidir.",
    zh: "当职业数据缺失时，技能评估证据是主要数据变量。",
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
  "VETASSESS assessments are sensitive to direct professional scope alignment; roles diverging from the defined scope may not satisfy assessment criteria.": {
    tr: "VETASSESS degerlendirmeleri dogrudan mesleki kapsam uyumuna duyarlidir; tanimli kapsamdan sapan roller degerlendirme kriterlerini karsilamayabilir.",
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
