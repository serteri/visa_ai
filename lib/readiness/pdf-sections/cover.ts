import type { PDFContext, PDFSection } from "../pdf-types";

/**
 * Renders the cover page of the PDF report.
 *
 * Layout:
 * - Full-page background with navy header band
 * - Centered title block with accent underline
 * - Metadata card (Prepared For, Report Date, Report ID, Occupation)
 * - Advisory intro text at bottom
 * - Adds a new page and resets yPosition to 20 after rendering
 *
 * This was extracted from the original 4,286-line monolith (lines 1618-1745).
 */
export const drawCoverPage: PDFSection = (ctx: PDFContext): void => {
  const {
    doc,
    locale,
    text,
    userInputSummary,
    pageWidth,
    pageHeight,
    margin,
    contentWidth,
    COLORS,
    FONTS,
    setBaseFont,
    setBoldFont,
    safeText,
    clipToWidth,
  } = ctx;

  const reportDate = new Intl.DateTimeFormat(locale, {
    timeZone: "Australia/Brisbane",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(new Date());

  const aestDatePart = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Brisbane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const subjectName = userInputSummary.name || "Applicant";
  const safeName = subjectName.replace(/[^A-Za-z0-9]/g, "").slice(0, 10).toUpperCase() || "CLIENT";
  const reportId = `LVA-${aestDatePart.replace(/-/g, "")}-${safeName}`;

  // ── Background ──────────────────────────────────────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // ── Top header band (navy) ──────────────────────────────────────────────
  doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.rect(0, 0, pageWidth, 58, "F");

  // ── Accent stripe below header ──────────────────────────────────────────
  doc.setFillColor(12, 116, 139);
  doc.rect(0, 58, pageWidth, 4, "F");

  // ── Bottom footer band ──────────────────────────────────────────────────
  doc.setFillColor(226, 232, 240);
  doc.rect(0, pageHeight - 38, pageWidth, 38, "F");
  doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.rect(0, pageHeight - 38, 10, 38, "F");

  // Confidential label in header
  setBoldFont();
  doc.setFontSize(9);
  doc.setTextColor(125, 211, 252);
  doc.text(safeText(text.coverConfidential || "CONFIDENTIAL ASSESSMENT"), 14, 14);

  // Product wordmark in header
  setBaseFont();
  doc.setFontSize(FONTS.body);
  doc.setTextColor(255, 255, 255);
  const wordmark = "LogiVisa";
  const ww = doc.getTextWidth(wordmark);
  doc.text(wordmark, pageWidth - margin - ww, 14);

  // ── Centered title block ─────────────────────────────────────────────────
  setBoldFont();
  doc.setFontSize(28);
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, 82, contentWidth, 108, 3, 3, "FD");
  doc.setFillColor(236, 254, 255);
  doc.roundedRect(margin + 6, 88, contentWidth - 12, 18, 2, 2, "F");

  const titleText = safeText(text.coverTitle);
  doc.setFontSize(28);
  doc.text(doc.splitTextToSize(titleText, contentWidth - 24), margin + 12, 122);

  // Thin accent underline under title
  doc.setDrawColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
  doc.setLineWidth(1.2);
  doc.line(margin + 12, 151, margin + 78, 151);

  setBaseFont();
  doc.setFontSize(12);
  doc.setTextColor(51, 65, 85);
  doc.text(doc.splitTextToSize(safeText(text.coverSubtitle), contentWidth - 24), margin + 12, 140);

  // ── Metadata card ────────────────────────────────────────────────────────
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin + 12, 160, contentWidth - 24, 42, 2, 2, "FD");

  // Accent left bar on card
  doc.setFillColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
  doc.rect(margin + 12, 160, 2.5, 42, "F");

  const labelX = margin + 19;
  const valueX = margin + 62;
  const metaRows: Array<[string, string]> = [
    [text.coverPreparedFor || "Prepared For", subjectName],
    ["Report Date", reportDate],
    [text.coverReference || "Reference", reportId],
  ];
  if (userInputSummary.occupation) {
    metaRows.push(["Occupation", userInputSummary.occupation]);
  }

  metaRows.slice(0, 4).forEach(([label, value], i) => {
    const ry = 171 + i * 8.8;
    setBoldFont();
    doc.setFontSize(9);
    doc.setTextColor(COLORS.lightText.r, COLORS.lightText.g, COLORS.lightText.b);
    doc.text(safeText(label), labelX, ry);
    setBaseFont();
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    doc.text(safeText(clipToWidth(value, contentWidth - 76)), valueX, ry);
  });

  // ── Occupation / goal summary chip ────────────────────────────────────────
  if (userInputSummary.occupation) {
    const chipY = 212;
    doc.setFillColor(236, 254, 255);
    doc.setDrawColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin + 4, chipY, contentWidth - 8, 10, 1.5, 1.5, "FD");
    setBaseFont();
    doc.setFontSize(9);
    doc.setTextColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
    doc.text(safeText(userInputSummary.occupation), margin + 8, chipY + 6.5);
  }

  setBaseFont();
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    doc.splitTextToSize(safeText(text.advisoryIntro || ""), contentWidth - 18),
    margin + 8,
    238,
  );

  // Add new page and reset cursor
  doc.addPage();
  ctx.yPosition = 20;
};
