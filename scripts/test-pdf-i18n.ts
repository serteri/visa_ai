import fs from "fs";
import path from "path";
import { runReadinessEngine } from "../src/lib/readiness-engine";
import { generateReadinessPDF } from "../lib/readiness/generate-pdf";

async function main() {
  const locales: Array<"en" | "tr" | "zh-Hans"> = ["en", "tr", "zh-Hans"];
  
  const mockInput = {
    locale: "en", // will be overridden in the loop
    mainGoal: "Skilled migration",
    passportCountry: "Turkey",
    age: "29",
    occupation: "Software Engineer",
    englishLevel: "Superior",
    preferredPathway: "189",
    timeline: "0-6 months",
    biggestConcern: "Points",
  };

  const mockUserInputSummary = {
    name: "Test User",
    email: "test@example.com",
    mainGoal: mockInput.mainGoal,
    passportCountry: mockInput.passportCountry,
    age: mockInput.age,
    occupation: mockInput.occupation,
    englishLevel: mockInput.englishLevel,
  };

  for (const locale of locales) {
    console.log(`\nGenerating readiness report for locale: ${locale}...`);
    // @ts-ignore - overriding locale in the loop
    const inputWithLocale = { ...mockInput, locale };
    // @ts-ignore
    const report = await runReadinessEngine(inputWithLocale, locale);
    
    console.log(`Generating PDF for locale: ${locale}...`);
    const pdfBytes = await generateReadinessPDF({
      report,
      locale,
      userInputSummary: mockUserInputSummary
    });
    
    const outputPath = path.join(process.cwd(), `test-output-${locale}.pdf`);
    fs.writeFileSync(outputPath, Buffer.from(pdfBytes));
    console.log(`✅ Saved: ${outputPath}`);
  }
}

main().catch(console.error);
