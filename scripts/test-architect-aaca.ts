import { writeFile } from "node:fs/promises";
import path from "node:path";

import { runReadinessEngine } from "@/src/lib/readiness-engine";
import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import type { Locale, ReadinessInput } from "@/lib/readiness/types";

const locales: Locale[] = ["en", "tr", "zh-Hans"];

const localeInputs: Record<Locale, ReadinessInput> = {
  en: {
    locale: "en",
    mainGoal: "Direct Permanent Residency via Skilled Migration",
    currentCountry: "Turkey",
    passportCountry: "Turkey",
    age: "32",
    occupation: "Architect 232111",
    englishLevel: "Competent English (IELTS 6.5)",
    occupationConfirmed: "yes",
    qualificationLevel: "Master's Degree (Coursework)",
    offshoreExperienceYears: 5,
    onshoreExperienceYears: 0,
  },
  tr: {
    locale: "tr",
    mainGoal: "Kalıcı Oturma - Nitelikli Göç",
    currentCountry: "Türkiye",
    passportCountry: "Türkiye",
    age: "32",
    occupation: "Architect 232111",
    englishLevel: "Competent English (IELTS 6.5)",
    occupationConfirmed: "yes",
    qualificationLevel: "Master's Degree (Coursework)",
    offshoreExperienceYears: 5,
    onshoreExperienceYears: 0,
  },
  "zh-Hans": {
    locale: "zh-Hans",
    mainGoal: "技术移民直接永居",
    currentCountry: "土耳其",
    passportCountry: "土耳其",
    age: "32",
    occupation: "Architect 232111",
    englishLevel: "Competent English (IELTS 6.5)",
    occupationConfirmed: "yes",
    qualificationLevel: "Master's Degree (Coursework)",
    offshoreExperienceYears: 5,
    onshoreExperienceYears: 0,
  },
};

async function main() {
  for (const locale of locales) {
    const input = localeInputs[locale];
    const report = runReadinessEngine(input);
    const skillsRow = report.financialRoadmap.find((item) =>
      item.category.toLowerCase().includes("aaca") ||
      item.category.toLowerCase().includes("skills assessment")
    );
    console.log(`\n=== ${locale} ===`);
    console.log(`Category: ${skillsRow?.category}`);
    console.log(`Amount: ${skillsRow?.amountLabel}`);
    console.log(`Explanation: ${skillsRow?.explanation?.slice(0, 250)}...`);

    const pdfBytes = await generateReadinessPDF({
      report,
      locale,
      saveToFile: false,
      userInputSummary: {
        name: locale === "zh-Hans" ? "Wei Chen" : "Ahmet Yilmaz",
        email: "qa@example.com",
        occupation: input.occupation,
        englishLevel: input.englishLevel,
        skillsAssessmentDone: true,
      },
    });

    if (pdfBytes.byteLength < 20_000) {
      throw new Error(`PDF for ${locale} unexpectedly small: ${pdfBytes.byteLength}`);
    }

    const filePath = path.join(process.cwd(), `test-architect-${locale}.pdf`);
    await writeFile(filePath, Buffer.from(pdfBytes));
    console.log(`PDF: ${filePath} (${pdfBytes.byteLength} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
