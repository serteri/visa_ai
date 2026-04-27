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
  const possiblePathwayAreas =
    context.length > 0
      ? context.slice(0, 4).map((item) => `${item.visa_name} (subclass ${item.subclass}) may be relevant to explore.`)
      : [
          "Student, skilled, employer sponsored, regional or partner pathways may be useful starting points to compare.",
        ];

  const missingInformation = [
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

  return {
    possiblePathwayAreas,
    missingInformation:
      missingInformation.length > 0
        ? missingInformation
        : ["No major gaps were detected in the preview form, but supporting evidence still needs review."],
    basicRiskSignals: [
      input.currentCountry
        ? `Current country is recorded as ${input.currentCountry}; location can affect available steps.`
        : "Current country was not provided, so location-based steps need further review.",
      input.age ? "Age can affect some skilled pathway settings." : "Age was not provided.",
      input.englishLevel
        ? "English level may affect some study, skilled or sponsored pathway settings."
        : "English level was not provided.",
      input.biggestConcern
        ? "Your stated concern may need a more detailed document and timing review."
        : "No main concern was provided, so this preview stays broad.",
    ],
    suggestedNextSteps: [
      "Review the possible pathway areas shown in this preview.",
      "Gather identity, study, work, English, sponsor, partner or family documents that may relate to your situation.",
      "Use the Full Visa Readiness Report when you want document readiness and an agent-ready summary.",
      "Speak with a registered migration agent for personalised advice.",
    ],
  };
}

function localizeActionLabel(label: string, locale: "en" | "tr"): string {
  if (locale !== "tr") return label;

  const map: Record<string, string> = {
    "Speak with registered migration agent": "Kayitli bir goc danismani ile gorusun",
    "View subclass 500 details": "500 vize detaylarini goruntule",
    "View subclass 482 details": "482 vize detaylarini goruntule",
    "View subclass 189 details": "189 vize detaylarini goruntule",
    "View subclass 190 details": "190 vize detaylarini goruntule",
    "View subclass 491 details": "491 vize detaylarini goruntule",
    "View Partner visa details": "Partner vize detaylarini goruntule",
    "View visa details (500)": "500 vize detaylarini goruntule",
    "View visa details (482)": "482 vize detaylarini goruntule",
    "View visa details (189)": "189 vize detaylarini goruntule",
    "View visa details (190)": "190 vize detaylarini goruntule",
    "Points calculator": "Puan hesaplayici",
    "Occupation checker": "Meslek kontrol araci",
  };

  return map[label] ?? label;
}
