import type { PDFContext, ColorRGB } from "../pdf-types";

/**
 * Table rendering component for the PDF generator.
 *
 * Renders professional tables with:
 * - Navy header row
 * - Zebra-striped body rows
 * - Automatic page breaks (header repeats on new pages)
 * - Text wrapping in cells
 * - Optional custom cell colors (for highlighting)
 *
 * Extracted from the original monolith (lines 2100-2178).
 */

export function createTableHelper(ctx: PDFContext) {
  const {
    doc,
    margin,
    contentWidth,
    contentBottom,
    COLORS,
    setBaseFont,
    setBoldFont,
    safeText,
    ensurePageSpace,
    text,
  } = ctx;

  return {
    /**
     * Draws a table with headers and rows.
     *
     * @param headers - Column headers
     * @param rows - Data rows (array of arrays)
     * @param colRatios - Column width ratios (must sum to ~1.0, e.g. [0.3, 0.4, 0.3])
     * @param getCellColor - Optional function to customize cell color based on content
     */
    drawTable(
      headers: string[],
      rows: string[][],
      colRatios: number[],
      getCellColor?: (rowIndex: number, colIndex?: number, cell?: string) => ColorRGB | null,
    ): void {
      const tableWidth = contentWidth;
      const colWidths = colRatios.map((ratio) => tableWidth * ratio);
      const headerHeight = 10;
      const cellPadX = 3;
      const cellPadY = 3;
      const bodyLineHeight = 4.6;

      const drawHeader = () => {
        ensurePageSpace(headerHeight + 6);
        doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
        doc.roundedRect(margin, ctx.yPosition, tableWidth, headerHeight, 1.2, 1.2, "F");

        let cursorX = margin;
        setBoldFont();
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        headers.forEach((h, i) => {
          const wrappedHeader = doc.splitTextToSize(safeText(h), colWidths[i] - cellPadX * 2);
          doc.text(wrappedHeader.slice(0, 2), cursorX + cellPadX, ctx.yPosition + 6, {
            maxWidth: colWidths[i] - cellPadX * 2,
            lineHeightFactor: 1.1,
          });
          cursorX += colWidths[i];
        });
        ctx.yPosition += headerHeight;
      };

      drawHeader();

      rows.forEach((row, rowIndex) => {
        setBaseFont();
        doc.setFontSize(8.5);
        const wrappedCells = row.map((cell, i) =>
          doc.splitTextToSize(
            safeText(cell || text.noData || "—"),
            Math.max(14, colWidths[i] - cellPadX * 2),
          ),
        );
        const maxLines = Math.max(...wrappedCells.map((lines) => lines.length));
        const rowHeight = Math.max(12, cellPadY * 2 + maxLines * bodyLineHeight);

        // Page break: if row doesn't fit, start new page and redraw header
        if (ctx.yPosition + rowHeight > contentBottom) {
          doc.addPage();
          ctx.yPosition = margin;
          drawHeader();
        }

        // Zebra striping
        const fill = rowIndex % 2 === 0 ? { r: 255, g: 255, b: 255 } : COLORS.zebra;
        doc.setFillColor(fill.r, fill.g, fill.b);
        doc.rect(margin, ctx.yPosition, tableWidth, rowHeight, "F");

        let x = margin;
        row.forEach((cell, i) => {
          const customColor = getCellColor?.(rowIndex, i);
          const color = customColor ?? COLORS.text;
          if (customColor) setBoldFont();
          else setBaseFont();
          doc.setFontSize(8.5);
          doc.setTextColor(color.r, color.g, color.b);
          doc.text(wrappedCells[i], x + cellPadX, ctx.yPosition + cellPadY + 3.2, {
            maxWidth: colWidths[i] - cellPadX * 2,
            lineHeightFactor: 1.18,
          });
          doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
          doc.setLineWidth(0.15);
          if (i > 0) doc.line(x, ctx.yPosition, x, ctx.yPosition + rowHeight);
          x += colWidths[i];
        });

        // Border around row
        doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
        doc.setLineWidth(0.2);
        doc.rect(margin, ctx.yPosition, tableWidth, rowHeight);
        ctx.yPosition += rowHeight;
      });

      ctx.yPosition += 4;
    },
  };
}
