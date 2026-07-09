import type { Locale, ReadinessInput } from "./types";

export type EmploymentDataSignals = {
  offshoreAnswered: boolean;
  onshoreAnswered: boolean;
  offshorePositive: boolean;
  onshorePositive: boolean;
  workExperienceYearsConfirmed: boolean;
  employmentDataProvided: boolean;
  bothBlank: boolean;
  missingOffshore: boolean;
  missingOnshore: boolean;
};

export function getEmploymentDataSignals(input: ReadinessInput): EmploymentDataSignals {
  const offshoreAnswered = input.offshoreExperienceYears !== undefined;
  const onshoreAnswered = input.onshoreExperienceYears !== undefined;
  const offshorePositive = (input.offshoreExperienceYears ?? 0) > 0;
  const onshorePositive = (input.onshoreExperienceYears ?? 0) > 0;
  const workExperienceYearsConfirmed = offshoreAnswered || onshoreAnswered;
  const employmentDataProvided = offshorePositive || onshorePositive;

  return {
    offshoreAnswered,
    onshoreAnswered,
    offshorePositive,
    onshorePositive,
    workExperienceYearsConfirmed,
    employmentDataProvided,
    bothBlank: !offshoreAnswered && !onshoreAnswered,
    missingOffshore: !offshoreAnswered,
    missingOnshore: !onshoreAnswered,
  };
}

export function buildEmploymentReferenceTable(locale: Locale): string {
  if (locale === "tr") {
    return "Referans tablo — Yurtdışı: 3-5 yıl +5, 5-8 yıl +10, 8+ yıl +15. Avustralya: 1-3 yıl +5, 3-5 yıl +10, 5-8 yıl +15, 8+ yıl +20. Birleşik üst sınır: 20 puan.";
  }
  if (locale === "zh-Hans") {
    return "参考表：海外工作 3-5 年 +5，5-8 年 +10，8+ 年 +15；澳洲工作 1-3 年 +5，3-5 年 +10，5-8 年 +15，8+ 年 +20；合计上限 20 分。";
  }
  return "Reference table: Overseas 3-5 yrs +5, 5-8 yrs +10, 8+ yrs +15; Australian 1-3 yrs +5, 3-5 yrs +10, 5-8 yrs +15, 8+ yrs +20; combined cap: 20.";
}

export function buildEmploymentExperienceCaveat(
  locale: Locale,
  signals: EmploymentDataSignals
): string | undefined {
  if (signals.bothBlank) {
    if (locale === "tr") {
      return `İş deneyimi sağlanmadı — bu durum sonucu önemli ölçüde değiştirebilir. Nitelikli iş deneyimi toplamda 20 puana kadar katkı sağlayabilir (üst sınır uygulanır). ${buildEmploymentReferenceTable(locale)} İlgili deneyiminiz varsa daha doğru bir sonuç için bu alanları doldurun; mevcut puanınız şu anda sıfır deneyim varsayar.`;
    }
    if (locale === "zh-Hans") {
      return `未提供工作经验——这可能显著改变结果。技术工作经验最多可增加 20 分（适用合计上限）。${buildEmploymentReferenceTable(locale)} 如果你有相关经验，请补充以获得更准确的评估；当前分数按零经验处理。`;
    }
    return `Employment experience not provided — this may significantly change your result. Skilled employment experience can add up to 20 points (capped). ${buildEmploymentReferenceTable(locale)} If you have relevant experience, add it above to get a more accurate result — your current score assumes zero.`;
  }

  if (signals.missingOnshore && !signals.missingOffshore) {
    if (locale === "tr") {
      return "Avustralya iş deneyimi sağlanmadı — uygunsa burada en fazla 20 puana kadar ek katkı olabilir. Avustralya tablo bandı: 1-3 yıl +5, 3-5 yıl +10, 5-8 yıl +15, 8+ yıl +20. Birleşik üst sınır yine 20 puandır.";
    }
    if (locale === "zh-Hans") {
      return "未提供澳大利亚工作经验——如适用，此项仍可能带来最高 20 分。澳洲工作分档：1-3 年 +5，3-5 年 +10，5-8 年 +15，8+ 年 +20；就业经验总上限仍为 20 分。";
    }
    return "Australian employment experience not provided — up to 20 points may still be available if applicable. Australian table: 1-3 yrs +5, 3-5 yrs +10, 5-8 yrs +15, 8+ yrs +20. Combined employment cap remains 20.";
  }

  if (signals.missingOffshore && !signals.missingOnshore) {
    if (locale === "tr") {
      return "Yurtdışı iş deneyimi sağlanmadı — uygunsa burada en fazla 15 puana kadar ek katkı olabilir. Yurtdışı tablo bandı: 3-5 yıl +5, 5-8 yıl +10, 8+ yıl +15. Birleşik üst sınır 20 puandır.";
    }
    if (locale === "zh-Hans") {
      return "未提供海外工作经验——如适用，此项仍可能带来最高 15 分。海外工作分档：3-5 年 +5，5-8 年 +10，8+ 年 +15；就业经验总上限为 20 分。";
    }
    return "Overseas employment experience not provided — up to 15 points may still be available if applicable. Overseas table: 3-5 yrs +5, 5-8 yrs +10, 8+ yrs +15. Combined employment cap remains 20.";
  }

  return undefined;
}

export function appendEmploymentCaveat(base: string, locale: Locale, signals: EmploymentDataSignals): string {
  const caveat = buildEmploymentExperienceCaveat(locale, signals);
  return caveat ? `${base} ${caveat}` : base;
}