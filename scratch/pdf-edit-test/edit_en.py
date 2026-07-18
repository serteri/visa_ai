# -*- coding: utf-8 -*-
import fitz

SRC = "scratch/pdf-edit-test/en-original.pdf"
DST = "scratch/pdf-edit-test/en-edited-TEST.pdf"
FONT_REG = "C:/Windows/Fonts/segoeui.ttf"
FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
COLOR_REG = (0x1B/255, 0x24/255, 0x30/255)   # 0x1B2430
COLOR_BOLD = (0x13/255, 0x28/255, 0x44/255)  # 0x132844
WHITE = (1, 1, 1)
SIZE = 10.12

doc = fitz.open(SRC)
page = doc[32]  # page 33 (1-indexed)

# 1) $4,640 -> $6,140 (Visa application row)
vac_box = fitz.Rect(408.7, 45.3, 445.0, 58.8)
page.add_redact_annot(vac_box, fill=WHITE)

# 2) $6,500-7,500 -> $7,700-8,780 (Total row, bold)
total_box = fitz.Rect(408.7, 182.6, 480.0, 196.0)
page.add_redact_annot(total_box, fill=WHITE)

page.apply_redactions()

page.insert_text((408.7, 56.8), "$6,140", fontsize=SIZE, fontfile=FONT_REG, fontname="SegoeCustom", color=COLOR_REG)
page.insert_text((408.7, 194.0), "$7,700–8,780", fontsize=SIZE, fontfile=FONT_BOLD, fontname="SegoeBoldCustom", color=COLOR_BOLD)

doc.save(DST)
print("Saved:", DST)
