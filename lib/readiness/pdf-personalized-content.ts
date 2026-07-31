import type { PDFContext } from "./pdf-types";
import type { Locale } from "./types";
import { getPersonalizedPointsBreakdown } from "./pdf-content/personalized-points";
import { getPersonalizedOverview } from "./pdf-content/personalized-overview";
import { getSkillsAssessmentStatus } from "./pdf-content/skills-assessment-status";

/** Core Skills Income Threshold — employer-sponsored visa minimum salary (1 July 2026). */
const CSIT_THRESHOLD_AUD = 79423;

/**
 * Renders PERSONALIZED content sections into the PDF.
 * These sections adapt to the user's actual profile data.
 *
 * Section order:
 *   1. Executive Summary (goal-adaptive intro)
 *   2. Points Breakdown (if points-tested visas in scope) OR Employer Sponsored Readiness
 *   3. Skills Assessment Status (with projected points when blocked)
 *
 * Removed: Personalized FAQ ("Questions Relevant to You"), Application Guide (duplicated main body).
 */
export function renderPersonalizedContent(ctx: PDFContext): void {
  const {
    report,
    text,
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
  const userName = userInputSummary.name ||
    (effectiveLocale === "tr" ? "Başvuru Sahibi" : effectiveLocale === "zh-Hans" ? "申请人" : "Applicant");
  const skillsAssessmentDone = userInputSummary.skillsAssessmentDone ?? false;
  const annualSalary = userInputSummary.annualSalaryAud
    ? Number(userInputSummary.annualSalaryAud)
    : undefined;
  const hasSalary = annualSalary !== undefined && Number.isFinite(annualSalary) && annualSalary > 0;

  // ── Determine which visa types are in scope ──────────────────────────
  const goals = userInputSummary.migrationGoals ?? [];
  const hasPointsTestedVisa =
    goals.some((g) => ["direct_pr", "regional"].includes(g)) ||
    (report.detectedSubclasses ?? []).some((s) => ["189", "190", "491"].includes(s));
  const hasEmployerSponsored =
    goals.includes("employer_sponsorship") ||
    (report.detectedSubclasses ?? []).some((s) => ["482", "186"].includes(s));

  // Fallback: if no goals detected, show points if breakdown exists
  const showPoints = hasPointsTestedVisa || (!hasEmployerSponsored && estimatedPoints > 0);

  // ════════════════════════════════════════════════════════════════════════
  // 1. EXECUTIVE SUMMARY (goal-adaptive)
  // ════════════════════════════════════════════════════════════════════════
  const overview = getPersonalizedOverview(
    effectiveLocale,
    country,
    userInputSummary,
    estimatedPoints,
    65,
    report.detectedSubclasses?.[0] || "189",
    skillsAssessmentDone,
    undefined,
    goals,
    hasSalary ? String(annualSalary) : undefined,
  );

  ctx.ensurePageSpace(50);
  addSectionHeading("", overview.title);
  overview.executiveSummary.forEach((item) => {
    addBody(item);
  });
  ctx.yPosition += 2;

  // Key findings
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
  ctx.yPosition += 2;

  // Employer Sponsored Viability (inline, salary-based)
  if (hasSalary && hasEmployerSponsored) {
    ctx.ensurePageSpace(20);
    const meetsCsit = annualSalary! >= CSIT_THRESHOLD_AUD;
    const csitLabel = `CSIT: AUD $${CSIT_THRESHOLD_AUD.toLocaleString("en-AU")}`;

    if (meetsCsit) {
      addPremiumKeyValueContainer(
        effectiveLocale === "tr" ? "İşveren Sponsorluğu Uygunluğu"
          : effectiveLocale === "zh-Hans" ? "雇主担保可行性"
          : "Employer Sponsored Viability",
        [[
          effectiveLocale === "tr" ? "Maaş Durumu"
            : effectiveLocale === "zh-Hans" ? "薪资状况"
            : "Salary Status",
          `✅ AUD $${annualSalary!.toLocaleString("en-AU")} — ${csitLabel}` +
          (effectiveLocale === "tr" ? " eşiğini karşılıyor. 482/186 yolları uygundur."
            : effectiveLocale === "zh-Hans" ? " 已达标。482/186路径可行。"
            : " threshold met. 482/186 pathways viable."),
        ]],
        COLORS.riskLow,
      );
    } else {
      addPremiumKeyValueContainer(
        effectiveLocale === "tr" ? "İşveren Sponsorluğu Uygunluğu"
          : effectiveLocale === "zh-Hans" ? "雇主担保可行性"
          : "Employer Sponsored Viability",
        [[
          effectiveLocale === "tr" ? "Maaş Durumu"
            : effectiveLocale === "zh-Hans" ? "薪资状况"
            : "Salary Status",
          `❌ AUD $${annualSalary!.toLocaleString("en-AU")} — ${csitLabel}` +
          (effectiveLocale === "tr" ? " eşiğinin altında. Maaş ayarlaması gerekiyor."
            : effectiveLocale === "zh-Hans" ? " 未达标。需调整薪资。"
            : " below threshold. Salary adjustment required."),
        ]],
        COLORS.riskHigh,
      );
    }
    ctx.yPosition += 2;
  }

  // ════════════════════════════════════════════════════════════════════════
  // 2. POINTS BREAKDOWN TABLE (with hard gate) — OR — EMPLOYER READINESS
  // ════════════════════════════════════════════════════════════════════════
  if (showPoints && report.pointsEstimate && report.pointsEstimate.breakdown.length > 0) {
    // ── Build breakdown with hard gate zero-out ────────────────────────
    const fullBreakdown = report.pointsEstimate.breakdown;
    let claimableTotal = estimatedPoints;
    let projectedTotal = estimatedPoints;

    const breakdown = fullBreakdown.map((item) => {
      const isOccupationRelated =
        item.label.toLowerCase().includes("occupation") ||
        item.label.toLowerCase().includes("skills") ||
        item.label.toLowerCase().includes("meslek") ||
        item.label.toLowerCase().includes("职业") ||
        item.label.toLowerCase().includes("overseas") ||
        item.label.toLowerCase().includes("australian experience") ||
        item.label.toLowerCase().includes("yurt dışı") ||
        item.label.toLowerCase().includes("avustralya deneyimi") ||
        item.label.toLowerCase().includes("海外") ||
        item.label.toLowerCase().includes("澳大利亚工作");

      const zeroed = isOccupationRelated && !skillsAssessmentDone;
      if (zeroed) {
        claimableTotal -= item.points;
      }

      return {
        label: item.label,
        points: zeroed ? 0 : item.points,
        max: item.max ?? 0,
        note: item.note,
        _originalPoints: item.points,
        _zeroed: zeroed,
      };
    });

    const pointsData = getPersonalizedPointsBreakdown(
      effectiveLocale,
      country,
      userName,
      skillsAssessmentDone ? estimatedPoints : claimableTotal,
      breakdown,
      65,
    );

    // ── Section Header ─────────────────────────────────────────────────
    ctx.ensurePageSpace(60);
    addSectionHeading("⭐", pointsData.title);

    // Gold accent bar
    doc.setDrawColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
    doc.setLineWidth(1.5);
    doc.line(margin, ctx.yPosition, margin + ctx.contentWidth * 0.3, ctx.yPosition);
    ctx.yPosition += 4;

    addSmallText(pointsData.summary, 0);
    ctx.yPosition += 3;

    // ── Category Breakdown Table ───────────────────────────────────────
    const headers = [
      effectiveLocale === "tr" ? "Kategori" : effectiveLocale === "zh-Hans" ? "类别" : "Category",
      effectiveLocale === "tr" ? "Alınan" : effectiveLocale === "zh-Hans" ? "已得分" : "Earned",
      effectiveLocale === "tr" ? "Maks." : effectiveLocale === "zh-Hans" ? "最高" : "Max",
      effectiveLocale === "tr" ? "Durum" : effectiveLocale === "zh-Hans" ? "状态" : "Status",
    ];

    const statusLabels: Record<string, string> = {
      excellent: "✅",
      good: "👍",
      needs_improvement: "⚠️",
      missing: "❌",
    };

    const rows = pointsData.categories.map((cat) => [
      cat.label,
      String(cat.earned),
      String(cat.max),
      statusLabels[cat.status] ?? "❌",
    ]);

    const statusColors: Record<string, { r: number; g: number; b: number }> = {
      excellent: { r: 22, g: 163, b: 74 },
      good: { r: 22, g: 100, b: 180 },
      needs_improvement: { r: 217, g: 119, b: 6 },
      missing: { r: 180, g: 60, b: 60 },
    };

    if (ctx.drawTable) {
      (ctx.drawTable as Function)(headers, rows, [0.38, 0.14, 0.14, 0.34],
        (rowIndex: number, colIndex: number) => {
          if (colIndex === 3 && pointsData.categories[rowIndex]) {
            return statusColors[pointsData.categories[rowIndex].status] ?? null;
          }
          return null;
        }
      );
    }

    // ── Gold-accented Total Line ───────────────────────────────────────
    ctx.ensurePageSpace(14);
    doc.setDrawColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
    doc.setLineWidth(0.8);
    doc.line(margin, ctx.yPosition, margin + ctx.contentWidth, ctx.yPosition);
    ctx.yPosition += 5;

    setBoldFont();
    doc.setFontSize(11);
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.text(safeText(pointsData.totalLine), margin, ctx.yPosition);
    ctx.yPosition += 7;

    // Gap analysis
    addSmallText(pointsData.gapAnalysis, 0);
    ctx.yPosition += 2;

    // ── CRITICAL BLOCKER: Skills Assessment Hard Gate ──────────────────
    if (!skillsAssessmentDone && claimableTotal !== estimatedPoints) {
      ctx.ensurePageSpace(30);

      // Red/gold accent border box
      const boxY = ctx.yPosition;
      const boxH = 28;
      doc.setFillColor(254, 242, 242); // light red bg
      doc.setDrawColor(220, 38, 38); // red border
      doc.setLineWidth(0.8);
      doc.roundedRect(margin, boxY, contentWidth, boxH, 2, 2, "FD");

      // Gold left accent bar
      doc.setFillColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
      doc.rect(margin, boxY, 3, boxH, "F");

      // Title
      setBoldFont();
      doc.setFontSize(10);
      doc.setTextColor(180, 38, 38);
      doc.text(
        safeText("🚨 CRITICAL BLOCKER: Skills Assessment Not Completed"),
        margin + 8,
        boxY + 8,
      );

      // Current claimable
      setBaseFont();
      doc.setFontSize(9);
      doc.setTextColor(120, 40, 40);
      const claimableLabel =
        effectiveLocale === "tr" ? "Mevcut Talep Edilebilir Puan:"
          : effectiveLocale === "zh-Hans" ? "当前可主张积分："
          : "Current Claimable Points:";
      doc.text(safeText(`${claimableLabel} ${claimableTotal} pts`), margin + 8, boxY + 16);

      // Projected points
      setBoldFont();
      doc.setTextColor(22, 101, 52);
      const projectedLabel =
        effectiveLocale === "tr" ? "Tahmini Puan (Değerlendirme Sonrası):"
          : effectiveLocale === "zh-Hans" ? "预计积分（评估通过后）："
          : "Projected Points (upon successful assessment):";
      doc.text(safeText(`${projectedLabel} ${estimatedPoints} pts`), margin + 8, boxY + 23);

      ctx.yPosition = boxY + boxH + 4;
    }

    // Improvement tips
    if (pointsData.improvementTips.length > 0) {
      addPremiumBulletContainer(
        effectiveLocale === "tr" ? "Puan Artırma Önerileri"
          : effectiveLocale === "zh-Hans" ? "积分提升建议"
          : "Points Improvement Tips",
        pointsData.improvementTips,
        COLORS.riskLow,
      );
    }

    // Additional strategies
    if (pointsData.additionalStrategies && pointsData.additionalStrategies.length > 0) {
      addSmallText(
        effectiveLocale === "tr" ? "Ek Stratejiler:"
          : effectiveLocale === "zh-Hans" ? "其他策略："
          : "Additional Strategies:",
        0,
      );
      ctx.yPosition += 1;
      pointsData.additionalStrategies.forEach((strategy) => {
        addSmallText(`  • ${strategy}`, 0);
      });
    }
    ctx.yPosition += 3;

  } else if (hasEmployerSponsored && !showPoints) {
    // ── EMPLOYER SPONSORSHIP READINESS (no points table) ───────────────
    ctx.ensurePageSpace(40);
    const title =
      effectiveLocale === "tr" ? "İşveren Sponsorluğu Hazırlık Analizi"
        : effectiveLocale === "zh-Hans" ? "雇主担保准备度分析"
        : "Employer Sponsorship Readiness";
    addSectionHeading("📋", title);

    const csitLabel = `AUD $${CSIT_THRESHOLD_AUD.toLocaleString("en-AU")}`;
    const items: string[] = [];

    // Salary check
    if (hasSalary) {
      const meets = annualSalary! >= CSIT_THRESHOLD_AUD;
      items.push(
        meets
          ? `✅ ${effectiveLocale === "tr" ? "Maaş" : effectiveLocale === "zh-Hans" ? "薪资" : "Salary"}: AUD $${annualSalary!.toLocaleString("en-AU")} — ${csitLabel} ${effectiveLocale === "tr" ? "eşik değerini karşılıyor" : effectiveLocale === "zh-Hans" ? "已达门槛" : "threshold met"}`
          : `❌ ${effectiveLocale === "tr" ? "Maaş" : effectiveLocale === "zh-Hans" ? "薪资" : "Salary"}: AUD $${annualSalary!.toLocaleString("en-AU")} — ${csitLabel} ${effectiveLocale === "tr" ? "eşik değerinin altında" : effectiveLocale === "zh-Hans" ? "未达门槛" : "below threshold"}`
      );
    } else {
      items.push(
        `⚠️ ${effectiveLocale === "tr" ? "Maaş bilgisi girilmedi" : effectiveLocale === "zh-Hans" ? "未提供薪资信息" : "Salary not provided"} — ${csitLabel} ${effectiveLocale === "tr" ? "eşik kontrolü yapılamadı" : effectiveLocale === "zh-Hans" ? "无法校验门槛" : "threshold check unavailable"}`
      );
    }

    // Key requirements
    const reqTitle =
      effectiveLocale === "tr" ? "Temel Gereklilikler"
        : effectiveLocale === "zh-Hans" ? "核心要求"
        : "Key Requirements";
    items.push(
      effectiveLocale === "tr"
        ? `• Beceri değerlendirmesi zorunludur (pozisyonunuza göre)`
        : effectiveLocale === "zh-Hans"
          ? `• 必须完成技能评估（根据您的职业）`
          : `• Skills assessment mandatory (for your occupation)`
    );
    items.push(
      effectiveLocale === "tr"
        ? `• İşvereninizin onaylı sponsor olması gerekir`
        : effectiveLocale === "zh-Hans"
          ? `• 雇主必须是获批担保方`
          : `• Employer must be an approved sponsor`
    );
    items.push(
      effectiveLocale === "tr"
        ? `• Pozisyonunuz mesleğinizle uyumlu olmalıdır`
        : effectiveLocale === "zh-Hans"
          ? `• 岗位必须与您的职业匹配`
          : `• Position must align with your nominated occupation`
    );

    items.forEach((item) => {
      addSmallText(item, 0);
    });
    ctx.yPosition += 3;
  }

  // ════════════════════════════════════════════════════════════════════════
  // 3. SKILLS ASSESSMENT STATUS
  // ════════════════════════════════════════════════════════════════════════
  ctx.ensurePageSpace(25);
  const skillsStatus = getSkillsAssessmentStatus(
    effectiveLocale,
    country,
    userInputSummary.occupation,
    skillsAssessmentDone,
    undefined,
  );

  addSectionHeading("", skillsStatus.title);
  addBody(skillsStatus.status);
  skillsStatus.details.forEach((detail) => {
    addSmallText(detail, 4);
  });

  // Show projected points in skills assessment section too
  if (!skillsAssessmentDone && showPoints && estimatedPoints > 0) {
    const projectedLabel =
      effectiveLocale === "tr" ? "Değerlendirme sonrası tahmini puanınız:"
        : effectiveLocale === "zh-Hans" ? "评估通过后预计积分："
        : "Projected points upon successful assessment:";
    addSmallText(`${projectedLabel} ${estimatedPoints} pts`, 0);
  }

  if (skillsStatus.nextAction) {
    addSmallText(
      effectiveLocale === "tr" ? "Sonraki adım: "
        : effectiveLocale === "zh-Hans" ? "下一步："
        : "Next step: ",
      0,
    );
    addBody(skillsStatus.nextAction);
  }
  ctx.yPosition += 3;
}
