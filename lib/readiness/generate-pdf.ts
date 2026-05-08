import { jsPDF } from "jspdf";
import { notoSansRegularBase64 } from "./pdf-font";
import { notoSansBoldBase64 } from "./pdf-font-bold";
import { notoSansSCRegularBase64 } from "./pdf-font-sc";
import { calculateRankedPathways } from "./ranked-pathways";
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
  en: "This report is an automated data analysis for general information only and does not constitute migration or legal advice. For strategic planning and visa applications, please consult a registered migration agent (MARA).",
  tr: "Bu rapor otomatik bir veri analizidir ve gocmenlik tavsiyesi teskil etmez. Resmi basvurulariniz icin kayitli bir MARA acentesine danisin.",
  "zh-Hans": "本报告为自动化数据分析，仅供一般信息参考，不构成移民或法律建议。涉及签证策略规划与正式申请，请咨询注册移民代理（MARA）。",
} as const;

const PDF_FONT_NAME = "NotoSans";
const PDF_FONT_FILE = "NotoSans-Regular.ttf";
const PDF_FONT_BOLD_FILE = "NotoSans-Bold.ttf";
const PDF_CJK_FONT_NAME = "NotoSansSC";
const PDF_CJK_FONT_FILE = "NotoSansSC-Regular.ttf";
const PDF_CJK_FONT_BOLD_FILE = "NotoSansSC-Bold.ttf";
const PDF_CJK_FONT_PUBLIC_PATH = "/fonts/NotoSansSC-Regular.ttf";
const PDF_CJK_FONT_BOLD_PUBLIC_PATH = "/fonts/NotoSansSC-Bold.ttf";
const PDF_CJK_FONT_ASSET_PATH = ["src", "assets", "fonts", "NotoSansSC-Regular.ttf"];
const PDF_CJK_FONT_BOLD_ASSET_PATH = ["src", "assets", "fonts", "NotoSansSC-Bold.ttf"];

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
      premiumSections: "Premium Bölümler",
      invitationTrends: "Tarihsel Davet Trendleri",
      livingCostProjection: "Yaşam Maliyeti Projeksiyonu",
      strategicGanttChart: "Stratejik Gantt Tablosu",
      ganttStep: "Adım",
      ganttWindow: "Pencere",
      monthlyRent: "Aylık Kira",
      monthlyGroceries: "Aylık Market",
      monthlyTransport: "Aylık Ulaşım",
      monthlyTotal: "Aylık Toplam",
      frictionLevel: "Rekabet Düzeyi",
      frictionScore: "Rekabet Puanı",
      realityCheck: "Gerçeklik Kontrolü",
      successSignals: "Başarı Sinyalleri",
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
      suggestedNextSteps: "Eksik Analizi ve Değerlendirmeler",
      documentLevelSpecificity: "Belge Düzeyinde Ayrıntı",
      yourImmediateActionPlan: "Eksik Analizi ve Değerlendirmeler",
      downloadablePdf: "İndirilebilir PDF",
      factorsAffectingPathways: "Yolları Etkileyebilecek Faktörler",
      missingInformation: "Eksik Bilgiler",
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
      category: "Kategori",
      amount: "Tutar",
      note: "Not",
      subclass: "Subclass",
      estimatedWait: "Tahmini Bekleme",
      visaViabilityRanking: "Vize Sans Siralamasi",
      topRecommendedStates: "En Guclu 2 Eyalet",
      stateNominationTracker: "Eyalet Nomination Tracker",
      lodgementReadyChecklist: "Lodgement-Ready Checklist",
      stateCode: "Eyalet",
      stateStatus: "Durum",
      stateMatch: "Uyum",
      match: "Uyum",
      pointsSignal: "Puan Sinyali",
      stateRadar: "Eyalet Sinyal Radarı",
      stateRadarSubtitle: "Eyalet adaylığı sinyalleri, profil uyum skoruna göre görselleştirilmiştir.",
      noClearSecondarySignal: "Belirgin ikincil sinyal yok",
      downloadablePdfDescription: "Bu dosya, oluşturulan tam vize hazırlık raporunun indirilebilir PDF sürümüdür.",
      urgent: "ACIL",
      important: "ONEMLI",
      ready: "HAZIR",
      highlyRecommendedPathway: "Guclu Onerilen Yol",
      alternativeOption: "Alternatif Secenek",
      highRiskLowProbability: "Yuksek Risk / Dusuk Olasilik",
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
      suggestedNextSteps: "差距分析与考量",
      documentLevelSpecificity: "文件级具体性",
      yourImmediateActionPlan: "差距分析与考量",
      downloadablePdf: "可下载 PDF",
      factorsAffectingPathways: "可能影响路径的因素",
      missingInformation: "缺失信息",
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
      category: "类别",
      amount: "金额",
      note: "说明",
      subclass: "签证类别",
      estimatedWait: "预计等待时间",
      visaViabilityRanking: "签证可行性排序",
      topRecommendedStates: "前 2 个推荐州",
      stateNominationTracker: "州担保追踪图",
      lodgementReadyChecklist: "递交准备行动清单",
      stateCode: "州",
      stateStatus: "状态",
      stateMatch: "匹配",
      match: "匹配",
      pointsSignal: "分数信号",
      stateRadar: "州担保信号雷达",
      stateRadarSubtitle: "州担保信号根据档案匹配分数进行可视化。",
      noClearSecondarySignal: "暂无明显次要信号",
      downloadablePdfDescription: "本文件为已生成完整签证准备度报告的可下载 PDF 版本。",
      urgent: "紧急",
      important: "重要",
      ready: "建议",
      highlyRecommendedPathway: "强烈推荐路径",
      alternativeOption: "替代选项",
      highRiskLowProbability: "高风险 / 低概率",
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
    suggestedNextSteps: "Gap Analysis & Considerations",
    documentLevelSpecificity: "Document-Level Specificity",
    yourImmediateActionPlan: "Gap Analysis & Considerations",
    downloadablePdf: "Downloadable PDF",
    factorsAffectingPathways: "Factors that may affect pathways",
    missingInformation: "Missing Information",
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
    category: "Category",
    amount: "Amount",
    note: "Note",
    subclass: "Subclass",
    estimatedWait: "Estimated Wait",
    visaViabilityRanking: "Visa Viability Ranking",
    topRecommendedStates: "Top 2 Recommended States",
    stateNominationTracker: "State Nomination Tracker",
    lodgementReadyChecklist: "Lodgement-Ready Checklist",
    stateCode: "State",
    stateStatus: "Status",
    stateMatch: "Match",
    match: "Match",
    pointsSignal: "Points Signal",
    stateRadar: "State Signal Radar",
    stateRadarSubtitle: "State nomination signals visualized by profile match score.",
    noClearSecondarySignal: "No clear secondary signal",
    downloadablePdfDescription: "This file is the downloadable PDF version of the generated full visa readiness report.",
    urgent: "URGENT",
    important: "IMPORTANT",
    ready: "READY",
    highlyRecommendedPathway: "Highly Recommended Pathway",
    alternativeOption: "Alternative Option",
    highRiskLowProbability: "High Risk / Low Probability",
  };
}

function getFeedbackTexts(locale: "en" | "tr" | "zh-Hans") {
  if (locale === "tr") {
    return {
      note: "Beta surecindeyiz. Raporu nasil buldunuz? Bize yazin:",
      cta: "Share Feedback",
    };
  }

  if (locale === "zh-Hans") {
    return {
      note: "我们正处于 Beta 阶段。你觉得这份报告如何？欢迎写信告诉我们：",
      cta: "Share Feedback",
    };
  }

  return {
    note: "We are in Beta! How was your report? Help us improve.",
    cta: "Share Feedback",
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

async function loadRuntimeCjkBoldFontBase64(): Promise<string | null> {
  // NotoSansSC-Bold uses CFF outlines (OTF) which jsPDF cannot parse.
  // CJK bold is achieved through visual techniques instead.
  return null;
}

export async function generateReadinessPDF(input: PDFGeneratorInput): Promise<Uint8Array> {
  const { report, locale, userInputSummary } = input;
  const cjkRequested = locale === "zh-Hans";
  const runtimeCjkFont = cjkRequested ? await loadRuntimeCjkFontBase64() : null;
  const runtimeCjkBoldFont = cjkRequested ? await loadRuntimeCjkBoldFontBase64() : null;
  const embeddedCjkFont = notoSansSCRegularBase64.length > 0 ? notoSansSCRegularBase64 : null;
  const resolvedCjkFontBase64 = runtimeCjkFont ?? embeddedCjkFont;
  const cjkFontAvailable = cjkRequested && Boolean(resolvedCjkFontBase64);
  const cjkBoldFontAvailable = cjkRequested && Boolean(runtimeCjkBoldFont);
  const effectiveLocale = cjkRequested && !cjkFontAvailable ? "en" : locale;
  const text = getLocalizedText(effectiveLocale);
  const feedbackText = getFeedbackTexts(effectiveLocale);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Register Latin/Latin-Extended regular font
  doc.addFileToVFS(PDF_FONT_FILE, notoSansRegularBase64);
  doc.addFont(PDF_FONT_FILE, PDF_FONT_NAME, "normal");

  // Register Latin bold font
  doc.addFileToVFS(PDF_FONT_BOLD_FILE, notoSansBoldBase64);
  doc.addFont(PDF_FONT_BOLD_FILE, PDF_FONT_NAME, "bold");

  // Register CJK fonts
  if (cjkFontAvailable && resolvedCjkFontBase64) {
    doc.addFileToVFS(PDF_CJK_FONT_FILE, resolvedCjkFontBase64);
    doc.addFont(PDF_CJK_FONT_FILE, PDF_CJK_FONT_NAME, "normal");
    // CJK bold: register same regular font as bold variant so setBoldFont() falls back gracefully
    doc.addFont(PDF_CJK_FONT_FILE, PDF_CJK_FONT_NAME, "bold");
  }
  // Note: CJK bold TTF (NotoSansSC-Bold) uses CFF outlines incompatible with jsPDF —
  // bold styling for CJK is achieved via color/size contrast instead.

  doc.setFont(PDF_FONT_NAME, "normal");

  const activeFontName = cjkFontAvailable ? PDF_CJK_FONT_NAME : PDF_FONT_NAME;
  const activeBoldAvailable = cjkRequested ? cjkBoldFontAvailable : true;

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
    if (activeBoldAvailable) {
      doc.setFont(activeFontName, "bold");
    } else {
      doc.setFont(activeFontName, "normal");
    }
  }

  function drawSeparator() {
    ensurePageSpace(6);
    doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    doc.setLineWidth(0.35);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;
  }

  function addSectionHeading(_symbol: string, heading: string) {
    drawSeparator();
    ensurePageSpace(13);
    // Ribbon-style background behind the heading
    doc.setFillColor(22, 78, 99);
    doc.roundedRect(margin, yPosition - 5, contentWidth, 10, 1.5, 1.5, "F");
    setBoldFont();
    doc.setFontSize(FONTS.heading);
    doc.setTextColor(255, 255, 255);
    doc.text(safeText(heading), margin + 4, yPosition + 1.5);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    setBaseFont();
    yPosition += 9;
  }

  /** Clip text to fit within maxWidthMm using actual rendered width */
  function clipToWidth(value: string, maxWidthMm: number): string {
    if (doc.getTextWidth(value) <= maxWidthMm) return value;
    let clipped = value;
    while (clipped.length > 1 && doc.getTextWidth(clipped + "…") > maxWidthMm) {
      clipped = clipped.slice(0, -1);
    }
    return clipped + "…";
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

    // ── Background ──────────────────────────────────────────────────────────
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // ── Left accent bar (full-height navy stripe) ────────────────────────────
    doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.rect(0, 0, 8, pageHeight, "F");

    // ── Top header band ──────────────────────────────────────────────────────
    doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.rect(0, 0, pageWidth, 44, "F");

    // Confidential label in header
    setBoldFont();
    doc.setFontSize(9);
    doc.setTextColor(8, 145, 178);           // accent cyan
    doc.text(safeText(text.confidentialAssessment), 14, 14);

    // Product wordmark in header
    setBaseFont();
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    const wordmark = "VisaAI Premium";
    doc.setFontSize(FONTS.body);
    const ww = doc.getTextWidth(wordmark);
    doc.text(wordmark, pageWidth - margin - ww, 14);

    // ── Centered title block ─────────────────────────────────────────────────
    // Title line 1
    setBoldFont();
    doc.setFontSize(28);
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    const titleText = safeText(text.title);
    doc.setFontSize(28);
    const tw = doc.getTextWidth(titleText);
    const titleX = Math.max(margin, (pageWidth - tw) / 2);
    doc.text(titleText, titleX, 80);

    // Thin accent underline under title
    doc.setDrawColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
    doc.setLineWidth(1.2);
    doc.line(margin + 4, 85, pageWidth - margin - 4, 85);

    // ── Metadata card ────────────────────────────────────────────────────────
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin + 4, 95, contentWidth - 8, 52, 2, 2, "FD");

    // Accent left bar on card
    doc.setFillColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
    doc.rect(margin + 4, 95, 2.5, 52, "F");

    const labelX = margin + 10;
    const valueX = margin + 46;
    const metaRows: Array<[string, string]> = [
      [text.subject, subjectName],
      [text.reportDate, reportDate],
      [text.reportId, reportId],
    ];
    if (userInputSummary.occupation) metaRows.push([text.occupationLabel ?? "Occupation", userInputSummary.occupation]);
    if (userInputSummary.mainGoal) metaRows.push([text.goalLabel ?? "Goal", userInputSummary.mainGoal]);

    metaRows.slice(0, 4).forEach(([label, value], i) => {
      const ry = 104 + i * 11;
      setBoldFont();
      doc.setFontSize(9);
      doc.setTextColor(COLORS.lightText.r, COLORS.lightText.g, COLORS.lightText.b);
      doc.text(safeText(label), labelX, ry);
      setBaseFont();
      doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
      doc.text(safeText(clipToWidth(value, contentWidth - 50)), valueX, ry);
    });

    // ── Occupation / goal summary chip ────────────────────────────────────────
    if (userInputSummary.occupation) {
      const chipY = 158;
      doc.setFillColor(236, 254, 255);
      doc.setDrawColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin + 4, chipY, contentWidth - 8, 10, 1.5, 1.5, "FD");
      doc.setFont(PDF_FONT_NAME, "normal");
      doc.setFontSize(9);
      doc.setTextColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
      doc.text(safeText(userInputSummary.occupation), margin + 8, chipY + 6.5);
    }

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
    addSectionHeading("", heading);
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

  function addPremiumBulletContainer(title: string, items: string[], accent = COLORS.accent) {
    if (items.length === 0) return;

    const lineGroups = items.map((item) => doc.splitTextToSize(safeText(item), contentWidth - 18));
    const boxHeight = Math.max(24, 13 + lineGroups.reduce((sum, lines) => sum + lines.length * 4.4 + 2, 0));
    ensurePageSpace(boxHeight + 8);

    const topY = yPosition;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, topY, contentWidth, boxHeight, 2, 2, "FD");
    doc.setFillColor(accent.r, accent.g, accent.b);
    doc.rect(margin, topY, 2.8, boxHeight, "F");

    setBoldFont();
    doc.setFontSize(FONTS.subheading);
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.text(safeText(title), margin + 7, topY + 7.5);

    let cursorY = topY + 14;
    lineGroups.forEach((lines) => {
      doc.setFillColor(accent.r, accent.g, accent.b);
      doc.circle(margin + 8, cursorY - 1.3, 1, "F");
      setBaseFont();
      doc.setFontSize(FONTS.small);
      doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
      doc.text(lines, margin + 12, cursorY);
      cursorY += lines.length * 4.4 + 2;
    });

    yPosition = topY + boxHeight + 5;
  }

  function addPremiumKeyValueContainer(title: string, rows: Array<[string, string]>, accent = COLORS.accent) {
    if (rows.length === 0) return;

    const preparedRows = rows.map(([label, value]) => ({
      label,
      lines: doc.splitTextToSize(safeText(value), contentWidth - 58),
    }));
    const boxHeight = Math.max(24, 13 + preparedRows.reduce((sum, row) => sum + Math.max(7, row.lines.length * 4.5 + 2), 0));
    ensurePageSpace(boxHeight + 8);

    const topY = yPosition;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, topY, contentWidth, boxHeight, 2, 2, "FD");
    doc.setFillColor(236, 254, 255);
    doc.roundedRect(margin + 3, topY + 3, contentWidth - 6, 8, 1.3, 1.3, "F");

    setBoldFont();
    doc.setFontSize(FONTS.subheading);
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.text(safeText(title), margin + 7, topY + 8.5);

    let cursorY = topY + 17;
    preparedRows.forEach((row) => {
      setBoldFont();
      doc.setFontSize(FONTS.small);
      doc.setTextColor(accent.r, accent.g, accent.b);
      doc.text(safeText(row.label), margin + 7, cursorY);

      setBaseFont();
      doc.setFontSize(FONTS.small);
      doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
      doc.text(row.lines, margin + 55, cursorY);
      cursorY += Math.max(7, row.lines.length * 4.5 + 2);
    });

    yPosition = topY + boxHeight + 5;
  }

  function drawTable(
    headers: string[],
    rows: string[][],
    colRatios: number[],
    getCellColor?: (rowIndex: number, colIndex: number, cell: string) => { r: number; g: number; b: number } | null
  ) {
    const tableWidth = contentWidth;
    const colWidths = colRatios.map((ratio) => tableWidth * ratio);
    const rowHeight = 8;
    const cellPad = 2.5;
    const totalRows = rows.length;

    ensurePageSpace(14);

    // Header row background
    doc.setFillColor(COLORS.tableHeader.r, COLORS.tableHeader.g, COLORS.tableHeader.b);
    doc.rect(margin, yPosition, tableWidth, rowHeight, "F");
    doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    doc.setLineWidth(0.3);
    doc.line(margin, yPosition + rowHeight, margin + tableWidth, yPosition + rowHeight);

    let cursorX = margin + cellPad;
    setBoldFont();
    doc.setFontSize(FONTS.body);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    headers.forEach((h, i) => {
      doc.text(safeText(h), cursorX, yPosition + 5.3);
      cursorX += colWidths[i];
    });
    yPosition += rowHeight;

    rows.forEach((row, rowIndex) => {
      ensurePageSpace(rowHeight + 1);
      if (rowIndex % 2 === 1) {
        doc.setFillColor(COLORS.zebra.r, COLORS.zebra.g, COLORS.zebra.b);
        doc.rect(margin, yPosition, tableWidth, rowHeight, "F");
      }

      let x = margin + cellPad;
      setBaseFont();
      doc.setFontSize(FONTS.body);
      doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
      row.forEach((cell, i) => {
        // Clip by rendered pixel width, not character count — CJK chars are wider
        const maxCellMm = colWidths[i] - 3;
        const clipped = clipToWidth(cell, maxCellMm);
        const customColor = getCellColor?.(rowIndex, i, cell);
        if (customColor) {
          doc.setTextColor(customColor.r, customColor.g, customColor.b);
        } else {
          doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
        }
        doc.text(safeText(clipped), x, yPosition + 5.3);
        x += colWidths[i];
      });
      doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
      doc.setLineWidth(0.15);
      doc.line(margin, yPosition + rowHeight, margin + tableWidth, yPosition + rowHeight);
      yPosition += rowHeight;
    });

    // Outer border + vertical column dividers
    doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    doc.setLineWidth(0.3);
    doc.rect(margin, yPosition - (totalRows + 1) * rowHeight, tableWidth, (totalRows + 1) * rowHeight);
    doc.setLineWidth(0.15);
    let vx = margin;
    for (let ci = 0; ci < colWidths.length - 1; ci++) {
      vx += colWidths[ci];
      doc.line(vx, yPosition - (totalRows + 1) * rowHeight, vx, yPosition);
    }

    yPosition += 3;
  }

  function drawGanttTimeline() {
    if (!report.premiumSections?.strategicGanttChart?.steps?.length) return;

    addSectionHeading("", text.strategicGanttChart);

    const steps = report.premiumSections.strategicGanttChart.steps;
    const timelineBand = report.premiumSections.strategicGanttChart.timelineBand;

    // Timeline layout constants
    const nodeR = 3.5;            // circle radius
    const spineX = margin + 8;   // vertical spine X
    const cardX = spineX + 9;    // step card left edge
    const cardW = contentWidth - 18;
    const cardH = 20;
    const stepGap = cardH + 6;   // gap between nodes

    const totalH = steps.length * stepGap + 10;
    ensurePageSpace(totalH + 16);

    // Timeline band label
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(margin, yPosition, contentWidth, 7, 1.2, 1.2, "F");
    setBaseFont();
    doc.setFontSize(FONTS.small);
    doc.setTextColor(COLORS.lightText.r, COLORS.lightText.g, COLORS.lightText.b);
    doc.text(safeText(`${text.ganttWindow}: ${timelineBand}`), margin + 3, yPosition + 4.5);
    yPosition += 10;

    // Draw the continuous vertical spine first (from top node centre to bottom node centre)
    const spineTop = yPosition + nodeR;
    const spineBottom = yPosition + (steps.length - 1) * stepGap + nodeR;
    doc.setDrawColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
    doc.setLineWidth(0.8);
    doc.line(spineX, spineTop, spineX, spineBottom);

    // Draw each step node and card
    steps.forEach((step, idx) => {
      const nodeY = yPosition + idx * stepGap;
      ensurePageSpace(cardH + 4);

      // Node circle (filled)
      doc.setFillColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.5);
      doc.circle(spineX, nodeY + nodeR, nodeR, "FD");

      // Step number inside circle
      setBoldFont();
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      const numStr = String(step.step);
      const numW = doc.getTextWidth(numStr);
      doc.text(numStr, spineX - numW / 2, nodeY + nodeR + 2, { baseline: "middle" });

      // Horizontal connector from spine to card
      doc.setDrawColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
      doc.setLineWidth(0.4);
      doc.line(spineX + nodeR, nodeY + nodeR, cardX - 1, nodeY + nodeR);

      // Step card background
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
      doc.setLineWidth(0.25);
      doc.roundedRect(cardX, nodeY, cardW, cardH, 1.5, 1.5, "FD");

      // Accent left border on card
      doc.setFillColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
      doc.rect(cardX, nodeY, 1.5, cardH, "F");

      // Step title
      setBoldFont();
      doc.setFontSize(FONTS.body);
      doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      const titleText = safeText(`${text.ganttStep} ${step.step}: ${step.title}`);
      doc.text(titleText, cardX + 4, nodeY + 6.5);

      // Window label
      setBaseFont();
      doc.setFontSize(FONTS.small);
      doc.setTextColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
      doc.text(safeText(step.window), cardX + 4, nodeY + 11.5);

      // Description text (wrapped)
      doc.setTextColor(COLORS.lightText.r, COLORS.lightText.g, COLORS.lightText.b);
      const descLines = doc.splitTextToSize(safeText(step.description ?? ""), cardW - 8);
      const descY = nodeY + 16;
      if (descLines.length > 0) {
        doc.text(descLines[0], cardX + 4, descY);
      }
    });

    yPosition += steps.length * stepGap + 6;
  }

  function drawAuditChecklistBox() {
    if (!report.documentChecklist?.length) return;

    addSectionHeading("", text.documentLevelSpecificity);

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

    addSectionHeading("", text.yourImmediateActionPlan);
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

  function formatRecommendationTag(tag: string) {
    if (tag.includes("Highly")) return text.highlyRecommendedPathway;
    if (tag.includes("Alternative")) return text.alternativeOption;
    if (tag.includes("High Risk")) return text.highRiskLowProbability;
    return safeText(tag.replace(/[^\x00-\x7F]/g, "").trim());
  }

  function stateMatchColor(matchLevel: "high" | "medium" | "low") {
    if (matchLevel === "high") return COLORS.riskLow;
    if (matchLevel === "medium") return COLORS.riskMedium;
    return COLORS.riskHigh;
  }

  function drawVisaViabilityRanking() {
    const rankedPathways =
      report.rankedPathways ??
      calculateRankedPathways(report, {
        age: userInputSummary.age,
        currentCountry: userInputSummary.currentCountry,
      });
    if (rankedPathways.length === 0) return;

    addHeading(text.visaViabilityRanking);
    ensurePageSpace(55);

    rankedPathways.forEach((item, index) => {
      const rowHeight = 16;
      ensurePageSpace(rowHeight + 2);

      const topY = yPosition;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
      doc.setLineWidth(0.25);
      doc.roundedRect(margin, topY, contentWidth, rowHeight, 1.2, 1.2, "FD");

      setBoldFont();
      doc.setFontSize(FONTS.body);
      doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      doc.text(safeText(`${item.visaLabel} - ${item.matchPercentage}% ${text.match}`), margin + 2.5, topY + 5.2);

      setBaseFont();
      doc.setFontSize(FONTS.small);
      doc.setTextColor(COLORS.lightText.r, COLORS.lightText.g, COLORS.lightText.b);
      doc.text(
        safeText(`${formatRecommendationTag(item.recommendationTag)}  (${text.pointsSignal}: ${item.pointsSignal})`),
        margin + 2.5,
        topY + 9.6
      );

      const barX = margin + 2.5;
      const barY = topY + 11;
      const barW = contentWidth - 5;
      const barH = 3.2;

      doc.setFillColor(COLORS.tableHeader.r, COLORS.tableHeader.g, COLORS.tableHeader.b);
      doc.roundedRect(barX, barY, barW, barH, 0.6, 0.6, "F");

      const fillW = (barW * item.matchPercentage) / 100;
      const barColor =
        index === 0
          ? COLORS.riskLow
          : index === 1
            ? COLORS.riskMedium
            : COLORS.riskHigh;
      doc.setFillColor(barColor.r, barColor.g, barColor.b);
      doc.roundedRect(barX, barY, fillW, barH, 0.6, 0.6, "F");

      yPosition += rowHeight + 2;
    });

    yPosition += 1;
  }

  function drawTopRecommendedStates() {
    const topStates = report.stateNominationTracker?.topRecommendedStates ?? [];
    if (topStates.length === 0) return;

    addHeading(text.topRecommendedStates);
    ensurePageSpace(32);

    topStates.forEach((state, index) => {
      const rowHeight = 14;
      ensurePageSpace(rowHeight + 2);

      const topY = yPosition;
      const color = stateMatchColor(state.matchLevel);

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
      doc.setLineWidth(0.25);
      doc.roundedRect(margin, topY, contentWidth, rowHeight, 1.2, 1.2, "FD");

      doc.setFillColor(color.r, color.g, color.b);
      doc.circle(margin + 4, topY + 5, 1.5, "F");

      setBoldFont();
      doc.setFontSize(FONTS.body);
      doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      doc.text(safeText(`${index + 1}. ${state.code} - ${state.name} (${state.status})`), margin + 7.5, topY + 5.3);

      setBaseFont();
      doc.setFontSize(FONTS.small);
      doc.setTextColor(COLORS.lightText.r, COLORS.lightText.g, COLORS.lightText.b);
      doc.text(safeText(state.summary), margin + 7.5, topY + 9.5, { maxWidth: contentWidth - 10 });

      yPosition += rowHeight + 2;
    });

    if (report.stateNominationTracker?.note) {
      addSmallText(report.stateNominationTracker.note, 4);
      yPosition += 2;
    }
  }

  function drawStateRadar() {
    const states = report.stateNominationTracker?.states ?? [];
    if (states.length === 0) return;

    addHeading(text.stateRadar);
    ensurePageSpace(86);

    const topY = yPosition;
    const boxHeight = 78;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, topY, contentWidth, boxHeight, 2, 2, "FD");

    setBaseFont();
    doc.setFontSize(FONTS.small);
    doc.setTextColor(COLORS.lightText.r, COLORS.lightText.g, COLORS.lightText.b);
    doc.text(doc.splitTextToSize(safeText(text.stateRadarSubtitle), contentWidth - 8), margin + 4, topY + 7);

    const centerX = margin + 50;
    const centerY = topY + 42;
    const radius = 24;
    const ringColor = { r: 203, g: 213, b: 225 };
    doc.setDrawColor(ringColor.r, ringColor.g, ringColor.b);
    doc.setLineWidth(0.25);
    [0.33, 0.66, 1].forEach((scale) => {
      doc.circle(centerX, centerY, radius * scale, "S");
    });

    const radarStates = states.slice(0, 8);
    const points = radarStates.map((state, index) => {
      const angle = -Math.PI / 2 + (index / radarStates.length) * Math.PI * 2;
      const scoreRadius = radius * Math.max(0.05, Math.min(1, state.score / 100));
      const outerX = centerX + Math.cos(angle) * radius;
      const outerY = centerY + Math.sin(angle) * radius;
      const pointX = centerX + Math.cos(angle) * scoreRadius;
      const pointY = centerY + Math.sin(angle) * scoreRadius;

      doc.setDrawColor(ringColor.r, ringColor.g, ringColor.b);
      doc.line(centerX, centerY, outerX, outerY);

      setBoldFont();
      doc.setFontSize(6.5);
      doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      doc.text(safeText(state.code), outerX, outerY, { align: outerX < centerX ? "right" : "left" });

      return { x: pointX, y: pointY };
    });

    if (points.length > 1) {
      doc.setDrawColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
      doc.setLineWidth(0.8);
      points.forEach((point, index) => {
        const next = points[(index + 1) % points.length];
        doc.line(point.x, point.y, next.x, next.y);
      });
      points.forEach((point) => {
        doc.setFillColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
        doc.circle(point.x, point.y, 1.4, "F");
      });
    }

    const listX = margin + 88;
    let listY = topY + 18;
    states.slice(0, 8).forEach((state) => {
      const color = stateMatchColor(state.matchLevel);
      const barW = 58;
      const barH = 4;

      setBoldFont();
      doc.setFontSize(7.5);
      doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      doc.text(safeText(`${state.code} ${state.score}%`), listX, listY);

      doc.setFillColor(226, 232, 240);
      doc.roundedRect(listX + 28, listY - 3.2, barW, barH, 0.8, 0.8, "F");
      doc.setFillColor(color.r, color.g, color.b);
      doc.roundedRect(listX + 28, listY - 3.2, (barW * state.score) / 100, barH, 0.8, 0.8, "F");

      setBaseFont();
      doc.setFontSize(6.5);
      doc.setTextColor(COLORS.lightText.r, COLORS.lightText.g, COLORS.lightText.b);
      doc.text(safeText(clipToWidth(state.status, contentWidth - 122)), listX + 90, listY);
      listY += 6.7;
    });

    yPosition = topY + boxHeight + 5;
  }

  function drawStateNominationTable() {
    const states = report.stateNominationTracker?.states ?? [];
    if (states.length === 0) return;

    addHeading(text.stateNominationTracker);
    ensurePageSpace(62);

    const col1 = margin;
    const col2 = margin + 28;
    const col3 = margin + 108;
    const col4 = margin + 150;
    const rowHeight = 8;

    doc.setFillColor(COLORS.tableHeader.r, COLORS.tableHeader.g, COLORS.tableHeader.b);
    doc.roundedRect(margin, yPosition, contentWidth, rowHeight, 1, 1, "F");
    setBoldFont();
    doc.setFontSize(FONTS.small);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    doc.text(safeText(text.stateCode), col1 + 2, yPosition + 5.2);
    doc.text(safeText(text.stateStatus), col2 + 2, yPosition + 5.2);
    doc.text(safeText(text.stateMatch), col3 + 2, yPosition + 5.2);
    doc.text(safeText(text.note), col4 + 2, yPosition + 5.2);
    yPosition += rowHeight;

    setBaseFont();
    doc.setFontSize(FONTS.small);

    states.forEach((state, index) => {
      ensurePageSpace(rowHeight + 2);

      if (index % 2 === 0) {
        doc.setFillColor(COLORS.zebra.r, COLORS.zebra.g, COLORS.zebra.b);
        doc.rect(margin, yPosition, contentWidth, rowHeight, "F");
      }

      const color = stateMatchColor(state.matchLevel);

      doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
      doc.text(safeText(state.code), col1 + 2, yPosition + 5.2);
      doc.text(safeText(state.status), col2 + 2, yPosition + 5.2, { maxWidth: 76 });
      doc.setTextColor(color.r, color.g, color.b);
      doc.text(safeText(`${state.score}%`), col3 + 2, yPosition + 5.2);
      doc.setTextColor(COLORS.lightText.r, COLORS.lightText.g, COLORS.lightText.b);
      const note = state.requirements[0] ?? state.summary;
      doc.text(safeText(note), col4 + 2, yPosition + 5.2, { maxWidth: contentWidth - (col4 - margin) - 4 });
      yPosition += rowHeight;
    });

    yPosition += 3;
  }

  function drawLodgementReadyChecklist() {
    const checklist = report.lodgementReadyChecklist?.items ?? [];
    if (checklist.length === 0) return;

    addHeading(text.lodgementReadyChecklist);

    checklist.forEach((item) => {
      const detailLines = doc.splitTextToSize(safeText(item.detail), contentWidth - 34);
      const boxHeight = Math.max(16, 10 + detailLines.length * 4.4);
      ensurePageSpace(boxHeight + 4);
      const topY = yPosition;

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
      doc.setLineWidth(0.25);
      doc.roundedRect(margin, topY, contentWidth, boxHeight, 1.8, 1.8, "FD");

      const color =
        item.priority === "urgent"
          ? COLORS.riskHigh
          : item.priority === "important"
            ? COLORS.riskMedium
            : COLORS.riskLow;

      const priorityLabel =
        item.priority === "urgent"
          ? text.urgent
          : item.priority === "important"
            ? text.important
            : text.ready;

      doc.setDrawColor(156, 163, 175);
      doc.setLineWidth(0.35);
      doc.roundedRect(margin + 3, topY + 3.2, 4.2, 4.2, 0.6, 0.6, "S");

      doc.setFillColor(color.r, color.g, color.b);
      doc.roundedRect(margin + 10, topY + 2.8, 17, 5.2, 1.2, 1.2, "F");

      setBoldFont();
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(safeText(priorityLabel), margin + 12, topY + 6.3);

      setBoldFont();
      doc.setFontSize(FONTS.body);
      doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      doc.text(safeText(item.title), margin + 30, topY + 6.5);

      setBaseFont();
      doc.setFontSize(FONTS.small);
      doc.setTextColor(COLORS.lightText.r, COLORS.lightText.g, COLORS.lightText.b);
      doc.text(detailLines, margin + 30, topY + 11.2);

      yPosition += boxHeight + 3;
    });

    if (report.lodgementReadyChecklist?.note) {
      addSmallText(report.lodgementReadyChecklist.note, 4);
      yPosition += 2;
    }
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
    addPremiumBulletContainer(text.executiveSummary, report.executiveSummary);
  }

  drawVisaViabilityRanking();
  drawStateRadar();
  drawTopRecommendedStates();
  drawStateNominationTable();
  drawLodgementReadyChecklist();

  addPremiumKeyValueContainer(text.signalSnapshot, [
    [text.strongestSignal, report.signalSnapshot.strongest],
    [
      text.secondarySignals,
      report.signalSnapshot.secondary.length > 0
        ? report.signalSnapshot.secondary.join(", ")
        : text.noClearSecondarySignal,
    ],
    [text.confidence, formatSignalConfidence(report.signalSnapshot.confidenceLabel)],
    [text.confidenceExplanation, report.signalSnapshot.confidenceExplanation],
  ]);

  addPremiumKeyValueContainer(
    text.primaryLimitingFactor,
    [
      [text.primaryLimitingFactor, report.primaryLimitingFactor.label],
      [text.realityCheck, report.primaryLimitingFactor.explanation],
    ],
    COLORS.riskMedium
  );

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
    addSectionHeading("", text.financialRoadmap);
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
    addSectionHeading("", text.premiumSections);

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
      addBody(`${levelText}  ${r.title}`);
      addSmallText(r.explanation, 4);
      yPosition += 2;
    });
    yPosition += 3;
  }

  drawAuditChecklistBox();
  drawImmediateActionPlan();

  addHeading(text.downloadablePdf);
  addSmallText(text.downloadablePdfDescription, 0);
  yPosition += 3;

  // Missing information
  if (report.missingInformation.length > 0) {
    addHeading(text.missingInformation);
    addBulletPoints(report.missingInformation);
    yPosition += 3;
  }

  // Beta feedback note on final page
  ensurePageSpace(14);
  yPosition += 2;
  addSmallText(feedbackText.note, 0);
  setBaseFont();
  doc.setFontSize(FONTS.small);
  doc.setTextColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
  doc.textWithLink(`${feedbackText.cta}: hello@logivisa.com`, margin, yPosition + 1, {
    url: "mailto:hello@logivisa.com?subject=Beta%20Feedback%20-%20Visa%20Readiness%20Report",
  });
  yPosition += 5;

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

  // Save PDF in browser environments only. Server-side callers can persist returned bytes explicitly.
  if (typeof window !== "undefined" && input.saveToFile !== false) {
    doc.save(filename);
  }

  return pdfBytes;
}
