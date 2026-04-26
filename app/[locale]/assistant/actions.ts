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
