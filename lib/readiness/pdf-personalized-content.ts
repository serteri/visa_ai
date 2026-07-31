import type { PDFContext } from "./pdf-types";
import type { Locale } from "./types";
import { getPersonalizedApplicationGuide } from "./pdf-content/personalized-guide";
import { getPersonalizedPointsBreakdown } from "./pdf-content/personalized-points";
import { getPersonalizedOverview } from "./pdf-content/personalized-overview";
import { getPersonalizedFaq } from "./pdf-content/personalized-faq";
import { getSkillsAssessmentStatus } from "./pdf-content/skills-assessment-status";

/**
 * Renders PERSONALIZED content sections into the PDF.
 * These sections adapt to the user's actual profile data.
 *
 * Called from generate-pdf.ts to add personalized sections.
 */
export function renderPersonalizedContent(ctx: PDFContext): void {
  const {
    report,
    text,
    locale,
    effectiveLocale,
    userInputSummary,
    addHeading,
    addBody,
    addSmallText,
    addSectionHeading,
    addPremiumBulletContainer,
    addPremiumKeyValueContainer,
    doc,
    margin,
    contentWidth,
    COLORS,
    setBaseFont,
    setBoldFont,
    safeText,
    ensurePageSpace,
  } = ctx;

  const country = report.country || "AU";
  const estimatedPoints = report.pointsEstimate?.estimatedPoints ?? 0;
  const userName = userInputSummary.name || (effectiveLocale === "tr" ? "Başvuru Sahibi" : effectiveLocale === "zh-Hans" ? "申请人" : "Applicant");

  // ── 1. Personalized Overview ──────────────────────────────────────────
  const overview = getPersonalizedOverview(
    effectiveLocale,
    country,
    userInputSummary,
    estimatedPoints,
    65,
    report.detectedSubclasses?.[0] || "189",
    false,
    undefined,
  );

  addSectionHeading("", overview.title);
  overview.executiveSummary.forEach((item) => {
    addBody(item);
  });
  ctx.yPosition += 2;

  // Key findings as bullet container
  if (overview.keyFindings.length > 0) {
    addPremiumBulletContainer(
      effectiveLocale === "tr" ? "Ana Bulgular" : effectiveLocale === "zh-Hans" ? "主要发现" : "Key Findings",
      overview.keyFindings,
      COLORS.accent,
    );
  }

  // Recommendation
  addSmallText(overview.recommendation, 0);
  ctx.yPosition += 1;

  // Confidence note
  addSmallText(overview.confidenceNote, 0);
  ctx.yPosition += 3;

  // ── 2. Skills Assessment Status ───────────────────────────────────────
  const skillsStatus = getSkillsAssessmentStatus(
    effectiveLocale,
    country,
    userInputSummary.occupation,
    false, // TODO: Get from report
    undefined,
  );

  addSectionHeading("", skillsStatus.title);
  addBody(skillsStatus.status);
  skillsStatus.details.forEach((detail) => {
    addSmallText(detail, 4);
  });
  if (skillsStatus.nextAction) {
    addSmallText(
      effectiveLocale === "tr" ? "Sonraki adım: " : effectiveLocale === "zh-Hans" ? "下一步：" : "Next step: ",
      0,
    );
    addBody(skillsStatus.nextAction);
  }
  ctx.yPosition += 3;

  // ── 3. Personalized Points Breakdown ──────────────────────────────────
  if (report.pointsEstimate && report.pointsEstimate.breakdown.length > 0) {
    const breakdown = report.pointsEstimate.breakdown.map((item) => ({
      label: item.label,
      points: item.points,
      max: item.max ?? 0,
      note: item.note,
    }));

    const pointsData = getPersonalizedPointsBreakdown(
      effectiveLocale,
      country,
      userName,
      estimatedPoints,
      breakdown,
      65,
    );

    addSectionHeading("", pointsData.title);
    addSmallText(pointsData.summary, 0);
    ctx.yPosition += 2;

    // Category breakdown table
    const headers = [
      effectiveLocale === "tr" ? "Kategori" : effectiveLocale === "zh-Hans" ? "类别" : "Category",
      effectiveLocale === "tr" ? "Alınan" : effectiveLocale === "zh-Hans" ? "已得分" : "Earned",
      effectiveLocale === "tr" ? "Maks." : effectiveLocale === "zh-Hans" ? "最高" : "Max",
      effectiveLocale === "tr" ? "Durum" : effectiveLocale === "zh-Hans" ? "状态" : "Status",
    ];

    const rows = pointsData.categories.map((cat) => [
      cat.label,
      String(cat.earned),
      String(cat.max),
      cat.status === "excellent"
        ? "✅"
        : cat.status === "good"
          ? "👍"
          : cat.status === "needs_improvement"
            ? "⚠️"
            : "❌",
    ]);

    // Use drawTable if available
    if (ctx.drawTable) {
      ctx.drawTable(headers, rows, [0.4, 0.15, 0.15, 0.3]);
    }

    // Total
    setBoldFont();
    doc.setFontSize(10);
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.text(safeText(pointsData.totalLine), margin, ctx.yPosition);
    ctx.yPosition += 6;

    // Gap analysis
    addSmallText(pointsData.gapAnalysis, 0);
    ctx.yPosition += 2;

    // Improvement tips
    if (pointsData.improvementTips.length > 0) {
      addPremiumBulletContainer(
        effectiveLocale === "tr" ? "Puan Artırma Önerileri" : effectiveLocale === "zh-Hans" ? "积分提升建议" : "Points Improvement Tips",
        pointsData.improvementTips,
        COLORS.riskLow,
      );
    }

    // Additional strategies
    if (pointsData.additionalStrategies && pointsData.additionalStrategies.length > 0) {
      addSmallText(
        effectiveLocale === "tr" ? "Ek Stratejiler:" : effectiveLocale === "zh-Hans" ? "其他策略：" : "Additional Strategies:",
        0,
      );
      ctx.yPosition += 1;
      pointsData.additionalStrategies.forEach((strategy) => {
        addSmallText(`  • ${strategy}`, 0);
      });
    }
    ctx.yPosition += 3;
  }

  // ── 4. Personalized Application Guide ─────────────────────────────────
  const guide = getPersonalizedApplicationGuide(
    effectiveLocale,
    country,
    userInputSummary,
    false,
    estimatedPoints,
  );

  addSectionHeading("", guide.title);
  addSmallText(guide.personalSummary, 0);
  ctx.yPosition += 2;

  // Next steps as priority-ordered list
  if (guide.nextSteps.length > 0) {
    addSmallText(
      effectiveLocale === "tr" ? "Öncelik sırasına göre yapılması gerekenler:" : effectiveLocale === "zh-Hans" ? "按优先顺序需要完成的事项：" : "Actions in priority order:",
      0,
    );
    ctx.yPosition += 1;

    guide.nextSteps.forEach((step) => {
      const priorityIcon = step.priority === "high" ? "🔴" : step.priority === "medium" ? "🟡" : "🟢";
      addBody(`${priorityIcon} ${step.title}`);
      addSmallText(step.detail, 4);
    });
  }

  // Timeline
  ctx.yPosition += 2;
  addSmallText(guide.timelineEstimate, 0);
  ctx.yPosition += 2;

  // Detailed Timeline
  if (guide.detailedTimeline && guide.detailedTimeline.length > 0) {
    addSmallText(
      effectiveLocale === "tr" ? "Detaylı Zaman Çizelgesi:" : effectiveLocale === "zh-Hans" ? "详细时间线：" : "Detailed Timeline:",
      0,
    );
    ctx.yPosition += 1;
    guide.detailedTimeline.forEach((item) => {
      addSmallText(`  ${item}`, 0);
    });
  }
  ctx.yPosition += 2;

  // Document Checklist
  if (guide.documentChecklist && guide.documentChecklist.length > 0) {
    addSmallText(
      effectiveLocale === "tr" ? "Belge Hazırlık Kontrol Listesi:" : effectiveLocale === "zh-Hans" ? "文件准备清单：" : "Document Preparation Checklist:",
      0,
    );
    ctx.yPosition += 1;
    guide.documentChecklist.forEach((item) => {
      addSmallText(`  ${item}`, 0);
    });
  }
  ctx.yPosition += 2;

  // Cost Estimate
  if (guide.costEstimate && guide.costEstimate.length > 0) {
    addSmallText(
      effectiveLocale === "tr" ? "Tahmini Maliyetler:" : effectiveLocale === "zh-Hans" ? "预计费用：" : "Estimated Costs:",
      0,
    );
    ctx.yPosition += 1;
    guide.costEstimate.forEach((item) => {
      addSmallText(`  ${item}`, 0);
    });
  }
  ctx.yPosition += 3;

  // ── 5. Personalized FAQ ───────────────────────────────────────────────
  const faq = getPersonalizedFaq(
    effectiveLocale,
    country,
    userInputSummary,
    estimatedPoints,
    65,
    false,
  );

  addSectionHeading("", faq.title);
  faq.items.forEach((item) => {
    addBody(item.question);
    addSmallText(item.answer, 4);
    ctx.yPosition += 1;
  });
  ctx.yPosition += 3;
}
