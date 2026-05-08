import { writeFile } from "node:fs/promises";
import path from "node:path";

import type { Locale, ReadinessInput, ReadinessReport } from "@/lib/readiness/types";
import { runReadinessEngine } from "@/src/lib/readiness-engine";

const locales: Locale[] = ["en", "tr", "zh-Hans"];

const inputs: Record<Locale, ReadinessInput> = {
  en: {
    locale: "en",
    mainGoal: "Skilled migration through 189, 190 or 491",
    currentCountry: "Australia",
    passportCountry: "Turkey",
    age: "30",
    occupation: "Software Engineer 261313",
    englishLevel: "PTE 79+ Superior English",
    englishTestTaken: "yes",
    occupationConfirmed: "yes",
    estimatedBudgetRange: "15000-25000",
    timeline: "0-6 months",
    sponsorOrFamily: "No employer sponsor, open to regional nomination",
    preferredPathway: "190",
    biggestConcern: "State nomination competitiveness",
    qualificationLevel: "Bachelor",
    offshoreExperienceYears: 5,
    onshoreExperienceYears: 1,
    regionalWilling: true,
    educationRelevance: "relevant",
  },
  tr: {
    locale: "tr",
    mainGoal: "189, 190 veya 491 uzerinden nitelikli goc",
    currentCountry: "Avustralya",
    passportCountry: "Turkiye",
    age: "30",
    occupation: "Software Engineer 261313",
    englishLevel: "PTE 79+ Superior English",
    englishTestTaken: "yes",
    occupationConfirmed: "yes",
    estimatedBudgetRange: "15000-25000",
    timeline: "0-6 months",
    sponsorOrFamily: "Isveren sponsoru yok, regional nomination uygun",
    preferredPathway: "190",
    biggestConcern: "Eyalet adayligi rekabeti",
    qualificationLevel: "Bachelor",
    offshoreExperienceYears: 5,
    onshoreExperienceYears: 1,
    regionalWilling: true,
    educationRelevance: "relevant",
  },
  "zh-Hans": {
    locale: "zh-Hans",
    mainGoal: "通过 189、190 或 491 技术移民路径递交",
    currentCountry: "澳大利亚",
    passportCountry: "土耳其",
    age: "30",
    occupation: "Software Engineer 261313",
    englishLevel: "PTE 79+ Superior English",
    englishTestTaken: "yes",
    occupationConfirmed: "yes",
    estimatedBudgetRange: "15000-25000",
    timeline: "0-6 months",
    sponsorOrFamily: "无雇主担保，愿意考虑偏远地区州担保",
    preferredPathway: "190",
    biggestConcern: "州担保竞争力",
    qualificationLevel: "Bachelor",
    offshoreExperienceYears: 5,
    onshoreExperienceYears: 1,
    regionalWilling: true,
    educationRelevance: "relevant",
  },
};

const headings: Record<Locale, string> = {
  en: "# ENGLISH UI OUTPUT",
  tr: "# TURKISH UI OUTPUT",
  "zh-Hans": "# CHINESE UI OUTPUT",
};

function section(title: string, body: string[] = []) {
  return [`## ${title}`, "", ...body, ""].join("\n");
}

function bullets(items: string[], noneLabel = "None") {
  return items.length > 0 ? items.map((item) => `- ${item}`) : [`- ${noneLabel}`];
}

function ui(locale: Locale) {
  if (locale === "tr") {
    return {
      none: "Yok",
      executiveSummary: "Yonetici Ozeti",
      visaViability: "Vize Uygunluk Degerlendirmesi",
      stateRadar: "Eyalet Sinyal Radari",
      checklist: "Basvuruya Hazirlik Kontrol Listesi",
      signalSnapshot: "Sinyal Ozeti",
      primaryLimitingFactor: "Birincil Sinirlayici Faktor",
      positionChangers: "Konumunuzu Degistirebilecek Faktorler",
      pathwayStrength: "Yol Gucu Karsilastirmasi",
      confidenceExplanation: "Guven Aciklamasi",
      evidenceReadiness: "Kanit Hazirlik Ozeti",
      pointsBooster: "Puan Senaryo Degerlendirmesi",
      financialRoadmap: "Maliyet Yol Haritasi",
      progressionPathways: "Gecis Yollari",
      pathwayFriction: "Yol Gerceklik Kontrolu",
      riskIndicators: "Risk Gostergeleri",
      documentChecklist: "Belge Kontrol Listesi",
      nextSteps: "Degerlendirilebilecek Sonraki Adimlar",
      missingInformation: "Eksik Bilgiler",
      estimatedBasePoints: "Tahmini Temel Puan",
      insufficientPoints: "Puan hesaplamak icin veri yetersiz",
      highPotential: "Yuksek potansiyel",
      conditional: "Kosullu",
      highRisk: "Yuksek risk",
      friction: "Zorluk",
      evidence: "Kanit",
      strongest: "En guclu",
      secondary: "Ikincil",
      confidence: "Guven",
      note: "Not",
      important: "onemli",
      recommended: "onerilen",
    };
  }

  if (locale === "zh-Hans") {
    return {
      none: "无",
      executiveSummary: "执行摘要",
      visaViability: "签证可行性评估",
      stateRadar: "州担保信号雷达",
      checklist: "递交准备检查清单",
      signalSnapshot: "信号概览",
      primaryLimitingFactor: "主要限制因素",
      positionChangers: "可能改变位置的因素",
      pathwayStrength: "路径强度对比",
      confidenceExplanation: "置信度说明",
      evidenceReadiness: "材料准备度概览",
      pointsBooster: "加分场景评估",
      financialRoadmap: "费用路线图",
      progressionPathways: "过渡路径",
      pathwayFriction: "路径现实校验",
      riskIndicators: "风险指标",
      documentChecklist: "文件清单",
      nextSteps: "可考虑的下一步",
      missingInformation: "缺失信息",
      estimatedBasePoints: "估算基础分",
      insufficientPoints: "数据不足，无法计算分数",
      highPotential: "高潜力",
      conditional: "有条件",
      highRisk: "高风险",
      friction: "阻力",
      evidence: "材料",
      strongest: "最强信号",
      secondary: "次要信号",
      confidence: "置信度",
      note: "说明",
      important: "重要",
      recommended: "建议",
    };
  }

  return {
    none: "None",
    executiveSummary: "Executive Summary",
    visaViability: "Visa Viability",
    stateRadar: "State Radar",
    checklist: "Lodgement-Ready Checklist",
    signalSnapshot: "Signal Snapshot",
    primaryLimitingFactor: "Primary Limiting Factor",
    positionChangers: "What May Change Your Position",
    pathwayStrength: "Pathway Strength Comparison",
    confidenceExplanation: "Confidence Explanation",
    evidenceReadiness: "Evidence Readiness",
    pointsBooster: "Points Booster Simulator",
    financialRoadmap: "Financial Roadmap",
    progressionPathways: "Progression Pathways",
    pathwayFriction: "Pathway Friction / Reality Check",
    riskIndicators: "Risk Indicators",
    documentChecklist: "Document Checklist",
    nextSteps: "Suggested Next Steps",
    missingInformation: "Missing Information",
    estimatedBasePoints: "Estimated Base Points",
    insufficientPoints: "Insufficient data to calculate points",
    highPotential: "High potential",
    conditional: "Conditional",
    highRisk: "High risk",
    friction: "Friction",
    evidence: "Evidence",
    strongest: "Strongest",
    secondary: "Secondary",
    confidence: "Confidence",
    note: "Note",
    important: "important",
    recommended: "recommended",
  };
}

function level(locale: Locale, value: string) {
  if (locale === "tr") {
    if (value === "high" || value === "strong" || value === "stronger") return "Yuksek";
    if (value === "medium" || value === "moderate") return "Orta";
    if (value === "low" || value === "limited") return "Dusuk";
  }
  if (locale === "zh-Hans") {
    if (value === "high" || value === "strong" || value === "stronger") return "高";
    if (value === "medium" || value === "moderate") return "中";
    if (value === "low" || value === "limited") return "低";
  }
  return value;
}

function rankedVisaLabel(locale: Locale, subclass: string) {
  if (locale === "tr") {
    if (subclass === "189") return "189 Yetenekli Bagimsiz";
    if (subclass === "190") return "190 Eyalet Adaylikli";
    if (subclass === "491") return "491 Bolgesel Nitelikli";
  }
  if (locale === "zh-Hans") {
    if (subclass === "189") return "189 独立技术移民";
    if (subclass === "190") return "190 州担保技术移民";
    if (subclass === "491") return "491 偏远地区技术移民";
  }
  if (subclass === "189") return "189 Skilled Independent";
  if (subclass === "190") return "190 Skilled Nominated";
  if (subclass === "491") return "491 Skilled Work Regional";
  return subclass;
}

function stateStatus(locale: Locale, status: string) {
  if (locale === "tr") {
    if (status === "Open for Offshore") return "Offshore icin acik";
    if (status === "High Demand") return "Yuksek talep";
    if (status === "Onshore Only") return "Yalnizca onshore";
    if (status === "Closed") return "Kapali";
  }
  if (locale === "zh-Hans") {
    if (status === "Open for Offshore") return "境外申请开放";
    if (status === "High Demand") return "高需求";
    if (status === "Onshore Only") return "仅限境内";
    if (status === "Closed") return "关闭";
  }
  return status;
}

function priorityLabel(locale: Locale, priority: string, t: ReturnType<typeof ui>) {
  if (priority === "important") return t.important;
  if (priority === "recommended") return t.recommended;
  return priority;
}

function renderReport(locale: Locale, report: ReadinessReport): string {
  const t = ui(locale);
  const b = (items: string[]) => bullets(items, t.none);
  const lines: string[] = [headings[locale], ""];

  lines.push(section(t.executiveSummary, b(report.executiveSummary)));

  lines.push(section(t.visaViability, [
    ...bullets(
      (report.rankedPathways ?? []).map(
        (item, index) => {
          const badge = index === 0 ? t.highPotential : index === 1 ? t.conditional : t.highRisk;
          return `${rankedVisaLabel(locale, item.subclass)}: ${item.matchPercentage}% (${badge}; ${t.estimatedBasePoints}: ${item.pointsSignal})`;
        }
      )
    , t.none),
  ]));

  lines.push(section(t.stateRadar, [
    ...bullets(
      report.stateNominationTracker?.states.map(
        (state) => `${state.code} ${state.name}: ${state.score}% (${stateStatus(locale, state.status)}) - ${state.summary}`
      ) ?? []
    , t.none),
    report.stateNominationTracker?.note ? `${t.note}: ${report.stateNominationTracker.note}` : "",
  ].filter(Boolean)));

  lines.push(section(t.checklist, [
    ...bullets(
      report.lodgementReadyChecklist?.items.map(
        (item) => `[${priorityLabel(locale, item.priority, t)}] ${item.title}: ${item.detail}`
      ) ?? []
    , t.none),
    report.lodgementReadyChecklist?.note ? `${t.note}: ${report.lodgementReadyChecklist.note}` : "",
  ].filter(Boolean)));

  lines.push(section(t.signalSnapshot, [
    `${t.strongest}: ${report.signalSnapshot.strongest}`,
    `${t.secondary}: ${report.signalSnapshot.secondary.join(", ") || t.none}`,
    `${t.confidence}: ${level(locale, report.signalSnapshot.confidenceLabel)}`,
    report.signalSnapshot.confidenceExplanation,
  ]));

  lines.push(section(t.primaryLimitingFactor, [
    report.primaryLimitingFactor.label,
    report.primaryLimitingFactor.explanation,
  ]));

  lines.push(section(t.positionChangers, b(
    report.positionChangers.map((item) => `${item.label}: ${item.explanation}`)
  )));

  lines.push(section(t.pathwayStrength, b(
    report.pathwayStrengthComparison.map((item) => [
      `${item.visaName} (${item.subclass})`,
      `${t.confidence}=${level(locale, item.strength)}`,
      `${t.friction}=${level(locale, item.friction)}`,
      `${t.evidence}=${level(locale, item.evidenceLoad)}`,
      item.typicalPath,
      item.signalReasons.join("; "),
      item.limitingFactors.join("; "),
    ].join(" | "))
  )));

  lines.push(section(t.confidenceExplanation, [report.confidenceExplanation]));

  lines.push(section(t.evidenceReadiness, b(
    report.evidenceReadiness.map((item) => `${item.category}: ${level(locale, item.status)} - ${item.explanation}`)
  )));

  if (report.pointsBoosterSimulator) {
    lines.push(section(t.pointsBooster, [
      `${t.estimatedBasePoints}: ${report.pointsBoosterSimulator.currentEstimate ?? t.insufficientPoints}`,
      report.pointsBoosterSimulator.note,
      ...b(report.pointsBoosterSimulator.scenarios.map(
        (item) => `${item.label}: ${item.estimatedChange >= 0 ? "+" : ""}${item.estimatedChange}; ${item.explanation}`
      )),
    ]));
  }

  lines.push(section(t.financialRoadmap, b(
    report.financialRoadmap.map((item) => `${item.category}: ${item.amountLabel} - ${item.explanation}`)
  )));

  lines.push(section(t.progressionPathways, b(
    report.progressionPathways.map((item) => `${item.label}: ${item.from} -> ${item.to}; ${item.explanation}`)
  )));

  lines.push(section(t.pathwayFriction, b(
    report.pathwayFriction.map((item) => `${item.pathway}: ${item.frictionType} - ${item.explanation}`)
  )));

  lines.push(section(t.riskIndicators, b(
    report.riskIndicators.map((item) => `[${level(locale, item.level)}] ${item.title}: ${item.explanation}`)
  )));

  lines.push(section(t.documentChecklist, b(
    report.documentChecklist.flatMap((category) => [
      category.category,
      ...category.items.map((item) => `  - ${item}`),
    ])
  )));

  lines.push(section(t.nextSteps, b(report.suggestedNextSteps)));
  lines.push(section(t.missingInformation, b(report.missingInformation)));

  return lines.join("\n").trim();
}

function assertNoLeak(locale: Locale, output: string) {
  const commonForbidden = [
    /partial points signal/i,
    /partial points picture/i,
    /Internal signal/i,
    /\bBook\b/i,
    /\bApply now\b/i,
    /\bPrepare EOI\b/i,
    /PTE\/IELTS booking/i,
  ];
  const localeForbidden: Record<Locale, RegExp[]> = {
    en: [/[\u4e00-\u9fff]/, /[ğıİşŞçÇöÖüÜ]/],
    tr: [/[\u4e00-\u9fff]/, /Confidence is/i, /This report compares/i],
    "zh-Hans": [/G[uü]ven/i, /Birincil/i, /Tahmini temel puan/i, /Confidence is/i, /This report compares/i],
  };

  const failed = [...commonForbidden, ...localeForbidden[locale]].find((pattern) => pattern.test(output));
  if (failed) {
    throw new Error(`UI translation check failed for ${locale}: matched ${failed}`);
  }
}

async function main() {
  const outputs = locales.map((locale) => {
    const report = runReadinessEngine(inputs[locale]);
    const output = renderReport(locale, report);
    assertNoLeak(locale, output);
    return output;
  });

  const outputPath = path.join(process.cwd(), "web-ui-translations-check.md");
  await writeFile(outputPath, `${outputs.join("\n\n---\n\n")}\n`, "utf8");
  console.log(`Generated ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
