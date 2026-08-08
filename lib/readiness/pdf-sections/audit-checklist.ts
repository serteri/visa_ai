import type { PDFContext, PDFSection } from "../pdf-types";
import type { DocumentChecklistItem, NominationStream } from "../types";

/**
 * Renders the "Audit-Ready Document Checklist" section.
 *
 * Groups documents by category, with checkboxes [ ] for each item.
 * Critical items are highlighted in red, non-critical in navy.
 * Stream-conditional 186 items are filtered or grouped by sub-headers
 * based on the report's nominationStream.
 *
 * Extracted from the original monolith (lines 2277-2318).
 */
export const drawAuditChecklistBox: PDFSection = (ctx: PDFContext): void => {
  const {
    report,
    text,
    doc,
    margin,
    contentWidth,
    COLORS,
    FONTS,
    addSectionHeading,
    addSmallText,
    setBaseFont,
    setBoldFont,
    safeText,
    ensurePageSpace,
    effectiveLocale,
  } = ctx;

  if (!report.documentChecklist || report.documentChecklist.length === 0) return;

  addSectionHeading("", text.auditReadyChecklist);
  addSmallText(text.auditReadyChecklistIntro, 0);
  ctx.yPosition += 2;

  /** Resolve the display text of a DocumentChecklistItem. */
  const itemText = (item: DocumentChecklistItem): string =>
    typeof item === "string" ? item : item.text;

  /** True when a stream-conditional item applies to the current nomination stream. */
  const streamApplies = (item: DocumentChecklistItem): boolean => {
    if (typeof item === "string") return true;
    const streams = item.streams;
    if (!streams || streams.length === 0) return true;
    const s = report.nominationStream;
    if (s === "direct_entry" || s === "trt" || s === "labour_agreement") return streams.includes(s);
    return true;
  };

  const STREAM_HEADERS: Record<string, string> = {
    direct_entry: effectiveLocale === "tr" ? "Direct Entry akışı" : effectiveLocale === "zh-Hans" ? "Direct Entry 通道" : "Direct Entry",
    trt: effectiveLocale === "tr" ? "TRT akışı" : effectiveLocale === "zh-Hans" ? "TRT 通道" : "TRT",
    labour_agreement: effectiveLocale === "tr" ? "Labour Agreement akışı" : effectiveLocale === "zh-Hans" ? "Labour Agreement 通道" : "Labour Agreement",
  };

  type ChecklistLine =
    | { kind: "item"; text: string }
    | { kind: "subheader"; text: string };

  report.documentChecklist.forEach((category) => {
    const isCritical = category.category.toUpperCase() === "CRITICAL";

    // --- build render lines ---
    const hasStreamConditioned = category.items.some(
      (item) => typeof item !== "string" && item.streams && item.streams.length > 0,
    );
    const lines: ChecklistLine[] = [];

    if (!hasStreamConditioned) {
      category.items.forEach((item) => lines.push({ kind: "item", text: itemText(item) }));
    } else if (report.nominationStream && report.nominationStream !== "not_sure") {
      category.items.filter(streamApplies).forEach((item) => {
        lines.push({ kind: "item", text: itemText(item) });
      });
    } else {
      // "not_sure" / undefined: shared items first, then per-stream sub-headers.
      category.items.forEach((item) => {
        if (typeof item === "string" || !item.streams || item.streams.length === 0) {
          lines.push({ kind: "item", text: itemText(item) });
        }
      });
      (["direct_entry", "trt", "labour_agreement"] as const).forEach((s) => {
        const matching = category.items.filter(
          (item): item is Extract<DocumentChecklistItem, { text: string; streams: Array<NominationStream> }> =>
            typeof item !== "string" && (item.streams?.includes(s) ?? false),
        );
        if (matching.length === 0) return;
        lines.push({ kind: "subheader", text: STREAM_HEADERS[s] });
        matching.forEach((item) => lines.push({ kind: "item", text: itemText(item) }));
      });
    }

    if (lines.length === 0) return;

    const boxHeight = 8 + lines.length * 5;
    ensurePageSpace(boxHeight + 6);

    doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    doc.setLineWidth(0.25);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, ctx.yPosition, contentWidth, boxHeight, 1.2, 1.2, "FD");

    setBoldFont();
    doc.setFontSize(FONTS.subheading);
    if (isCritical) {
      doc.setTextColor(COLORS.riskHigh.r, COLORS.riskHigh.g, COLORS.riskHigh.b);
    } else {
      doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    }
    doc.text(safeText(category.category), margin + 2, ctx.yPosition + 5);

    lines.forEach((line, idx) => {
      const y = ctx.yPosition + 10 + idx * 5;
      if (line.kind === "subheader") {
        setBoldFont();
        doc.setFontSize(FONTS.small);
        doc.setTextColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
        doc.text(safeText(line.text), margin + 6, y);
        setBaseFont();
        doc.setFontSize(FONTS.body);
      } else {
        if (isCritical) {
          doc.setTextColor(COLORS.riskHigh.r, COLORS.riskHigh.g, COLORS.riskHigh.b);
        } else {
          doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
        }
        doc.setFontSize(FONTS.body);
        doc.text(safeText(`[ ] ${line.text}`), margin + 4, y);
      }
    });

    ctx.yPosition += boxHeight + 4;
  });
};
