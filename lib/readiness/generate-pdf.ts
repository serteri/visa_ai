import { jsPDF } from "jspdf";
import { notoSansRegularBase64 } from "./pdf-font";
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

const PDF_FONT_NAME = "NotoSans";
const PDF_FONT_FILE = "NotoSans-Regular.ttf";

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
      reportIndicators: "Rapor göstergeleri",
      dataCompletenessScore: "Veri Tamamlanma Skoru",
      documentReadinessIndicator: "Belge Hazırlık Göstergesi",
      informationCoverageLevel: "Bilgi Kapsam Düzeyi",
      highCompleteness: "Yüksek tamamlanma",
      mediumCompleteness: "Orta tamamlanma",
      lowCompleteness: "Düşük tamamlanma",
      primaryGap: "Birincil Boşluk",
      dataCompleteness: "Veri Tamamlanma Düzeyi",
      completionRate: "Tamamlanma",
      pathwayTable: "Yapılandırılmış Yol Karşılaştırması",
      visa: "Vize",
      difficulty: "Zorluk",
      requirementType: "Gereklilik Türü",
      userRelativePosition: "Size Göre Konum",
      pathwayComparison: "Olası Vize Yolları",
      confidence: "Güven",
      confidenceExplanation: "Güven Açıklaması",
      keyRequirements: "Ana Gereklilikler",
      pathwayRisks: "Yola Özgü Riskler",
      keyVisaRequirements: "Ana Vize Gereklilikleri",
      whatThisMeans: "Bunun Anlamı",
      riskIndicators: "Risk Göstergeleri",
      documentChecklist: "Belge Kontrol Listesi",
      pointsEstimate: "Puan Tahmini",
      occupationReview: "Meslek Göstergesi",
      suggestedNextSteps: "Değerlendirilebilecek Sonraki Adımlar",
      downloadablePdf: "İndirilebilir PDF",
      factorsAffectingPathways: "Yolları Etkileyebilecek Faktörler",
      missingInformation: "Eksik Bilgiler",
      disclaimer: "Uyarı / İçtihadı",
      estimatedPoints: "Tahmini Puan",
      relevantVisas: "İlgili Vizeler",
      highRisk: "Yüksek",
      mediumRisk: "Orta",
      lowRisk: "Düşük",
      noData: "Veri bulunmamaktadır",
      nameLabel: "Ad soyad",
      emailLabel: "E-posta",
      goalLabel: "Ana hedef",
      currentCountryLabel: "Bulunduğu ülke",
      passportCountryLabel: "Pasaport ülkesi",
      ageLabel: "Yaş",
      occupationLabel: "Meslek",
      englishLevelLabel: "İngilizce seviyesi",
      sponsorFamilyLabel: "Sponsor/aile",
      biggestConcernLabel: "En büyük endişe",
    };
  }

  return {
    title: "Full Visa Readiness Report",
    generatedDate: "Generated Date",
    userInfo: "User Information",
    reportIndicators: "Report indicators",
    dataCompletenessScore: "Data Completeness Score",
    documentReadinessIndicator: "Document Readiness Indicator",
    informationCoverageLevel: "Information Coverage Level",
    highCompleteness: "High completeness",
    mediumCompleteness: "Medium completeness",
    lowCompleteness: "Low completeness",
    primaryGap: "Primary Gap",
    dataCompleteness: "Data Completeness",
    completionRate: "Completeness",
    pathwayTable: "Structured Pathway Comparison",
    visa: "Visa",
    difficulty: "Difficulty",
    requirementType: "Requirement Type",
    userRelativePosition: "User-Relative Position",
    pathwayComparison: "Possible Visa Pathways",
    confidence: "Confidence",
    confidenceExplanation: "Confidence Explanation",
    keyRequirements: "Key Requirements",
    pathwayRisks: "Pathway-Specific Risks",
    keyVisaRequirements: "Key Visa Requirements",
    whatThisMeans: "What This Means",
    riskIndicators: "Risk Indicators",
    documentChecklist: "Document Checklist",
    pointsEstimate: "Points Estimate",
    occupationReview: "Occupation Indication",
    suggestedNextSteps: "Next Steps That Can Be Considered",
    downloadablePdf: "Downloadable PDF",
    factorsAffectingPathways: "Factors that may affect pathways",
    missingInformation: "Missing Information",
    disclaimer: "Disclaimer",
    estimatedPoints: "Estimated Points",
    relevantVisas: "Relevant Visas",
    highRisk: "High",
    mediumRisk: "Medium",
    lowRisk: "Low",
    noData: "No data available",
    nameLabel: "Name",
    emailLabel: "Email",
    goalLabel: "Goal",
    currentCountryLabel: "Current Country",
    passportCountryLabel: "Passport Country",
    ageLabel: "Age",
    occupationLabel: "Occupation",
    englishLevelLabel: "English Level",
    sponsorFamilyLabel: "Sponsor/Family",
    biggestConcernLabel: "Biggest Concern",
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
  doc.addFileToVFS(PDF_FONT_FILE, notoSansRegularBase64);
  doc.addFont(PDF_FONT_FILE, PDF_FONT_NAME, "normal");
  doc.setFont(PDF_FONT_NAME, "normal");

  let yPosition = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 5;

  // Helper functions
  function setBaseFont() {
    doc.setFont(PDF_FONT_NAME, "normal");
  }

  function addTitle(title: string) {
    setBaseFont();
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
    setBaseFont();
    doc.setFontSize(FONTS.heading);
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.text(heading, margin, yPosition);
    yPosition += 10;
  }

  function addBody(text: string, indent = 0) {
    setBaseFont();
    doc.setFontSize(FONTS.body);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    const x = margin + indent;
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    lines.forEach((line: string) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      setBaseFont();
      doc.text(line, x, yPosition);
      yPosition += lineHeight;
    });
  }

  function addSmallText(text: string, indent = 0) {
    setBaseFont();
    doc.setFontSize(FONTS.small);
    doc.setTextColor(COLORS.lightText.r, COLORS.lightText.g, COLORS.lightText.b);
    const x = margin + indent;
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    lines.forEach((line: string) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      setBaseFont();
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
      setBaseFont();
      doc.setFontSize(FONTS.body);
      doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
      const lines = doc.splitTextToSize(item, contentWidth - 8);
      doc.text("•", margin + 2, yPosition);
      lines.forEach((line: string, index: number) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        setBaseFont();
        doc.text(line, margin + 8, yPosition);
        yPosition += lineHeight;
      });
    });
  }

  function formatDifficulty(level: "low" | "medium" | "high") {
    if (level === "high") return text.highRisk;
    if (level === "medium") return text.mediumRisk;
    return text.lowRisk;
  }

  function formatIndicator(level: "low" | "medium" | "high") {
    if (level === "high") return text.highRisk;
    if (level === "medium") return text.mediumRisk;
    return text.lowRisk;
  }

  // Title
  addTitle(text.title);

  // Generated date and user summary
  addSmallText(`${text.generatedDate}: ${new Date().toLocaleDateString(locale)}`);
  yPosition += 5;

  if (Object.values(userInputSummary).some((v) => v)) {
    addHeading(text.userInfo);
    if (userInputSummary.name) addBody(`${text.nameLabel}: ${userInputSummary.name}`);
    if (userInputSummary.email) addBody(`${text.emailLabel}: ${userInputSummary.email}`);
    if (userInputSummary.mainGoal) addBody(`${text.goalLabel}: ${userInputSummary.mainGoal}`);
    if (userInputSummary.currentCountry) addBody(`${text.currentCountryLabel}: ${userInputSummary.currentCountry}`);
    if (userInputSummary.passportCountry) addBody(`${text.passportCountryLabel}: ${userInputSummary.passportCountry}`);
    if (userInputSummary.age) addBody(`${text.ageLabel}: ${userInputSummary.age}`);
    if (userInputSummary.occupation) addBody(`${text.occupationLabel}: ${userInputSummary.occupation}`);
    if (userInputSummary.englishLevel) addBody(`${text.englishLevelLabel}: ${userInputSummary.englishLevel}`);
    if (userInputSummary.sponsorOrFamily) addBody(`${text.sponsorFamilyLabel}: ${userInputSummary.sponsorOrFamily}`);
    if (userInputSummary.biggestConcern) addBody(`${text.biggestConcernLabel}: ${userInputSummary.biggestConcern}`);
    yPosition += 5;
  }

  // Compliance-safe indicators
  addHeading(text.reportIndicators);
  addBody(
    `${text.dataCompletenessScore}: ${report.reportIndicators.dataCompletenessLabel} (${report.reportIndicators.dataCompletenessScore}/100)`
  );
  addBody(
    `${text.documentReadinessIndicator}: ${formatIndicator(report.reportIndicators.documentReadinessIndicator)}`
  );
  addBody(
    `${text.informationCoverageLevel}: ${formatIndicator(report.reportIndicators.informationCoverageLevel)}`
  );
  addSmallText(report.reportIndicators.explanation, 0);
  yPosition += 2;

  addHeading(text.primaryGap);
  addBody(report.primaryGap);
  yPosition += 2;

  addHeading(text.dataCompleteness);
  addBody(`${text.completionRate}: ${report.dataCompleteness.percentage}%`);
  if (report.dataCompleteness.missingFields.length > 0) {
    addBulletPoints(report.dataCompleteness.missingFields);
  }
  yPosition += 3;

  // Structured pathway comparison table (from pathwayComparison fields)
  if (report.pathwayComparison.length > 0) {
    addHeading(text.pathwayTable);
    report.pathwayComparison.forEach((pathway) => {
      const visaLabel =
        pathway.subclass === "general"
          ? pathway.visaName
          : `${pathway.visaName} (${pathway.subclass})`;
      addBody(`${text.visa}: ${visaLabel}`);
      addSmallText(`${text.difficulty}: ${formatDifficulty(pathway.difficulty)}`, 4);
      addSmallText(`${text.requirementType}: ${pathway.requirementType}`, 4);
      addSmallText(`${text.userRelativePosition}: ${pathway.userRelativePosition}`, 4);
      yPosition += 1;
    });
    yPosition += 3;
  }

  // Pathway comparison
  if (report.pathwayComparison.length > 0) {
    addHeading(text.pathwayComparison);
    report.pathwayComparison.forEach((p) => {
      const relevance = p.relevance.toUpperCase().replace(/_/g, " ");
      const confidence =
        p.confidenceLevel === "high"
          ? text.highRisk
          : p.confidenceLevel === "medium"
            ? text.mediumRisk
            : text.lowRisk;
      addBody(`${p.visaName} (${p.subclass}) - ${relevance}`);
      addSmallText(`${text.confidence}: ${confidence}`, 4);
      addSmallText(p.reason, 4);
      addSmallText(`${text.confidenceExplanation}: ${p.confidenceExplanation}`, 4);
      if (p.keyRequirements.length > 0) {
        addBody(text.keyRequirements, 4);
        addBulletPoints(p.keyRequirements);
      }
      if (p.pathwaySpecificRisks.length > 0) {
        addBody(text.pathwayRisks, 4);
        addBulletPoints(p.pathwaySpecificRisks);
      }
      yPosition += 2;
    });
    yPosition += 3;
  }

  if (report.keyVisaRequirements.length > 0) {
    addHeading(text.keyVisaRequirements);
    report.keyVisaRequirements.forEach((requirement) => {
      addBody(requirement.pathway);
      addBulletPoints(requirement.items);
      yPosition += 2;
    });
    yPosition += 3;
  }

  if (report.whatThisMeans.length > 0) {
    addHeading(text.whatThisMeans);
    addBulletPoints(report.whatThisMeans);
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
      addBody(`${text.occupationLabel}: ${report.occupationIndication.occupation}`);
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

  // Next steps that can be considered
  if (report.suggestedNextSteps.length > 0) {
    addHeading(text.suggestedNextSteps);
    addBulletPoints(report.suggestedNextSteps);
    yPosition += 3;
  }

  addHeading(text.downloadablePdf);
  addSmallText(
    locale === "tr"
      ? "Bu dosya, oluşturulan tam vize hazırlık raporunun indirilebilir PDF sürümüdür."
      : "This file is the downloadable PDF version of the generated full visa readiness report.",
    0
  );
  yPosition += 3;

  if (report.factorsAffectingPathways.length > 0) {
    addHeading(text.factorsAffectingPathways);
    addBulletPoints(report.factorsAffectingPathways);
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
