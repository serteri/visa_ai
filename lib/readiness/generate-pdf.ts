import { jsPDF } from "jspdf";
import type { ReadinessReport } from "./types";

const COLORS = {
  primary: { r: 59, g: 130, b: 246 }, // blue-500
  text: { r: 24, g: 24, b: 24 }, // black
  lightText: { r: 107, g: 114, b: 128 }, // gray-500
  border: { r: 229, g: 231, b: 235 }, // gray-200
  riskHigh: { r: 220, g: 38, b: 38 }, // red-600
  riskMedium: { r: 217, g: 119, b: 6 }, // amber-600
  riskLow: { r: 34, g: 197, b: 94 }, // green-600
};

const FONTS = {
  title: 24,
  heading: 14,
  subheading: 11,
  body: 10,
  small: 8,
};

interface PDFGeneratorInput {
  report: ReadinessReport;
  locale: "en" | "tr";
  userInputSummary: {
    name?: string;
    email?: string;
    mainGoal?: string;
    currentCountry?: string;
    passportCountry?: string;
    age?: string;
    occupation?: string;
    englishLevel?: string;
    sponsorOrFamily?: string;
    biggestConcern?: string;
  };
}

function getLocalizedText(locale: "en" | "tr") {
  if (locale === "tr") {
    return {
      title: "Tam Vize Hazırlık Raporu",
      generatedDate: "Oluşturma Tarihi",
      userInfo: "Kullanıcı Bilgileri",
      pathwayComparison: "Olası Vize Yolları",
      riskIndicators: "Risk Göstergeleri",
      documentChecklist: "Belge Kontrol Listesi",
      pointsEstimate: "Puan Tahmini",
      occupationReview: "Meslek İncelemesi",
      suggestedNextSteps: "Önerilen Sonraki Adımlar",
      missingInformation: "Eksik Bilgiler",
      disclaimer: "Uyarı / İçtihadı",
      estimatedPoints: "Tahmini Puan",
      relevantVisas: "İlgili Vizeler",
      highRisk: "Yüksek",
      mediumRisk: "Orta",
      lowRisk: "Düşük",
      noData: "Veri bulunmamaktadır",
    };
  }

  return {
    title: "Full Visa Readiness Report",
    generatedDate: "Generated Date",
    userInfo: "User Information",
    pathwayComparison: "Possible Visa Pathways",
    riskIndicators: "Risk Indicators",
    documentChecklist: "Document Checklist",
    pointsEstimate: "Points Estimate",
    occupationReview: "Occupation Review",
    suggestedNextSteps: "Suggested Next Steps",
    missingInformation: "Missing Information",
    disclaimer: "Disclaimer",
    estimatedPoints: "Estimated Points",
    relevantVisas: "Relevant Visas",
    highRisk: "High",
    mediumRisk: "Medium",
    lowRisk: "Low",
    noData: "No data available",
  };
}

export function generateReadinessPDF(input: PDFGeneratorInput): void {
  const { report, locale, userInputSummary } = input;
  const text = getLocalizedText(locale);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  let yPosition = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 5;

  // Helper functions
  function addTitle(title: string) {
    doc.setFontSize(FONTS.title);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    doc.text(title, margin, yPosition);
    yPosition += 15;
  }

  function addHeading(heading: string) {
    if (yPosition > 260) {
      doc.addPage();
      yPosition = 20;
    }
    doc.setFontSize(FONTS.heading);
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.text(heading, margin, yPosition);
    yPosition += 10;
  }

  function addBody(text: string, indent = 0) {
    doc.setFontSize(FONTS.body);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    const x = margin + indent;
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    lines.forEach((line: string) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, x, yPosition);
      yPosition += lineHeight;
    });
  }

  function addSmallText(text: string, indent = 0) {
    doc.setFontSize(FONTS.small);
    doc.setTextColor(COLORS.lightText.r, COLORS.lightText.g, COLORS.lightText.b);
    const x = margin + indent;
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    lines.forEach((line: string) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, x, yPosition);
      yPosition += lineHeight;
    });
  }

  function addBulletPoints(items: string[]) {
    items.forEach((item) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setFontSize(FONTS.body);
      doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
      const lines = doc.splitTextToSize(item, contentWidth - 8);
      doc.text("•", margin + 2, yPosition);
      lines.forEach((line: string, index: number) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(line, margin + 8, yPosition);
        yPosition += lineHeight;
      });
    });
  }

  // Title
  addTitle(text.title);

  // Generated date and user summary
  addSmallText(`${text.generatedDate}: ${new Date().toLocaleDateString(locale)}`);
  yPosition += 5;

  if (Object.values(userInputSummary).some((v) => v)) {
    addHeading(text.userInfo);
    if (userInputSummary.name) addBody(`Name: ${userInputSummary.name}`);
    if (userInputSummary.email) addBody(`Email: ${userInputSummary.email}`);
    if (userInputSummary.mainGoal) addBody(`Goal: ${userInputSummary.mainGoal}`);
    if (userInputSummary.currentCountry) addBody(`Current Country: ${userInputSummary.currentCountry}`);
    if (userInputSummary.passportCountry) addBody(`Passport Country: ${userInputSummary.passportCountry}`);
    if (userInputSummary.age) addBody(`Age: ${userInputSummary.age}`);
    if (userInputSummary.occupation) addBody(`Occupation: ${userInputSummary.occupation}`);
    if (userInputSummary.englishLevel) addBody(`English Level: ${userInputSummary.englishLevel}`);
    if (userInputSummary.sponsorOrFamily) addBody(`Sponsor/Family: ${userInputSummary.sponsorOrFamily}`);
    if (userInputSummary.biggestConcern) addBody(`Biggest Concern: ${userInputSummary.biggestConcern}`);
    yPosition += 5;
  }

  // Pathway comparison
  if (report.pathwayComparison.length > 0) {
    addHeading(text.pathwayComparison);
    report.pathwayComparison.forEach((p) => {
      const relevance = p.relevance.toUpperCase().replace(/_/g, " ");
      addBody(`${p.visaName} (${p.subclass}) - ${relevance}`);
      addSmallText(p.reason, 4);
      yPosition += 2;
    });
    yPosition += 3;
  }

  // Risk indicators
  if (report.riskIndicators.length > 0) {
    addHeading(text.riskIndicators);
    report.riskIndicators.forEach((r) => {
      const levelText =
        r.level === "high"
          ? text.highRisk
          : r.level === "medium"
            ? text.mediumRisk
            : text.lowRisk;
      addBody(`[${levelText}] ${r.title}`);
      addSmallText(r.explanation, 4);
      yPosition += 2;
    });
    yPosition += 3;
  }

  // Document checklist
  if (report.documentChecklist.length > 0) {
    addHeading(text.documentChecklist);
    report.documentChecklist.forEach((category) => {
      addBody(category.category);
      addBulletPoints(category.items);
      yPosition += 2;
    });
    yPosition += 3;
  }

  // Points estimate
  if (report.pointsEstimate) {
    addHeading(text.pointsEstimate);
    if (report.pointsEstimate.estimatedPoints !== undefined) {
      addBody(`${text.estimatedPoints}: ${report.pointsEstimate.estimatedPoints}`);
    }
    if (report.pointsEstimate.breakdown.length > 0) {
      report.pointsEstimate.breakdown.forEach((item) => {
        addBody(`${item.label}: ${item.points} points`);
        if (item.note) addSmallText(`(${item.note})`, 4);
      });
    }
    addSmallText(report.pointsEstimate.note, 0);
    yPosition += 3;
  }

  // Occupation indication
  if (report.occupationIndication) {
    addHeading(text.occupationReview);
    if (report.occupationIndication.occupation) {
      addBody(`Occupation: ${report.occupationIndication.occupation}`);
    }
    if (report.occupationIndication.matches.length > 0) {
      addBody("Matches Found:");
      report.occupationIndication.matches.forEach((match) => {
        addBody(match.title);
        addSmallText(`${text.relevantVisas}: ${match.relevantVisas.join(", ")}`, 4);
      });
    } else {
      addSmallText(text.noData, 0);
    }
    addSmallText(report.occupationIndication.note, 0);
    yPosition += 3;
  }

  // Suggested next steps
  if (report.suggestedNextSteps.length > 0) {
    addHeading(text.suggestedNextSteps);
    addBulletPoints(report.suggestedNextSteps);
    yPosition += 3;
  }

  // Missing information
  if (report.missingInformation.length > 0) {
    addHeading(text.missingInformation);
    addBulletPoints(report.missingInformation);
    yPosition += 3;
  }

  // Disclaimer
  addHeading(text.disclaimer);
  addSmallText(report.disclaimer, 0);

  // Generate filename
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = locale === "tr" ? `vize-hazırlık-raporu-${timestamp}.pdf` : `visa-readiness-report-${timestamp}.pdf`;

  // Save PDF
  doc.save(filename);
}
