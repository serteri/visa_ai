import type { ApplicationStage, Locale } from "../types";
import { getCommonPitfalls } from "./common-pitfalls";

/**
 * Stage-specific content (AU). Wording only: the application stage never changes an eligibility result.
 *
 * Every fact here is already in the report's own sourced content -- nothing new is stated:
 *  - the 60-day lodgement deadline: the "60-Day Rule" in Common Pitfalls (common-pitfalls.ts);
 *  - police certificates: the Financial Roadmap's police item (AFP certificate processed online within 15 business
 *    days; 4-12 weeks lead time for overseas certificates) and the document inventory (AFP certificate valid 12 months,
 *    order it after invitation so it is still valid at lodgement);
 *  - the health examination: the Financial Roadmap's medical item (through Bupa Medical Visa Services, results valid
 *    12 months, 6-12 months longer where extra chest monitoring is required);
 *  - the document order: the report's document checklist and document inventory items.
 */

const pick = (locale: Locale, en: string, tr: string, zh: string) => (locale === "tr" ? tr : locale === "zh-Hans" ? zh : en);

function sixtyDayRule(locale: Locale): string {
  const rule = getCommonPitfalls(locale, "AU").pitfalls.find((p) => /60/.test(p.title));
  return rule?.body ?? pick(locale, "You must lodge your application within 60 days of invitation.", "Davet aldıktan sonra 60 gün içinde başvuru sunulmalıdır.", "收到邀请后须在60天内提交申请。");
}

/** The first suggested next step once invited or nominated. */
export function lodgementNextStep(locale: Locale): string {
  return pick(
    locale,
    "Lodge your visa application within 60 days of your invitation: order police certificates and book the health examination now (see Lodgement Preparation).",
    "Davetinizden sonraki 60 gün içinde vize başvurunuzu yapın: adli sicil belgelerini şimdi isteyin ve sağlık muayenesi randevusu alın (bkz. Başvuru Hazırlığı).",
    "请在获邀后 60 天内递交签证申请：现在就申请无犯罪记录证明并预约体检（见“签证申请递交准备”）。"
  );
}

export type LodgementSection = { title: string; intro: string; deadline: string; order: string[]; leadTimes: string[]; boosterNote: string };

/** "Invited or nominated": the lodgement section shown above the Points Booster. */
export function getLodgementSection(locale: Locale): LodgementSection {
  return {
    title: pick(locale, "Lodgement Preparation", "Başvuru Hazırlığı", "签证申请递交准备"),
    intro: pick(
      locale,
      "You told us you have been invited or nominated. Your next step is lodging the visa application, not raising your points.",
      "Davet aldığınızı veya aday gösterildiğinizi belirttiniz. Bir sonraki adımınız puanınızı yükseltmek değil, vize başvurusunu yapmaktır.",
      "您表示已获邀请或提名。您的下一步是递交签证申请，而不是提高分数。"
    ),
    deadline: sixtyDayRule(locale),
    order: [
      pick(locale, "1. Identity: valid passport and identity documents.", "1. Kimlik: geçerli pasaport ve kimlik belgeleri.", "1. 身份：有效护照及身份证件。"),
      pick(locale, "2. The skills assessment outcome letter and English test results claimed in your EOI.", "2. EOI'nizde beyan ettiğiniz beceri değerlendirmesi sonuç mektubu ve İngilizce test sonuçları.", "2. EOI 中申报的技能评估结果信和英语考试成绩。"),
      pick(locale, "3. Employment references and education documents that match the points you claimed.", "3. Beyan ettiğiniz puanlarla uyumlu işveren referansları ve eğitim belgeleri.", "3. 与所申报分数一致的雇主推荐信和学历文件。"),
      pick(locale, "4. Police certificates: start first, they have the longest lead times.", "4. Adli sicil belgeleri: en uzun süren bunlardır, ilk önce başlayın.", "4. 无犯罪记录证明：办理时间最长，请最先开始。"),
      pick(locale, "5. Health examination.", "5. Sağlık muayenesi.", "5. 体检。"),
      pick(locale, "6. Form 80 / Form 1221 if requested: a full 10-year travel and address history.", "6. Talep edilirse Form 80 / Form 1221: 10 yıllık tam seyahat ve adres geçmişi.", "6. 如被要求，Form 80 / Form 1221：完整 10 年旅行及住址记录。"),
    ],
    leadTimes: [
      pick(
        locale,
        "Police certificates: the Australian Federal Police (AFP) certificate is processed online within 15 business days and is valid for 12 months from issue; plan for 4-12 weeks for overseas police certificates.",
        "Adli sicil belgeleri: Avustralya Federal Polisi (AFP) belgesi 15 iş günü içinde çevrimiçi işlenir ve verildiği tarihten itibaren 12 ay geçerlidir; yurt dışı adli sicil belgeleri için 4-12 hafta öngörün.",
        "无犯罪记录证明：澳大利亚联邦警察（AFP）证明在线办理，15 个工作日内完成，自签发起 12 个月内有效；海外无犯罪记录证明请预留 4-12 周。"
      ),
      pick(
        locale,
        "Health examination: through Bupa Medical Visa Services; results are valid for 12 months; where additional chest monitoring is required the process can take 6-12 months longer.",
        "Sağlık muayenesi: Bupa Medical Visa Services aracılığıyla; sonuçlar 12 ay geçerlidir; ek akciğer takibi gerekirse süreç 6-12 ay uzayabilir.",
        "体检：通过 Bupa Medical Visa Services 进行；结果有效期 12 个月；如需额外胸部复查，流程可能延长 6-12 个月。"
      ),
    ],
    boosterNote: pick(
      locale,
      "Points boosters below are secondary at this stage: your invitation was issued on the points in your EOI.",
      "Aşağıdaki puan artırıcılar bu aşamada ikincildir: davetiniz EOI'nizdeki puana göre verildi.",
      "在此阶段，以下提分项为次要事项：您的邀请是根据 EOI 中的分数发出的。"
    ),
  };
}

/** "EOI submitted": points can be updated in the EOI when they change. */
export function eoiUpdateNote(locale: Locale): string {
  return pick(
    locale,
    "Your EOI is submitted: when your points change (a new English result, more experience, a completed qualification), update your EOI in SkillSelect so it reflects them.",
    "EOI'niz gönderildi: puanınız değiştiğinde (yeni bir İngilizce sonucu, daha fazla deneyim, tamamlanan bir eğitim) EOI'nizi SkillSelect'te güncelleyin.",
    "您的 EOI 已提交：当分数变化时（新的英语成绩、更多工作经验、完成学历），请在 SkillSelect 中更新您的 EOI。"
  );
}

export const STAGE_LABEL: Record<ApplicationStage, [string, string, string]> = {
  planning: ["Planning", "Planlama", "规划中"],
  skills_assessment_in_progress: ["Skills assessment in progress", "Beceri değerlendirmesi sürüyor", "技能评估进行中"],
  eoi_submitted: ["EOI submitted", "EOI gönderildi", "已提交 EOI"],
  invited: ["Invited or nominated", "Davet edildi veya aday gösterildi", "已获邀请或提名"],
};
