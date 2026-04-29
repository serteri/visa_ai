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
      pathwayTable: "Yapılandırılmış Yol Karşılaştırması",
      pathwayStrengthComparison: "Vize Yolu Güç Karşılaştırması",
      evidenceReadiness: "Kanıt/Bilgi Hazırlık Özeti",
      pointsBoosterSimulator: "Puan Senaryo Simülatörü",
      financialRoadmap: "Tahmini Maliyet Yol Haritası",
      progressionPathways: "Tipik Geçiş Yolları",
      pathwayFriction: "Vize Yolu Gerçeklik Kontrolü",
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
      executiveSummary: "Yonetici Ozeti",
      riskIndicators: "Risk Göstergeleri",
      suggestedNextSteps: "Önerilen Sonraki Adımlar",
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
    pathwayTable: "Structured Pathway Comparison",
    pathwayStrengthComparison: "Pathway Strength Comparison",
    evidenceReadiness: "Evidence Readiness Snapshot",
    pointsBoosterSimulator: "Points Booster Simulator",
    financialRoadmap: "Financial Roadmap",
    progressionPathways: "Bridge to PR / Typical Progression Pathways",
    pathwayFriction: "Pathway Friction / Reality Check",
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
    executiveSummary: "Executive Summary",
    riskIndicators: "Risk Indicators",
    suggestedNextSteps: "Suggested Next Steps",
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

  function formatStrength(level: "limited" | "moderate" | "strong") {
    if (locale === "tr") {
      return level === "strong" ? "Daha güçlü sinyal" : level === "moderate" ? "Orta sinyal" : "Sınırlı sinyal";
    }
    return level === "strong" ? "Stronger signal" : level === "moderate" ? "Moderate signal" : "Limited signal";
  }

  function formatLoad(level: "low" | "medium" | "high") {
    if (locale === "tr") {
      return level === "high" ? "Yüksek" : level === "medium" ? "Orta" : "Düşük";
    }
    return level === "high" ? "High" : level === "medium" ? "Medium" : "Low";
  }

  function formatEvidenceStatus(status: "provided" | "missing" | "unclear" | "typically_required") {
    if (locale === "tr") {
      if (status === "provided") return "Sağlandı";
      if (status === "missing") return "Eksik";
      if (status === "typically_required") return "Tipik olarak gerekir";
      return "Net değil";
    }
    if (status === "provided") return "Provided";
    if (status === "missing") return "Missing";
    if (status === "typically_required") return "Typically required";
    return "Unclear";
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

  if (report.executiveSummary.length > 0) {
    addHeading(text.executiveSummary);
    addBulletPoints(report.executiveSummary);
    yPosition += 3;
  }

  if (report.pathwayStrengthComparison.length > 0) {
    addHeading(text.pathwayStrengthComparison);
    report.pathwayStrengthComparison.forEach((item) => {
      addBody(`${item.visaName} (${item.subclass})`);
      addSmallText(`${locale === "tr" ? "Güç" : "Strength"}: ${formatStrength(item.strength)}`, 4);
      addSmallText(`${locale === "tr" ? "Sürtünme" : "Friction"}: ${formatDifficulty(item.friction)}`, 4);
      addSmallText(`${locale === "tr" ? "Kanıt yükü" : "Evidence load"}: ${formatLoad(item.evidenceLoad)}`, 4);
      addSmallText(`${locale === "tr" ? "Tipik yol" : "Typical path"}: ${item.typicalPath}`, 4);
      if (item.signalReasons.length > 0) {
        addSmallText(locale === "tr" ? "Sinyal nedenleri:" : "Signal reasons:", 4);
        item.signalReasons.forEach((r) => addSmallText(`– ${r}`, 8));
      }
      if (item.limitingFactors.length > 0) {
        addSmallText(locale === "tr" ? "Sınırlayıcı faktörler:" : "Limiting factors:", 4);
        item.limitingFactors.forEach((f) => addSmallText(`– ${f}`, 8));
      }
      if (item.evidenceStatus.length > 0) {
        addSmallText(locale === "tr" ? "Kanıt durumu:" : "Evidence status:", 4);
        item.evidenceStatus.forEach((ev) => {
          const statusLabel =
            ev.status === "provided" ? (locale === "tr" ? "Sağlandı" : "Provided")
            : ev.status === "missing" ? (locale === "tr" ? "Eksik" : "Missing")
            : ev.status === "unclear" ? (locale === "tr" ? "Net değil" : "Unclear")
            : (locale === "tr" ? "Tipik gereklilik" : "Typically required");
          addSmallText(`– ${ev.label}: ${statusLabel}`, 8);
        });
      }
    });
    yPosition += 3;
  }

  addHeading(text.confidenceExplanation);
  addBody(report.confidenceExplanation);
  yPosition += 3;

  if (report.evidenceReadiness.length > 0) {
    addHeading(text.evidenceReadiness);
    report.evidenceReadiness.forEach((item) => {
      addBody(`${item.category}: ${formatEvidenceStatus(item.status)}`);
      addSmallText(item.explanation, 4);
    });
    yPosition += 3;
  }

  if (report.pointsBoosterSimulator) {
    addHeading(text.pointsBoosterSimulator);
    if (report.pointsBoosterSimulator.currentEstimate !== undefined) {
      addBody(`${text.estimatedPoints}: ${report.pointsBoosterSimulator.currentEstimate}`);
    }
    addSmallText(
      locale === "tr"
        ? "Bu senaryolar yalnızca matematiksel puan değişimini gösterir; uygunluk veya sonuç anlamına gelmez."
        : "This scenario reflects a mathematical change only and does not represent eligibility or outcome.",
      0
    );
    addSmallText(report.pointsBoosterSimulator.note, 0);
    report.pointsBoosterSimulator.scenarios.forEach((scenario) => {
      addBody(`${scenario.label}: ${scenario.estimatedChange >= 0 ? "+" : ""}${scenario.estimatedChange}`);
      if (scenario.resultingEstimate !== undefined) {
        addSmallText(`${locale === "tr" ? "Sonraki matematiksel tahmin" : "Resulting mathematical estimate"}: ${scenario.resultingEstimate}`, 4);
      }
      addSmallText(scenario.explanation, 4);
    });
    yPosition += 3;
  }

  if (report.financialRoadmap.length > 0) {
    addHeading(text.financialRoadmap);
    report.financialRoadmap.forEach((item) => {
      addBody(`${item.category}: ${item.amountLabel}`);
      addSmallText(item.explanation, 4);
    });
    yPosition += 3;
  }

  if (report.progressionPathways.length > 0) {
    addHeading(text.progressionPathways);
    addSmallText(
      locale === "tr"
        ? "Avustralya vize sisteminde tipik geçiş yolları şunları içerebilir:"
        : "Typical progression pathways in the Australian visa system may include:",
      0
    );
    report.progressionPathways.forEach((item) => {
      addBody(`${item.label}: ${item.from} -> ${item.to}`);
      addSmallText(item.explanation, 4);
    });
    yPosition += 3;
  }

  if (report.pathwayFriction.length > 0) {
    addHeading(text.pathwayFriction);
    report.pathwayFriction.forEach((item) => {
      addBody(`${item.pathway}: ${item.frictionType}`);
      addSmallText(item.explanation, 4);
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
