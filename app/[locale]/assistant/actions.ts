"use server";

import {
  generateGroundedVisaAnswer,
  type GroundedAnswerResult,
} from "@/lib/ai/generate-grounded-answer";
import { retrieveVisaContext } from "@/lib/ai/retrieve-visa-context";

type RunAssistantInput = {
  locale: "en" | "tr";
  message: string;
};

export async function runAssistantMessage(
  input: RunAssistantInput
): Promise<GroundedAnswerResult> {
  const locale = input.locale === "tr" ? "tr" : "en";
  const message = input.message.trim();

  const context = await retrieveVisaContext({ message });
  const grounded = await generateGroundedVisaAnswer({
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
    "View visa details (500)": "500 vize detaylarini goruntule",
    "View visa details (482)": "482 vize detaylarini goruntule",
    "View visa details (189)": "189 vize detaylarini goruntule",
    "View visa details (190)": "190 vize detaylarini goruntule",
    "Points calculator": "Puan hesaplayici",
    "Occupation checker": "Meslek kontrol araci",
  };

  return map[label] ?? label;
}
