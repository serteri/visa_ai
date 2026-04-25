"use server";

import {
  analyzeVisaMessage,
  type VisaAssistantResult,
} from "@/lib/ai/visa-assistant";

type RunAssistantInput = {
  locale: "en" | "tr";
  message: string;
};

function localizeActionLabel(label: string, locale: "en" | "tr"): string {
  if (locale !== "tr") return label;

  const map: Record<string, string> = {
    "Speak with a registered migration agent": "Kayitli bir goc danismani ile gorusun",
    "View Student visa": "Ogrenci vizesini goruntule",
    "View 482 details": "482 detaylarini goruntule",
    "Check occupation": "Meslegi kontrol et",
    "View 189 details": "189 detaylarini goruntule",
    "View 190 details": "190 detaylarini goruntule",
    "Estimate points": "Puani tahmin et",
  };

  return map[label] ?? label;
}

export async function runAssistantMessage(
  input: RunAssistantInput
): Promise<VisaAssistantResult> {
  const locale = input.locale === "tr" ? "tr" : "en";
  const message = input.message.trim();

  const result = analyzeVisaMessage(message);

  return {
    ...result,
    nextActions: result.nextActions.map((action) => ({
      label: localizeActionLabel(action.label, locale),
      href: action.href.replace("{locale}", locale),
    })),
  };
}
