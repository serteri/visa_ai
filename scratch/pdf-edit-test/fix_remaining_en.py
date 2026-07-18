# -*- coding: utf-8 -*-
import fitz

SRC = "public/australia-guide-2026.pdf"
FONT_REG = "C:/Windows/Fonts/segoeui.ttf"
COLOR_REG = (0x1B/255, 0x24/255, 0x30/255)
WHITE_BG = (1, 1, 1)
ZEBRA_BG = (245/255, 249/255, 251/255)

doc = fitz.open(SRC)

# Page 10 (index 9): "Typical total cost" row (zebra bg)
page10 = doc[9]
page10.add_redact_annot(fitz.Rect(153.0, 447.3, 182.4, 460.8), fill=ZEBRA_BG)
page10.add_redact_annot(fitz.Rect(193.1, 447.3, 222.5, 460.8), fill=ZEBRA_BG)
page10.apply_redactions()
page10.insert_text((153.0, 458.8), "$7,700", fontsize=10.12, fontfile=FONT_REG, fontname="SegoeCustom", color=COLOR_REG)
page10.insert_text((193.1, 458.8), "$8,800", fontsize=10.12, fontfile=FONT_REG, fontname="SegoeCustom", color=COLOR_REG)

# Page 43 (index 42): EOI vs Visa Application table, "Paid ($4,640+)" row (white bg)
page43 = doc[42]
page43.add_redact_annot(fitz.Rect(336.5, 263.6, 379.0, 277.0), fill=WHITE_BG)
page43.apply_redactions()
page43.insert_text((336.5, 275.0), "($6,140+)", fontsize=10.12, fontfile=FONT_REG, fontname="SegoeCustom", color=COLOR_REG)

# Page 73 (index 72): FAQ, "Approximately AUD 6,500-7,500 without an agent..." (white bg)
page73 = doc[72]
page73.add_redact_annot(fitz.Rect(161.0, 408.2, 222.0, 423.7), fill=WHITE_BG)
page73.apply_redactions()
page73.insert_text((161.0, 421.2), "7,700–8,800", fontsize=11.62, fontfile=FONT_REG, fontname="SegoeCustom", color=COLOR_REG)

doc.save("scratch/pdf-edit-test/en-live-new2.pdf")
print("Saved: scratch/pdf-edit-test/en-live-new2.pdf")
