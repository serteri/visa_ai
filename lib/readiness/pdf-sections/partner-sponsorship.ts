import type { PDFContext, PDFSection } from "../pdf-types";

/**
 * Renders the Partner Sponsorship Assessment report.
 *
 * Covers: Relationship & Sponsor Snapshot, Genuine Relationship
 * Evidence Assessment, Sponsor Eligibility, Evidence Checklist,
 * and Recommended Next Steps.
 *
 * All labels are fully trilingual (en/tr/zh-Hans).
 *
 * Extracted from the original monolith (lines 3577-3732).
 */
export const drawPartnerSponsorshipReport: PDFSection = (ctx: PDFContext): void => {
  const {
    report,
    text,
    effectiveLocale,
    COLORS,
    addSectionHeading,
    addHeading,
    addBody,
    addSmallText,
    addPremiumKeyValueContainer,
  } = ctx;

  const isTr = effectiveLocale === "tr";
  const isZh = effectiveLocale === "zh-Hans";
  const pAssessment = report.partnerSponsorshipAssessment;
  if (!pAssessment) return;

  // ── 1. Relationship & Sponsor Snapshot ───────────────────────────────
  addSectionHeading(
    "",
    isTr ? "İlişki ve Sponsor Özeti" : isZh ? "关系与担保人概览" : "Relationship & Sponsor Snapshot",
  );

  const relLabel = isTr ? "İlişki Türü" : isZh ? "关系类型" : "Relationship Type";
  const cohabLabel = isTr ? "Birlikte Yaşama Süresi" : isZh ? "共同居住时间" : "Cohabitation Duration";
  const sponsorStatusLabel = isTr ? "Sponsor Statüsü" : isZh ? "担保人身份" : "Sponsor Status";

  const relVal = isTr ? "Evli" : isZh ? "已婚" : "Married";
  const cohabVal = isTr ? "12 aydan fazla" : isZh ? "12个月以上" : "More than 12 months";
  const sponVal = isTr ? "Vatandaş" : isZh ? "公民" : "Citizen";

  addPremiumKeyValueContainer(
    isTr ? "Segment Özet Tablosu" : isZh ? "评估基本信息" : "Assessment Snapshot",
    [
      [relLabel, relVal],
      [cohabLabel, cohabVal],
      [sponsorStatusLabel, sponVal],
    ],
    COLORS.primary,
  );
  ctx.yPosition += 2;

  // ── 2. Genuine Relationship Evidence Assessment ──────────────────────
  addHeading(
    isTr ? "İlişki Kanıt Gücü Değerlendirmesi" : isZh ? "真实关系证明评估" : "Genuine Relationship Evidence Assessment",
  );

  const signalLabel = isTr ? "İlişki Kanıt Sinyali Gücü" : isZh ? "关系证明信号强度" : "Relationship Signal Strength";
  const sigColor =
    pAssessment.relationshipSignalStrength === "High"
      ? COLORS.riskLow
      : pAssessment.relationshipSignalStrength === "Medium"
        ? COLORS.riskMedium
        : COLORS.riskHigh;

  const signalValueText =
    pAssessment.relationshipSignalStrength === "High"
      ? (isTr ? "YÜKSEK (Güçlü kanıt derinliği)" : isZh ? "高（证明材料丰富）" : "HIGH (Strong evidence depth)")
      : pAssessment.relationshipSignalStrength === "Medium"
        ? (isTr ? "ORTA (Makul kanıt derinliği)" : isZh ? "中（证明材料一般）" : "MEDIUM (Moderate evidence depth)")
        : (isTr ? "DÜŞÜK (Yetersiz/Kısıtlı kanıt)" : isZh ? "低（证明材料不足）" : "LOW (Limited evidence/cohabitation)");

  addPremiumKeyValueContainer(
    isTr ? "Kanıt Gücü Sinyali" : isZh ? "证明强度信号" : "Evidence Strength Signal",
    [[signalLabel, signalValueText]],
    sigColor,
  );
  ctx.yPosition += 2;

  addBody(
    isTr
      ? "Bu değerlendirme, başvuru formunda işaretlediğiniz birlikte yaşama süresi ve ilişki kanıtı çeşitliliğine dayanmaktadır. Bu resmi bir 'genuine relationship' kararı değildir."
      : isZh
        ? "此评估基于您在申请表中填写的共同居住时间及关系证明材料。这并非官方的“真实关系”裁决。"
        : "This assessment is based on the cohabitation duration and the variety of relationship evidence provided in your intake. It is not an official 'genuine relationship' decision.",
  );
  ctx.yPosition += 2;

  // ── 3. Sponsor Eligibility Snapshot ──────────────────────────────────
  addHeading(
    isTr ? "Sponsor Uygunluk Durumu" : isZh ? "担保人资格评估" : "Sponsor Eligibility Snapshot",
  );

  const sponSigText =
    pAssessment.sponsorEligibilitySignal === "Eligible"
      ? (isTr ? "UYGUN" : isZh ? "符合条件" : "ELIGIBLE")
      : (isTr ? "KOŞULLU" : isZh ? "有待核实" : "CONDITIONAL");

  addPremiumKeyValueContainer(
    isTr ? "Sponsorluk Uygunluk Sinyali" : isZh ? "担保人资格信号" : "Sponsor Eligibility Signal",
    [
      [
        isTr ? "Değerlendirme Sonucu" : isZh ? "评估结果" : "Assessment Status",
        sponSigText,
      ],
    ],
    pAssessment.sponsorEligibilitySignal === "Eligible"
      ? COLORS.riskLow
      : COLORS.riskMedium,
  );
  ctx.yPosition += 2;

  if (pAssessment.hardGateFlags.length > 0) {
    pAssessment.hardGateFlags.forEach((flag) => {
      addPremiumKeyValueContainer(
        isTr ? "UYARI / KISITLAMA" : isZh ? "限制性警示" : "REGULATORY WARNING",
        [
          [
            isTr ? "Açıklama" : isZh ? "详情说明" : "Details",
            flag,
          ],
        ],
        COLORS.riskHigh,
      );
      ctx.yPosition += 2;
    });
  } else {
    addBody(
      isTr
        ? "Sponsorun son 5 yıl içinde başka birine sponsor olduğu yönünde bir kayıt beyan edilmemiştir."
        : isZh
          ? "未申报担保人在过去5年内有担保他人的记录。"
          : "No previous sponsorship within the last 5 years was declared.",
    );
    ctx.yPosition += 2;
  }

  // ── 4. Evidence Checklist ────────────────────────────────────────────
  addSectionHeading(
    "",
    isTr ? "Kanıt Evrak Kontrol Listesi" : isZh ? "关系证明文件清单" : "Audit-Ready Evidence Checklist",
  );
  addSmallText(
    isTr
      ? "Partner vizesi başvurusunda ilişkinin gerçekliğini kanıtlamak için gereken temel evraklar:"
      : isZh
        ? "用于在伴侣签证申请中证明关系真实性的关键文件清单："
        : "Key documents required to substantiate relationship genuineness in your partner application:",
    0,
  );
  ctx.yPosition += 2;

  addBody(
    isTr
      ? "Mevcut Olduğu Belirtilen Evraklar:"
      : isZh
        ? "已准备/申报的关系证明："
        : "Declared Evidence (Ready/Available):",
  );

  const evidenceLabels: Record<string, string> = {
    marriage_cert: isTr ? "Evlilik Cüzdanı" : isZh ? "结婚证书" : "Marriage Certificate",
    joint_bank: isTr ? "Ortak Banka Hesabı" : isZh ? "联名账户" : "Joint Bank Account",
    joint_lease: isTr ? "Ortak Kira Sözleşmesi" : isZh ? "联名租约" : "Joint Lease",
    photos_social: isTr ? "Birlikte Fotoğraflar" : isZh ? "合影与社交证据" : "Photos & Social Evidence",
    children: isTr ? "Ortak Çocuk Bilgileri" : isZh ? "共同子女" : "Joint Children Details",
  };

  ["marriage_cert", "joint_bank", "joint_lease", "photos_social"].forEach((e) => {
    addSmallText(`[x] ${evidenceLabels[e] ?? e}`, 4);
  });
  ctx.yPosition += 2;

  if (pAssessment.evidenceGaps.length > 0) {
    addBody(
      isTr
        ? "Eksik / Güçlendirilmesi Gereken Kanıtlar:"
        : isZh
          ? "缺失/待加强的关系证明材料："
          : "Evidence Gaps (Needs to be acquired/strengthened):",
    );
    pAssessment.evidenceGaps.forEach((g) => {
      addSmallText(`[ ] ${g}`, 4);
    });
    ctx.yPosition += 2;
  }

  // ── 5. Recommended Next Steps ────────────────────────────────────────
  addHeading(
    isTr ? "Önerilen Sonraki Adımlar" : isZh ? "推荐执行步骤" : "Recommended Next Steps",
  );
  pAssessment.recommendedNextSteps.forEach((step) => {
    addSmallText(`• ${step}`, 0);
  });
  ctx.yPosition += 3;
};