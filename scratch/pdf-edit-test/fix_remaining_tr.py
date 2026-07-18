# -*- coding: utf-8 -*-
import fitz

SRC = "public/avustralya-pr-rehberi-2026.pdf"
FONT = "C:/Users/serte/AppData/Local/Programs/Python/Python310/lib/site-packages/matplotlib/mpl-data/fonts/ttf/DejaVuSans.ttf"
TEXTCOLOR = (0x37/255, 0x41/255, 0x51/255)
WHITE_BG = (1, 1, 1)
GRAY_ROW_BG = (242/255, 244/255, 246/255)

doc = fitz.open(SRC)

# Page 9 (index 8): "189 vs 190 vs 491" comparison table, Vize Ucreti row (white bg)
page9 = doc[8]
for box in [
    fitz.Rect(192.3, 409.6, 227.2, 419.6),
    fitz.Rect(305.6, 409.6, 340.6, 419.6),
    fitz.Rect(419.0, 409.6, 454.0, 419.6),
]:
    page9.add_redact_annot(box, fill=WHITE_BG)
page9.apply_redactions()
for x in [192.3, 305.6, 419.0]:
    page9.insert_text((x, 417.6), "$6.140", fontsize=10, fontfile=FONT, fontname="F3custom", color=TEXTCOLOR)

# Page 26 (index 25): EOI vs Vize Basvurusu table, "Ucretli ($4.640+)" row (white bg)
page26 = doc[25]
page26.add_redact_annot(fitz.Rect(341.4, 295.6, 392.5, 305.6), fill=WHITE_BG)
page26.apply_redactions()
page26.insert_text((341.4, 303.6), "($6.140+)", fontsize=10, fontfile=FONT, fontname="F3custom", color=TEXTCOLOR)

# Page 51 (index 50): Day-by-day checklist, "Vize ucretini ode ($4.640+)." (gray zebra bg)
page51 = doc[50]
page51.add_redact_annot(fitz.Rect(407.3, 123.3, 464.4, 133.8), fill=GRAY_ROW_BG)
page51.apply_redactions()
page51.insert_text((407.3, 131.8), "($6.140+).", fontsize=10.5, fontfile=FONT, fontname="F3custom", color=TEXTCOLOR)

doc.save("scratch/pdf-edit-test/tr-live-new2.pdf")
print("Saved: scratch/pdf-edit-test/tr-live-new2.pdf")
