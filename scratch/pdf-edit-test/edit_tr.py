# -*- coding: utf-8 -*-
import fitz

SRC = "scratch/pdf-edit-test/tr-original.pdf"
DST = "scratch/pdf-edit-test/tr-edited-TEST.pdf"
FONT = "C:/Users/serte/AppData/Local/Programs/Python/Python310/lib/site-packages/matplotlib/mpl-data/fonts/ttf/DejaVuSans.ttf"
TEXTCOLOR = (0x37/255, 0x41/255, 0x51/255)  # 0x374151
GRAY_ROW_BG = (242/255, 244/255, 246/255)   # zebra-stripe row background
WHITE_BG = (1, 1, 1)
FONTSIZE = 10

doc = fitz.open(SRC)
page = doc[33]  # page 34 (1-indexed)

# 1) Base VAC: $4.640 -> $6.140 (row has gray zebra background)
vac_boxes = [
    fitz.Rect(234.8, 246.8, 269.8, 256.8),
    fitz.Rect(334.0, 246.8, 369.0, 256.8),
]
for r in vac_boxes:
    page.add_redact_annot(r, fill=GRAY_ROW_BG)

# 2) "Eş Vize Ücreti" label -> two-line rename (row has white background)
label_box = fitz.Rect(64.7, 273.5, 233.0, 288.5)
page.add_redact_annot(label_box, fill=WHITE_BG)

# 3) $2.320 -> $2.455 (white background row)
spouse_box = fitz.Rect(334.0, 275.8, 369.0, 285.8)
page.add_redact_annot(spouse_box, fill=WHITE_BG)

page.apply_redactions()

# Re-insert corrected text using the same font/size/color
page.insert_text((234.8, 254.8), "$6.140", fontsize=FONTSIZE, fontfile=FONT, fontname="F3custom", color=TEXTCOLOR)
page.insert_text((334.0, 254.8), "$6.140", fontsize=FONTSIZE, fontfile=FONT, fontname="F3custom", color=TEXTCOLOR)
page.insert_text((334.0, 283.8), "$2.455", fontsize=FONTSIZE, fontfile=FONT, fontname="F3custom", color=TEXTCOLOR)

# Two-line label, slightly smaller font to fit column width comfortably
LABEL_SIZE = 8.2
page.insert_text((64.7, 282.0), "Eş İçin Ek Ücret", fontsize=LABEL_SIZE, fontfile=FONT, fontname="F3custom", color=TEXTCOLOR)
page.insert_text((64.7, 292.5), "(Ana Başvuruya Dahil)", fontsize=LABEL_SIZE, fontfile=FONT, fontname="F3custom", color=TEXTCOLOR)

doc.save(DST)
print("Saved:", DST)
