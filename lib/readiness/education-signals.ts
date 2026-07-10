import type { Locale, ReadinessInput } from "./types";
import type { CaveatDetailLevel } from "./employment-signals";

export type SpecialistEducationSignals = {
  /** True when the profile even qualifies to be asked the STEM field question (research/doctorate + Australian-awarded). */
  applicable: boolean;
  answered: boolean;
  confirmedYes: boolean;
  confirmedNo: boolean;
  notSure: boolean;
  /** Applicable AND (unanswered OR "not sure") — the +10 was withheld, but that should read as "unconfirmed", not "confirmed no". */
  unconfirmed: boolean;
};

function isResearchOrDoctorateQualification(level?: ReadinessInput["qualificationLevel"]): boolean {
  return level === "Master's Degree (Research)" || level === "PhD/Doctorate" || level === "PhD";
}

export function getSpecialistEducationSignals(input: ReadinessInput): SpecialistEducationSignals {
  const applicable =
    isResearchOrDoctorateQualification(input.qualificationLevel) &&
    input.qualificationAwardedInAustralia === true;
  const response = input.specialistEducationStemResponse;
  const confirmedYes = response === "yes";
  const confirmedNo = response === "no";
  const notSure = response === "not_sure";
  const answered = confirmedYes || confirmedNo || notSure;

  return {
    applicable,
    answered,
    confirmedYes,
    confirmedNo,
    notSure,
    unconfirmed: applicable && (!answered || notSure),
  };
}

export function buildSpecialistEducationCaveat(
  locale: Locale,
  signals: SpecialistEducationSignals,
  detail: CaveatDetailLevel = "long"
): string | undefined {
  if (!signals.unconfirmed) return undefined;

  if (signals.notSure) {
    if (detail === "short") {
      if (locale === "tr") {
        return "Uzmanlık eğitimi (STEM) alanı onaylanmadı — ayrıntılar için Kanıt/Bilgi Hazırlık Özeti bölümüne bakın.";
      }
      if (locale === "zh-Hans") {
        return "Specialist education（STEM）尚未确认——详情请参见“材料准备度摘要”部分。";
      }
      return "Specialist education (STEM field) remains unconfirmed — see Evidence Readiness section for details.";
    }

    if (locale === "tr") {
      return "Uzmanlık eğitimi (STEM) alanı 'Emin değilim' olarak işaretlendi — +10 puan uygulanmadı ve durum onaylanmamış olarak işaretlendi. Alanı doğrulayabilirseniz yanıtınızı güncelleyin.";
    }
    if (locale === "zh-Hans") {
      return "Specialist education（STEM）领域回答为“不确定”——未授予 +10 分，该项标记为未确认。如能确认该研究领域，请更新你的回答。";
    }
    return "Specialist education (STEM field) was marked \"Not sure\" — the +10 point was not applied and this remains unconfirmed. If you can confirm the field of study, update your answer for a more accurate result.";
  }

  if (detail === "short") {
    if (locale === "tr") {
      return "Uzmanlık eğitimi (STEM) alanı yanıtı onaylanmadı — ayrıntılar için Kanıt/Bilgi Hazırlık Özeti bölümüne bakın.";
    }
    if (locale === "zh-Hans") {
      return "Specialist education（STEM）未确认——详情请参见“材料准备度摘要”部分。";
    }
    return "Specialist education (STEM field) remains unconfirmed — see Evidence Readiness section for details.";
  }

  if (locale === "tr") {
    return "Uzmanlık eğitimi (STEM) alanı sorusu yanıtlanmadı — +10 puan uygulanmadı ve durum onaylanmamış olarak işaretlendi (otomatik olarak 'hayır' varsayılmadı).";
  }
  if (locale === "zh-Hans") {
    return "Specialist education（STEM）领域问题未作答——未授予 +10 分，该项标记为未确认（不会被默认视为“否”）。";
  }
  return "Specialist education (STEM field) question was not answered — the +10 point was not applied and this remains unconfirmed (not defaulted to \"no\").";
}

export function appendSpecialistEducationCaveat(
  base: string,
  locale: Locale,
  signals: SpecialistEducationSignals,
  detail: CaveatDetailLevel = "long"
): string {
  const caveat = buildSpecialistEducationCaveat(locale, signals, detail);
  return caveat ? `${base} ${caveat}` : base;
}
