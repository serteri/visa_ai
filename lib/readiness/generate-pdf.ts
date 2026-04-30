import { jsPDF } from "jspdf";
import { notoSansRegularBase64 } from "./pdf-font";
import type { ReadinessReport } from "./types";

const COLORS = {
  primary: { r: 22, g: 78, b: 99 },
  accent: { r: 8, g: 145, b: 178 },
  text: { r: 24, g: 24, b: 24 },
  lightText: { r: 107, g: 114, b: 128 },
  border: { r: 229, g: 231, b: 235 },
  tableHeader: { r: 243, g: 244, b: 246 },
  zebra: { r: 249, g: 250, b: 251 },
  riskHigh: { r: 220, g: 38, b: 38 },
  riskMedium: { r: 217, g: 119, b: 6 },
  riskLow: { r: 34, g: 197, b: 94 },
};

const FONTS = {
  title: 24,
  heading: 15,
  subheading: 11,
  body: 10,
  small: 8,
};

const GLOBAL_FOOTER_TEXT =
  "Disclaimer: This is an automated data analysis report provided for general information only. It is NOT migration advice. Final outcomes depend on the Department of Home Affairs. Consult a MARA agent for legal strategy.";

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
      signalSnapshot: "Sinyal Özeti",
      strongestSignal: "En güçlü sinyal",
      secondarySignals: "İkincil sinyaller",
      primaryLimitingFactor: "Birincil Sınırlayıcı Faktör",
      positionChangers: "Durumunuzu Değiştirebilecek Faktörler",
      pathwayTable: "Vize Yolu Karşılaştırması",
      pathwayStrengthComparison: "Vize Yolu Karşılaştırması",
      evidenceReadiness: "Kanıt/Bilgi Hazırlık Özeti",
      pointsBoosterSimulator: "Puan Senaryo Simülatörü",
      financialRoadmap: "Tahmini Maliyet Yol Haritası",
      progressionPathways: "Tipik Geçiş Yolları",
      pathwayFriction: "Vize Yolu Gerçeklik Kontrolü",
      premiumSections: "Premium Sections",
      invitationTrends: "Historical Invitation Trends",
      livingCostProjection: "Living Cost Projection",
      strategicGanttChart: "Strategic Gantt Chart",
      ganttStep: "Adım",
      ganttWindow: "Pencere",
      monthlyRent: "Aylık Kira",
      monthlyGroceries: "Aylık Market",
      monthlyTransport: "Aylık Ulaşım",
      monthlyTotal: "Aylık Toplam",
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
      executiveSummary: "Yönetici Özeti",
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
    signalSnapshot: "Signal Snapshot",
    strongestSignal: "Strongest signal",
    secondarySignals: "Secondary signals",
    primaryLimitingFactor: "Primary Limiting Factor",
    positionChangers: "What May Change Your Position",
    pathwayTable: "Structured Pathway Comparison",
    pathwayStrengthComparison: "Pathway Strength Comparison",
    evidenceReadiness: "Evidence Readiness Snapshot",
    pointsBoosterSimulator: "Points Booster Simulator",
    financialRoadmap: "Financial Roadmap",
    progressionPathways: "Bridge to PR / Typical Progression Pathways",
    pathwayFriction: "Pathway Friction / Reality Check",
    premiumSections: "Premium Sections",
    invitationTrends: "Historical Invitation Trends",
    livingCostProjection: "Living Cost Projection",
    strategicGanttChart: "Strategic Gantt Chart",
    ganttStep: "Step",
    ganttWindow: "Window",
    monthlyRent: "Monthly Rent",
    monthlyGroceries: "Monthly Groceries",
    monthlyTransport: "Monthly Transport",
    monthlyTotal: "Monthly Total",
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
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 5;
  const contentBottom = 267;

  function ensurePageSpace(heightNeeded = 10) {
    if (yPosition + heightNeeded > contentBottom) {
      doc.addPage();
      yPosition = 20;
    }
  }

  // Helper functions
  function setBaseFont() {
    doc.setFont(PDF_FONT_NAME, "normal");
  }

  function setBoldFont() {
    doc.setFont(PDF_FONT_NAME, "normal");
  }

  function drawSeparator() {
    ensurePageSpace(6);
    doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    doc.setLineWidth(0.35);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;
  }

  function addSectionHeading(symbol: string, heading: string) {
    drawSeparator();
    ensurePageSpace(10);
    setBoldFont();
    doc.setFontSize(FONTS.heading);
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.text(`${symbol} ${heading}`, margin, yPosition);
    yPosition += 8;
  }

  function addGlobalFooters() {
    const totalPages = doc.getNumberOfPages();
    const footerWidth = pageWidth - margin * 2;

    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page);
      setBaseFont();
      doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
      doc.setLineWidth(0.25);
      doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
      doc.setFontSize(FONTS.small);
      doc.setTextColor(COLORS.lightText.r, COLORS.lightText.g, COLORS.lightText.b);
      const footerLines = doc.splitTextToSize(GLOBAL_FOOTER_TEXT, footerWidth);
      doc.text(footerLines, margin, pageHeight - 10);
      doc.text(`${page}/${totalPages}`, pageWidth - margin, pageHeight - 4, { align: "right" });
    }
  }

  function addCoverPage() {
    const reportDate = new Date().toLocaleDateString(locale);
    const subjectName = userInputSummary.name || "Applicant";
    const safeName = subjectName.replace(/[^A-Za-z0-9]/g, "").slice(0, 10).toUpperCase() || "CLIENT";
    const reportId = `LVA-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${safeName}`;

    doc.setFillColor(250, 250, 250);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.rect(0, 0, pageWidth, 36, "F");

    setBoldFont();
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text("CONFIDENTIAL READINESS ASSESSMENT", margin, 22);

    setBoldFont();
    doc.setFontSize(26);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    doc.text(text.title, margin, 68);

    doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    doc.setLineWidth(0.4);
    doc.line(margin, 76, pageWidth - margin, 76);

    doc.setFontSize(12);
    doc.setTextColor(COLORS.lightText.r, COLORS.lightText.g, COLORS.lightText.b);
    doc.text("Subject", margin, 92);
    doc.text("Report Date", margin, 104);
    doc.text("Report ID", margin, 116);

    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    doc.text(subjectName, margin + 34, 92);
    doc.text(reportDate, margin + 34, 104);
    doc.text(reportId, margin + 34, 116);

    doc.setTextColor(COLORS.lightText.r, COLORS.lightText.g, COLORS.lightText.b);
    doc.setFontSize(10);
    doc.text(
      "Prepared as an automated analytical briefing for general information purposes.",
      margin,
      pageHeight - 26
    );
    doc.text(
      "Compliance scope: general information, no legal strategy or migration advice.",
      margin,
      pageHeight - 20
    );

    doc.addPage();
    yPosition = 20;
  }

  function addTitle(title: string) {
    setBaseFont();
    doc.setFontSize(FONTS.title);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    doc.text(title, margin, yPosition);
    yPosition += 15;
  }

  function addHeading(heading: string) {
    addSectionHeading("[#]", heading);
  }

  function addBody(text: string, indent = 0) {
    setBaseFont();
    doc.setFontSize(FONTS.body);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    const x = margin + indent;
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    lines.forEach((line: string) => {
      ensurePageSpace(lineHeight + 1);
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
      ensurePageSpace(lineHeight + 1);
      setBaseFont();
      doc.text(line, x, yPosition);
      yPosition += lineHeight;
    });
  }

  function addBulletPoints(items: string[]) {
    items.forEach((item) => {
      ensurePageSpace(lineHeight + 2);
      setBaseFont();
      doc.setFontSize(FONTS.body);
      doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
      const lines = doc.splitTextToSize(item, contentWidth - 8);
      doc.text("-", margin + 2, yPosition);
      lines.forEach((line: string, index: number) => {
        ensurePageSpace(lineHeight + 1);
        setBaseFont();
        doc.text(line, margin + 8, yPosition);
        yPosition += lineHeight;
      });
    });
  }

  function drawTable(
    headers: string[],
    rows: string[][],
    colRatios: number[]
  ) {
    const tableWidth = contentWidth;
    const colWidths = colRatios.map((ratio) => tableWidth * ratio);
    const rowHeight = 7;

    ensurePageSpace(14);
    doc.setFillColor(COLORS.tableHeader.r, COLORS.tableHeader.g, COLORS.tableHeader.b);
    doc.rect(margin, yPosition, tableWidth, rowHeight, "F");
    doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    doc.setLineWidth(0.2);
    doc.line(margin, yPosition + rowHeight, margin + tableWidth, yPosition + rowHeight);

    let cursorX = margin + 1.5;
    setBoldFont();
    doc.setFontSize(FONTS.body);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    headers.forEach((h, i) => {
      doc.text(h, cursorX, yPosition + 4.7);
      cursorX += colWidths[i];
    });
    yPosition += rowHeight;

    rows.forEach((row, rowIndex) => {
      ensurePageSpace(rowHeight + 1);
      if (rowIndex % 2 === 1) {
        doc.setFillColor(COLORS.zebra.r, COLORS.zebra.g, COLORS.zebra.b);
        doc.rect(margin, yPosition, tableWidth, rowHeight, "F");
      }

      let x = margin + 1.5;
      setBaseFont();
      doc.setFontSize(FONTS.body);
      doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
      row.forEach((cell, i) => {
        const clipped = cell.length > 44 ? `${cell.slice(0, 41)}...` : cell;
        doc.text(clipped, x, yPosition + 4.7);
        x += colWidths[i];
      });
      doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
      doc.line(margin, yPosition + rowHeight, margin + tableWidth, yPosition + rowHeight);
      yPosition += rowHeight;
    });
    yPosition += 3;
  }

  function drawGanttTimeline() {
    if (!report.premiumSections?.strategicGanttChart?.steps?.length) return;

    addSectionHeading("[~]", text.strategicGanttChart);
    addSmallText(`${text.ganttWindow}: ${report.premiumSections.strategicGanttChart.timelineBand}`, 0);
    yPosition += 2;

    const phases = [
      { title: "Phase 1: Preparation", steps: report.premiumSections.strategicGanttChart.steps.slice(0, 1) },
      { title: "Phase 2: Assessment", steps: report.premiumSections.strategicGanttChart.steps.slice(1, 2) },
      { title: "Phase 3: EOI and Nomination", steps: report.premiumSections.strategicGanttChart.steps.slice(2, 3) },
      { title: "Phase 4: Lodgement", steps: report.premiumSections.strategicGanttChart.steps.slice(3, 4) },
    ].filter((phase) => phase.steps.length > 0);

    phases.forEach((phase) => {
      ensurePageSpace(16);
      setBoldFont();
      doc.setFontSize(FONTS.subheading);
      doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      doc.text(phase.title, margin, yPosition);
      yPosition += 6;

      const lineX = margin + 4;
      const blockX = margin + 10;

      phase.steps.forEach((step) => {
        ensurePageSpace(16);
        doc.setDrawColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
        doc.setLineWidth(0.5);
        doc.line(lineX, yPosition - 1.5, lineX, yPosition + 10.5);
        doc.setFillColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
        doc.rect(lineX - 1.3, yPosition + 2.5, 2.6, 2.6, "F");

        doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(blockX, yPosition, contentWidth - 12, 12, 1.5, 1.5, "FD");

        setBoldFont();
        doc.setFontSize(FONTS.body);
        doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
        doc.text(`${text.ganttStep} ${step.step}: ${step.title}`, blockX + 2, yPosition + 4.5);

        setBaseFont();
        doc.setFontSize(FONTS.small);
        doc.setTextColor(COLORS.lightText.r, COLORS.lightText.g, COLORS.lightText.b);
        doc.text(`${text.ganttWindow}: ${step.window}`, blockX + 2, yPosition + 8.3);

        yPosition += 15;
      });
      yPosition += 2;
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

  function formatSignalConfidence(level: "limited" | "moderate" | "stronger") {
    if (locale === "tr") {
      return level === "stronger" ? "Daha güçlü" : level === "moderate" ? "Orta" : "Sınırlı";
    }
    return level === "stronger" ? "Stronger" : level === "moderate" ? "Moderate" : "Limited";
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

  // Cover page
  addCoverPage();

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

  addHeading(text.signalSnapshot);
  addBody(`${text.strongestSignal}: ${report.signalSnapshot.strongest}`);
  addBody(
    `${text.secondarySignals}: ${
      report.signalSnapshot.secondary.length > 0
        ? report.signalSnapshot.secondary.join(", ")
        : locale === "tr" ? "Belirgin ikincil sinyal yok" : "No clear secondary signal"
    }`
  );
  addBody(`${text.confidence}: ${formatSignalConfidence(report.signalSnapshot.confidenceLabel)}`);
  addSmallText(report.signalSnapshot.confidenceExplanation, 4);
  yPosition += 3;

  addHeading(text.primaryLimitingFactor);
  addBody(report.primaryLimitingFactor.label);
  addSmallText(report.primaryLimitingFactor.explanation, 4);
  yPosition += 3;

  if (report.positionChangers.length > 0) {
    addHeading(text.positionChangers);
    report.positionChangers.forEach((item) => {
      addBody(item.label);
      addSmallText(item.explanation, 4);
    });
    yPosition += 3;
  }

  if (report.pathwayComparison.length > 0) {
    addHeading(text.pathwayTable);
    report.pathwayComparison.forEach((item) => {
      addBody(`${item.visaName} (${item.subclass})`);
      addSmallText(`${text.confidence}: ${item.confidenceLevel}`, 4);
      addSmallText(item.reason, 4);
    });
    yPosition += 3;
  }

  if (report.pathwayStrengthComparison.length > 0) {
    addHeading(text.pathwayStrengthComparison);
    report.pathwayStrengthComparison.forEach((item) => {
      addBody(`${item.visaName} (${item.subclass})`);
      addSmallText(`${locale === "tr" ? "Güç" : "Strength"}: ${formatStrength(item.strength)}`, 4);
      addSmallText(`${locale === "tr" ? "Zorluk seviyesi" : "Friction"}: ${formatDifficulty(item.friction)}`, 4);
      addSmallText(`${locale === "tr" ? "Gerekli belge düzeyi" : "Evidence load"}: ${formatLoad(item.evidenceLoad)}`, 4);
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
    addSectionHeading("[$]", text.financialRoadmap);
    drawTable(
      [locale === "tr" ? "Kategori" : "Category", locale === "tr" ? "Tutar" : "Amount", locale === "tr" ? "Not" : "Note"],
      report.financialRoadmap.map((item) => [item.category, item.amountLabel, item.explanation]),
      [0.28, 0.2, 0.52]
    );
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

  if (report.premiumSections) {
    addSectionHeading("[*]", text.premiumSections);

    addBody(text.invitationTrends);
    addSmallText(
      `${report.premiumSections.historicalInvitationTrends.matchedOccupationGroup} (${report.premiumSections.historicalInvitationTrends.anzscoCode})`,
      2
    );
    drawTable(
      [locale === "tr" ? "Subclass" : "Subclass", locale === "tr" ? "Tahmini Puan" : "Estimated Points", locale === "tr" ? "Tahmini Bekleme" : "Estimated Wait"],
      report.premiumSections.historicalInvitationTrends.estimates.map((item) => [
        item.subclass,
        `${item.estimatedPoints}`,
        item.estimatedWait,
      ]),
      [0.2, 0.3, 0.5]
    );
    addSmallText(report.premiumSections.historicalInvitationTrends.note, 2);

    addBody(text.livingCostProjection);
    addSmallText(
      `${report.premiumSections.livingCostProjection.city} - ${report.premiumSections.livingCostProjection.familyProfile} (${report.premiumSections.livingCostProjection.currency})`,
      2
    );
    drawTable(
      [text.monthlyRent, text.monthlyGroceries, text.monthlyTransport, text.monthlyTotal],
      [[
        `${report.premiumSections.livingCostProjection.monthly.rent}`,
        `${report.premiumSections.livingCostProjection.monthly.groceries}`,
        `${report.premiumSections.livingCostProjection.monthly.transport}`,
        `${report.premiumSections.livingCostProjection.monthly.total}`,
      ]],
      [0.25, 0.25, 0.25, 0.25]
    );
    addSmallText(report.premiumSections.livingCostProjection.note, 2);

    drawGanttTimeline();
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

  // Missing information
  if (report.missingInformation.length > 0) {
    addHeading(text.missingInformation);
    addBulletPoints(report.missingInformation);
    yPosition += 3;
  }

  // Disclaimer
  addHeading(text.disclaimer);
  addSmallText(report.disclaimer, 0);

  // Global footer on every page
  addGlobalFooters();

  // Generate filename
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = locale === "tr" ? `vize-hazırlık-raporu-${timestamp}.pdf` : `visa-readiness-report-${timestamp}.pdf`;

  // Save PDF
  doc.save(filename);
}
