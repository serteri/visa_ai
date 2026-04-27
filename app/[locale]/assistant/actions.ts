"use server";

import {
  generateGroundedAnswer,
  type GroundedAssistantResult,
} from "@/lib/ai/generate-grounded-answer";
import { retrieveVisaContext } from "@/lib/ai/retrieve-visa-context";

type RunAssistantInput = {
  locale: "en" | "tr";
  message: string;
};

export type ReadinessPreviewInput = {
  locale: "en" | "tr";
  mainGoal: string;
  currentCountry: string;
  passportCountry: string;
  age: string;
  occupation: string;
  englishLevel: string;
  sponsorFamily: string;
  preferredPathway: string;
  biggestConcern: string;
};

export type ReadinessPreviewResult = {
  possiblePathwayAreas: string[];
  missingInformation: string[];
  basicRiskSignals: string[];
  suggestedNextSteps: string[];
};

export async function runAssistantMessage(
  input: RunAssistantInput
): Promise<GroundedAssistantResult> {
  const locale = input.locale === "tr" ? "tr" : "en";
  const message = input.message.trim();

  const context = await retrieveVisaContext({ message });
  const grounded = await generateGroundedAnswer({
    message,
    locale,
    context,
  });

  return {
    ...grounded,
    nextActions: grounded.nextActions.map((action) => ({
      label: localizeActionLabel(action.label, locale),
      href: action.href,
    })),
  };
}

export async function runReadinessPreview(
  input: ReadinessPreviewInput
): Promise<ReadinessPreviewResult> {
  const isTr = input.locale === "tr";
  const message = [
    input.mainGoal,
    input.preferredPathway,
    input.occupation,
    input.sponsorFamily,
    input.biggestConcern,
  ]
    .filter(Boolean)
    .join(" ");

  const context = await retrieveVisaContext({ message });

  const possiblePathwayAreas = isTr
    ? context.length > 0
      ? context.slice(0, 4).map((item) => `${item.visa_name} (alt sınıf ${item.subclass}) incelemeye değer olabilir.`)
      : ["Öğrenci, yetenekli, işveren sponsorlu, bölgesel veya partner yolları karşılaştırılmaya değer başlangıç noktaları olabilir."]
    : context.length > 0
      ? context.slice(0, 4).map((item) => `${item.visa_name} (subclass ${item.subclass}) may be relevant to explore.`)
      : ["Student, skilled, employer sponsored, regional or partner pathways may be useful starting points to compare."];

  const missingInformation = isTr
    ? [
        !input.mainGoal ? "Ana hedef" : null,
        !input.currentCountry ? "Bulunduğunuz ülke" : null,
        !input.passportCountry ? "Pasaport ülkesi" : null,
        !input.age ? "Yaş" : null,
        !input.occupation ? "Meslek veya eğitim geçmişi" : null,
        !input.englishLevel ? "İngilizce seviyesi" : null,
        !input.sponsorFamily ? "Avustralya'da sponsor, partner veya aile" : null,
        !input.preferredPathway ? "Biliniyorsa tercih edilen vize yolu" : null,
        !input.biggestConcern ? "En büyük endişe veya hazırlık sorusu" : null,
      ].filter((item): item is string => Boolean(item))
    : [
        !input.mainGoal ? "Main goal" : null,
        !input.currentCountry ? "Current country" : null,
        !input.passportCountry ? "Passport country" : null,
        !input.age ? "Age" : null,
        !input.occupation ? "Occupation or study background" : null,
        !input.englishLevel ? "English level" : null,
        !input.sponsorFamily ? "Sponsor, partner or family context in Australia" : null,
        !input.preferredPathway ? "Preferred pathway if known" : null,
        !input.biggestConcern ? "Biggest concern or preparation question" : null,
      ].filter((item): item is string => Boolean(item));

  const missingInformationFallback = isTr
    ? "Ön inceleme formunda büyük bir eksiklik tespit edilmedi, ancak destekleyici kanıtların incelenmesi gerekiyor."
    : "No major gaps were detected in the preview form, but supporting evidence still needs review.";

  const basicRiskSignals = isTr
    ? [
        input.currentCountry
          ? `Bulunduğunuz ülke ${input.currentCountry} olarak kaydedildi; konum mevcut adımları etkileyebilir.`
          : "Bulunduğunuz ülke belirtilmedi, bu nedenle konuma dayalı adımlar daha fazla inceleme gerektirir.",
        input.age ? "Yaş, bazı yetenekli yol ayarlarını etkileyebilir." : "Yaş belirtilmedi.",
        input.englishLevel
          ? "İngilizce seviyesi bazı eğitim, yetenekli veya sponsorlu yol ayarlarını etkileyebilir."
          : "İngilizce seviyesi belirtilmedi.",
        input.biggestConcern
          ? "Belirtilen endişe belge hazırlığı veya zamanlama incelemesini etkileyebilir."
          : "Ana endişe belirtilmedi, bu nedenle bu ön inceleme geniş kapsamlı kalıyor.",
      ]
    : [
        input.currentCountry
          ? `Current country is recorded as ${input.currentCountry}; location can affect available steps.`
          : "Current country was not provided, so location-based steps need further review.",
        input.age ? "Age can affect some skilled pathway settings." : "Age was not provided.",
        input.englishLevel
          ? "English level may affect some study, skilled or sponsored pathway settings."
          : "English level was not provided.",
        input.biggestConcern
          ? "The stated concern may affect document readiness or timing review."
          : "No main concern was provided, so this preview stays broad.",
      ];

  const suggestedNextSteps = isTr
    ? [
        "Olası yol alanları genellikle daha derin hazırlıktan önce karşılaştırılır.",
        "Kimlik, eğitim, iş, İngilizce, sponsor, partner veya aile belgeleri genellikle yol incelemesi için değerlendirilir.",
        "Belge hazırlığı ve danışmana hazır özet, daha sonraki tam rapor için ilgili olabilir.",
        "Kişiselleştirilmiş tavsiye kayıtlı bir göç danışmanı tarafından verilir.",
      ]
    : [
        "Possible pathway areas are often compared before deeper preparation.",
        "Identity, study, work, English, sponsor, partner or family documents are commonly considered for pathway review.",
        "Document readiness and an agent-ready summary may be relevant for a later full report version.",
        "Personalised advice is handled by a registered migration agent.",
      ];

  return {
    possiblePathwayAreas,
    missingInformation:
      missingInformation.length > 0 ? missingInformation : [missingInformationFallback],
    basicRiskSignals,
    suggestedNextSteps,
  };
}

function localizeActionLabel(label: string, locale: "en" | "tr"): string {
  if (locale !== "tr") return label;

  const map: Record<string, string> = {
    "Speak with registered migration agent": "Kayıtlı bir göç danışmanı ile görüşün",
    "View subclass 500 details": "500 vize detaylarını görüntüle",
    "View subclass 482 details": "482 vize detaylarını görüntüle",
    "View subclass 189 details": "189 vize detaylarını görüntüle",
    "View subclass 190 details": "190 vize detaylarını görüntüle",
    "View subclass 491 details": "491 vize detaylarını görüntüle",
    "View Partner visa details": "Partner vize detaylarını görüntüle",
    "View visa details (500)": "500 vize detaylarını görüntüle",
    "View visa details (482)": "482 vize detaylarını görüntüle",
    "View visa details (189)": "189 vize detaylarını görüntüle",
    "View visa details (190)": "190 vize detaylarını görüntüle",
    "Points calculator": "Puan hesaplayıcı",
    "Occupation checker": "Meslek kontrol aracı",
  };

  return map[label] ?? label;
}
