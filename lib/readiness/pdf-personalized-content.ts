import type { PDFContext } from "./pdf-types";
import type { Locale } from "./types";
import { getPersonalizedPointsBreakdown } from "./pdf-content/personalized-points";
import { getPersonalizedOverview } from "./pdf-content/personalized-overview";
import { getSkillsAssessmentStatus } from "./pdf-content/skills-assessment-status";
import { getViabilityInsights } from "./pdf-content/viability-insights";

/** Core Skills Income Threshold — employer-sponsored visa minimum salary (1 July 2026). */
const CSIT_THRESHOLD_AUD = 79423;

/**
 * Renders PERSONALIZED content sections into the PDF.
 *
 * Section order:
 *   1. EOI Status Banner (BLOCKED / READY)
 *   2. Executive Summary (goal-adaptive intro)
 *   3. Points Breakdown Table (4 columns: Category | Potential | Claimable | Action/Status)
 *   4. Predictive Viability Insights (historical cutoff comparison)
 *   5. Skills Assessment Status
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
    lineHeight,
    COLORS,
    FONTS,
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
  const isAusQual = userInputSummary.isAustralianQualification ?? null;
  const isQualRecognized = userInputSummary.isQualificationRecognized ?? null;
  const annualSalary = userInputSummary.annualSalaryAud
    ? Number(userInputSummary.annualSalaryAud)
    : undefined;
  const hasSalary = annualSalary !== undefined && Number.isFinite(annualSalary) && annualSalary > 0;
  const t = effectiveLocale === "tr" ? "tr" : effectiveLocale === "zh-Hans" ? "zh" : "en";

  // ── Determine which visa types are in scope ──────────────────────────
  const goals = userInputSummary.migrationGoals ?? [];
  const hasPointsTestedVisa =
    goals.some((g) => ["direct_pr", "regional"].includes(g)) ||
    (report.detectedSubclasses ?? []).some((s) => ["189", "190", "491"].includes(s));
  const hasEmployerSponsored =
    goals.includes("employer_sponsorship") ||
    (report.detectedSubclasses ?? []).some((s) => ["482", "186"].includes(s));
  const showPoints = hasPointsTestedVisa || (!hasEmployerSponsored && estimatedPoints > 0);

  // ════════════════════════════════════════════════════════════════════════
  // 1. EOI STATUS BANNER (reason-aware)
  // ════════════════════════════════════════════════════════════════════════
  if (showPoints) {
    // Read the engine's EOI eligibility flag (age < 45 AND skills assessment done)
    const isEoiEligible = report.pointsEstimate?.isEoiEligible ?? false;
    const eoiReason = report.pointsEstimate?.eoiIneligibilityReason ?? null;

    ctx.ensurePageSpace(20);
    const bannerY = ctx.getCurrentY();
    const bannerH = 18;

    if (!isEoiEligible && eoiReason === "age") {
      // RED: INELIGIBLE — age limit exceeded
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(0.8);
      doc.roundedRect(margin, bannerY, contentWidth, bannerH, 2, 2, "FD");
      doc.setFillColor(220, 38, 38);
      doc.rect(margin, bannerY, 3, bannerH, "F");

      setBoldFont();
      doc.setFontSize(9);
      doc.setTextColor(180, 38, 38);
      const ineligibleTitle = t === "tr"
        ? "EOI DURUMU: UYGUN DEĞİL. Yaş Sınırı Aşıldı."
        : t === "zh" ? "EOI 状态：不符合资格。已超过年龄上限。"
        : "EOI STATUS: INELIGIBLE. Age Limit Exceeded.";
      doc.text(safeText(ineligibleTitle), margin + 8, bannerY + 7);

      setBaseFont();
      doc.setFontSize(7.5);
      doc.setTextColor(120, 40, 40);
      const ineligibleDetail = t === "tr"
        ? "Bir EOI sunmak için 45 yaşın altında olmanız gerekir."
        : t === "zh"
          ? "递交EOI必须年满45周岁以下。"
          : "You must be under 45 to lodge an EOI.";
      doc.text(safeText(ineligibleDetail), margin + 8, bannerY + 13);
    } else if (!isEoiEligible && eoiReason === "english") {
      // RED: BLOCKED — Competent English not met
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(0.8);
      doc.roundedRect(margin, bannerY, contentWidth, bannerH, 2, 2, "FD");
      doc.setFillColor(220, 38, 38);
      doc.rect(margin, bannerY, 3, bannerH, "F");

      setBoldFont();
      doc.setFontSize(9);
      doc.setTextColor(180, 38, 38);
      const englishTitle = t === "tr"
        ? "EOI DURUMU: ENGELLİ."
        : t === "zh" ? "EOI 状态：已阻止。"
        : "EOI STATUS: BLOCKED.";
      doc.text(safeText(englishTitle), margin + 8, bannerY + 7);

      setBaseFont();
      doc.setFontSize(7.5);
      doc.setTextColor(120, 40, 40);
      const englishDetail = t === "tr"
        ? "Eylem Gerekli: Bir EOI sunmak için en azından Competent English (yetkin İngilizce) seviyesini kanıtlamanız gerekir."
        : t === "zh"
          ? "需要采取行动：递交EOI前，您必须证明至少具备能力级英语水平。"
          : "Action Required: You must demonstrate at least Competent English to lodge an EOI.";
      doc.text(safeText(englishDetail), margin + 8, bannerY + 13);
    } else if (!isEoiEligible) {
      // RED: BLOCKED — skills assessment missing
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(0.8);
      doc.roundedRect(margin, bannerY, contentWidth, bannerH, 2, 2, "FD");
      doc.setFillColor(220, 38, 38);
      doc.rect(margin, bannerY, 3, bannerH, "F");

      setBoldFont();
      doc.setFontSize(9);
      doc.setTextColor(180, 38, 38);
      const blockedTitle = t === "tr"
        ? "EOI DURUMU: ENGELLİ."
        : t === "zh" ? "EOI 状态：已阻止。"
        : "EOI STATUS: BLOCKED.";
      doc.text(safeText(blockedTitle), margin + 8, bannerY + 7);

      setBaseFont();
      doc.setFontSize(7.5);
      doc.setTextColor(120, 40, 40);
      const blockedDetail = t === "tr"
        ? "Eylem Gerekli: Bir EOI sunmadan önce mesleğiniz için olumlu bir Beceri Değerlendirmesi yasal olarak zorunludur."
        : t === "zh"
          ? "需要采取行动：递交EOI之前，获得提名职业的正面技能评估是法律强制要求。"
          : "Action Required: A positive Skills Assessment is legally required before lodging an EOI.";
      doc.text(safeText(blockedDetail), margin + 8, bannerY + 13);
    } else {
      // GREEN: READY
      doc.setFillColor(220, 253, 230);
      doc.setDrawColor(22, 163, 74);
      doc.setLineWidth(0.8);
      doc.roundedRect(margin, bannerY, contentWidth, bannerH, 2, 2, "FD");
      doc.setFillColor(22, 163, 74);
      doc.rect(margin, bannerY, 3, bannerH, "F");

      setBoldFont();
      doc.setFontSize(9);
      doc.setTextColor(22, 101, 52);
      const readyTitle = t === "tr"
        ? "EOI DURUMU: HAZIR."
        : t === "zh" ? "EOI 状态：就绪。"
        : "EOI STATUS: READY.";
      doc.text(safeText(readyTitle), margin + 8, bannerY + 10);
    }

    // Advance closure yPosition past the 18mm banner + 5mm gap.
    // Each addSmallText("", 0) advances by lineHeight (~5mm).
    addSmallText("", 0);
    addSmallText("", 0);
    addSmallText("", 0);
    addSmallText("", 0);
    addSmallText("", 0);
  }

  // ════════════════════════════════════════════════════════════════════════
  // 2. EXECUTIVE SUMMARY (goal-adaptive)
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

  if (overview.keyFindings.length > 0) {
    addPremiumBulletContainer(
      t === "tr" ? "Ana Bulgular" : t === "zh" ? "主要发现" : "Key Findings",
      overview.keyFindings,
      COLORS.accent,
    );
  }

  addSmallText(overview.recommendation, 0);
  ctx.yPosition += 1;
  addSmallText(overview.confidenceNote, 0);
  ctx.yPosition += 2;

  // Employer Sponsored Viability (salary-based)
  if (hasSalary && hasEmployerSponsored) {
    ctx.ensurePageSpace(20);
    const meetsCsit = annualSalary! >= CSIT_THRESHOLD_AUD;
    const csitLabel = `CSIT: AUD $${CSIT_THRESHOLD_AUD.toLocaleString("en-AU")}`;

    addPremiumKeyValueContainer(
      t === "tr" ? "İşveren Sponsorluğu Uygunluğu"
        : t === "zh" ? "雇主担保可行性"
        : "Employer Sponsored Viability",
      [[
        t === "tr" ? "Maaş Durumu" : t === "zh" ? "薪资状况" : "Salary Status",
        meetsCsit
          ? `✅ AUD $${annualSalary!.toLocaleString("en-AU")} — ${csitLabel} ${
              t === "tr" ? "eşiğini karşılıyor. 482/186 yolları uygundur."
              : t === "zh" ? " 已达标。482/186路径可行。"
              : " threshold met. 482/186 pathways viable."
            }`
          : `❌ AUD $${annualSalary!.toLocaleString("en-AU")} — ${csitLabel} ${
              t === "tr" ? "eşiğinin altında. Maaş ayarlaması gerekiyor."
              : t === "zh" ? " 未达标。需调整薪资。"
              : " below threshold. Salary adjustment required."
            }`,
      ]],
      meetsCsit ? COLORS.riskLow : COLORS.riskHigh,
    );
    ctx.yPosition += 2;
  }

  // ════════════════════════════════════════════════════════════════════════
  // 3. POINTS BREAKDOWN TABLE (4 columns)
  // ════════════════════════════════════════════════════════════════════════
  if (showPoints && report.pointsEstimate && report.pointsEstimate.breakdown.length > 0) {
    const breakdown = report.pointsEstimate.breakdown;

    const pointsData = getPersonalizedPointsBreakdown(
      effectiveLocale,
      country,
      userName,
      estimatedPoints,
      breakdown.map((item) => ({ ...item, max: item.max ?? 0 })),
      65,
    );

    // Section Header
    ctx.ensurePageSpace(60);
    addSectionHeading("⭐", pointsData.title);
    addSmallText(pointsData.summary, 0);
    ctx.yPosition += 3;

    // ── 4-Column Table: Category | Potential Points | Claimable Points | Action/Status ──
    const colHeaders: Record<string, string[]> = {
      en: ["Category", "Potential Points", "Claimable Points", "Action / Status"],
      tr: ["Kategori", "Potansiyel Puan", "Talep Edilen Puan", "Durum"],
      zh: ["类别", "潜在积分", "可主张积分", "状态"],
    };
    const headers = colHeaders[t];

    // Build rows with Potential vs Claimable distinction
    const rows = breakdown.map((item) => {
      const maxPts = item.max ?? 0;
      const claimedPts = item.points;
      const potentialPts = maxPts; // Maximum they could potentially earn

      // Determine action/status label
      let actionStatus: string;
      const isEducation = item.label.toLowerCase().includes("education") ||
        item.label.toLowerCase().includes("eğitim") ||
        item.label.toLowerCase().includes("教育");
      const isEmployment = item.label.toLowerCase().includes("employment") ||
        item.label.toLowerCase().includes("istihdam") ||
        item.label.toLowerCase().includes("工作");
      const isPartner = item.label.toLowerCase().includes("partner") ||
        item.label.toLowerCase().includes("伴侣");

      if (claimedPts > 0) {
        actionStatus = t === "tr" ? "✅ Tamamlandı"
          : t === "zh" ? "✅ 已完成"
          : "✅ Complete";
      } else if (isEducation && !isAusQual && !isQualRecognized) {
        actionStatus = t === "tr" ? "Yabancı tanıma gerekli"
          : t === "zh" ? "需要海外资格认可"
          : "Requires Overseas Qualification Recognition";
      } else if (isEducation && !isAusQual && !skillsAssessmentDone) {
        actionStatus = t === "tr" ? "Değerlendirme gerekli"
          : t === "zh" ? "需要技能评估"
          : "Requires Skills Assessment";
      } else if (isEmployment && !skillsAssessmentDone) {
        actionStatus = t === "tr" ? "Değerlendirme gerekli"
          : t === "zh" ? "需要技能评估"
          : "Requires Skills Assessment";
      } else if (isPartner && claimedPts === 0) {
        actionStatus = t === "tr" ? "Beceri dil doğrulanmadı"
          : t === "zh" ? "技能/语言未验证"
          : "Skills/English Not Verified";
      } else if (claimedPts === 0 && maxPts > 0) {
        actionStatus = t === "tr" ? "Bilgi eksik"
          : t === "zh" ? "信息缺失"
          : "Information Missing";
      } else {
        actionStatus = t === "tr" ? "Uygulanmıyor"
          : t === "zh" ? "不适用"
          : "N/A";
      }

      return [
        item.label,
        String(potentialPts),
        String(claimedPts),
        actionStatus,
      ];
    });

    // Color the Claimable Points column (col 2)
    const pointsColors = breakdown.map((item) => {
      if (item.points > 0) return { r: 22, g: 101, b: 52 }; // green
      if ((item.max ?? 0) > 0) return { r: 180, g: 38, b: 38 }; // red = blocked
      return { r: 120, g: 130, b: 145 }; // gray
    });

    // ── Explanation sub-rows: why a scored category shows 0 claimable points ──
    // Spans all columns under its category row, light-gray, smaller font.
    const subRows: Record<number, string> = {};
    breakdown.forEach((item, idx) => {
      const maxPts = item.max ?? 0;
      if (maxPts <= 0 || item.points > 0) return; // not scored or already claimed → no sub-row
      const reason = item.note && item.note.trim().length > 0
        ? item.note
        : t === "tr"
          ? "Bilgi eksik: Bu kategoride puan talep etmek için gerekli bilgileri sağlamalısınız."
          : t === "zh"
            ? "信息缺失：您必须提供必要信息才能在此类别中主张积分。"
            : "Information Missing: You must provide the required information to claim points in this category.";
      subRows[idx] = `${item.label}: ${reason}`;
    });

    if (ctx.drawTable) {
      (ctx.drawTable as Function)(headers, rows, [0.30, 0.13, 0.13, 0.44],
        (rowIndex: number, colIndex: number) => {
          if (colIndex === 2 && pointsColors[rowIndex]) {
            return pointsColors[rowIndex];
          }
          return null;
        },
        subRows
      );
    }
    // Sync ctx.yPosition after drawTable (which advances closure yPosition).
    // No sync needed — all rendering uses closure helpers, so cursors stay in sync.

    // ── Gold total line + Gap analysis + Tips + Strategies ─────────────
    // ALL rendering uses closure-based helpers (addSmallText, addBody, etc.)
    // to keep the cursor in sync. The gold line uses ctx.getCurrentY() for
    // the exact y-coordinate.

    // Gold separator line at the closure's current position
    ctx.ensurePageSpace(14);
    const goldLineY = ctx.getCurrentY();
    doc.setDrawColor(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
    doc.setLineWidth(0.8);
    doc.line(margin, goldLineY, margin + ctx.contentWidth, goldLineY);

    // Total line text (rendered via addSmallText which advances closure y)
    ctx.ensurePageSpace(12);
    addSmallText(pointsData.totalLine, 0);

    // Gap analysis text
    addSmallText(pointsData.gapAnalysis, 0);

    // Improvement tips (closure-based container)
    if (pointsData.improvementTips.length > 0) {
      addPremiumBulletContainer(
        t === "tr" ? "Puan Artırma Önerileri"
          : t === "zh" ? "积分提升建议"
          : "Points Improvement Tips",
        pointsData.improvementTips,
        COLORS.riskLow,
      );
    }

    // Additional strategies (closure-based text)
    if (pointsData.additionalStrategies && pointsData.additionalStrategies.length > 0) {
      addSmallText(
        t === "tr" ? "Ek Stratejiler:"
          : t === "zh" ? "其他策略："
          : "Additional Strategies:",
        0,
      );
      pointsData.additionalStrategies.forEach((strategy) => {
        addSmallText(`  • ${strategy}`, 0);
      });
    }

  } else if (hasEmployerSponsored && !showPoints) {
    // ── EMPLOYER SPONSORSHIP READINESS ────────────────────────────────
    ctx.ensurePageSpace(40);
    addSectionHeading("📋",
      t === "tr" ? "İşveren Sponsorluğu Hazırlık Analizi"
        : t === "zh" ? "雇主担保准备度分析"
        : "Employer Sponsorship Readiness"
    );

    const csitLabel = `AUD $${CSIT_THRESHOLD_AUD.toLocaleString("en-AU")}`;
    if (hasSalary) {
      const meets = annualSalary! >= CSIT_THRESHOLD_AUD;
      addSmallText(
        meets
          ? `✅ ${t === "tr" ? "Maaş" : t === "zh" ? "薪资" : "Salary"}: AUD $${annualSalary!.toLocaleString("en-AU")} — ${csitLabel} ${t === "tr" ? "eşik değerini karşılıyor" : t === "zh" ? "已达门槛" : "threshold met"}`
          : `❌ ${t === "tr" ? "Maaş" : t === "zh" ? "薪资" : "Salary"}: AUD $${annualSalary!.toLocaleString("en-AU")} — ${csitLabel} ${t === "tr" ? "eşik değerinin altında" : t === "zh" ? "未达门槛" : "below threshold"}`,
        0,
      );
    } else {
      addSmallText(
        `⚠️ ${t === "tr" ? "Maaş bilgisi girilmedi" : t === "zh" ? "未提供薪资信息" : "Salary not provided"} — ${csitLabel}`,
        0,
      );
    }
    ctx.yPosition += 1;
    [
      t === "tr" ? "• Beceri değerlendirmesi zorunludur" : t === "zh" ? "• 必须完成技能评估" : "• Skills assessment mandatory",
      t === "tr" ? "• İşvereninizin onaylı sponsor olması gerekir" : t === "zh" ? "• 雇主必须是获批担保方" : "• Employer must be an approved sponsor",
      t === "tr" ? "• Pozisyonunuz mesleğinizle uyumlu olmalıdır" : t === "zh" ? "• 岗位必须与您的职业匹配" : "• Position must align with your nominated occupation",
    ].forEach((item) => addSmallText(item, 0));
    ctx.yPosition += 3;
  }

  // ════════════════════════════════════════════════════════════════════════
  // 4. PREDICTIVE VIABILITY INSIGHTS (isolated & route-split)
  // ════════════════════════════════════════════════════════════════════════
  if (showPoints && userInputSummary.viability) {
    const viab = userInputSummary.viability;
    const isEoiEligible = report.pointsEstimate?.isEoiEligible ?? false;

    // Claimable total (respects assessment/recognition/age gates from engine)
    const claimableTotal = report.pointsEstimate?.breakdown
      ? report.pointsEstimate.breakdown.reduce((sum: number, item: { points: number }) => sum + item.points, 0)
      : estimatedPoints;

    ctx.ensurePageSpace(35);
    addSectionHeading("📊",
      t === "tr" ? "Tahmini Uygunluk Analizi"
        : t === "zh" ? "预测可行性分析"
        : "Predictive Viability Insights"
    );

    // ── Condition A: EOI is BLOCKED → locked state ─────────────────────
    if (!isEoiEligible) {
      const boxY = ctx.getCurrentY();
      const boxH = 22;
      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.8);
      doc.roundedRect(margin, boxY, contentWidth, boxH, 2, 2, "FD");
      doc.setFillColor(148, 163, 184);
      doc.rect(margin, boxY, 3, boxH, "F");

      setBoldFont();
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const lockedTitle = t === "tr"
        ? "🔒 Tahminler Kilitli"
        : t === "zh" ? "🔒 预测已锁定"
        : "🔒 Predictive Insights Locked";
      doc.text(safeText(lockedTitle), margin + 8, boxY + 7);

      setBaseFont();
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      const lockedDetail = t === "tr"
        ? "Tahmini analiz şu anda kilitli. Tarihsel uygunluğu analiz etmeden önce EOI engellerini (Yaş veya Beceri Değerlendirmesi) çözmelisiniz."
        : t === "zh"
          ? "预测分析当前已锁定。在分析历史可行性之前，您必须先解决EOI障碍（年龄或技能评估）。"
          : "Predictive insights are currently locked. You must resolve the EOI blockers (Age or Skills Assessment) before analyzing historical viability.";
      doc.text(safeText(lockedDetail), margin + 8, boxY + 14);

      // Advance closure yPosition past the 22mm box + gap
      addSmallText("", 0);
      addSmallText("", 0);
      addSmallText("", 0);
      addSmallText("", 0);
      addSmallText("", 0);
    }
    // ── Condition C: State Nomination (190/491) outlook ────────────────
    else if (viab.stateAllocation) {
      const sa = viab.stateAllocation;
      const subclass = sa.visaSubclass;

      // Key-value box: state allocation
      const allocText = t === "tr"
        ? `${sa.state} eyaletinin ${subclass} programı için bu yıl ${sa.allocation.toLocaleString("en-AU")} kontenjanı bulunmaktadır.`
        : t === "zh"
          ? `${sa.state} 州在${subclass}计划本年度拥有 ${sa.allocation.toLocaleString("en-AU")} 个配额。`
          : `${sa.state} has an allocation of ${sa.allocation.toLocaleString("en-AU")} places for the ${subclass} program this year.`;

      addPremiumKeyValueContainer(
        t === "tr" ? `Eyalet Adaylığı (${subclass}) Görünümü`
          : t === "zh" ? `州提名（${subclass}）展望`
          : `State Nomination (${subclass}) Outlook`,
        [[
          t === "tr" ? "Tahsis" : t === "zh" ? "配额" : "Allocation",
          allocText,
        ]],
        COLORS.primary,
      );
      ctx.yPosition += 2;

      const stateNote = t === "tr"
        ? `Eyalet adaylıkları katı federal puan kesim çizgileri yerine yerel beceri kıtlıklarını ve benzersiz demografik ihtiyaçları önceliklendirir. ${sa.state} eyaletinin belirli yerel kriterlerini karşıladığınızdan emin olun.`
        : t === "zh"
          ? `州提名优先考虑本地技能短缺和独特的人口需求，而非严格的联邦分数线。请确保您满足${sa.state}州的具体当地标准。`
          : `State nominations prioritize local skill shortages and unique demographic needs rather than strict federal point cut-offs. Ensure you meet ${sa.state}'s specific local criteria.`;
      addSmallText(stateNote, 0);
      ctx.yPosition += 3;
    }
    // ── Condition B: Federal 189 Viability ─────────────────────────────
    else {
      const viabData = getViabilityInsights(effectiveLocale, {
        occupationTitle: viab.occupationTitle,
        calculatedPoints: claimableTotal,
        cutoffScore: viab.cutoffScore,
        roundDate: viab.roundDate,
        totalInvited: viab.totalInvited,
        gap: claimableTotal - viab.cutoffScore,
        viability: claimableTotal >= viab.cutoffScore + 10
          ? "strong"
          : claimableTotal >= viab.cutoffScore
            ? "viable"
            : claimableTotal >= viab.cutoffScore - 5
              ? "borderline"
              : "below_threshold",
        hasSkillsAssessment: skillsAssessmentDone,
      });

      addBody(viabData.summary);
      ctx.yPosition += 2;

      // Historical cut-off headline
      const headline = t === "tr"
        ? `Federal 189 Uygunluğu: ${viab.occupationTitle} için en son federal turda (Haziran 2026) tarihsel kesim puanı ${viab.cutoffScore} puandı.`
        : t === "zh"
          ? `联邦189可行性：${viab.occupationTitle}在最近联邦轮次（2026年6月）的历史分数线为${viab.cutoffScore}分。`
          : `Federal 189 Viability: The historical cut-off for ${viab.occupationTitle} in the recent federal round (June 2026) was ${viab.cutoffScore} points.`;
      addBody(headline);
      ctx.yPosition += 2;

      // Dynamic gap text block (rendered via closure helpers for cursor sync)
      if (claimableTotal >= viab.cutoffScore) {
        const competitiveText = t === "tr"
          ? "Son davet turlarına göre yüksek rekabet gücüne sahipsiniz."
          : t === "zh"
            ? "基于近期邀请轮次，您具有很强的竞争力。"
            : "Highly competitive based on recent rounds.";
        addSmallText(competitiveText, 4);
      } else {
        const gap = viab.cutoffScore - claimableTotal;
        const shortText = t === "tr"
          ? `Son kesim puanının ${gap} puan altındasınız. Daha yüksek dil puanı, NAATI veya Partner puanları gibi ek puan yollarını değerlendirin.`
          : t === "zh"
            ? `您目前距离最近的历史分数线还差${gap}分。建议探索额外加分途径（如优秀语言成绩、NAATI或伴侣积分）。`
            : `You are currently ${gap} points short of the recent historical cut-off. We recommend exploring additional point avenues (e.g., superior English, NAATI, or Partner points).`;
        addSmallText(shortText, 4);
      }

      viabData.details.forEach((detail) => {
        addSmallText(detail, 4);
      });
      ctx.yPosition += 2;

      addSmallText(viabData.recommendation, 0);
      ctx.yPosition += 3;
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // 5. SKILLS ASSESSMENT STATUS
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
      t === "tr" ? "Sonraki adım: " : t === "zh" ? "下一步：" : "Next step: ",
      0,
    );
    addBody(skillsStatus.nextAction);
  }
  ctx.yPosition += 3;
}
