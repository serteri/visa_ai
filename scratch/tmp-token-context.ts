import { PDFParse } from "pdf-parse";
import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import { runReadinessEngine } from "@/src/lib/readiness-engine";

async function main() {
  const input = {
    locale: "tr" as const,
    country: "AU" as const,
    mainGoal: "Avustralya'ya nitelikli göç",
    currentCountry: "Türkiye",
    passportCountry: "Türkiye",
    age: "31",
    occupation: "Yazilim Mühendisi",
    englishLevel: "superior",
    qualificationLevel: "Bachelor's Degree" as const,
    annualSalaryAud: 120000,
    sponsorOrFamily: "single",
    timeline: "12+ months",
  };

  const report = runReadinessEngine(input);
  const pdfBytes = await generateReadinessPDF({
    report,
    locale: "tr",
    userInputSummary: {
      occupation: input.occupation,
      age: input.age,
      englishLevel: input.englishLevel,
      currentCountry: input.currentCountry,
    },
  });

  const parser = new PDFParse({ data: Buffer.from(pdfBytes) });
  const text = (await parser.getText()).text.toLowerCase();
  await parser.destroy();

  for (const token of ["goc", "degerlendirme", "ingilizce"]) {
    let idx = text.indexOf(token);
    while (idx !== -1) {
      const start = Math.max(0, idx - 50);
      const end = Math.min(text.length, idx + token.length + 60);
      console.log(`${token}@${idx}: ${text.slice(start, end).replace(/\s+/g, " ")}`);
      idx = text.indexOf(token, idx + 1);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
