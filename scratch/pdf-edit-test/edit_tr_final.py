# -*- coding: utf-8 -*-
import fitz

SRC = "public/avustralya-pr-rehberi-2026.pdf"
FONT = "C:/Users/serte/AppData/Local/Programs/Python/Python310/lib/site-packages/matplotlib/mpl-data/fonts/ttf/DejaVuSans.ttf"
TEXTCOLOR = (0x37/255, 0x41/255, 0x51/255)
GRAY_ROW_BG = (242/255, 244/255, 246/255)
WHITE_BG = (1, 1, 1)
FONTSIZE = 10

doc = fitz.open(SRC)
page = doc[33]  # page 34 (1-indexed)

# 1) Base VAC: $4.640 -> $6.140 (gray zebra row)
for r in [fitz.Rect(234.8, 246.8, 269.8, 256.8), fitz.Rect(334.0, 246.8, 369.0, 256.8)]:
    page.add_redact_annot(r, fill=GRAY_ROW_BG)

# 2) "Eş Vize Ücreti" label -> two-line rename (white row)
page.add_redact_annot(fitz.Rect(64.7, 273.5, 233.0, 288.5), fill=WHITE_BG)

# 3) $2.320 -> $2.455 (white row)
page.add_redact_annot(fitz.Rect(334.0, 275.8, 369.0, 285.8), fill=WHITE_BG)

# 4) TOPLAM row: redact both wrapped-line blocks (gray zebra row)
page.add_redact_annot(fitz.Rect(234.8, 514.0, 315.0, 528.0), fill=GRAY_ROW_BG)   # Tek Kisi total
page.add_redact_annot(fitz.Rect(334.0, 506.5, 420.0, 536.0), fill=GRAY_ROW_BG)   # Aile total (2-line block)

page.apply_redactions()

page.insert_text((234.8, 254.8), "$6.140", fontsize=FONTSIZE, fontfile=FONT, fontname="F3custom", color=TEXTCOLOR)
page.insert_text((334.0, 254.8), "$6.140", fontsize=FONTSIZE, fontfile=FONT, fontname="F3custom", color=TEXTCOLOR)
page.insert_text((334.0, 283.8), "$2.455", fontsize=FONTSIZE, fontfile=FONT, fontname="F3custom", color=TEXTCOLOR)

LABEL_SIZE = 8.2
page.insert_text((64.7, 282.0), "Eş İçin Ek Ücret", fontsize=LABEL_SIZE, fontfile=FONT, fontname="F3custom", color=TEXTCOLOR)
page.insert_text((64.7, 292.5), "(Ana Başvuruya Dahil)", fontsize=LABEL_SIZE, fontfile=FONT, fontname="F3custom", color=TEXTCOLOR)

# TOPLAM row new values, single line each (both comfortably fit column width)
page.insert_text((234.8, 524.3), "~$8.200-10.200", fontsize=FONTSIZE, fontfile=FONT, fontname="F3custom", color=TEXTCOLOR)
page.insert_text((334.0, 524.3), "~$14.700-20.700", fontsize=FONTSIZE, fontfile=FONT, fontname="F3custom", color=TEXTCOLOR)

doc.save("scratch/pdf-edit-test/tr-live-new.pdf")
print("Saved staged file: scratch/pdf-edit-test/tr-live-new.pdf")
