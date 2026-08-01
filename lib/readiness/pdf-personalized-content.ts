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
  // 2. POINTS BREAKDOWN TABLE — OR — EMPLOYER READINESS
  // ════════════════════════════════════════════════════════════════════════
  if (showPoints && report.pointsEstimate && report.pointsEstimate.breakdown.length > 0) {
    // The engine now handles skills-assessment gating (education + employment
    // zeroed when assessment is missing), so breakdown already reflects the
    // correct claimable points. No additional zero-out needed here.
    const breakdown = report.pointsEstimate.breakdown;

    const pointsData = getPersonalizedPointsBreakdown(
      effectiveLocale,
      country,
      userName,
      estimatedPoints,
      breakdown.map((item) => ({ ...item, max: item.max ?? 0 })),
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

    // ── CRITICAL COMPLIANCE BANNER (above table) ───────────────────────
    if (!skillsAssessmentDone) {
      ctx.ensurePageSpace(24);
      const bannerY = ctx.yPosition;
      const bannerH = 20;
      doc.setFillColor(254, 242, 242); // light red bg
      doc.setDrawColor(220, 38, 38); // red border
      doc.setLineWidth(0.8);
      doc.roundedRect(margin, bannerY, contentWidth, bannerH, 2, 2, "FD");

      // Red left accent bar
      doc.setFillColor(220, 38, 38);
      doc.rect(margin, bannerY, 3, bannerH, "F");

      setBoldFont();
      doc.setFontSize(8.5);
      doc.setTextColor(180, 38, 38);
      const bannerText =
        effectiveLocale === "tr"
          ? "KRİTİK UYUMLULUK UYARISI: Geçerli Bir Beceri Değerlendirmesi Yok."
          : effectiveLocale === "zh-Hans"
            ? "关键合规警告：无有效技能评估。"
            : "CRITICAL COMPLIANCE ALERT: No Valid Skills Assessment.";
      doc.text(safeText(bannerText), margin + 8, bannerY + 7);

      setBaseFont();
      doc.setFontSize(7.5);
      doc.setTextColor(120, 40, 40);
      const bannerDetail =
        effectiveLocale === "tr"
          ? "Mesleğiniz için uygun beceri değerlendirmesi almak yasal bir zorunluluktur. Değerlendirme olmadan EOI sunulamaz. Bazı puan talepleri kısıtlanmıştır."
          : effectiveLocale === "zh-Hans"
            ? "获得提名职业的合适技能评估是法定要求。未通过评估无法有效递交EOI。部分积分已被限制。"
            : "Obtaining a suitable skills assessment for your nominated occupation is a mandatory legal requirement. An EOI cannot be validly lodged without it. Some points claims have been restricted accordingly.";
      doc.text(safeText(bannerDetail), margin + 8, bannerY + 14);

      ctx.yPosition = bannerY + bannerH + 3;
    }

    // ── 4-Column Points Breakdown Table ────────────────────────────────
    // Column 1: Category | Column 2: User's Exact Input | Column 3: Claimed Points | Column 4: Max Possible
    const t = effectiveLocale === "tr" ? "tr" : effectiveLocale === "zh-Hans" ? "zh" : "en";
    const colHeaders: Record<string, string[]> = {
      en: ["Category", "Your Input", "Claimed Points", "Max Possible"],
      tr: ["Kategori", "Girdiniz", "Talep Edilen", "Maksimum"],
      zh: ["类别", "您的输入", "已获积分", "最高积分"],
    };
    const headers = colHeaders[t];

    const blockedLabel = !skillsAssessmentDone
      ? (t === "tr" ? " (Değerlendirme Gerekli)" : t === "zh" ? " (需要评估)" : " (Assessment Required)")
      : "";

    // Build rows from the breakdown — use engine-gated points directly
    const rows = breakdown.map((item) => {
      const userInput = item.note || "—";
      const maxPts = item.max ?? 0;
      const pointsDisplay = item.points === 0 && maxPts > 0 && !skillsAssessmentDone
        ? `0${blockedLabel}`
        : String(item.points);
      return [
        item.label,
        userInput,
        pointsDisplay,
        String(maxPts),
      ];
    });

    // Color-coded points column: red for blocked zeros, green for earned, gray for zero
    const pointsColors = breakdown.map((item) => {
      const maxPts = item.max ?? 0;
      if (item.points === 0 && maxPts > 0 && !skillsAssessmentDone) {
        return { r: 180, g: 38, b: 38 }; // red for blocked
      }
      if (item.points > 0) {
        return { r: 22, g: 101, b: 52 }; // green for earned
      }
      return { r: 120, g: 130, b: 145 }; // gray for zero
    });

    if (ctx.drawTable) {
      (ctx.drawTable as Function)(headers, rows, [0.30, 0.30, 0.20, 0.20],
        (rowIndex: number, colIndex: number) => {
          if (colIndex === 2 && pointsColors[rowIndex]) {
            return pointsColors[rowIndex];
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
