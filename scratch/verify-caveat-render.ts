import { PDFParse } from "pdf-parse";

import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import { runReadinessEngine } from "@/src/lib/readiness-engine";

type ReadinessInput = Parameters<typeof runReadinessEngine>[0];

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let index = 0;
  while (true) {
    const next = haystack.indexOf(needle, index);
    if (next === -1) return count;
    count += 1;
    index = next + needle.length;
  }
}

async function main() {
  const employmentInput = {
    locale: "en",
    country: "AU",
    mainGoal: "Skilled migration to Australia",
    currentCountry: "Turkey",
    passportCountry: "Turkey",
    age: "36",
    occupation: "Software Engineer",
    englishLevel: "competent",
    qualificationLevel: "Bachelor's Degree",
    occupationConfirmed: "yes",
    sponsorOrFamily: "Single / No Dependants",
    annualSalaryAud: 85000,
  } as const;

  const specialistInput = {
    ...employmentInput,
    qualificationLevel: "PhD" as const,
    qualificationAwardedInAustralia: true,
    specialistEducationStemResponse: "not_sure" as const,
  };

  async function parsePdfText(input: ReadinessInput) {
    const report = runReadinessEngine(input);
    const pdfBytes = await generateReadinessPDF({
      report,
      locale: "en",
      saveToFile: false,
      userInputSummary: {
        name: "Test User",
        email: "test@example.com",
        mainGoal: input.mainGoal,
        currentCountry: input.currentCountry,
        passportCountry: input.passportCountry,
        age: input.age,
        occupation: input.occupation,
        englishLevel: input.englishLevel,
        sponsorOrFamily: input.sponsorOrFamily,
      },
    });

    const parser = new PDFParse({ data: pdfBytes });
    try {
      return (await parser.getText()).text.replace(/\s+/g, " ");
    } finally {
      await parser.destroy();
    }
  }

  const employmentText = await parsePdfText(employmentInput);
  const specialistText = await parsePdfText(specialistInput);

  const longPrefix = "Employment experience not provided — this may significantly change your result.";
  const shortReference = "Employment experience not provided — see Evidence Readiness section for details.";
  const referenceTableMarker = "Reference table: Overseas 3-5 yrs +5";

  const specialistLong =
    "Specialist education (STEM field) was marked \"Not sure\" — the +10 point was not applied and this remains unconfirmed.";
  const specialistShort =
    "Specialist education (STEM field) remains unconfirmed — see Evidence Readiness section for details.";

  const longCount = countOccurrences(employmentText, longPrefix);
  const shortCount = countOccurrences(employmentText, shortReference);
  const tableCount = countOccurrences(employmentText, referenceTableMarker);

  const markerIndex = employmentText.indexOf(referenceTableMarker);
  const evidenceExcerpt =
    markerIndex >= 0
      ? employmentText.slice(Math.max(0, markerIndex - 160), markerIndex + 320)
      : null;

  console.log(
    JSON.stringify(
      {
        employment: {
          longCount,
          shortCount,
          tableCount,
          evidenceExcerpt,
        },
        specialistEducation: {
          longCount: countOccurrences(specialistText, specialistLong),
          shortCount: countOccurrences(specialistText, specialistShort),
        },
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
