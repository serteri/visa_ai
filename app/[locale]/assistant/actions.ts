"use server";

import {
  generateGroundedAnswer,
  type GroundedAssistantResult,
} from "@/lib/ai/generate-grounded-answer";
import { retrieveVisaContext } from "@/lib/ai/retrieve-visa-context";
import { runReadinessEngine } from "@/lib/readiness/engine";

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

  const report = runReadinessEngine({
    locale: input.locale,
    mainGoal: input.mainGoal || undefined,
    currentCountry: input.currentCountry || undefined,
    passportCountry: input.passportCountry || undefined,
    age: input.age || undefined,
    occupation: input.occupation || undefined,
    englishLevel: input.englishLevel || undefined,
    sponsorOrFamily: input.sponsorFamily || undefined,
    preferredPathway: input.preferredPathway || undefined,
    biggestConcern: input.biggestConcern || undefined,
  });

  const possiblePathwayAreas = report.pathwayComparison.map((p) => {
    if (p.subclass === "general") return p.reason;
    return `${p.visaName} (${p.subclass}): ${p.reason}`;
  });

  const basicRiskSignals = report.riskIndicators.map((r) => {
    const levelLabel = isTr
      ? r.level === "high" ? "Yüksek" : r.level === "medium" ? "Orta" : "Düşük"
      : r.level === "high" ? "High" : r.level === "medium" ? "Medium" : "Low";
    return `[${levelLabel}] ${r.explanation}`;
  });

  const missingFallback = isTr
    ? "Ön inceleme formunda büyük bir eksiklik tespit edilmedi, ancak destekleyici kanıtların incelenmesi gerekiyor."
    : "No major gaps were detected in the preview form, but supporting evidence still needs review.";

  return {
    possiblePathwayAreas,
    missingInformation:
      report.missingInformation.length > 0
        ? report.missingInformation
        : [missingFallback],
    basicRiskSignals,
    suggestedNextSteps: report.suggestedNextSteps,
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
