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
    .replace(/months/gi, "个月")
    .replace(/month/gi, "个月")
    .replace(/\bto\b/gi, "至");
}

export function frictionBandLabel(locale: Locale, score: "LOW" | "MEDIUM" | "HIGH" | "EXTREME"): string {
  if (locale === "zh-Hans") {
    if (score === "EXTREME") return "高难度 / 高竞争";
    if (score === "HIGH") return "高难度";
    if (score === "MEDIUM") return "中等难度";
    return "低难度";
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
