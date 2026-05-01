import { jsPDF } from "jspdf";
import { notoSansRegularBase64 } from "./pdf-font";
import { notoSansSCRegularBase64 } from "./pdf-font-sc";
import { frictionBandLabel } from "@/src/lib/readiness/localization";
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

const GLOBAL_FOOTER_TEXTS = {
  en: "Disclaimer: This is an automated data analysis report provided for general information only. It is NOT migration advice. Final outcomes depend on the Department of Home Affairs. Consult a MARA agent for legal strategy.",
  tr: "Uyari: Bu rapor yalnizca genel bilgi amacli otomatik veri analizidir. Gocmenlik danismanligi degildir. Nihai sonuc Department of Home Affairs degerlendirmesine baglidir. Hukuki strateji icin MARA lisansli uzmana danisin.",
  "zh-Hans": "免责声明：本报告为自动化数据分析，仅供一般信息参考，并非移民法律建议。最终结果取决于澳大利亚内政部评估。法律策略请咨询持牌 MARA 代理。",
} as const;

const PDF_FONT_NAME = "NotoSans";
const PDF_FONT_FILE = "NotoSans-Regular.ttf";
const PDF_CJK_FONT_NAME = "NotoSansSC";
const PDF_CJK_FONT_FILE = "NotoSansSC-Regular.ttf";
const PDF_CJK_FONT_PUBLIC_PATH = "/fonts/NotoSansSC-Regular.ttf";
const PDF_CJK_FONT_ASSET_PATH = ["src", "assets", "fonts", "NotoSansSC-Regular.ttf"];

interface PDFGeneratorInput {
  report: ReadinessReport;
  locale: "en" | "tr" | "zh-Hans";
  saveToFile?: boolean;
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

function getLocalizedText(locale: "en" | "tr" | "zh-Hans") {
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
      frictionLevel: "Friction Level",
      frictionScore: "Friction Score",
      realityCheck: "Reality Check",
      successSignals: "Success Signals",
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
      documentLevelSpecificity: "Document-Level Specificity",
      yourImmediateActionPlan: "Your Immediate Action Plan",
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
      confidentialAssessment: "GIZLI HAZIRLIK DEGERLENDIRMESI",
      subject: "Konu",
      reportDate: "Rapor Tarihi",
      reportId: "Rapor ID",
      coverPurpose: "Genel bilgi amacli otomatik analitik bilgilendirme olarak hazirlanmistir.",
      coverScope: "Uyum kapsami: genel bilgi; hukuki strateji veya goc tavsiyesi degildir.",
      category: "Kategori",
      amount: "Tutar",
      note: "Not",
      subclass: "Subclass",
      estimatedWait: "Tahmini Bekleme",
    };
  }

  if (locale === "zh-Hans") {
    return {
      title: "完整签证准备度报告",
      generatedDate: "生成日期",
      userInfo: "用户信息",
      signalSnapshot: "匹配度概览",
      strongestSignal: "最高匹配路径",
      secondarySignals: "其他匹配路径",
      primaryLimitingFactor: "主要限制因素",
      positionChangers: "可能改变你位置的因素",
      pathwayTable: "签证路径结构化对比",
      pathwayStrengthComparison: "路径强度对比",
      evidenceReadiness: "材料/信息准备度摘要",
      pointsBoosterSimulator: "加分场景模拟",
      financialRoadmap: "费用路线图",
      progressionPathways: "通往永居的常见过渡路径",
      pathwayFriction: "竞争激烈度 / 实际难度评估",
      premiumSections: "高级章节",
      invitationTrends: "历史邀请趋势",
      livingCostProjection: "生活成本预测",
      strategicGanttChart: "战略甘特图",
      ganttStep: "步骤",
      ganttWindow: "时间窗口",
      monthlyRent: "月租",
      monthlyGroceries: "月度食品",
      monthlyTransport: "月度交通",
      monthlyTotal: "月总计",
      frictionLevel: "竞争激烈度",
      frictionScore: "竞争激烈度评分",
      realityCheck: "实际难度评估",
      successSignals: "有利因素",
      visa: "签证",
      difficulty: "难度",
      requirementType: "要求类型",
      userRelativePosition: "相对位置",
      pathwayComparison: "可能签证路径",
      confidence: "置信度",
      confidenceExplanation: "置信度说明",
      keyRequirements: "关键要求",
      pathwayRisks: "路径特定风险",
      keyVisaRequirements: "关键签证要求",
      executiveSummary: "执行摘要",
      riskIndicators: "风险指标",
      suggestedNextSteps: "建议下一步",
      documentLevelSpecificity: "文件级具体性",
      yourImmediateActionPlan: "你的立即行动计划",
      downloadablePdf: "可下载 PDF",
      factorsAffectingPathways: "可能影响路径的因素",
      missingInformation: "缺失信息",
      disclaimer: "免责声明",
      estimatedPoints: "初步打分估算",
      relevantVisas: "相关签证",
      highRisk: "高",
      mediumRisk: "中",
      lowRisk: "低",
      noData: "暂无数据",
      nameLabel: "姓名",
      emailLabel: "邮箱",
      goalLabel: "目标",
      currentCountryLabel: "当前国家",
      passportCountryLabel: "护照国家",
      ageLabel: "年龄",
      occupationLabel: "职业",
      englishLevelLabel: "英语水平",
      sponsorFamilyLabel: "担保/家庭",
      biggestConcernLabel: "最大担忧",
      confidentialAssessment: "保密准备度评估",
      subject: "对象",
      reportDate: "报告日期",
      reportId: "报告编号",
      coverPurpose: "本报告为自动化分析简报，仅供一般信息参考。",
      coverScope: "合规范围：一般信息，不构成法律策略或移民建议。",
      category: "类别",
      amount: "金额",
      note: "说明",
      subclass: "签证类别",
      estimatedWait: "预计等待时间",
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
    frictionLevel: "Friction Level",
    frictionScore: "Friction Score",
    realityCheck: "Reality Check",
    successSignals: "Success Signals",
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
    documentLevelSpecificity: "Document-Level Specificity",
    yourImmediateActionPlan: "Your Immediate Action Plan",
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
    confidentialAssessment: "CONFIDENTIAL READINESS ASSESSMENT",
    subject: "Subject",
    reportDate: "Report Date",
    reportId: "Report ID",
    coverPurpose: "Prepared as an automated analytical briefing for general information purposes.",
    coverScope: "Compliance scope: general information, no legal strategy or migration advice.",
    category: "Category",
    amount: "Amount",
    note: "Note",
    subclass: "Subclass",
    estimatedWait: "Estimated Wait",
  };
}

async function toBase64FromArrayBuffer(buffer: ArrayBuffer): Promise<string> {
  if (typeof window === "undefined") {
    return Buffer.from(buffer).toString("base64");
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function loadRuntimeCjkFontBase64(): Promise<string | null> {
  try {
    if (typeof window === "undefined") {
      const { readFile } = await import("node:fs/promises");
      const path = await import("node:path");
      const assetPath = path.join(process.cwd(), ...PDF_CJK_FONT_ASSET_PATH);
      const publicPath = path.join(process.cwd(), "public", "fonts", "NotoSansSC-Regular.ttf");
      const fontBuffer = await readFile(assetPath).catch(() => readFile(publicPath));
      return fontBuffer.toString("base64");
    }

    const response = await fetch(PDF_CJK_FONT_PUBLIC_PATH);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return await toBase64FromArrayBuffer(arrayBuffer);
  } catch {
    return null;
  }
}

export async function generateReadinessPDF(input: PDFGeneratorInput): Promise<Uint8Array> {
  const { report, locale, userInputSummary } = input;
  const cjkRequested = locale === "zh-Hans";
  const runtimeCjkFont = cjkRequested ? await loadRuntimeCjkFontBase64() : null;
  const embeddedCjkFont = notoSansSCRegularBase64.length > 0 ? notoSansSCRegularBase64 : null;
  const resolvedCjkFontBase64 = runtimeCjkFont ?? embeddedCjkFont;
  const cjkFontAvailable = cjkRequested && Boolean(resolvedCjkFontBase64);
  const effectiveLocale = cjkRequested && !cjkFontAvailable ? "en" : locale;
  const text = getLocalizedText(effectiveLocale);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  doc.addFileToVFS(PDF_FONT_FILE, notoSansRegularBase64);
  doc.addFont(PDF_FONT_FILE, PDF_FONT_NAME, "normal");
  if (cjkFontAvailable && resolvedCjkFontBase64) {
    doc.addFileToVFS(PDF_CJK_FONT_FILE, resolvedCjkFontBase64);
    doc.addFont(PDF_CJK_FONT_FILE, PDF_CJK_FONT_NAME, "normal");
  }
  doc.setFont(PDF_FONT_NAME, "normal");

  const activeFontName = cjkFontAvailable ? PDF_CJK_FONT_NAME : PDF_FONT_NAME;

  function safeText(value: string): string {
    if (!cjkRequested || cjkFontAvailable) return value;
    return value.replace(/[^\x00-\x7F]/g, "?");
  }

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
    doc.setFont(activeFontName, "normal");
  }

  function setBoldFont() {
    doc.setFont(activeFontName, "normal");
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
    doc.text(safeText(`${symbol} ${heading}`), margin, yPosition);
    yPosition += 8;
  }

  function addGlobalFooters() {
    const totalPages = doc.getNumberOfPages();
    const footerWidth = pageWidth - margin * 2;
    const footerText = GLOBAL_FOOTER_TEXTS[effectiveLocale];

    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page);
      setBaseFont();
      doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
      doc.setLineWidth(0.25);
      doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
      doc.setFontSize(FONTS.small);
      doc.setTextColor(COLORS.lightText.r, COLORS.lightText.g, COLORS.lightText.b);
      const footerLines = doc.splitTextToSize(footerText, footerWidth);
      doc.text(footerLines.map((line: string) => safeText(line)), margin, pageHeight - 10);
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
    doc.text(safeText(text.confidentialAssessment), margin, 22);

    setBoldFont();
    doc.setFontSize(26);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    doc.text(safeText(text.title), margin, 68);

    doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    doc.setLineWidth(0.4);
    doc.line(margin, 76, pageWidth - margin, 76);

    doc.setFontSize(12);
    doc.setTextColor(COLORS.lightText.r, COLORS.lightText.g, COLORS.lightText.b);
    doc.text(safeText(text.subject), margin, 92);
    doc.text(safeText(text.reportDate), margin, 104);
    doc.text(safeText(text.reportId), margin, 116);

    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    doc.text(safeText(subjectName), margin + 34, 92);
    doc.text(reportDate, margin + 34, 104);
    doc.text(safeText(reportId), margin + 34, 116);

    doc.setTextColor(COLORS.lightText.r, COLORS.lightText.g, COLORS.lightText.b);
    doc.setFontSize(10);
    doc.text(safeText(text.coverPurpose), margin, pageHeight - 26);
    doc.text(safeText(text.coverScope), margin, pageHeight - 20);

    doc.addPage();
    yPosition = 20;
  }

  function addTitle(title: string) {
    setBaseFont();
    doc.setFontSize(FONTS.title);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    doc.text(safeText(title), margin, yPosition);
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
    const lines = doc.splitTextToSize(safeText(text), contentWidth - indent);
    lines.forEach((line: string) => {
      ensurePageSpace(lineHeight + 1);
      setBaseFont();
      doc.text(safeText(line), x, yPosition);
      yPosition += lineHeight;
    });
  }

  function addSmallText(text: string, indent = 0) {
    setBaseFont();
    doc.setFontSize(FONTS.small);
    doc.setTextColor(COLORS.lightText.r, COLORS.lightText.g, COLORS.lightText.b);
    const x = margin + indent;
    const lines = doc.splitTextToSize(safeText(text), contentWidth - indent);
    lines.forEach((line: string) => {
      ensurePageSpace(lineHeight + 1);
      setBaseFont();
      doc.text(safeText(line), x, yPosition);
      yPosition += lineHeight;
    });
  }

  function addBulletPoints(items: string[]) {
    items.forEach((item) => {
      ensurePageSpace(lineHeight + 2);
      setBaseFont();
      doc.setFontSize(FONTS.body);
      doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
      const lines = doc.splitTextToSize(safeText(item), contentWidth - 8);
      doc.text("-", margin + 2, yPosition);
      lines.forEach((line: string) => {
        ensurePageSpace(lineHeight + 1);
        setBaseFont();
        doc.text(safeText(line), margin + 8, yPosition);
        yPosition += lineHeight;
      });
    });
  }

  function drawTable(
    headers: string[],
    rows: string[][],
    colRatios: number[],
    getCellColor?: (rowIndex: number, colIndex: number, cell: string) => { r: number; g: number; b: number } | null
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
      doc.text(safeText(h), cursorX, yPosition + 4.7);
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
        const customColor = getCellColor?.(rowIndex, i, cell);
        if (customColor) {
          doc.setTextColor(customColor.r, customColor.g, customColor.b);
        } else {
          doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
        }
        doc.text(safeText(clipped), x, yPosition + 4.7);
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

    const phaseTitles =
      effectiveLocale === "zh-Hans"
        ? ["第一阶段：准备工作", "第二阶段：职业评估", "第三阶段：意向书与提名", "第四阶段：递交准备"]
        : ["Phase 1: Preparation", "Phase 2: Assessment", "Phase 3: EOI and Nomination", "Phase 4: Lodgement"];
    const phases = phaseTitles
      .map((title, index) => ({
        title,
        steps: report.premiumSections.strategicGanttChart.steps.slice(index, index + 1),
      }))
      .filter((phase) => phase.steps.length > 0);

    phases.forEach((phase) => {
      ensurePageSpace(16);
      setBoldFont();
      doc.setFontSize(FONTS.subheading);
      doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      doc.text(safeText(phase.title), margin, yPosition);
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
        doc.text(safeText(`${text.ganttStep} ${step.step}: ${step.title}`), blockX + 2, yPosition + 4.5);

        setBaseFont();
        doc.setFontSize(FONTS.small);
        doc.setTextColor(COLORS.lightText.r, COLORS.lightText.g, COLORS.lightText.b);
        doc.text(safeText(`${text.ganttWindow}: ${step.window}`), blockX + 2, yPosition + 8.3);

        yPosition += 15;
      });
      yPosition += 2;
    });
  }

  function drawAuditChecklistBox() {
    if (!report.documentChecklist?.length) return;

    addSectionHeading("[ ]", text.documentLevelSpecificity);

    report.documentChecklist.forEach((category) => {
      const isCritical = category.category.toUpperCase() === "CRITICAL";
      const itemCount = Math.max(1, category.items.length);
      const boxHeight = 8 + itemCount * 5;
      ensurePageSpace(boxHeight + 6);

      doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
      doc.setLineWidth(0.25);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, yPosition, contentWidth, boxHeight, 1.2, 1.2, "FD");

      setBoldFont();
      doc.setFontSize(FONTS.subheading);
      if (isCritical) {
        doc.setTextColor(COLORS.riskHigh.r, COLORS.riskHigh.g, COLORS.riskHigh.b);
      } else {
        doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      }
      doc.text(safeText(category.category), margin + 2, yPosition + 5);

      setBaseFont();
      doc.setFontSize(FONTS.body);
      category.items.forEach((item, idx) => {
        if (isCritical) {
          doc.setTextColor(COLORS.riskHigh.r, COLORS.riskHigh.g, COLORS.riskHigh.b);
          doc.text(safeText(`[ ] ${item}`), margin + 4, yPosition + 10 + idx * 5);
        } else {
          doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
          doc.text(safeText(`[ ] ${item}`), margin + 4, yPosition + 10 + idx * 5);
        }
      });

      yPosition += boxHeight + 4;
    });
  }

  function drawImmediateActionPlan() {
    if (!report.suggestedNextSteps?.length) return;

    addSectionHeading("[!]", text.yourImmediateActionPlan);
    ensurePageSpace(18);

    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, yPosition, contentWidth, 12, 1.2, 1.2, "FD");

    setBoldFont();
    doc.setFontSize(12);
    doc.setTextColor(6, 95, 70);
    doc.text(safeText(text.yourImmediateActionPlan), margin + 3, yPosition + 7.5);
    yPosition += 15;

    report.suggestedNextSteps.forEach((step, idx) => {
      addBody(`${idx + 1}. ${step}`, 2);
      yPosition += 1;
    });
    yPosition += 2;
  }

  function formatDifficulty(level: "low" | "medium" | "high") {
    if (level === "high") return text.highRisk;
    if (level === "medium") return text.mediumRisk;
    return text.lowRisk;
  }

  function formatStrength(level: "limited" | "moderate" | "strong") {
    if (effectiveLocale === "tr") {
      return level === "strong" ? "Daha güçlü sinyal" : level === "moderate" ? "Orta sinyal" : "Sınırlı sinyal";
    }
    if (effectiveLocale === "zh-Hans") {
      return level === "strong" ? "匹配度较高" : level === "moderate" ? "匹配度中等" : "匹配度有限";
    }
    return level === "strong" ? "Stronger signal" : level === "moderate" ? "Moderate signal" : "Limited signal";
  }

  function formatSignalConfidence(level: "limited" | "moderate" | "stronger") {
    if (effectiveLocale === "tr") {
      return level === "stronger" ? "Daha güçlü" : level === "moderate" ? "Orta" : "Sınırlı";
    }
    if (effectiveLocale === "zh-Hans") {
      return level === "stronger" ? "较强" : level === "moderate" ? "中等" : "有限";
    }
    return level === "stronger" ? "Stronger" : level === "moderate" ? "Moderate" : "Limited";
  }

  function formatConfidenceLevel(level: "low" | "medium" | "high") {
    if (effectiveLocale === "tr") {
      return level === "high" ? "Yüksek" : level === "medium" ? "Orta" : "Düşük";
    }
    if (effectiveLocale === "zh-Hans") {
      return level === "high" ? "较高" : level === "medium" ? "中等" : "有限";
    }
    return level === "high" ? "High" : level === "medium" ? "Medium" : "Low";
  }

  function formatLoad(level: "low" | "medium" | "high") {
    if (effectiveLocale === "tr") {
      return level === "high" ? "Yüksek" : level === "medium" ? "Orta" : "Düşük";
    }
    if (effectiveLocale === "zh-Hans") {
      return level === "high" ? "高" : level === "medium" ? "中" : "低";
    }
    return level === "high" ? "High" : level === "medium" ? "Medium" : "Low";
  }

  function formatEvidenceStatus(status: "provided" | "missing" | "unclear" | "typically_required") {
    if (effectiveLocale === "tr") {
      if (status === "provided") return "Sağlandı";
      if (status === "missing") return "Eksik";
      if (status === "typically_required") return "Tipik olarak gerekir";
      return "Net değil";
    }
    if (effectiveLocale === "zh-Hans") {
      if (status === "provided") return "已提供";
      if (status === "missing") return "缺失";
      if (status === "typically_required") return "通常需要";
      return "不明确";
    }
    if (status === "provided") return "Provided";
    if (status === "missing") return "Missing";
    if (status === "typically_required") return "Typically required";
    return "Unclear";
  }

  function getFrictionColorByLabel(score: "LOW" | "MEDIUM" | "HIGH" | "EXTREME") {
    if (score === "EXTREME") return { r: 220, g: 38, b: 38 };
    if (score === "HIGH") return { r: 217, g: 119, b: 6 };
    if (score === "MEDIUM") return { r: 202, g: 138, b: 4 };
    return { r: 22, g: 163, b: 74 };
  }

  function getFrictionForPathway(subclass: string) {
    return report.frictionAnalysis.find(
      (f) => f.pathway === subclass || (subclass === "820_801" && f.pathway === "820/801")
    );
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
        : effectiveLocale === "tr"
          ? "Belirgin ikincil sinyal yok"
          : effectiveLocale === "zh-Hans"
            ? "暂无明显次要信号"
            : "No clear secondary signal"
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
    const pathwayRows = report.pathwayComparison.map((item) => {
      const friction = getFrictionForPathway(item.subclass);
      const frictionScore = friction?.frictionScore ?? "MEDIUM";
      return {
        visa: `${item.visaName} (${item.subclass})`,
        confidence: formatConfidenceLevel(item.confidenceLevel),
        frictionScore,
        frictionLabel: frictionBandLabel(effectiveLocale, frictionScore),
        realityCheck: friction?.realityCheck ?? item.reason,
      };
    });

    drawTable(
      [text.visa, text.confidence, text.frictionLevel],
      pathwayRows.map((row) => [row.visa, row.confidence, row.frictionLabel]),
      [0.5, 0.2, 0.3],
      (rowIndex, colIndex) => {
        if (colIndex !== 2) return null;
        const row = pathwayRows[rowIndex];
        if (!row) return null;
        return getFrictionColorByLabel(row.frictionScore);
      }
    );

    pathwayRows.forEach((row) => {
      addSmallText(`${row.visa} - ${text.realityCheck}: ${row.realityCheck}`, 4);
    });
    yPosition += 3;
  }

  if (report.pathwayStrengthComparison.length > 0) {
    addHeading(text.pathwayStrengthComparison);
    report.pathwayStrengthComparison.forEach((item) => {
      addBody(`${item.visaName} (${item.subclass})`);
      addSmallText(`${effectiveLocale === "tr" ? "Güç" : effectiveLocale === "zh-Hans" ? "强度" : "Strength"}: ${formatStrength(item.strength)}`, 4);
      addSmallText(`${effectiveLocale === "tr" ? "Zorluk seviyesi" : effectiveLocale === "zh-Hans" ? "竞争激烈度" : "Friction"}: ${formatDifficulty(item.friction)}`, 4);
      addSmallText(`${effectiveLocale === "tr" ? "Gerekli belge düzeyi" : effectiveLocale === "zh-Hans" ? "材料准备难度" : "Evidence load"}: ${formatLoad(item.evidenceLoad)}`, 4);
      addSmallText(`${effectiveLocale === "tr" ? "Tipik yol" : effectiveLocale === "zh-Hans" ? "典型路径" : "Typical path"}: ${item.typicalPath}`, 4);
      if (item.signalReasons.length > 0) {
        addSmallText(effectiveLocale === "tr" ? "Sinyal nedenleri:" : effectiveLocale === "zh-Hans" ? "匹配依据：" : "Signal reasons:", 4);
        item.signalReasons.forEach((r) => addSmallText(`– ${r}`, 8));
      }
      if (item.limitingFactors.length > 0) {
        addSmallText(effectiveLocale === "tr" ? "Sınırlayıcı faktörler:" : effectiveLocale === "zh-Hans" ? "限制因素：" : "Limiting factors:", 4);
        item.limitingFactors.forEach((f) => addSmallText(`– ${f}`, 8));
      }
      if (item.evidenceStatus.length > 0) {
        addSmallText(effectiveLocale === "tr" ? "Kanıt durumu:" : effectiveLocale === "zh-Hans" ? "证据状态：" : "Evidence status:", 4);
        item.evidenceStatus.forEach((ev) => {
          const statusLabel =
            ev.status === "provided" ? (effectiveLocale === "tr" ? "Sağlandı" : effectiveLocale === "zh-Hans" ? "已提供" : "Provided")
            : ev.status === "missing" ? (effectiveLocale === "tr" ? "Eksik" : effectiveLocale === "zh-Hans" ? "缺失" : "Missing")
            : ev.status === "unclear" ? (effectiveLocale === "tr" ? "Net değil" : effectiveLocale === "zh-Hans" ? "不明确" : "Unclear")
            : (effectiveLocale === "tr" ? "Tipik gereklilik" : effectiveLocale === "zh-Hans" ? "通常需要" : "Typically required");
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
      effectiveLocale === "tr"
        ? "Bu senaryolar yalnızca matematiksel puan değişimini gösterir; uygunluk veya sonuç anlamına gelmez."
        : effectiveLocale === "zh-Hans"
          ? "该模拟仅表示数学分数变化，不代表资格结论或结果保证。"
        : "This scenario reflects a mathematical change only and does not represent eligibility or outcome.",
      0
    );
    addSmallText(report.pointsBoosterSimulator.note, 0);
    report.pointsBoosterSimulator.scenarios.forEach((scenario) => {
      addBody(`${scenario.label}: ${scenario.estimatedChange >= 0 ? "+" : ""}${scenario.estimatedChange}`);
      if (scenario.resultingEstimate !== undefined) {
        addSmallText(`${effectiveLocale === "tr" ? "Sonraki matematiksel tahmin" : effectiveLocale === "zh-Hans" ? "调整后估算分" : "Resulting mathematical estimate"}: ${scenario.resultingEstimate}`, 4);
      }
      addSmallText(scenario.explanation, 4);
    });
    yPosition += 3;
  }

  if (report.financialRoadmap.length > 0) {
    addSectionHeading("[$]", text.financialRoadmap);
    drawTable(
      [effectiveLocale === "tr" ? "Kategori" : text.category, effectiveLocale === "tr" ? "Tutar" : text.amount, effectiveLocale === "tr" ? "Not" : text.note],
      report.financialRoadmap.map((item) => [item.category, item.amountLabel, item.explanation]),
      [0.28, 0.2, 0.52]
    );
  }

  if (report.progressionPathways.length > 0) {
    addHeading(text.progressionPathways);
    addSmallText(
      effectiveLocale === "tr"
        ? "Avustralya vize sisteminde tipik geçiş yolları şunları içerebilir:"
        : effectiveLocale === "zh-Hans"
          ? "澳大利亚签证体系中的典型过渡路径可能包括："
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
      [text.subclass, text.estimatedPoints, text.estimatedWait],
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

  drawAuditChecklistBox();
  drawImmediateActionPlan();

  addHeading(text.downloadablePdf);
  addSmallText(
    effectiveLocale === "tr"
      ? "Bu dosya, oluşturulan tam vize hazırlık raporunun indirilebilir PDF sürümüdür."
      : effectiveLocale === "zh-Hans"
        ? "本文件为已生成完整签证准备度报告的可下载 PDF 版本。"
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
  const filename = effectiveLocale === "tr"
    ? `vize-hazırlık-raporu-${timestamp}.pdf`
    : effectiveLocale === "zh-Hans"
      ? `qianzheng-zhunbeibaogao-${timestamp}.pdf`
      : `visa-readiness-report-${timestamp}.pdf`;
  const pdfBytes = new Uint8Array(doc.output("arraybuffer"));

  // Save PDF
  if (typeof window !== "undefined" && input.saveToFile !== false) {
    doc.save(filename);
  }

  return pdfBytes;
}
