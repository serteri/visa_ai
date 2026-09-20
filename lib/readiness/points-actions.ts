import { calculateAustraliaPoints } from "@/lib/points/calculate-australia-points";
import type {
  AustralianEmploymentOption,
  AustraliaPointsInput,
  EducationOption,
  OverseasEmploymentOption,
} from "@/lib/points/types";
import type {
  Locale,
  PointsAction,
  PointsActionDifficulty,
  PointsActionFactorStatus,
  PointsActionId,
  PointsActionPlan,
} from "./types";

/**
 * Deterministic "what can still raise THIS applicant's score" list.
 *
 * Every gain is the difference between two runs of the engine's own points
 * table (calculateAustraliaPoints) -- the applicant's baseline input vs. the
 * same input with ONE factor improved -- so no number here is typed in by
 * hand, and nothing (in particular no LLM) can disagree with the engine.
 * A factor that is already at its maximum, cannot be changed, or is already
 * claimed produces no action at all (it is recorded in `factors` instead).
 *
 * A skills assessment is NOT a points action: it is an "enabling step" with
 * no points value (it unlocks skilled-employment points once positive).
 */

export type PointsActionInputs = {
  /** Exactly what buildPointsEstimate passes to calculateAustraliaPoints. */
  base: AustraliaPointsInput;
  locale: Locale;
  /** English level was actually provided (a real tier, not "none"/empty). */
  englishProvided: boolean;
  /** Occupation matched the dataset, so employment points can be claimed at all. */
  canApplyExperience: boolean;
  /** Positive skills assessment on file. */
  assessmentDone: boolean;
  isResearchOrDoctorate: boolean;
  isAustralianQualification: boolean;
  specialistStemResponse?: "yes" | "no" | "not_sure";
  professionalYearRelevant: boolean;
  /** The family/partner question was answered (an unanswered one gives no basis for a partner action). */
  partnerStatusProvided: boolean;
  /** Detected subclasses (190 / 491 nomination actions only appear for these). */
  subclasses: readonly string[];
};

/** Fixed difficulty table -- the only source of difficulty, in code. */
export const POINTS_ACTION_DIFFICULTY: Readonly<Record<PointsActionId, PointsActionDifficulty>> = {
  community_language: "Low",
  specialist_education: "Low",
  english_upgrade: "Medium",
  professional_year: "Medium",
  partner_skills: "Medium",
  state_nomination_190: "Medium",
  regional_nomination_491: "Medium",
  overseas_employment: "High",
  australian_employment: "High",
  education: "High",
  australian_study: "High",
  regional_study: "High",
};

const ID_ORDER: readonly PointsActionId[] = [
  "english_upgrade",
  "overseas_employment",
  "australian_employment",
  "education",
  "australian_study",
  "specialist_education",
  "community_language",
  "professional_year",
  "regional_study",
  "partner_skills",
  "state_nomination_190",
  "regional_nomination_491",
];

const DIFFICULTY_RANK: Record<PointsActionDifficulty, number> = { Low: 0, Medium: 1, High: 2 };

const NEXT_OVERSEAS: Record<OverseasEmploymentOption, { next: OverseasEmploymentOption; years: number } | null> = {
  lt3: { next: "3_4", years: 3 },
  "3_4": { next: "5_7", years: 5 },
  "5_7": { next: "8_plus", years: 8 },
  "8_plus": null,
};

const NEXT_AUSTRALIAN: Record<AustralianEmploymentOption, { next: AustralianEmploymentOption; years: number } | null> = {
  lt1: { next: "1_2", years: 1 },
  "1_2": { next: "3_4", years: 3 },
  "3_4": { next: "5_7", years: 5 },
  "5_7": { next: "8_plus", years: 8 },
  "8_plus": null,
};

type Wording = { label: string; reason: string };
type L3 = { en: string; tr: string; zh: string };

const pick = (locale: Locale, t: L3): string => (locale === "tr" ? t.tr : locale === "zh-Hans" ? t.zh : t.en);

/** Wording for one action. `years` is only used by the two employment actions. */
function wording(id: PointsActionId, locale: Locale, ctx: { years?: number; educationTarget?: "doctorate" | "bachelor" }): Wording {
  const w = (label: L3, reason: L3): Wording => ({ label: pick(locale, label), reason: pick(locale, reason) });
  switch (id) {
    case "english_upgrade":
      return w(
        {
          en: "Improve your English test result to Superior level (IELTS 8.0 / PTE 79)",
          tr: "İngilizce sınav sonucunuzu Superior seviyesine yükseltin (IELTS 8.0 / PTE 79)",
          zh: "将英语考试成绩提升至卓越级别（雅思 8.0 / PTE 79）",
        },
        {
          en: "Your current English tier is below the points table's top tier, so a stronger result on an approved test adds points.",
          tr: "Mevcut İngilizce seviyeniz puan tablosunun en üst kademesinin altında; onaylı bir testte daha yüksek sonuç puan ekler.",
          zh: "您当前的英语级别低于积分表的最高档，在认可的考试中取得更高成绩即可加分。",
        }
      );
    case "overseas_employment":
      return w(
        {
          en: `Reach ${ctx.years} ${ctx.years === 1 ? "year" : "years"} of skilled overseas employment`,
          tr: `Yurt dışı nitelikli istihdamda ${ctx.years} yıla ulaşın`,
          zh: `累计海外技术工作经验达到 ${ctx.years} 年`,
        },
        {
          en: "Points step up when you cross the next experience band; they can only be claimed once a positive skills assessment covers the work.",
          tr: "Bir sonraki deneyim bandını geçtiğinizde puan artar; yalnızca işi kapsayan olumlu bir beceri değerlendirmesi olduğunda talep edilebilir.",
          zh: "跨入下一个工作经验区间时积分上升；只有在正面技能评估涵盖该工作经历后才能计分。",
        }
      );
    case "australian_employment":
      return w(
        {
          en: `Reach ${ctx.years} ${ctx.years === 1 ? "year" : "years"} of skilled Australian employment`,
          tr: `Avustralya'da nitelikli istihdamda ${ctx.years} yıla ulaşın`,
          zh: `累计澳大利亚技术工作经验达到 ${ctx.years} 年`,
        },
        {
          en: "Points step up when you cross the next experience band; they can only be claimed once a positive skills assessment covers the work.",
          tr: "Bir sonraki deneyim bandını geçtiğinizde puan artar; yalnızca işi kapsayan olumlu bir beceri değerlendirmesi olduğunda talep edilebilir.",
          zh: "跨入下一个工作经验区间时积分上升；只有在正面技能评估涵盖该工作经历后才能计分。",
        }
      );
    case "education":
      return ctx.educationTarget === "doctorate"
        ? w(
            {
              en: "Obtain a doctorate (PhD)",
              tr: "Doktora derecesi (PhD) edinin",
              zh: "取得博士学位",
            },
            {
              en: "The points table awards its top education tier to a recognised doctorate.",
              tr: "Puan tablosu en yüksek eğitim kademesini tanınan bir doktora derecesine verir.",
              zh: "积分表将最高学历档位授予获认可的博士学位。",
            }
          )
        : w(
            {
              en: "Obtain a bachelor's degree or higher recognised by the assessing authority",
              tr: "Değerlendirme kurumunca tanınan lisans veya üzeri bir derece edinin",
              zh: "取得评估机构认可的学士或以上学位",
            },
            {
              en: "Your current qualification does not reach the points table's bachelor-or-higher tier.",
              tr: "Mevcut yeterliliğiniz puan tablosundaki lisans veya üzeri kademesine ulaşmıyor.",
              zh: "您当前的学历未达到积分表中“学士或以上”的档位。",
            }
          );
    case "australian_study":
      return w(
        {
          en: "Complete an Australian qualification (at least 2 academic years of study in Australia)",
          tr: "Avustralya'da bir yeterlilik tamamlayın (Avustralya'da en az 2 akademik yıl eğitim)",
          zh: "在澳大利亚完成一项学历（至少 2 个学年）",
        },
        {
          en: "The Australian study requirement is not yet claimed on your profile.",
          tr: "Avustralya öğrenim koşulu profilinizde henüz talep edilmiyor.",
          zh: "您的档案中尚未申报澳大利亚学习要求。",
        }
      );
    case "specialist_education":
      return w(
        {
          en: "Confirm your Australian research degree is in an eligible STEM field (specialist education)",
          tr: "Avustralya'daki araştırma dereceniz uygun bir STEM alanında olduğunu doğrulayın (uzmanlık eğitimi)",
          zh: "确认您在澳大利亚获得的研究型学位属于符合条件的 STEM 领域（专业型学位）",
        },
        {
          en: "Your degree type and Australian study qualify, but the STEM field has not been confirmed.",
          tr: "Derece türünüz ve Avustralya'daki eğitiminiz uygun, ancak STEM alanı doğrulanmadı.",
          zh: "您的学位类型和澳大利亚学习经历符合条件，但 STEM 领域尚未确认。",
        }
      );
    case "community_language":
      return w(
        {
          en: "Obtain a NAATI credentialled community language (CCL) certification",
          tr: "NAATI toplum dili (CCL) sertifikası edinin",
          zh: "获得 NAATI 社区语言（CCL）认证",
        },
        {
          en: "This credential is not on your profile and is one of the quicker factors to add.",
          tr: "Bu sertifika profilinizde yok ve ekleyebileceğiniz daha hızlı faktörlerden biridir.",
          zh: "您的档案中没有该证书，它是较容易补充的加分项之一。",
        }
      );
    case "professional_year":
      return w(
        {
          en: "Complete an Australian Professional Year program",
          tr: "Avustralya'da Mesleki Yıl (Professional Year) programını tamamlayın",
          zh: "完成澳大利亚职业年（Professional Year）项目",
        },
        {
          en: "Relevant to accounting, IT and engineering occupations; not yet claimed on your profile.",
          tr: "Muhasebe, BT ve mühendislik meslekleri için geçerlidir; profilinizde henüz talep edilmiyor.",
          zh: "适用于会计、IT 和工程类职业；您的档案中尚未申报。",
        }
      );
    case "regional_study":
      return w(
        {
          en: "Study at a designated regional campus in Australia",
          tr: "Avustralya'da belirlenmiş bir bölgesel kampüste eğitim alın",
          zh: "在澳大利亚指定的偏远地区校区学习",
        },
        {
          en: "Regional-study points apply only to study completed at a designated regional campus.",
          tr: "Bölgesel eğitim puanı yalnızca belirlenmiş bir bölgesel kampüste tamamlanan eğitim için geçerlidir.",
          zh: "偏远地区学习加分仅适用于在指定偏远地区校区完成的学习。",
        }
      );
    case "partner_skills":
      return w(
        {
          en: "Partner skills: your partner obtains Competent English and a positive skills assessment",
          tr: "Partner nitelikleri: partneriniz Competent English ve olumlu bir beceri değerlendirmesi elde etsin",
          zh: "伴侣技能：伴侣取得 Competent English 及正面技能评估",
        },
        {
          en: "Your partner currently earns no partner points under the points table.",
          tr: "Partneriniz puan tablosuna göre şu anda partner puanı kazanmıyor.",
          zh: "按积分表，您的伴侣目前不能带来伴侣加分。",
        }
      );
    case "state_nomination_190":
      return w(
        {
          en: "Obtain state or territory nomination (subclass 190)",
          tr: "Eyalet veya bölge adaylığı alın (Subclass 190)",
          zh: "获得州或领地提名（190 子类）",
        },
        {
          en: "Nomination is a points factor only for subclass 190 and depends on the state's own criteria.",
          tr: "Adaylık yalnızca Subclass 190 için bir puan faktörüdür ve eyaletin kendi kriterlerine bağlıdır.",
          zh: "提名仅对 190 子类计分，且取决于各州自身的标准。",
        }
      );
    case "regional_nomination_491":
      return w(
        {
          en: "Obtain regional nomination or eligible relative sponsorship (subclass 491)",
          tr: "Bölgesel adaylık veya uygun akraba sponsorluğu alın (Subclass 491)",
          zh: "获得偏远地区提名或符合条件的亲属担保（491 子类）",
        },
        {
          en: "Nomination or sponsorship is a points factor only for subclass 491 and depends on the nominating body's criteria.",
          tr: "Adaylık veya sponsorluk yalnızca Subclass 491 için bir puan faktörüdür ve adaylık veren kurumun kriterlerine bağlıdır.",
          zh: "提名或担保仅对 491 子类计分，且取决于提名机构的标准。",
        }
      );
  }
}

const DIFFICULTY_NOTE: Record<PointsActionDifficulty, L3> = {
  Low: {
    en: "Mostly within your control and relatively quick.",
    tr: "Büyük ölçüde sizin kontrolünüzde ve nispeten hızlı.",
    zh: "主要由您自己掌控，耗时相对较短。",
  },
  Medium: {
    en: "Needs preparation or a decision by a third party.",
    tr: "Hazırlık veya üçüncü bir tarafın kararını gerektirir.",
    zh: "需要准备，或取决于第三方的决定。",
  },
  High: {
    en: "Takes a long time or depends on major life decisions.",
    tr: "Uzun zaman alır veya büyük yaşam kararlarına bağlıdır.",
    zh: "耗时较长，或取决于重大的人生决定。",
  },
};

const ENABLING_SKILLS_ASSESSMENT: { label: L3; reason: L3 } = {
  label: {
    en: "Enabling step: obtain a positive Skills Assessment",
    tr: "Etkinleştirici adım: olumlu bir Beceri Değerlendirmesi edinin",
    zh: "前置步骤：取得正面的技能评估",
  },
  reason: {
    en: "It unlocks skilled-employment points once positive.",
    tr: "Olumlu sonuçlandığında beceriye dayalı istihdam puanlarının kilidini açar.",
    zh: "结果为正面后，将解锁技能就业积分。",
  },
};

export function buildPointsActionPlan(inputs: PointsActionInputs): PointsActionPlan {
  const { base, locale } = inputs;
  const baseResult = calculateAustraliaPoints(base);
  const baseTotal = baseResult.total189;
  const gainOf = (patch: Partial<AustraliaPointsInput>, total: "total189" | "total190" | "total491" = "total189"): number =>
    calculateAustraliaPoints({ ...base, ...patch })[total] - baseTotal;

  const actions: PointsAction[] = [];
  const factors: PointsActionPlan["factors"] = [];
  const setFactor = (factor: string, status: PointsActionFactorStatus) => factors.push({ factor, status });
  const add = (id: PointsActionId, gain: number, ctx: { years?: number; educationTarget?: "doctorate" | "bachelor" } = {}) => {
    const wd = wording(id, locale, ctx);
    const difficulty = POINTS_ACTION_DIFFICULTY[id];
    actions.push({
      id,
      gain,
      difficulty,
      label: wd.label,
      reason: wd.reason,
      difficultyNote: pick(locale, DIFFICULTY_NOTE[difficulty]),
      requiresSkillsAssessment: id === "overseas_employment" || id === "australian_employment",
    });
  };

  // Age: never an action -- the applicant cannot improve it.
  setFactor("age", base.age === "25_32" ? "at_maximum" : "not_applicable");

  // English
  const englishGain = gainOf({ english: "superior" });
  if (englishGain > 0) {
    add("english_upgrade", englishGain);
    setFactor("english", "action");
  } else {
    setFactor("english", "at_maximum");
  }

  // Skilled employment (next experience band only; combined cap is applied by the table)
  if (!inputs.canApplyExperience) {
    setFactor("overseas_employment", "not_applicable");
    setFactor("australian_employment", "not_applicable");
  } else {
    const nextOverseas = NEXT_OVERSEAS[base.overseasEmployment];
    const overseasGain = nextOverseas ? gainOf({ overseasEmployment: nextOverseas.next }) : 0;
    if (nextOverseas && overseasGain > 0) {
      add("overseas_employment", overseasGain, { years: nextOverseas.years });
      setFactor("overseas_employment", "action");
    } else {
      setFactor("overseas_employment", "at_maximum");
    }
    const nextAustralian = NEXT_AUSTRALIAN[base.australianEmployment];
    const australianGain = nextAustralian ? gainOf({ australianEmployment: nextAustralian.next }) : 0;
    if (nextAustralian && australianGain > 0) {
      add("australian_employment", australianGain, { years: nextAustralian.years });
      setFactor("australian_employment", "action");
    } else {
      setFactor("australian_employment", "at_maximum");
    }
  }

  // Education
  const educationTarget: EducationOption = base.education === "bachelor_or_higher" ? "doctorate" : "bachelor_or_higher";
  const educationGain = base.education === "doctorate" ? 0 : gainOf({ education: educationTarget });
  if (educationGain > 0) {
    add("education", educationGain, { educationTarget: educationTarget === "doctorate" ? "doctorate" : "bachelor" });
    setFactor("education", "action");
  } else {
    setFactor("education", "at_maximum");
  }

  // Australian study requirement
  if (base.australianStudyRequirement) {
    setFactor("australian_study", "already_claimed");
  } else {
    add("australian_study", gainOf({ australianStudyRequirement: true }));
    setFactor("australian_study", "action");
  }

  // Specialist education (STEM): only for an Australian research degree / doctorate whose STEM field is unconfirmed
  if (base.specialistEducation) {
    setFactor("specialist_education", "already_claimed");
  } else if (
    inputs.isResearchOrDoctorate &&
    inputs.isAustralianQualification &&
    (inputs.specialistStemResponse === undefined || inputs.specialistStemResponse === "not_sure")
  ) {
    add("specialist_education", gainOf({ specialistEducation: true }));
    setFactor("specialist_education", "action");
  } else {
    setFactor("specialist_education", "not_applicable");
  }

  // Credentialled community language (NAATI CCL)
  if (base.credentialledCommunityLanguage) {
    setFactor("community_language", "already_claimed");
  } else {
    add("community_language", gainOf({ credentialledCommunityLanguage: true }));
    setFactor("community_language", "action");
  }

  // Professional Year: only for the occupation families it exists for
  if (base.professionalYear) {
    setFactor("professional_year", "already_claimed");
  } else if (inputs.professionalYearRelevant) {
    add("professional_year", gainOf({ professionalYear: true }));
    setFactor("professional_year", "action");
  } else {
    setFactor("professional_year", "not_applicable");
  }

  // Regional study: future study at a regional campus (not possible retroactively once Australian study is claimed)
  if (base.regionalStudy) {
    setFactor("regional_study", "already_claimed");
  } else if (base.australianStudyRequirement) {
    setFactor("regional_study", "not_applicable");
  } else {
    add("regional_study", gainOf({ regionalStudy: true }));
    setFactor("regional_study", "action");
  }

  // Partner skills
  const partnerGain = gainOf({ partner: "partner_skilled" });
  if (!inputs.partnerStatusProvided) {
    setFactor("partner_skills", "not_applicable");
  } else if (partnerGain > 0) {
    add("partner_skills", partnerGain);
    setFactor("partner_skills", "action");
  } else {
    // Single applicants (and partners already at the top tier) are at the maximum.
    setFactor("partner_skills", "at_maximum");
  }

  // Nominations
  if (inputs.subclasses.includes("190")) {
    add("state_nomination_190", gainOf({ hasStateNomination190: true }, "total190"));
    setFactor("state_nomination_190", "action");
  } else {
    setFactor("state_nomination_190", "not_applicable");
  }
  if (inputs.subclasses.includes("491")) {
    add("regional_nomination_491", gainOf({ hasNominationOrSponsorship491: true }, "total491"));
    setFactor("regional_nomination_491", "action");
  } else {
    setFactor("regional_nomination_491", "not_applicable");
  }

  actions.sort(
    (a, b) =>
      b.gain - a.gain ||
      DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty] ||
      ID_ORDER.indexOf(a.id) - ID_ORDER.indexOf(b.id)
  );

  const enablingSteps: PointsActionPlan["enablingSteps"] = inputs.assessmentDone
    ? []
    : [
        {
          id: "skills_assessment",
          label: pick(locale, ENABLING_SKILLS_ASSESSMENT.label),
          reason: pick(locale, ENABLING_SKILLS_ASSESSMENT.reason),
        },
      ];

  return {
    actions,
    enablingSteps,
    factors,
    englishAtMaximum: englishGain === 0 && inputs.englishProvided,
  };
}
