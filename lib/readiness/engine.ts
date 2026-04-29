import { checkOccupation } from "@/lib/occupations/check-occupation";
import { calculateSkilledPoints } from "@/lib/points/calculate-skilled-points";
import type { AgeOption, EnglishOption } from "@/lib/points/types";
import { getDocumentChecklist } from "./document-checklists";
import { buildRiskIndicators } from "./risk-rules";
import { buildNextSteps } from "./next-steps";
import type {
  ConfidenceLevel,
  DataCompleteness,
  DocumentCategory,
  EvidenceReadinessItem,
  FinancialRoadmapItem,
  InformationCoverageLevel,
  IndicatorLevel,
  KeyVisaRequirement,
  Locale,
  OccupationIndication,
  PathwayComparison,
  PathwayFriction,
  PathwayRelevance,
  PathwayStrengthComparison,
  PointsBoosterSimulator,
  PointsEstimate,
  ProgressionPathway,
  ReadinessInput,
  ReadinessReport,
  ReportIndicators,
} from "./types";

export type LeadTier = "High intent" | "Moderate intent" | "Low intent";

export type LeadQuality = {
  leadValueScore: number;
  leadScore: number;
  leadTier: LeadTier;
};

// ─── Keyword helpers ─────────────────────────────────────────────────────────

function norm(text: string): string {
  return text.toLowerCase().trim();
}

function hasKw(text: string, keywords: string[]): boolean {
  const n = norm(text);
  return keywords.some((kw) => n.includes(kw));
}

// ─── Pathway detection ────────────────────────────────────────────────────────

function detectSubclasses(input: ReadinessInput): string[] {
  const combined = [
    input.mainGoal ?? "",
    input.preferredPathway ?? "",
    input.sponsorOrFamily ?? "",
    input.biggestConcern ?? "",
    input.occupation ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const found = new Set<string>();

  // Explicit subclass numbers first
  const pref = norm(input.preferredPathway ?? "");
  if (/\b500\b/.test(pref)) found.add("500");
  if (/\b485\b/.test(pref)) found.add("485");
  if (/\b482\b/.test(pref)) found.add("482");
  if (/\b189\b/.test(pref)) found.add("189");
  if (/\b190\b/.test(pref)) found.add("190");
  if (/\b491\b/.test(pref)) found.add("491");
  if (/820|801/.test(pref)) found.add("820_801");

  // Study → 500
  if (hasKw(combined, ["study", "student", "course", "university", "college", "school", "eğitim", "öğrenci", "okul"])) {
    found.add("500");
  }

  // Graduate/post-study → 485
  if (
    hasKw(combined, [
      "485",
      "graduate visa",
      "post study",
      "post-study",
      "after study",
      "temporary graduate",
      "graduated",
      "graduate work",
      "485 visa",
      "mezun",
      "geçici mezun",
    ]) ||
    (hasKw(combined, ["study", "student", "eğitim", "öğrenci"]) &&
      hasKw(norm(input.currentCountry ?? ""), ["australia", "avustralya"]))
  ) {
    found.add("485");
  }

  // Sponsor/employer → 482
  if (hasKw(combined, ["482", "employer", "sponsor", "sponsored", "job offer", "işveren", "sponsorlu"])) {
    found.add("482");
  }

  // Skilled/PR → 189, 190, 491
  if (
    hasKw(combined, [
      "pr",
      "permanent",
      "skilled",
      "points",
      "migrate",
      "migration",
      "189",
      "190",
      "491",
      "nitelikli",
      "puan",
      "kalıcı",
      "göç",
    ])
  ) {
    found.add("189");
    found.add("190");
    found.add("491");
  }

  // Regional → also ensure 491
  if (hasKw(combined, ["regional", "bölgesel"])) {
    found.add("491");
  }

  // Partner → 820_801
  if (
    hasKw(combined, [
      "partner",
      "spouse",
      "marriage",
      "married",
      "de facto",
      "relationship",
      "girlfriend",
      "boyfriend",
      "820",
      "801",
      "eş",
      "evlilik",
      "ilişki",
      "nişan",
    ])
  ) {
    found.add("820_801");
  }

  // Work without explicit sponsor and no other pathway → suggest 482 as needs_more_info
  if (
    hasKw(combined, ["work", "çalış", "iş"]) &&
    !found.has("482") &&
    !found.has("189") &&
    !found.has("500") &&
    !found.has("820_801")
  ) {
    found.add("482");
  }

  return Array.from(found);
}

// ─── Visa name map ────────────────────────────────────────────────────────────

const VISA_NAMES: Record<string, { en: string; tr: string }> = {
  "500": { en: "Student Visa", tr: "Öğrenci Vizesi" },
  "485": { en: "Temporary Graduate Visa (subclass 485)", tr: "Geçici Mezun Vizesi (subclass 485)" },
  "482": { en: "Skills in Demand Visa", tr: "Skills in Demand Vizesi" },
  "189": { en: "Skilled Independent Visa", tr: "Yetenekli Bağımsız Vize" },
  "190": { en: "Skilled Nominated Visa", tr: "Yetenekli Aday Gösterilen Vize" },
  "491": { en: "Skilled Work Regional Visa", tr: "Bölgesel Yetenekli Çalışma Vizesi" },
  "820_801": { en: "Partner Visa (Onshore)", tr: "Partner Vizesi (Yerinde)" },
};

function getPathwayKeyRequirements(
  subclass: string,
  locale: Locale
): string[] {
  const isTr = locale === "tr";

  switch (subclass) {
    case "500":
      return isTr
        ? [
            "Kayıtlı bir eğitim kurumu ve kurs bağlamı",
            "Gerçek öğrenci niyetine ilişkin destekleyici bilgiler",
            "Maddi yeterlilik ve eğitim planı bağlamı",
          ]
        : [
            "A registered education provider and course context",
            "Supporting information relevant to genuine student intent",
            "Financial capacity and study plan context",
          ];
    case "485":
      return isTr
        ? [
            "Tamamlanmış uygun Avustralya niteliği ve CRICOS kayıtlı kurum bağlamı",
            "Son 6 ayda öğrenci vizesi (500) tutulduğuna ilişkin kanıt",
            "İngilizce eşik gereksinimlerine ilişkin bilgiler ve yaş uygunluğu bağlamı",
          ]
        : [
            "Completed Australian qualification from a CRICOS-registered institution",
            "Evidence of having held a Student visa (subclass 500) in the last 6 months",
            "Information relevant to English threshold requirements and age context",
          ];
    case "482":
      return isTr
        ? [
            "Uygun bir işveren sponsorluğu bağlamı",
            "Görev ile uyumlu meslek ve deneyim bilgisi",
            "İngilizce ve iş koşullarına ilişkin destekleyici bilgiler",
          ]
        : [
            "Employer sponsorship context",
            "Occupation and experience information aligned with the role",
            "Supporting information relevant to English and employment conditions",
          ];
    case "189":
      return isTr
        ? [
            "Puan testine konu olabilecek yaş ve İngilizce bilgisi",
            "Meslek ve beceri değerlendirmesi bağlamı",
            "Davet gereksinimine ilişkin genel uygunluk bağlamı",
          ]
        : [
            "Age and English information relevant to a points-tested pathway",
            "Occupation and skills assessment context",
            "General context relevant to the invitation requirement",
          ];
    case "190":
      return isTr
        ? [
            "Puan testine konu olabilecek yaş ve İngilizce bilgisi",
            "Meslek ve beceri değerlendirmesi bağlamı",
            "Eyalet veya bölge adaylığına ilişkin bağlam",
          ]
        : [
            "Age and English information relevant to a points-tested pathway",
            "Occupation and skills assessment context",
            "State or territory nomination context",
          ];
    case "491":
      return isTr
        ? [
            "Puan testine konu olabilecek yaş ve İngilizce bilgisi",
            "Meslek ve beceri değerlendirmesi bağlamı",
            "Bölgesel adaylık veya uygun akraba sponsorluğu bağlamı",
          ]
        : [
            "Age and English information relevant to a points-tested pathway",
            "Occupation and skills assessment context",
            "Regional nomination or relative sponsorship context",
          ];
    case "820_801":
      return isTr
        ? [
            "Uygun partner sponsorluğu statüsü bağlamı",
            "İlişkinin niteliği ve sürekliliğine ilişkin bilgiler",
            "Birlikte yaşam veya ortak yaşam düzenine ilişkin destekleyici bağlam",
          ]
        : [
            "Partner sponsorship status context",
            "Information relevant to the nature and continuity of the relationship",
            "Supporting context about living arrangements or shared life",
          ];
    default:
      return isTr
        ? ["Daha ayrıntılı kişisel bağlam"]
        : ["Additional personal context"];
  }
}

function getPathwaySpecificRisks(
  subclass: string,
  input: ReadinessInput,
  locale: Locale,
  estimatedPoints?: number
): string[] {
  const isTr = locale === "tr";
  const risks: string[] = [];

  if (subclass === "500") {
    if (!hasKw([input.mainGoal ?? "", input.preferredPathway ?? ""].join(" "), ["study", "student", "course", "eğitim", "öğrenci"])) {
      risks.push(
        isTr
          ? "Eğitim amacı açık biçimde belirtilmediği için bu yolun ağırlığı sınırlı kalabilir."
          : "The study purpose is not clearly stated, which may limit the weight of this pathway."
      );
    }
    if (!input.currentCountry) {
      risks.push(
        isTr
          ? "Mevcut ülke bağlamı olmadan öğrenci konumuna ilişkin değerlendirme sınırlı kalır."
          : "Without current-country context, the student-position review remains limited."
      );
    }
  }

  if (subclass === "485") {
    risks.push(
      isTr
        ? "İstihdam sonuçları ve nitelikli yollara geçiş bireysel koşullara bağlı olabilir."
        : "Employment outcomes and transition to skilled pathways may affect this pathway."
    );
    if (!hasKw([input.mainGoal ?? "", input.preferredPathway ?? ""].join(" "), ["study", "student", "graduated", "eğitim", "mezun"])) {
      risks.push(
        isTr
          ? "Eğitim veya mezuniyet bağlamı açık biçimde görünmediği için bu yolun değerlendirmesi sınırlı kalabilir."
          : "The study or graduation context is not clearly visible, which may limit the review of this pathway."
      );
    }
  }

  if (subclass === "482") {
    if (!hasKw([input.sponsorOrFamily ?? "", input.mainGoal ?? ""].join(" "), ["sponsor", "employer", "işveren", "sponsored"])) {
      risks.push(
        isTr
          ? "İşveren sponsorluğu bağlamı açık değil."
          : "Employer sponsorship context is not yet clear."
      );
    }
    if (!input.occupation) {
      risks.push(
        isTr
          ? "Meslek bilgisi olmadan rol uyumu daha sınırlı incelenebilir."
          : "Without occupation information, role alignment can only be reviewed at a limited level."
      );
    }
  }

  if (["189", "190", "491"].includes(subclass)) {
    if (!input.occupation) {
      risks.push(
        isTr
          ? "Meslek bilgisi eksik olduğu için yetenekli yol incelemesi sınırlıdır."
          : "The skilled-pathway review is limited because occupation information is missing."
      );
    }
    if (!input.englishLevel || !input.age) {
      risks.push(
        isTr
          ? "Yaş ve İngilizce bilgisi eksik olduğunda puan testli değerlendirme eksik kalır."
          : "When age and English details are missing, the points-based review remains incomplete."
      );
    }
    if (estimatedPoints !== undefined && estimatedPoints < 65) {
      risks.push(
        isTr
          ? "Mevcut kısmi puan görünümü, tipik minimum eşiğin altında kalmaktadır."
          : "The current partial points picture sits below the typical minimum threshold."
      );
    }
  }

  if (subclass === "190") {
    risks.push(
      isTr
        ? "Eyalet veya bölge adaylığına ilişkin bağlam olmadan bu yol daha temkinli değerlendirilir."
        : "Without nomination context, this pathway is assessed more cautiously."
    );
  }

  if (subclass === "491") {
    if (!hasKw(input.sponsorOrFamily ?? "", ["family", "relative", "akraba", "sponsor"])) {
      risks.push(
        isTr
          ? "Bölgesel adaylık veya uygun akraba sponsorluğu bağlamı henüz net değil."
          : "Regional nomination or relative sponsorship context is not yet clear."
      );
    }
  }

  if (subclass === "820_801") {
    if (!input.sponsorOrFamily) {
      risks.push(
        isTr
          ? "Partner sponsorluğu bağlamı olmadan bu yol sınırlı görünür."
          : "Without partner sponsorship context, this pathway remains limited."
      );
    }
    if (!hasKw([input.mainGoal ?? "", input.sponsorOrFamily ?? ""].join(" "), ["partner", "spouse", "de facto", "eş", "ilişki"])) {
      risks.push(
        isTr
          ? "İlişki bağlamı açık biçimde görünmediği için bu yol için güven seviyesi düşer."
          : "Because the relationship context is not clearly visible, confidence in this pathway is lower."
      );
    }
  }

  if (risks.length === 0) {
    risks.push(
      isTr
        ? "Mevcut bilgiler bu yol için bazı ana sinyaller sunuyor, ancak bireysel bağlam sonucu değiştirebilir."
        : "The available information provides some baseline signals for this pathway, but individual context could change the picture."
    );
  }

  return risks;
}

function getPathwayConfidenceLevel(
  subclass: string,
  input: ReadinessInput,
  relevance: PathwayRelevance,
  dataCompletenessPercentage: number,
  estimatedPoints?: number
): ConfidenceLevel {
  const combinedGoal = [input.mainGoal ?? "", input.preferredPathway ?? ""].join(" ");
  const sponsorText = [input.sponsorOrFamily ?? "", input.mainGoal ?? ""].join(" ");

  if (relevance !== "possible") {
    return relevance === "needs_more_information" ? "low" : "low";
  }

  if (subclass === "500") {
    const base = hasKw(combinedGoal, ["study", "student", "course", "eğitim", "öğrenci"])
      ? "high"
      : "medium";
    if (dataCompletenessPercentage < 40) return "low";
    if (dataCompletenessPercentage < 60 && base === "high") return "medium";
    return base;
  }

  if (subclass === "485") {
    const hasGradContext = hasKw(
      [input.mainGoal ?? "", input.preferredPathway ?? ""].join(" "),
      ["study", "student", "graduated", "graduate", "485", "eğitim", "mezun"]
    );
    const base = hasGradContext ? "medium" : "low";
    if (dataCompletenessPercentage < 40) return "low";
    return base;
  }

  if (subclass === "482") {
    const base = hasKw(sponsorText, ["sponsor", "employer", "işveren", "sponsored"]) && Boolean(input.occupation)
      ? "high"
      : "medium";
    if (dataCompletenessPercentage < 40) return "low";
    if (dataCompletenessPercentage < 60 && base === "high") return "medium";
    return base;
  }

  if (subclass === "189") {
    if (input.occupation && input.age && input.englishLevel && estimatedPoints !== undefined && estimatedPoints >= 65) {
      return dataCompletenessPercentage >= 60 ? "high" : "medium";
    }
    if (dataCompletenessPercentage < 40) return "low";
    return input.occupation && (input.age || input.englishLevel) ? "medium" : "low";
  }

  if (subclass === "190") {
    if (input.occupation && input.age && input.englishLevel && estimatedPoints !== undefined && estimatedPoints >= 65) {
      return dataCompletenessPercentage >= 60 ? "medium" : "low";
    }
    if (dataCompletenessPercentage < 40) return "low";
    return input.occupation ? "medium" : "low";
  }

  if (subclass === "491") {
    if (input.occupation && input.age && input.englishLevel && hasKw(sponsorText, ["family", "relative", "regional", "akraba", "bölgesel"])) {
      return dataCompletenessPercentage >= 60 ? "medium" : "low";
    }
    if (dataCompletenessPercentage < 40) return "low";
    return input.occupation ? "medium" : "low";
  }

  if (subclass === "820_801") {
    const base = hasKw(sponsorText, ["partner", "spouse", "de facto", "eş", "ilişki"]) && Boolean(input.sponsorOrFamily)
      ? "high"
      : "medium";
    if (dataCompletenessPercentage < 40) return "low";
    if (dataCompletenessPercentage < 60 && base === "high") return "medium";
    return base;
  }

  return "low";
}

function getConfidenceExplanation(
  subclass: string,
  input: ReadinessInput,
  locale: Locale,
  confidenceLevel: ConfidenceLevel,
  dataCompletenessPercentage: number,
  estimatedPoints?: number
): string {
  const isTr = locale === "tr";
  const hasAge = Boolean(input.age);
  const hasEnglish = Boolean(input.englishLevel);
  const hasOccupation = Boolean(input.occupation);
  const hasSponsorContext = hasKw(
    [input.sponsorOrFamily ?? "", input.mainGoal ?? ""].join(" "),
    ["sponsor", "employer", "partner", "family", "işveren", "eş", "akraba"]
  );

  if (subclass === "500") {
    return isTr
      ? confidenceLevel === "high"
        ? `Eğitim amacı net görünüyor ve veri tamamlanma düzeyi (%${dataCompletenessPercentage}) bu güven seviyesini destekliyor.`
        : `Eğitim bağlamı mevcut; ancak veri tamamlanma düzeyi (%${dataCompletenessPercentage}) bu güveni sınırlıyor.`
      : confidenceLevel === "high"
        ? `Study intent is clear and the available detail (${dataCompletenessPercentage}%) supports this confidence level.`
        : `There is study context, but available detail (${dataCompletenessPercentage}%) limits confidence.`;
  }

  if (subclass === "485") {
    const hasGradContext = hasKw(
      [input.mainGoal ?? "", input.preferredPathway ?? ""].join(" "),
      ["study", "student", "graduated", "graduate", "485", "eğitim", "mezun"]
    );
    return isTr
      ? hasGradContext
        ? `Eğitim veya mezuniyet bağlamı mevcut; veri tamamlanma düzeyi (%${dataCompletenessPercentage}) bu yolun genel bir göstergesi olarak kullanılıyor.`
        : `485 yolu için eğitim/mezuniyet bağlamı veya veri tamamlanma düzeyi (%${dataCompletenessPercentage}) sınırlı olduğu için güven daha temkinli.`
      : hasGradContext
        ? `Study or graduation context is visible; available detail (${dataCompletenessPercentage}%) is used as a general indicator for this pathway.`
        : `Graduate or study context or available detail (${dataCompletenessPercentage}%) is limited, so confidence for the 485 pathway remains cautious.`;
  }

  if (subclass === "482") {
    return isTr
      ? hasSponsorContext && hasOccupation
        ? `Sponsor ve rol bağlamı mevcut; veri tamamlanma düzeyi (%${dataCompletenessPercentage}) ile birlikte güven destekleniyor.`
        : `Sponsor/rol bağlamı veya veri tamamlanma düzeyi (%${dataCompletenessPercentage}) sınırlı olduğu için güven daha temkinli.`
      : hasSponsorContext && hasOccupation
        ? `Sponsor and role context are visible, and the available detail (${dataCompletenessPercentage}%) supports this confidence level.`
        : `Sponsor/role context or available detail (${dataCompletenessPercentage}%) is limited, so confidence remains cautious.`;
  }

  if (["189", "190", "491"].includes(subclass)) {
    const pointsText =
      estimatedPoints === undefined
        ? isTr
          ? "kısmi puan görünümü yok"
          : "no partial points picture"
        : isTr
          ? `kısmi puan görünümü ${estimatedPoints}`
          : `partial points picture is ${estimatedPoints}`;
    return isTr
      ? `Güven seviyesi; yaş/İngilizce/meslek girdileri, ${pointsText} ve veri tamamlanma düzeyi (%${dataCompletenessPercentage}) ile göstergesel olarak hesaplanmıştır.`
      : `Confidence is estimated indicatively from age/English/occupation inputs, ${pointsText}, and available detail (${dataCompletenessPercentage}%).`;
  }

  if (subclass === "820_801") {
    return isTr
      ? hasSponsorContext
        ? `İlişki/sponsor bağlamı mevcut ve veri tamamlanma düzeyi (%${dataCompletenessPercentage}) güveni destekliyor.`
        : `İlişki/sponsor bağlamı veya veri tamamlanma düzeyi (%${dataCompletenessPercentage}) sınırlı olduğu için güven düşüktür.`
      : hasSponsorContext
        ? `Confidence is stronger with relationship/sponsor context and current available detail (${dataCompletenessPercentage}%).`
        : `Confidence is lower when relationship/sponsor context or available detail (${dataCompletenessPercentage}%) is limited.`;
  }

  const knownSignals = [hasAge, hasEnglish, hasOccupation, hasSponsorContext].filter(Boolean)
    .length;
  return isTr
    ? `Güven seviyesi, mevcut ${knownSignals}/4 ana sinyal ve %${dataCompletenessPercentage} veri tamamlanma düzeyi ile genel bir gösterge olarak oluşturuldu.`
    : `Confidence is shown as a general indicator based on ${knownSignals}/4 core signals and ${dataCompletenessPercentage}% available detail.`;
}

// ─── Pathway reason builder ───────────────────────────────────────────────────

function buildPathwayEntry(
  subclass: string,
  input: ReadinessInput,
  locale: Locale,
  dataCompletenessPercentage: number,
  estimatedPoints?: number
): PathwayComparison {
  const isTr = locale === "tr";
  const names = VISA_NAMES[subclass] ?? {
    en: `Subclass ${subclass}`,
    tr: `Alt sınıf ${subclass}`,
  };
  const visaName = isTr ? names.tr : names.en;

  let reason: string;
  let relevance: PathwayRelevance;

  const goalText = [input.mainGoal ?? "", input.preferredPathway ?? ""].join(" ");
  const sponsorText = [input.sponsorOrFamily ?? "", input.mainGoal ?? ""].join(" ");

  if (subclass === "500") {
    const studySignal = hasKw(goalText, ["study", "student", "course", "eğitim", "öğrenci"]);
    relevance = studySignal ? "possible" : "needs_more_information";
    reason = isTr
      ? studySignal
        ? "Eğitim hedefi, 500 Öğrenci Vizesinin olası bir yol olabileceğini göstermektedir. Bu yalnızca genel bilgidir ve kişisel duruma göre değişebilir."
        : "500 Öğrenci Vizesi, Avustralya'da kayıtlı bir kurumda öğrenim için ilgili olabilir. Daha fazla bağlam bu değerlendirmeyi destekleyecektir."
      : studySignal
        ? "The study goal indicates the Student Visa (subclass 500) may be a possible pathway. This is general information only and depends on individual circumstances."
        : "The 500 Student Visa may be relevant for study at a registered Australian institution. More context would support this assessment.";
  } else if (subclass === "485") {
    const hasGradSignal = hasKw(goalText, ["study", "student", "graduated", "graduate", "485", "eğitim", "mezun"]);
    relevance = hasGradSignal ? "possible" : "needs_more_information";
    reason = isTr
      ? hasGradSignal
        ? "485 Geçici Mezun Vizesi (Post-Yükseköğretim Çalışma akışı), Avustralya'da uygun bir kurumdan mezun olan kişiler için ilgili bir yol olabilir. Bu yalnızca genel bilgidir ve bireysel koşullara bağlıdır."
        : "485 Geçici Mezun Vizesi, Avustralya'da uygun çalışmayı tamamlayan mezunlar için ilgili olabilir. Bu yolun değerlendirilebilmesi için daha fazla eğitim ve mezuniyet bağlamı gereklidir."
      : hasGradSignal
        ? "The 485 Temporary Graduate Visa (Post-Higher Education Work stream) may be a possible pathway for those who have completed approved study in Australia. This is general information only and depends on individual circumstances."
        : "The 485 Temporary Graduate Visa may be relevant for those who have completed Australian study at an approved institution. More graduate or study context would support this assessment.";
  } else if (subclass === "482") {
    const hasSponsor = hasKw(sponsorText, ["sponsor", "employer", "işveren", "sponsored"]);
    relevance = hasSponsor ? "possible" : "needs_more_information";
    reason = isTr
      ? hasSponsor
        ? "İşveren sponsoru bağlamı, 482 Skills in Demand Vizesinin olası bir yol olabileceğini göstermektedir. Bu kişisel duruma göre değişebilir."
        : "482 Skills in Demand Vizesi bir işveren sponsoru gerektirmektedir. Sponsor bağlamı bu değerlendirme için önemlidir."
      : hasSponsor
        ? "The employer sponsor context indicates the 482 Skills in Demand Visa may be a possible pathway. This depends on individual circumstances."
        : "The 482 Skills in Demand Visa requires an employer sponsor. Sponsor context is important to support this assessment.";
  } else if (subclass === "189") {
    relevance = input.occupation ? "possible" : "needs_more_information";
    reason = isTr
      ? "189 Yetenekli Bağımsız Vizesi, puan testi ve davet gereksinimi olan bağımsız bir yoldur. Bu yalnızca genel bilgidir ve kişisel duruma göre değişebilir."
      : "The 189 Skilled Independent Visa is a points-tested pathway requiring an invitation. This is general information only and depends on individual circumstances.";
  } else if (subclass === "190") {
    relevance = input.occupation ? "possible" : "needs_more_information";
    reason = isTr
      ? "190 Yetenekli Aday Gösterilen Vizesi, eyalet veya bölge adaylığı gerektiren bir puan testi yoludur. Bu yalnızca genel bilgidir ve kişisel duruma göre değişebilir."
      : "The 190 Skilled Nominated Visa is a points-tested pathway requiring state or territory nomination. This is general information only and depends on individual circumstances.";
  } else if (subclass === "491") {
    relevance = input.occupation ? "possible" : "needs_more_information";
    reason = isTr
      ? "491 Bölgesel Yetenekli Çalışma Vizesi, bölgesel adaylık veya akraba sponsorluğu gerektiren geçici bir yoldur. Bu yalnızca genel bilgidir ve kişisel duruma göre değişebilir."
      : "The 491 Skilled Work Regional Visa is a provisional regional pathway requiring nomination or relative sponsorship. This is general information only and depends on individual circumstances.";
  } else if (subclass === "820_801") {
    const hasPartnerSignal = hasKw(sponsorText, ["partner", "citizen", "pr", "permanent", "nz", "eş", "vatandaş", "daimi"]);
    relevance = hasPartnerSignal ? "possible" : "needs_more_information";
    reason = isTr
      ? hasPartnerSignal
        ? "Partner bağlamı, 820/801 Partner Vizesinin olası bir yol olabileceğini göstermektedir. Bu kişisel duruma ve Avustralya'daki sponsor statüsüne göre değişebilir."
        : "820/801 Partner Vizesi için Avustralya vatandaşı, daimi oturum veya NZ vatandaşı olan bir sponsorun varlığı gerekmektedir. Sponsor bilgisi bu değerlendirmeyi destekleyecektir."
      : hasPartnerSignal
        ? "The partner context indicates the 820/801 Partner Visa may be a possible pathway. This depends on individual circumstances and the sponsor's Australian status."
        : "The 820/801 Partner Visa requires a sponsor who is an Australian citizen, permanent resident, or NZ citizen. Sponsor information would support this assessment.";
  } else {
    relevance = "not_enough_information";
    reason = isTr
      ? "Bu yol mevcut bilgilere dayanarak incelemeye değer olabilir."
      : "This pathway may be relevant to explore based on available information.";
  }

  const confidenceLevel = getPathwayConfidenceLevel(
    subclass,
    input,
    relevance,
    dataCompletenessPercentage,
    estimatedPoints
  );
  const confidenceExplanation = getConfidenceExplanation(
    subclass,
    input,
    locale,
    confidenceLevel,
    dataCompletenessPercentage,
    estimatedPoints
  );
  const difficulty = getDifficultyForPathway({ subclass });
  const requirementType = getRequirementType(
    { subclass },
    locale
  );
  const userRelativePosition = getUserRelativePosition(
    { relevance, confidenceLevel },
    locale
  );
  const keyRequirements = getPathwayKeyRequirements(subclass, locale);
  const pathwaySpecificRisks = getPathwaySpecificRisks(
    subclass,
    input,
    locale,
    estimatedPoints
  );

  return {
    subclass,
    visaName,
    reason,
    relevance,
    confidenceLevel,
    confidenceExplanation,
    difficulty,
    requirementType,
    userRelativePosition,
    keyRequirements,
    pathwaySpecificRisks,
  };
}

function getDifficultyForPathway(
  pathway: Pick<PathwayComparison, "subclass">
): "low" | "medium" | "high" {
  if (pathway.subclass === "general") return "medium";
  if (pathway.subclass === "500") return "medium";
  if (pathway.subclass === "485") return "medium";
  if (pathway.subclass === "482") return "medium";
  if (pathway.subclass === "820_801") return "high";
  if (["189", "190", "491"].includes(pathway.subclass)) return "high";
  return "medium";
}

function getRequirementType(
  pathway: Pick<PathwayComparison, "subclass">,
  locale: Locale
): string {
  const isTr = locale === "tr";
  if (pathway.subclass === "500") {
    return isTr
      ? "Eğitim ve mali kanıt ağırlıklı"
      : "Study and financial evidence focused";
  }
  if (pathway.subclass === "485") {
    return isTr
      ? "Mezuniyet, İngilizce ve polis taraması kanıtı odaklı"
      : "Graduation, English, and police clearance evidence focused";
  }
  if (pathway.subclass === "482") {
    return isTr
      ? "İşveren sponsorluğu ve rol uyumu"
      : "Employer sponsorship and role alignment";
  }
  if (["189", "190", "491"].includes(pathway.subclass)) {
    return isTr
      ? "Puan, meslek ve davet/adaylık odaklı"
      : "Points, occupation, and invitation/nomination based";
  }
  if (pathway.subclass === "820_801") {
    return isTr
      ? "İlişki ve sponsor kanıtı odaklı"
      : "Relationship and sponsor evidence based";
  }
  return isTr ? "Daha fazla kişisel bağlam gerektirir" : "Requires more personal context";
}

function getUserRelativePosition(
  pathway: Pick<PathwayComparison, "relevance" | "confidenceLevel">,
  locale: Locale
): string {
  const isTr = locale === "tr";

  if (pathway.relevance === "not_enough_information") {
    return isTr
      ? "Konumlandırma için veri yetersiz"
      : "Insufficient data for relative positioning";
  }

  if (pathway.relevance === "needs_more_information") {
    return isTr
      ? "Ek kişisel veriyle netleşebilir"
      : "Could become clearer with additional personal data";
  }

  if (pathway.confidenceLevel === "high") {
    return isTr
      ? "Mevcut veride göreli olarak daha güçlü"
      : "Relatively stronger in current data";
  }

  if (pathway.confidenceLevel === "medium") {
    return isTr
      ? "Orta düzey sinyal, belirgin boşluklarla"
      : "Moderate signal with notable gaps";
  }

  return isTr
    ? "Düşük sinyal, sınırlı uyum görünümü"
    : "Lower signal with limited alignment";
}

function buildDataCompleteness(
  input: ReadinessInput,
  locale: Locale
): DataCompleteness {
  const isTr = locale === "tr";
  const fields: Array<{ value?: string; label: string }> = [
    {
      value: input.mainGoal,
      label: isTr ? "Ana hedef" : "Main goal",
    },
    {
      value: input.preferredPathway,
      label: isTr ? "Vize ilgi alanı" : "Visa interest",
    },
    {
      value: input.currentCountry,
      label: isTr ? "Bulunduğunuz ülke" : "Current country",
    },
    {
      value: input.passportCountry,
      label: isTr ? "Pasaport ülkesi" : "Passport country",
    },
    {
      value: input.age,
      label: isTr ? "Yaş" : "Age",
    },
    {
      value: input.occupation,
      label: isTr ? "Meslek" : "Occupation",
    },
    {
      value: input.englishLevel,
      label: isTr ? "İngilizce seviyesi" : "English level",
    },
    {
      value: input.sponsorOrFamily,
      label: isTr ? "Sponsor/aile durumu" : "Sponsor/family context",
    },
    {
      value: input.biggestConcern,
      label: isTr ? "En büyük endişe" : "Biggest concern",
    },
  ];

  const completed = fields.filter((f) => Boolean(f.value)).length;
  const percentage = Math.round((completed / fields.length) * 100);
  const missingFields = fields
    .filter((f) => !f.value)
    .map((f) => f.label);

  return { percentage, missingFields };
}

function hasClearGoal(mainGoal?: string): boolean {
  if (!mainGoal) return false;
  const trimmed = mainGoal.trim();
  if (!trimmed) return false;
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  return wordCount >= 3;
}

export function buildLeadQuality(input: ReadinessInput): LeadQuality {
  const completeness = buildDataCompleteness(input, input.locale).percentage;
  const occupationConfirmed = (input.occupationConfirmed ?? "").trim().toLowerCase() === "yes";

  const englishIsValid = Boolean(input.englishLevel?.trim() && parseEnglishOption(input.englishLevel) !== null);
  const occupationHasMatch = Boolean(
    input.occupation?.trim() && checkOccupation({ occupation: input.occupation }).matches.length > 0
  );
  const clearOccupationMatch = occupationConfirmed || occupationHasMatch;
  const timelineDefined = Boolean(input.timeline?.trim());
  const goalClear = hasClearGoal(input.mainGoal);
  const completenessScore = Math.round(completeness * 0.4);

  let score = 0;
  if (englishIsValid) score += 20;
  if (clearOccupationMatch) score += 20;
  if (timelineDefined) score += 10;
  if (goalClear) score += 10;
  score += completenessScore;

  score = Math.max(0, Math.min(100, score));

  const leadTier: LeadTier =
    score >= 70 ? "High intent" : score >= 40 ? "Moderate intent" : "Low intent";

  return {
    leadValueScore: score,
    leadScore: score,
    leadTier,
  };
}

function getDataCompletenessLabel(score: number, locale: Locale): string {
  const isTr = locale === "tr";
  if (score >= 80) return isTr ? "Yüksek tamamlanma" : "High completeness";
  if (score >= 50) return isTr ? "Orta tamamlanma" : "Medium completeness";
  return isTr ? "Düşük tamamlanma" : "Low completeness";
}

function buildDocumentReadinessIndicator(input: ReadinessInput): IndicatorLevel {
  const englishTestTaken = (input.englishTestTaken ?? "").trim().toLowerCase() === "yes";
  const skillsSignal = (input.occupationConfirmed ?? "").trim().toLowerCase() === "yes";

  const readinessSignals = [englishTestTaken, skillsSignal].filter(Boolean).length;

  if (readinessSignals === 2) return "high";
  if (readinessSignals === 1) return "medium";
  return "low";
}

function buildInformationCoverageLevel(dataCompletenessScore: number): InformationCoverageLevel {
  if (dataCompletenessScore >= 80) return "comprehensive";
  if (dataCompletenessScore >= 50) return "partial";
  return "initial";
}

function buildReportIndicators(params: {
  locale: Locale;
  dataCompleteness: DataCompleteness;
  input: ReadinessInput;
}): ReportIndicators {
  const { locale, dataCompleteness, input } = params;
  const isTr = locale === "tr";

  const dataCompletenessScore = dataCompleteness.percentage;
  const dataCompletenessLabel = getDataCompletenessLabel(dataCompletenessScore, locale);
  const documentReadinessIndicator = buildDocumentReadinessIndicator(input);
  const informationCoverageLevel = buildInformationCoverageLevel(dataCompletenessScore);
  const explanation = isTr
    ? "Bu göstergeler yalnızca bilgi tamamlanmasını yansıtır ve vize sonucunu garanti etmez."
    : "These indicators reflect information coverage only and do not predict visa outcomes.";

  return {
    dataCompletenessScore,
    dataCompletenessLabel,
    documentReadinessIndicator,
    informationCoverageLevel,
    explanation,
  };
}

function buildPrimaryGap(params: {
  locale: Locale;
  pathways: PathwayComparison[];
  dataCompleteness: DataCompleteness;
  missingInformation: string[];
  riskIndicators: ReturnType<typeof buildRiskIndicators>;
  pointsEstimate?: PointsEstimate;
}): string {
  const { locale, pathways, dataCompleteness, missingInformation, riskIndicators, pointsEstimate } = params;
  const isTr = locale === "tr";

  const hasSkilled = pathways.some((p) => ["189", "190", "491"].includes(p.subclass));
  if (hasSkilled && pointsEstimate?.estimatedPoints !== undefined && pointsEstimate.estimatedPoints < 65) {
    return isTr
      ? "Birincil boşluk: Mevcut kısmi puan görünümü puan testli yollar için sınırlayıcı kalıyor."
      : "Internal signal: The current partial points picture remains a limiting factor for points-tested pathways.";
  }

  const priorityMissing = [
    "Occupation",
    "Meslek",
    "English level",
    "İngilizce seviyesi",
    "Sponsor",
    "sponsor",
    "partner",
    "Partner",
  ];
  const majorMissing = missingInformation.find((item) =>
    priorityMissing.some((needle) => item.includes(needle))
  );
  if (majorMissing) {
    return isTr
      ? `Birincil boşluk: ${majorMissing} alanı netleşmeden karşılaştırmalı değerlendirme sınırlı kalır.`
      : `Internal signal: Comparative assessment remains limited until ${majorMissing} is clarified.`;
  }

  const highRisk = riskIndicators.find((risk) => risk.level === "high");
  if (highRisk) {
    return isTr
      ? `Birincil boşluk: "${highRisk.title}" başlığındaki risk etkisi baskın görünüyor.`
      : `Internal signal: The risk signal in "${highRisk.title}" appears to be the dominant limiter.`;
  }

  if (dataCompleteness.percentage < 60) {
    return isTr
      ? `Birincil boşluk: Veri tamamlanma düzeyi (%${dataCompleteness.percentage}) karar-destek sinyallerini sınırlıyor.`
      : `Internal signal: Available detail (${dataCompleteness.percentage}%) is limiting the decision-support signal strength.`;
  }

  return isTr
    ? "Birincil boşluk: Karşılaştırmalı tabloyu güçlendirecek ek kişisel bağlam ihtiyacı."
    : "Internal signal: Additional personal context is needed to strengthen the comparison table.";
}

function buildFactorsAffectingPathways(
  locale: Locale,
  input: ReadinessInput,
  dataCompleteness: DataCompleteness,
  hasSkilledPathway: boolean,
  hasEmployerPathway: boolean,
  hasPartnerPathway: boolean
): string[] {
  const isTr = locale === "tr";
  const items: string[] = [];

  if (!input.englishLevel?.trim()) {
    items.push(
      isTr
        ? "İngilizce seviyesi netleşmediği için puan testli ve işveren odaklı yolların karşılaştırması zayıflayabilir."
        : "Without a defined English level, comparison signals for points-tested and employer pathways can remain weak."
    );
  }

  if (!input.occupation?.trim()) {
    items.push(
      isTr
        ? "Meslek bilgisi olmadan beceri değerlendirmesi gerektiren yolların göreli gücü netleşmez."
        : "Without occupation detail, the relative strength of pathways that rely on skills assessment remains unclear."
    );
  }

  if (!input.sponsorOrFamily?.trim()) {
    items.push(
      isTr
        ? "Sponsor/aile bağlamı eksik olduğunda işveren veya partner sponsorluğu içeren seçenekler sınırlı görünür."
        : "When sponsorship/family context is missing, employer- or partner-sponsored options can appear more limited."
    );
  }

  if (dataCompleteness.percentage < 60) {
    items.push(
      isTr
        ? `Veri tamamlanma düzeyi (%${dataCompleteness.percentage}) düşük olduğu için yol karşılaştırmasındaki güven sinyali azalır.`
        : `Low information completeness (${dataCompleteness.percentage}%) reduces confidence in pathway comparison signals.`
    );
  }

  if (hasSkilledPathway) {
    items.push(
      isTr
        ? "Puan testli yollar için davet seviyeleri ve eyalet/bölge öncelikleri dönemsel dalgalanabilir."
        : "For points-tested pathways, invitation levels and state/territory priorities may fluctuate by period."
    );
  }

  if (hasEmployerPathway) {
    items.push(
      isTr
        ? "İşverenin rol, ücret ve sponsorluk gerekliliklerine uygunluğu sonucu etkileyebilir."
        : "Employer alignment with role, salary, and sponsorship settings can affect pathway viability signals."
    );
  }

  if (hasPartnerPathway) {
    items.push(
      isTr
        ? "İlişki kanıtlarının türü ve süreklilik düzeyi partner yolunun gücünü değiştirebilir."
        : "The type and continuity of relationship evidence can alter the relative strength of partner pathways."
    );
  }

  if (!input.currentCountry?.trim()) {
    items.push(
      isTr
        ? "Mevcut ülke bilgisi olmadan bazı başvuru senaryolarının uygulanabilirlik değerlendirmesi eksik kalabilir."
        : "Without current-country context, feasibility checks for some application scenarios may stay incomplete."
    );
  }

  if (!input.mainGoal?.trim()) {
    items.push(
      isTr
        ? "Ana hedef netleşmediğinde uygun yol önceliği daha düşük güvenle sıralanır."
        : "When the primary migration goal is unclear, pathway prioritization is ranked with lower confidence."
    );
  }

  const fallbackFactors = [
    isTr
      ? "Resmi kriter ve politika güncellemeleri karşılaştırmalı sinyalleri dönemsel olarak değiştirebilir."
      : "Official criteria and policy updates can periodically shift comparative pathway signals.",
    isTr
      ? "Sunulan bilgilerin belgeyle tutarlılığı, yol sıralamasında nihai ağırlığı etkileyebilir."
      : "How submitted information aligns with supporting evidence can influence final pathway weighting.",
    isTr
      ? "Başvuru zamanlaması, dönemsel davet ve işlem öncelikleri nedeniyle sonuç sinyallerini etkileyebilir."
      : "Application timing can influence outcome signals due to period-based invitation and processing priorities.",
  ];

  for (const factor of fallbackFactors) {
    if (items.length >= 3) break;
    if (!items.includes(factor)) items.push(factor);
  }

  return items.slice(0, 5);
}

// ─── Points estimate ──────────────────────────────────────────────────────────

function parseAgeOption(ageStr: string): AgeOption | null {
  const n = parseInt(ageStr.trim(), 10);
  if (isNaN(n)) return null;
  if (n < 18) return null;
  if (n <= 24) return "18_24";
  if (n <= 32) return "25_32";
  if (n <= 39) return "33_39";
  if (n <= 44) return "40_44";
  return "45_plus";
}

function parseEnglishOption(raw: string): EnglishOption | null {
  const s = raw.toLowerCase();
  if (s.includes("superior") || /ielts\s*[89]/.test(s) || /pte\s*7[0-9]/.test(s) || /pte\s*8/.test(s))
    return "superior";
  if (s.includes("proficient") || /ielts\s*7/.test(s) || /pte\s*6[0-9]/.test(s))
    return "proficient";
  if (s.includes("competent") || /ielts\s*6/.test(s) || /pte\s*5[0-9]/.test(s) || s.includes("functional"))
    return "competent";
  return null;
}

function buildPointsEstimate(input: ReadinessInput, locale: Locale): PointsEstimate {
  const isTr = locale === "tr";
  const ageOption = input.age ? parseAgeOption(input.age) : null;
  const englishOption = input.englishLevel ? parseEnglishOption(input.englishLevel) : null;

  const missingFactors = [
    ...(isTr
      ? ["Yurt dışı istihdam", "Avustralya istihdam", "Eğitim", "Bonus faktörler", "Partner durumu"]
      : ["Overseas employment", "Australian employment", "Education", "Bonus factors", "Partner status"]),
  ];

  if (!ageOption && !englishOption) {
    return {
      appliesTo: ["189", "190", "491"],
      estimatedPoints: undefined,
      breakdown: [],
      note: isTr
        ? "Puan tahmini için yaş ve İngilizce seviyesi sağlanmadı. Puan hesaplaması mevcut değil."
        : "Age and English level were not provided. A points estimate is not available.",
    };
  }

  const result = calculateSkilledPoints({
    age: ageOption ?? "18_24",
    english: englishOption ?? "competent",
    overseasEmployment: "lt3",
    australianEmployment: "lt1",
    education: "none_or_unsure",
    specialistEducation: false,
    australianStudyRequirement: false,
    professionalYear: false,
    credentialledCommunityLanguage: false,
    regionalStudy: false,
    partner: "none_or_unsure",
    hasStateNomination190: false,
    hasNominationOrSponsorship491: false,
  });

  const breakdown = [
    ageOption
      ? {
          label: isTr ? "Yaş puanı" : "Age points",
          points: result.breakdown.age,
          note: input.age,
        }
      : null,
    englishOption
      ? {
          label: isTr ? "İngilizce seviyesi puanı" : "English level points",
          points: result.breakdown.english,
          note: input.englishLevel,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  const estimatedPoints = breakdown.reduce((sum, item) => sum + item.points, 0);

  const missingStr = missingFactors.join(", ");
  const note = isTr
    ? `Bu yalnızca yaş${ageOption ? "" : " (belirtilmedi)"} ve İngilizce seviyesine${englishOption ? "" : " (belirtilmedi)"} dayalı kısmi bir tahmindir. Diğer faktörler dahil değil: ${missingStr}. Gerçek puan durumu kişisel duruma göre değişebilir.`
    : `This is a partial estimate based on age${ageOption ? "" : " (not provided)"} and English level${englishOption ? "" : " (not provided)"}. Other factors not included: ${missingStr}. Actual points position depends on individual circumstances.`;

  return {
    appliesTo: ["189", "190", "491"],
    estimatedPoints,
    breakdown,
    note,
  };
}

// ─── Occupation indication ────────────────────────────────────────────────────

function buildOccupationIndication(
  input: ReadinessInput,
  locale: Locale
): OccupationIndication | undefined {
  const isTr = locale === "tr";

  if (!input.occupation) return undefined;

  const result = checkOccupation({ occupation: input.occupation });

  if (result.matches.length === 0) {
    return {
      occupation: input.occupation,
      matches: [],
      note: isTr
        ? `"${input.occupation}" için stored occupation verilerinde eşleşme bulunamadı. Bu, mesleğin listede olmadığı anlamına gelmez; resmi kaynakların incelenmesi önerilir.`
        : `No matches were found in the stored occupation data for "${input.occupation}". This does not mean the occupation is not listed. Reviewing official sources may be relevant.`,
    };
  }

  return {
    occupation: result.query,
    matches: result.matches.map((m) => ({
      title: m.title,
      relevantVisas: m.relevantVisas,
    })),
    note: isTr
      ? `Stored verilerde ${result.matches.length} olası meslek eşleşmesi bulundu. Bu yalnızca genel bilgi amaçlıdır ve kişisel duruma göre değişebilir. Resmi bir beceri değerlendirmesi ayrı bir süreçtir.`
      : `${result.matches.length} possible occupation match(es) found in stored data. This is general information only and depends on individual circumstances. A formal skills assessment is a separate step.`,
  };
}

// ─── Missing information ──────────────────────────────────────────────────────

function buildMissingInformation(
  input: ReadinessInput,
  subclasses: string[],
  locale: Locale
): string[] {
  const isTr = locale === "tr";
  const missing: string[] = [];
  const skilled = subclasses.some((s) => ["189", "190", "491"].includes(s));
  const has485 = subclasses.includes("485");
  const has482 = subclasses.includes("482");
  const hasPartner = subclasses.includes("820_801");

  if (!input.mainGoal && subclasses.length === 0) {
    missing.push(isTr ? "Ana hedef veya vize ilgi alanı" : "Main goal or visa interest");
  }
  if (!input.currentCountry) {
    missing.push(isTr ? "Bulunduğunuz ülke" : "Current country");
  }
  if (!input.passportCountry) {
    missing.push(isTr ? "Pasaport ülkesi" : "Passport country");
  }
  if (!input.age) {
    missing.push(isTr ? "Yaş" : "Age");
  }
  if (skilled && !input.occupation) {
    missing.push(
      isTr
        ? "Meslek veya eğitim geçmişi (yetenekli yol için)"
        : "Occupation or study background (for skilled pathway)"
    );
  }
  if ((skilled || has482 || has485) && !input.englishLevel) {
    missing.push(isTr ? "İngilizce seviyesi" : "English level");
  }
  if ((has482 || hasPartner) && !input.sponsorOrFamily) {
    missing.push(
      isTr
        ? "Sponsor, partner veya Avustralya'daki aile bağlamı"
        : "Sponsor, partner, or family context in Australia"
    );
  }

  return missing;
}

// ─── Disclaimer ───────────────────────────────────────────────────────────────

function buildDisclaimer(locale: Locale): string {
  return locale === "tr"
    ? "Bu rapor yalnızca genel bilgi içermektedir. Göç tavsiyesi, hukuki tavsiye veya vize sonucu tahmini sağlamaz. Kişisel durumunuza göre tavsiye için kayıtlı bir göç danışmanı veya Avustralya hukuk uygulayıcısı ile görüşün."
    : "This report contains general information only. It does not provide migration advice, legal advice, or predict visa outcomes. For advice based on personal circumstances, speak with a registered migration agent or Australian legal practitioner.";
}

function buildKeyVisaRequirements(
  pathways: PathwayComparison[]
): KeyVisaRequirement[] {
  return pathways
    .filter((pathway) => pathway.subclass !== "general")
    .map((pathway) => ({
      pathway: `${pathway.visaName} (${pathway.subclass})`,
      items: pathway.keyRequirements,
    }));
}

function buildExecutiveSummary(
  input: ReadinessInput,
  pathways: PathwayComparison[],
  locale: Locale,
  missingInformation: string[],
  estimatedPoints?: number
): string[] {
  const isTr = locale === "tr";
  const strongestPathway = pathways.find((pathway) => pathway.subclass !== "general");
  const highConfidenceCount = pathways.filter((pathway) => pathway.confidenceLevel === "high").length;
  const skilledVisible = pathways.some((pathway) => ["189", "190", "491"].includes(pathway.subclass));

  const items: string[] = [];

  if (strongestPathway) {
    items.push(
      isTr
        ? `${strongestPathway.visaName} (${strongestPathway.subclass}) yolu mevcut bilgiler içinde daha güçlü bir sinyal göstermektedir ve güven seviyesi ${strongestPathway.confidenceLevel === "high" ? "yüksek" : strongestPathway.confidenceLevel === "medium" ? "orta" : "düşük"} görünmektedir.`
        : `${strongestPathway.visaName} (${strongestPathway.subclass}) shows the strongest signal in the current information, with ${strongestPathway.confidenceLevel} confidence.`
    );
  } else {
    items.push(
      isTr
        ? "Mevcut bilgi seti belirli bir vize yolunu güçlü biçimde öne çıkarmamaktadır."
        : "The current information set does not strongly point to one visa pathway yet."
    );
  }

  items.push(
    isTr
      ? highConfidenceCount > 0
        ? `Birden fazla yol ilgili görünebilir; bu nedenle rapor tek bir sonuç yerine karşılaştırmalı bir görünüm sunmaktadır.`
        : `Bu rapor, daha fazla bilgi sağlandığında değişebilecek erken aşama bir yapılandırılmış görünüm sunmaktadır.`
      : highConfidenceCount > 0
          ? "More than one possible pathway may be relevant, so this report is presented as a comparison rather than a single outcome."
        : "This report presents an early structured view that could change when more detail is available."
  );

  if (skilledVisible && estimatedPoints !== undefined) {
    items.push(
      isTr
        ? `Kısmi puan görünümü ${estimatedPoints} olarak oluşmuştur; bu rakam yalnızca sınırlı girdilere dayanmaktadır.`
        : `The partial points picture is ${estimatedPoints}, and that figure depends on limited inputs only.`
    );
  }

  if (missingInformation.length > 0) {
    items.push(
      isTr
        ? `Eksik bilgi alanları (${missingInformation.join(", ")}) bu rapordaki güven seviyelerini aşağı çekebilir.`
        : `Missing information areas (${missingInformation.join(", ")}) may reduce the confidence levels shown in this report.`
    );
  }

  if (input.biggestConcern) {
    items.push(
      isTr
        ? `Belirtilen ana endişe (${input.biggestConcern}) rapordaki risk ve gereklilik vurgularını etkilemektedir.`
        : `The stated main concern (${input.biggestConcern}) influences the report's risk and requirement emphasis.`
    );
  }

  return items;
}

// Per-pathway metadata used in strength comparison
const PATHWAY_STRENGTH_META: Record<
  string,
  {
    friction: "low" | "medium" | "high";
    evidenceLoad: "low" | "medium" | "high";
    typicalPathEn: string;
    typicalPathTr: string;
  }
> = {
  "500": {
    friction: "medium",
    evidenceLoad: "medium",
    typicalPathEn: "Study pathway",
    typicalPathTr: "Eğitim yolu",
  },
  "485": {
    friction: "medium",
    evidenceLoad: "medium",
    typicalPathEn: "Post-study temporary graduate pathway",
    typicalPathTr: "Mezuniyet sonrası geçici mezun yolu",
  },
  "482": {
    friction: "medium",
    evidenceLoad: "high",
    typicalPathEn: "Employer-sponsored work pathway",
    typicalPathTr: "İşveren sponsorlu çalışma yolu",
  },
  "189": {
    friction: "high",
    evidenceLoad: "high",
    typicalPathEn: "Invitation-based skilled pathway",
    typicalPathTr: "Davet tabanlı nitelikli yol",
  },
  "190": {
    friction: "high",
    evidenceLoad: "high",
    typicalPathEn: "State or territory nomination pathway",
    typicalPathTr: "Eyalet veya bölge adaylık yolu",
  },
  "491": {
    friction: "medium",
    evidenceLoad: "high",
    typicalPathEn: "Regional provisional pathway",
    typicalPathTr: "Bölgesel geçici yol",
  },
  "820_801": {
    friction: "high",
    evidenceLoad: "high",
    typicalPathEn: "Onshore partner pathway",
    typicalPathTr: "Avustralya içi partner yolu",
  },
};

function buildPathwayStrengthComparison(
  pathways: PathwayComparison[],
  locale: Locale
): PathwayStrengthComparison[] {
  const isTr = locale === "tr";

  function strengthFor(pathway: PathwayComparison): "limited" | "moderate" | "strong" {
    if (pathway.confidenceLevel === "high" && pathway.difficulty !== "high") return "strong";
    if (pathway.confidenceLevel === "low" || pathway.relevance !== "possible") return "limited";
    return "moderate";
  }

  return pathways.map((pathway) => {
    const strength = strengthFor(pathway);
    const meta = PATHWAY_STRENGTH_META[pathway.subclass];
    const friction: "low" | "medium" | "high" = meta?.friction ?? (pathway.difficulty === "high" ? "high" : pathway.difficulty === "medium" ? "medium" : "low");
    const evidenceLoad: "low" | "medium" | "high" = meta?.evidenceLoad ?? "medium";
    const typicalPath = meta
      ? isTr ? meta.typicalPathTr : meta.typicalPathEn
      : isTr ? "Genel yol" : "General pathway";

    const strengthLabel = isTr
      ? strength === "strong" ? "daha güçlü sinyal" : strength === "moderate" ? "orta sinyal" : "sınırlı sinyal"
      : strength === "strong" ? "stronger signal" : strength === "moderate" ? "moderate signal" : "limited signal";
    const frictionLabel = isTr
      ? friction === "high" ? "yüksek" : friction === "medium" ? "orta" : "düşük"
      : friction;
    const evidenceLoadLabel = isTr
      ? evidenceLoad === "high" ? "yüksek" : evidenceLoad === "medium" ? "orta" : "düşük"
      : evidenceLoad;

    return {
      subclass: pathway.subclass,
      visaName: pathway.visaName,
      strength,
      friction,
      evidenceLoad,
      typicalPath,
      explanation: isTr
        ? `${pathway.visaName}: sinyal ${strengthLabel}; sürtünme ${frictionLabel}; kanıt yükü ${evidenceLoadLabel}. Tipik yol: ${typicalPath}. Mevcut forma girilen bilgilere göre genel karşılaştırmadır.`
        : `${pathway.visaName}: ${strengthLabel}; ${frictionLabel} friction; ${evidenceLoadLabel} evidence load. Typical path: ${typicalPath}. General comparison based on the details provided.`,
    };
  });
}

function buildEvidenceReadiness(
  input: ReadinessInput,
  subclasses: string[],
  locale: Locale
): EvidenceReadinessItem[] {
  const isTr = locale === "tr";
  const hasSkilled = subclasses.some((subclass) => ["189", "190", "491"].includes(subclass));
  const has485 = subclasses.includes("485");
  const has482 = subclasses.includes("482");
  const hasPartner = subclasses.includes("820_801");
  const items: EvidenceReadinessItem[] = [
    {
      category: isTr ? "Kimlik ve pasaport" : "Identity and passport",
      status: input.passportCountry ? "provided" : "typically_required",
      explanation: isTr
        ? input.passportCountry
          ? "Pasaport ülkesi sağlandı; kimlik belgeleri tipik olarak ayrıca hazırlanır."
          : "Kimlik ve pasaport belgeleri tipik olarak gerekir."
        : input.passportCountry
          ? "Passport country was provided; identity documents are typically prepared separately."
          : "Identity and passport evidence is typically required.",
    },
    {
      category: isTr ? "İngilizce kanıtı" : "English evidence",
      status: input.englishLevel ? "provided" : hasSkilled || has482 || has485 ? "missing" : "unclear",
      explanation: isTr
        ? input.englishLevel
          ? "İngilizce seviyesi formda belirtildi."
          : hasSkilled || has482 || has485
            ? "Yetenekli, işveren odaklı veya 485 mezun vizesi yollarında İngilizce kanıtı genellikle değerlendirilir."
            : "Bu yolda İngilizce kanıtının rolü bağlama göre değişebilir."
        : input.englishLevel
          ? "English level was provided in the form."
          : hasSkilled || has482 || has485
            ? "English evidence is commonly considered for skilled, employer-sponsored, or 485 graduate visa pathways."
            : "The role of English evidence depends on pathway context.",
    },
    {
      category: isTr ? "Meslek ve beceri kanıtı" : "Occupation and skills evidence",
      status: input.occupation ? (input.occupationConfirmed === "yes" ? "provided" : "unclear") : hasSkilled || has482 ? "missing" : "unclear",
      explanation: isTr
        ? input.occupation
          ? "Meslek bilgisi sağlandı; beceri değerlendirmesi veya deneyim kanıtı ayrıca değişebilir."
          : "Meslek bilgisi özellikle yetenekli ve işveren odaklı yollar için önemlidir."
        : input.occupation
          ? "Occupation was provided; skills assessment or work evidence may still vary by pathway."
          : "Occupation detail is important for skilled and employer-sponsored pathways.",
    },
  ];

  if (has485) {
    items.push({
      category: isTr ? "Eğitim tamamlama kanıtı" : "Study completion evidence",
      status: hasKw([input.mainGoal ?? "", input.preferredPathway ?? ""].join(" "), ["study", "student", "graduated", "eğitim", "mezun"]) ? "unclear" : "typically_required",
      explanation: isTr
        ? "485 vizesi için CRICOS kayıtlı bir kurumdan uygun bir Avustralya niteliğinin tamamlanmasına ilişkin kanıt tipik olarak gereklidir."
        : "Evidence of completing an approved Australian qualification from a CRICOS-registered institution is typically required for the 485 visa.",
    });
    items.push({
      category: isTr ? "Polis taraması ve karakter belgesi" : "Police clearance and character evidence",
      status: "typically_required",
      explanation: isTr
        ? "485 vizesi için Avustralya polis taraması tipik olarak gereklidir. Yurt dışı polis sertifikaları da gerekebilir."
        : "Australian police clearance is typically required for the 485 visa. Overseas police certificates may also be required.",
    });
  }

  if (has482 || hasPartner) {
    items.push({
      category: isTr ? "Sponsorluk kanıtı" : "Sponsorship evidence",
      status: input.sponsorOrFamily ? "provided" : "missing",
      explanation: isTr
        ? "İşveren veya partner sponsorluğu içeren yollar için sponsorluk bağlamı merkezi olabilir."
        : "Sponsorship context can be central for employer or partner pathways.",
    });
  }

  if (hasPartner) {
    items.push({
      category: isTr ? "İlişki kanıtı" : "Relationship evidence",
      status: input.sponsorOrFamily || hasKw(input.mainGoal ?? "", ["partner", "spouse", "eş", "ilişki"]) ? "unclear" : "missing",
      explanation: isTr
        ? "820/801 için ilişki kanıtı kategorileri tipik olarak ayrıntılı şekilde değerlendirilir."
        : "Relationship evidence categories are typically reviewed in detail for 820/801.",
    });
  }

  items.push({
    category: isTr ? "Sağlık, karakter ve çeviri belgeleri" : "Health, character, and translation documents",
    status: "typically_required",
    explanation: isTr
      ? "Sağlık kontrolleri, polis belgeleri ve çeviriler yol ve kişisel duruma göre değişebilir."
      : "Health checks, police certificates, and translations can vary by pathway and individual circumstances.",
  });

  return items;
}

function buildPointsBoosterSimulator(
  input: ReadinessInput,
  subclasses: string[],
  pointsEstimate: PointsEstimate | undefined,
  locale: Locale
): PointsBoosterSimulator | undefined {
  const isTr = locale === "tr";
  const hasSkilled = subclasses.some((subclass) => ["189", "190", "491"].includes(subclass));
  if (!hasSkilled) return undefined;

  const currentEstimate = pointsEstimate?.estimatedPoints;
  const scenarios: PointsBoosterSimulator["scenarios"] = [];
  const englishOption = input.englishLevel ? parseEnglishOption(input.englishLevel) : null;
  const ageOption = input.age ? parseAgeOption(input.age) : null;

  if (englishOption === "competent" || englishOption === "proficient") {
    scenarios.push({
      label: isTr ? "İngilizce seviyesi senaryosu" : "English level scenario",
      estimatedChange: 10,
      resultingEstimate: currentEstimate === undefined ? undefined : currentEstimate + 10,
      explanation: isTr
        ? `İngilizce faktörü ${englishOption === "competent" ? "proficient" : "superior"} düzeye değişirse matematiksel puan konumu +10 değişebilir.`
        : `If the English factor changes to ${englishOption === "competent" ? "proficient" : "superior"}, the mathematical score position may change by +10.`,
    });
  }

  if (subclasses.includes("190")) {
    scenarios.push({
      label: isTr ? "190 adaylık puanı senaryosu" : "190 nomination points scenario",
      estimatedChange: 5,
      resultingEstimate: currentEstimate === undefined ? undefined : currentEstimate + 5,
      explanation: isTr
        ? "190 eyalet/bölge adaylığı faktörü mevcut olursa matematiksel puan konumu +5 değişebilir."
        : "If the 190 state or territory nomination factor is present, the mathematical score position may change by +5.",
    });
  }

  if (subclasses.includes("491")) {
    scenarios.push({
      label: isTr ? "491 adaylık/sponsorluk puanı senaryosu" : "491 nomination/sponsorship points scenario",
      estimatedChange: 15,
      resultingEstimate: currentEstimate === undefined ? undefined : currentEstimate + 15,
      explanation: isTr
        ? "491 adaylık veya uygun akraba sponsorluğu faktörü mevcut olursa matematiksel puan konumu +15 değişebilir."
        : "If the 491 nomination or relative sponsorship factor is present, the mathematical score position may change by +15.",
    });
  }

  if (ageOption === "18_24" || ageOption === "40_44") {
    const estimatedChange = ageOption === "18_24" ? 5 : -10;
    scenarios.push({
      label: isTr ? "Yaş bandı senaryosu" : "Age band scenario",
      estimatedChange,
      resultingEstimate: currentEstimate === undefined ? undefined : currentEstimate + estimatedChange,
      explanation: isTr
        ? "Yaş bandı değişirse puan tablosundaki matematiksel konum da değişebilir."
        : "If the age band changes, the mathematical position in the points table may also change.",
    });
  }

  if (scenarios.length === 0) {
    scenarios.push({
      label: isTr ? "Eksik puan faktörleri" : "Missing points-table factors",
      estimatedChange: 0,
      resultingEstimate: currentEstimate,
      explanation: isTr
        ? "İstihdam, eğitim, partner ve bonus faktörleri sağlanmadığı için ek matematiksel senaryo hesaplanmadı."
        : "Employment, education, partner, and bonus factors were not provided, so no additional mathematical scenario was calculated.",
    });
  }

  return {
    currentEstimate,
    scenarios,
    note: isTr
      ? "Bir puan tablosu faktörü değişirse matematiksel puan konumu aşağıdaki gibi değişebilir. Bu yalnızca genel bilgidir."
      : "If a points-table factor changes, the mathematical score position may change as follows. This is general information only.",
  };
}

// Indicative government application charges by subclass
// Source: Australian Government Department of Home Affairs (subject to change)
const GOV_FEES_EN: Record<string, string> = {
  "500": "From AUD 2,000 (unless exempt)",
  "482": "From AUD 3,210 (main applicant and dependants 18+); AUD 805 (dependants under 18)",
  "485": "From AUD 4,600",
  "189": "From AUD 4,910 (main applicant)",
  "190": "From AUD 4,910 (main applicant)",
  "491": "From AUD 4,910 (main applicant)",
  "820_801": "From AUD 9,365 (most applicants)",
};
const GOV_FEES_TR: Record<string, string> = {
  "500": "AUD 2.000'den itibaren (muaf olmayan başvurular için)",
  "482": "AUD 3.210'dan itibaren (ana başvurucu ve 18+ bağımlılar); AUD 805 (18 yaş altı bağımlılar)",
  "485": "AUD 4.600'dan itibaren",
  "189": "AUD 4.910'dan itibaren (ana başvurucu)",
  "190": "AUD 4.910'dan itibaren (ana başvurucu)",
  "491": "AUD 4.910'dan itibaren (ana başvurucu)",
  "820_801": "AUD 9.365'ten itibaren (çoğu başvurucu)",
};

function buildFinancialRoadmap(
  subclasses: string[],
  input: ReadinessInput,
  locale: Locale
): FinancialRoadmapItem[] {
  const isTr = locale === "tr";
  const hasSkilled = subclasses.some((subclass) => ["189", "190", "491"].includes(subclass));
  const has482 = subclasses.includes("482");
  const variable = isTr ? "Değişken / sağlayıcıya bağlı" : "Variable / depends on provider";

  const feeSubclass = subclasses.find((s) => GOV_FEES_EN[s]);
  const govFeeLabel = feeSubclass
    ? (isTr ? GOV_FEES_TR[feeSubclass] : GOV_FEES_EN[feeSubclass])
    : (isTr ? "Resmi ücret yol ve tarihe göre değişir" : "Official fee varies by pathway and date");

  const items: FinancialRoadmapItem[] = [
    {
      category: isTr ? "Devlet başvuru ücreti" : "Government application charge",
      estimateType: "official_fee",
      amountLabel: govFeeLabel,
      explanation: isTr
        ? "Resmi devlet ücretleri ve tahmini üçüncü taraf maliyet kategorileri. Ücretler değişebilir; resmi kaynaklar incelenmelidir."
        : "Official government fees and estimated third-party cost categories. Fees may change; official sources should be reviewed.",
    },
    {
      category: isTr ? "İngilizce test maliyet kategorisi" : "English test cost category",
      estimateType: "third_party_estimate",
      amountLabel: variable,
      explanation: isTr
        ? "Test sağlayıcısı, lokasyon ve tekrar sayısı maliyeti etkileyebilir."
        : "Provider, location, and repeat attempts can affect this cost category.",
    },
  ];

  if (hasSkilled || has482) {
    items.push({
      category: isTr ? "Beceri değerlendirmesi maliyet kategorisi" : "Skills assessment cost category",
      estimateType: "third_party_estimate",
      amountLabel: isTr ? "Değişken / değerlendirme kurumuna bağlı" : "Variable / depends on assessing authority",
      explanation: isTr
        ? "Meslek ve değerlendirme kurumu maliyet aralığını etkileyebilir."
        : "Occupation and assessing authority can affect the cost range.",
    });
  }

  items.push(
    {
      category: isTr ? "Sağlık kontrolleri / polis belgeleri" : "Health checks / police certificates",
      estimateType: "variable",
      amountLabel: isTr ? "Değişken / ülke ve sağlayıcıya bağlı" : "Variable / depends on country and provider",
      explanation: isTr
        ? "Kişisel geçmiş ve başvuru yeri maliyet kategorisini değiştirebilir."
        : "Personal history and application location may change this cost category.",
    },
    {
      category: isTr ? "Çeviri / belge hazırlığı" : "Translation / document preparation",
      estimateType: "variable",
      amountLabel: isTr ? "Değişken / belge sayısına bağlı" : "Variable / depends on document volume",
      explanation: isTr
        ? "İngilizce olmayan belgeler ve belge sayısı maliyeti etkileyebilir."
        : "Non-English documents and document volume can affect this cost category.",
    },
    {
      category: isTr ? "Danışman / profesyonel inceleme" : "Agent / professional review",
      estimateType: "variable",
      amountLabel: variable,
      explanation: isTr
        ? "Kayıtlı bir göç danışmanı veya avukat ile çalışmayı seçen başvurucular için bu maliyet kategorisi bireysel koşullara ve sağlayıcıya göre değişebilir."
        : "For those who choose to seek input from a registered migration agent or legal practitioner, this cost category varies by individual circumstances and provider.",
    }
  );

  return items;
}

function buildProgressionPathways(
  subclasses: string[],
  locale: Locale
): ProgressionPathway[] {
  const isTr = locale === "tr";
  const items: ProgressionPathway[] = [];

  if (subclasses.includes("500")) {
    items.push({
      from: "500",
      to: "485 / 189 / 190 / 491",
      label: isTr ? "Öğrenci sonrası tipik seçenekler" : "Typical post-study options",
      explanation: isTr
        ? "Avustralya sistemindeki tipik geçiş yolları 500 → 485 → 189/190/491 seçeneklerini içerebilir. Bu PR vaadi değildir."
        : "Typical progression pathways in the Australian visa system may include 500 → 485 → 189/190/491. This does not promise PR.",
    });
  }
  if (subclasses.includes("485")) {
    items.push({
      from: "485",
      to: "189 / 190 / 491",
      label: isTr ? "485 sonrası tipik seçenekler" : "Typical post-485 options",
      explanation: isTr
        ? "485 Geçici Mezun vizesinden sonra, bireysel koşullara ve uygunluğa bağlı olarak nitelikli göç yolları ilgili olabilir. Bu PR garantisi değildir ve kişisel duruma göre değişebilir."
        : "After the 485 Temporary Graduate visa, skilled migration pathways may be relevant depending on individual circumstances and eligibility. This does not guarantee access to permanent residence and depends on individual circumstances.",
    });
  }

  if (subclasses.includes("482")) {
    items.push({
      from: "482",
      to: "Employer-sponsored permanent pathways",
      label: isTr ? "İşveren sponsorlu kalıcı seçenekler" : "Employer-sponsored permanent options",
      explanation: isTr
        ? "482 sonrası işveren sponsorlu kalıcı yollar bazı durumlarda ilgili olabilir; kriterler ve işveren bağlamı belirleyicidir."
        : "After 482, employer-sponsored permanent pathways may be relevant in some cases; criteria and employer context matter.",
    });
  }
  if (subclasses.includes("491")) {
    items.push({
      from: "491",
      to: "191",
      label: isTr ? "Bölgesel geçiş bağlamı" : "Regional progression context",
      explanation: isTr
        ? "491 → 191 ilgili dönem ve kriterler karşılanırsa tipik bir sistem geçişi olarak değerlendirilebilir."
        : "491 → 191 may be considered a typical system progression after the relevant period if criteria are met.",
    });
  }
  if (subclasses.includes("820_801")) {
    items.push({
      from: "820",
      to: "801",
      label: isTr ? "Partner yolu aşamaları" : "Partner pathway stages",
      explanation: isTr
        ? "820 geçici aşama ve 801 kalıcı aşama aynı onshore partner yolunun tipik aşamalarıdır."
        : "820 temporary stage and 801 permanent stage are typical stages of the same onshore partner pathway.",
    });
  }

  if (items.length === 0) {
    items.push({
      from: isTr ? "Mevcut bilgiler" : "Current information",
      to: isTr ? "Daha net yol bağlamı" : "Clearer pathway context",
      label: isTr ? "Tipik geçiş bağlamı net değil" : "Typical progression context is unclear",
      explanation: isTr
        ? "Tipik geçiş yolları, daha net hedef ve vize ilgisi sağlandığında daha anlamlı şekilde gösterilebilir."
        : "Typical progression pathways can be shown more meaningfully when clearer goal and visa-interest details are provided.",
    });
  }

  return items;
}

function buildPathwayFriction(
  pathways: PathwayComparison[],
  locale: Locale
): PathwayFriction[] {
  const isTr = locale === "tr";
  return pathways.map((pathway) => {
    const visaLabel =
      pathway.subclass === "general" ? pathway.visaName : `${pathway.visaName} (${pathway.subclass})`;
    const detail: Record<string, { en: string; tr: string }> = {
      "500": {
        en: "Course enrolment, OSHC, and genuine student settings may affect this pathway.",
        tr: "Kurs kaydı, OSHC ve gerçek öğrenci ayarları bu yolu etkileyebilir.",
      },
      "485": {
        en: "Employment outcomes and transition to skilled pathways may affect this pathway.",
        tr: "İstihdam sonuçları ve nitelikli yollara geçiş bu yolu etkileyebilir.",
      },
      "482": {
        en: "Employer sponsorship context is central to this pathway.",
        tr: "İşveren sponsorluğu bağlamı bu yol için merkezi önemdedir.",
      },
      "189": {
        en: "Invitation rounds and points competition may affect this pathway.",
        tr: "Davet dönemleri ve puan rekabeti bu yolu etkileyebilir.",
      },
      "190": {
        en: "State or territory nomination settings may affect this pathway.",
        tr: "Eyalet veya bölge adaylık ayarları bu yolu etkileyebilir.",
      },
      "491": {
        en: "Regional requirements and nomination or sponsorship context may affect this pathway.",
        tr: "Bölgesel gereklilikler ve adaylık veya sponsorluk bağlamı bu yolu etkileyebilir.",
      },
      "820_801": {
        en: "Relationship evidence is central to this pathway.",
        tr: "İlişki kanıtı bu yol için merkezi önemdedir.",
      },
      general: {
        en: "More detail is needed before pathway friction can be compared.",
        tr: "Yol sürtünmesi karşılaştırılmadan önce daha fazla ayrıntı gerekir.",
      },
    };
    const selected = detail[pathway.subclass] ?? detail.general;
    return {
      pathway: visaLabel,
      frictionType: isTr ? "Gerçeklik kontrolü" : "Reality check",
      explanation: isTr ? selected.tr : selected.en,
    };
  });
}

function buildConfidenceExplanation(
  pathways: PathwayComparison[],
  evidenceReadiness: EvidenceReadinessItem[],
  locale: Locale
): string {
  const isTr = locale === "tr";
  const strongCount = pathways.filter((pathway) => pathway.confidenceLevel === "high").length;
  const missingEvidence = evidenceReadiness.filter((item) => item.status === "missing").length;
  return isTr
    ? `Güven açıklaması; yol sinyalleri, kanıt hazırlığı ve sürtünme faktörlerine göre oluşturulur. ${strongCount} yol güçlü sinyal gösteriyor; ${missingEvidence} kanıt alanı eksik görünüyor. Bu yalnızca genel bilgidir.`
    : `Confidence is explained using pathway signals, evidence readiness, and friction factors. ${strongCount} pathway(s) show strong signals; ${missingEvidence} evidence area(s) appear missing. This is general information only.`;
}

// ─── Main engine ──────────────────────────────────────────────────────────────

export function runReadinessEngine(input: ReadinessInput): ReadinessReport {
  const locale = input.locale;

  const detectedSubclasses = detectSubclasses(input);
  const hasSkilledPathway = detectedSubclasses.some((s) =>
    ["189", "190", "491"].includes(s)
  );
  const pointsEstimate = hasSkilledPathway
    ? buildPointsEstimate(input, locale)
    : undefined;
  const dataCompleteness = buildDataCompleteness(input, locale);

  let pathwayComparison: PathwayComparison[];

  if (detectedSubclasses.length === 0) {
    pathwayComparison = [
      {
        subclass: "general",
        visaName:
          locale === "tr" ? "Genel değerlendirme" : "General assessment",
        reason:
          locale === "tr"
            ? "Mevcut bilgilerle belirli bir yol tespit edilemedi. Hedef, meslek ve sponsorluk ayrıntıları daha kapsamlı bir değerlendirme sağlayacaktır."
            : "No specific pathway was detected from available information. Goal, occupation, and sponsorship details would provide a more complete assessment.",
        relevance: "not_enough_information",
        confidenceLevel: "low",
        confidenceExplanation:
          locale === "tr"
            ? "Mevcut sinyal seti sınırlı olduğu için güven seviyesi düşük görünmektedir."
            : "Confidence is low because the available signal set is limited.",
        difficulty: "medium",
        requirementType:
          locale === "tr"
            ? "Genel yol sinyali (eksik veri nedeniyle sınırlı)"
            : "General pathway signal (limited by missing data)",
        userRelativePosition:
          locale === "tr"
            ? "Daha fazla bilgi olmadan göreli konum netleşmez."
            : "Relative position is unclear without additional details.",
        keyRequirements:
          locale === "tr"
            ? ["Daha ayrıntılı hedef, meslek ve sponsorluk bağlamı"]
            : ["More detailed goal, occupation, and sponsorship context"],
        pathwaySpecificRisks:
          locale === "tr"
            ? ["Belirli bir yol için yeterli sinyal bulunmadığı için değerlendirme genel düzeyde kalmaktadır."]
            : ["The review remains general because there is not yet enough signal for a specific pathway."],
      },
    ];
  } else {
    pathwayComparison = detectedSubclasses.map((subclass) =>
      buildPathwayEntry(
        subclass,
        input,
        locale,
        dataCompleteness.percentage,
        pointsEstimate?.estimatedPoints
      )
    );
  }

  const occupationIndication = buildOccupationIndication(input, locale);

  const riskIndicators = buildRiskIndicators({
    locale,
    pathways: pathwayComparison,
    age: input.age,
    englishLevel: input.englishLevel,
    sponsorOrFamily: input.sponsorOrFamily,
    occupation: input.occupation,
    biggestConcern: input.biggestConcern,
    currentCountry: input.currentCountry,
    passportCountry: input.passportCountry,
    estimatedPoints: pointsEstimate?.estimatedPoints,
  });

  const documentChecklist: DocumentCategory[] = getDocumentChecklist(
    detectedSubclasses,
    locale
  );

  const missingInformation = buildMissingInformation(
    input,
    detectedSubclasses,
    locale
  );

  const reportIndicators = buildReportIndicators({
    locale,
    dataCompleteness,
    input,
  });
  const primaryGap = buildPrimaryGap({
    locale,
    pathways: pathwayComparison,
    dataCompleteness,
    missingInformation,
    riskIndicators,
    pointsEstimate,
  });

  const factorsAffectingPathways = buildFactorsAffectingPathways(
    locale,
    input,
    dataCompleteness,
    hasSkilledPathway,
    detectedSubclasses.includes("482"),
    detectedSubclasses.includes("820_801")
  );

  const keyVisaRequirements = buildKeyVisaRequirements(pathwayComparison);
  const executiveSummary = buildExecutiveSummary(
    input,
    pathwayComparison,
    locale,
    missingInformation,
    pointsEstimate?.estimatedPoints
  );
  const pathwayStrengthComparison = buildPathwayStrengthComparison(
    pathwayComparison,
    locale
  );
  const evidenceReadiness = buildEvidenceReadiness(
    input,
    detectedSubclasses,
    locale
  );
  const pointsBoosterSimulator = buildPointsBoosterSimulator(
    input,
    detectedSubclasses,
    pointsEstimate,
    locale
  );
  const financialRoadmap = buildFinancialRoadmap(
    detectedSubclasses,
    input,
    locale
  );
  const progressionPathways = buildProgressionPathways(
    detectedSubclasses,
    locale
  );
  const pathwayFriction = buildPathwayFriction(
    pathwayComparison,
    locale
  );
  const confidenceExplanation = buildConfidenceExplanation(
    pathwayComparison,
    evidenceReadiness,
    locale
  );

  const suggestedNextSteps = buildNextSteps({
    locale,
    pathways: pathwayComparison,
    hasOccupation: Boolean(input.occupation),
    hasEnglish: Boolean(input.englishLevel),
    hasSkilledPathway,
    hasPartnerPathway: detectedSubclasses.includes("820_801"),
    has482Pathway: detectedSubclasses.includes("482"),
    hasMissingInfo: missingInformation.length > 0,
  });

  const disclaimer = buildDisclaimer(locale);

  return {
    executiveSummary,
    pathwayComparison,
    pathwayStrengthComparison,
    evidenceReadiness,
    pointsBoosterSimulator,
    financialRoadmap,
    progressionPathways,
    pathwayFriction,
    confidenceExplanation,
    reportIndicators,
    primaryGap,
    dataCompleteness,
    keyVisaRequirements,
    factorsAffectingPathways,
    pointsEstimate,
    occupationIndication,
    riskIndicators,
    documentChecklist,
    suggestedNextSteps,
    missingInformation,
    disclaimer,
  };
}
