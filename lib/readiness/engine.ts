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
  KeyVisaRequirement,
  Locale,
  OccupationIndication,
  PathwayComparison,
  PathwayComparisonRow,
  PathwayRelevance,
  PointsEstimate,
  ReadinessScore,
  ReadinessInput,
  ReadinessReport,
} from "./types";

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
  if (/\b482\b/.test(pref)) found.add("482");
  if (/\b189\b/.test(pref)) found.add("189");
  if (/\b190\b/.test(pref)) found.add("190");
  if (/\b491\b/.test(pref)) found.add("491");
  if (/820|801/.test(pref)) found.add("820_801");

  // Study → 500
  if (hasKw(combined, ["study", "student", "course", "university", "college", "school", "eğitim", "öğrenci", "okul"])) {
    found.add("500");
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
    case "482":
      return isTr
        ? [
            "Uygun bir işveren sponsorluğu bağlamı",
            "Görev ile uyumlu meslek ve deneyim bilgisi",
            "İngilizce ve iş koşullarına ilişkin destekleyici bilgiler",
          ]
        : [
            "Eligible employer sponsorship context",
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
            "Regional nomination or eligible relative sponsorship context",
          ];
    case "820_801":
      return isTr
        ? [
            "Uygun partner sponsorluğu statüsü bağlamı",
            "İlişkinin niteliği ve sürekliliğine ilişkin bilgiler",
            "Birlikte yaşam veya ortak yaşam düzenine ilişkin destekleyici bağlam",
          ]
        : [
            "Eligible partner sponsorship status context",
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
          ? "Yaş ve İngilizce bilgisi eksik olduğunda puan temelli değerlendirme eksik kalır."
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
          : "Regional nomination or eligible-relative sponsorship context is not yet clear."
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
        ? "Mevcut bilgiler bu yol için bazı temel sinyaller sunuyor, ancak bireysel bağlam sonucu değiştirebilir."
        : "The available information provides some baseline signals for this pathway, but individual context could change the picture."
    );
  }

  return risks;
}

function getPathwayConfidenceLevel(
  subclass: string,
  input: ReadinessInput,
  relevance: PathwayRelevance,
  estimatedPoints?: number
): ConfidenceLevel {
  const combinedGoal = [input.mainGoal ?? "", input.preferredPathway ?? ""].join(" ");
  const sponsorText = [input.sponsorOrFamily ?? "", input.mainGoal ?? ""].join(" ");

  if (relevance !== "possible") {
    return relevance === "needs_more_information" ? "low" : "low";
  }

  if (subclass === "500") {
    return hasKw(combinedGoal, ["study", "student", "course", "eğitim", "öğrenci"])
      ? "high"
      : "medium";
  }

  if (subclass === "482") {
    return hasKw(sponsorText, ["sponsor", "employer", "işveren", "sponsored"]) && Boolean(input.occupation)
      ? "high"
      : "medium";
  }

  if (subclass === "189") {
    if (input.occupation && input.age && input.englishLevel && estimatedPoints !== undefined && estimatedPoints >= 65) {
      return "high";
    }
    return input.occupation && (input.age || input.englishLevel) ? "medium" : "low";
  }

  if (subclass === "190") {
    if (input.occupation && input.age && input.englishLevel && estimatedPoints !== undefined && estimatedPoints >= 65) {
      return "medium";
    }
    return input.occupation ? "medium" : "low";
  }

  if (subclass === "491") {
    if (input.occupation && input.age && input.englishLevel && hasKw(sponsorText, ["family", "relative", "regional", "akraba", "bölgesel"])) {
      return "medium";
    }
    return input.occupation ? "medium" : "low";
  }

  if (subclass === "820_801") {
    return hasKw(sponsorText, ["partner", "spouse", "de facto", "eş", "ilişki"]) && Boolean(input.sponsorOrFamily)
      ? "high"
      : "medium";
  }

  return "low";
}

function getConfidenceExplanation(
  subclass: string,
  input: ReadinessInput,
  locale: Locale,
  confidenceLevel: ConfidenceLevel,
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
        ? "Eğitim amacı net göründüğü için bu yol için göreli güven sinyali daha güçlüdür."
        : "Eğitim amacıyla ilgili bağlam mevcut, ancak kişisel durum detayları bu güven düzeyini değiştirebilir."
      : confidenceLevel === "high"
        ? "The study intent appears clear, so the relative confidence signal is stronger for this pathway."
        : "There is study-related context, but personal details could still shift this confidence level.";
  }

  if (subclass === "482") {
    return isTr
      ? hasSponsorContext && hasOccupation
        ? "Sponsor ve rol bağlamı birlikte göründüğü için güven seviyesi desteklenmektedir."
        : "Sponsor veya rol bağlamı sınırlı olduğu için güven seviyesi daha temkinli tutulmuştur."
      : hasSponsorContext && hasOccupation
        ? "Sponsor and role context are both visible, which supports this confidence level."
        : "Sponsor or role context is limited, so confidence is kept cautious.";
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
      ? `Güven seviyesi; yaş/İngilizce/meslek girdileri ve ${pointsText} üzerinden gösterge niteliğinde hesaplanmıştır.`
      : `Confidence is estimated indicatively from age/English/occupation inputs and ${pointsText}.`;
  }

  if (subclass === "820_801") {
    return isTr
      ? hasSponsorContext
        ? "İlişki ve sponsor bağlamı bulunduğunda güven seviyesi daha güçlü görünür."
        : "İlişki/sponsor kanıt bağlamı sınırlı olduğunda güven seviyesi düşer."
      : hasSponsorContext
        ? "Confidence tends to be stronger when relationship and sponsor context are present."
        : "Confidence is lower when relationship/sponsor evidence context is limited.";
  }

  const knownSignals = [hasAge, hasEnglish, hasOccupation, hasSponsorContext].filter(Boolean)
    .length;
  return isTr
    ? `Güven seviyesi, mevcut ${knownSignals}/4 temel sinyal üzerinden genel bir gösterge olarak oluşturuldu.`
    : `Confidence is shown as a general indicator based on ${knownSignals}/4 available core signals.`;
}

// ─── Pathway reason builder ───────────────────────────────────────────────────

function buildPathwayEntry(
  subclass: string,
  input: ReadinessInput,
  locale: Locale,
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
    estimatedPoints
  );
  const confidenceExplanation = getConfidenceExplanation(
    subclass,
    input,
    locale,
    confidenceLevel,
    estimatedPoints
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
    keyRequirements,
    pathwaySpecificRisks,
  };
}

function getDifficultyForPathway(
  pathway: PathwayComparison
): "low" | "medium" | "high" {
  if (pathway.subclass === "general") return "medium";
  if (pathway.subclass === "500") return "medium";
  if (pathway.subclass === "482") return "medium";
  if (pathway.subclass === "820_801") return "high";
  if (["189", "190", "491"].includes(pathway.subclass)) return "high";
  return "medium";
}

function getRequirementType(
  pathway: PathwayComparison,
  locale: Locale
): string {
  const isTr = locale === "tr";
  if (pathway.subclass === "500") {
    return isTr
      ? "Eğitim ve mali kanıt ağırlıklı"
      : "Study and financial evidence focused";
  }
  if (pathway.subclass === "482") {
    return isTr
      ? "İşveren sponsorluğu ve rol uyumu"
      : "Employer sponsorship and role alignment";
  }
  if (["189", "190", "491"].includes(pathway.subclass)) {
    return isTr
      ? "Puan, meslek ve davet/adaylık temelli"
      : "Points, occupation, and invitation/nomination based";
  }
  if (pathway.subclass === "820_801") {
    return isTr
      ? "İlişki ve sponsor kanıtı temelli"
      : "Relationship and sponsor evidence based";
  }
  return isTr ? "Daha fazla kişisel bağlam gerektirir" : "Requires more personal context";
}

function getUserRelativePosition(
  pathway: PathwayComparison,
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

function buildPathwayComparisonTable(
  pathways: PathwayComparison[],
  locale: Locale
): PathwayComparisonRow[] {
  return pathways.map((pathway) => ({
    visa:
      pathway.subclass === "general"
        ? pathway.visaName
        : `${pathway.visaName} (${pathway.subclass})`,
    difficulty: getDifficultyForPathway(pathway),
    requirementType: getRequirementType(pathway, locale),
    userRelativePosition: getUserRelativePosition(pathway, locale),
  }));
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

function buildReadinessScore(params: {
  locale: Locale;
  pathways: PathwayComparison[];
  missingInformation: string[];
  riskIndicators: ReturnType<typeof buildRiskIndicators>;
  pointsEstimate?: PointsEstimate;
}): ReadinessScore {
  const { locale, pathways, missingInformation, riskIndicators, pointsEstimate } = params;
  const isTr = locale === "tr";

  let score = 100;

  const hasSpecificPathway = pathways.some((p) => p.subclass !== "general");
  if (!hasSpecificPathway) score -= 20;

  const lowConfidenceCount = pathways.filter((p) => p.confidenceLevel === "low").length;
  score -= lowConfidenceCount * 6;

  const missingPenalty = Math.min(36, missingInformation.length * 6);
  score -= missingPenalty;

  const riskPenalty = Math.min(
    34,
    riskIndicators.reduce((sum, risk) => {
      if (risk.level === "high") return sum + 10;
      if (risk.level === "medium") return sum + 5;
      return sum + 2;
    }, 0)
  );
  score -= riskPenalty;

  if (pointsEstimate?.estimatedPoints !== undefined) {
    const shortfall = Math.max(0, 65 - pointsEstimate.estimatedPoints);
    score -= Math.min(24, Math.round(shortfall * 1.2));
  } else if (pathways.some((p) => ["189", "190", "491"].includes(p.subclass))) {
    score -= 10;
  }

  score = Math.max(0, Math.min(100, score));

  const explanation = isTr
    ? `Gösterge puanı; eksik alanlar, risk yoğunluğu ve mevcut puan görünümüne göre hesaplanır. Bu bir karar-destek göstergesidir, sonuç/uygunluk beyanı değildir.`
    : `The indicative score is calculated from missing-data load, risk intensity, and the current points picture. It is a decision-support indicator, not an outcome/eligibility statement.`;

  return { score, explanation };
}

function buildPrimaryGap(params: {
  locale: Locale;
  pathways: PathwayComparison[];
  missingInformation: string[];
  riskIndicators: ReturnType<typeof buildRiskIndicators>;
  pointsEstimate?: PointsEstimate;
}): string {
  const { locale, pathways, missingInformation, riskIndicators, pointsEstimate } = params;
  const isTr = locale === "tr";

  const hasSkilled = pathways.some((p) => ["189", "190", "491"].includes(p.subclass));
  if (hasSkilled && pointsEstimate?.estimatedPoints !== undefined && pointsEstimate.estimatedPoints < 65) {
    return isTr
      ? "Birincil boşluk: Mevcut kısmi puan görünümü puan-temelli yollar için sınırlayıcı kalıyor."
      : "Primary gap: The current partial points picture remains a limiting factor for points-tested pathways.";
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
      : `Primary gap: Comparative assessment remains limited until ${majorMissing} is clarified.`;
  }

  const highRisk = riskIndicators.find((risk) => risk.level === "high");
  if (highRisk) {
    return isTr
      ? `Birincil boşluk: "${highRisk.title}" başlığındaki risk etkisi baskın görünüyor.`
      : `Primary gap: The risk signal in "${highRisk.title}" appears to be the dominant limiter.`;
  }

  return isTr
    ? "Birincil boşluk: Karşılaştırmalı tabloyu güçlendirecek ek kişisel bağlam ihtiyacı."
    : "Primary gap: Additional personal context is needed to strengthen the comparison table.";
}

function buildFactorsThatMayAffectPathways(
  locale: Locale,
  hasSkilledPathway: boolean,
  hasEmployerPathway: boolean,
  hasPartnerPathway: boolean
): string[] {
  const isTr = locale === "tr";
  const items: string[] = [
    isTr
      ? "Başvuru dönemlerindeki davet/öncelik seviyeleri zamanla değişebilir."
      : "Invitation and processing priority settings can change over time.",
    isTr
      ? "Sunulan belgelerin tutarlılığı ve kapsamı, yol karşılaştırmasını etkileyebilir."
      : "Consistency and coverage of supporting evidence may change pathway comparisons.",
    isTr
      ? "Resmi kriter ve politika güncellemeleri değerlendirme sinyallerini değiştirebilir."
      : "Official criteria and policy updates may shift pathway signals.",
  ];

  if (hasSkilledPathway) {
    items.push(
      isTr
        ? "Puan-temelli yollar için davet seviyeleri ve eyalet/bölge öncelikleri dönemsel dalgalanabilir."
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

  return items;
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
  if ((skilled || has482) && !input.englishLevel) {
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

function buildWhatThisMeans(
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
        ? "More than one pathway may be relevant, so the report is framed as a comparison rather than a single outcome."
        : "This report presents an early structured view that could change when more detail is available."
  );

  if (skilledVisible && estimatedPoints !== undefined) {
    items.push(
      isTr
        ? `Kısmi puan görünümü ${estimatedPoints} olarak oluşmuştur; bu rakam yalnızca sınırlı girdilere dayanmaktadır.`
        : `The partial points picture is ${estimatedPoints}, and that figure is based on limited inputs only.`
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
      buildPathwayEntry(subclass, input, locale, pointsEstimate?.estimatedPoints)
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

  const pathwayComparisonTable = buildPathwayComparisonTable(
    pathwayComparison,
    locale
  );
  const dataCompleteness = buildDataCompleteness(input, locale);
  const readinessScore = buildReadinessScore({
    locale,
    pathways: pathwayComparison,
    missingInformation,
    riskIndicators,
    pointsEstimate,
  });
  const primaryGap = buildPrimaryGap({
    locale,
    pathways: pathwayComparison,
    missingInformation,
    riskIndicators,
    pointsEstimate,
  });

  const factorsThatMayAffectPathways = buildFactorsThatMayAffectPathways(
    locale,
    hasSkilledPathway,
    detectedSubclasses.includes("482"),
    detectedSubclasses.includes("820_801")
  );

  const keyVisaRequirements = buildKeyVisaRequirements(pathwayComparison);
  const whatThisMeans = buildWhatThisMeans(
    input,
    pathwayComparison,
    locale,
    missingInformation,
    pointsEstimate?.estimatedPoints
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
    pathwayComparison,
    pathwayComparisonTable,
    readinessScore,
    primaryGap,
    dataCompleteness,
    keyVisaRequirements,
    whatThisMeans,
    factorsThatMayAffectPathways,
    pointsEstimate,
    occupationIndication,
    riskIndicators,
    documentChecklist,
    suggestedNextSteps,
    missingInformation,
    disclaimer,
  };
}
