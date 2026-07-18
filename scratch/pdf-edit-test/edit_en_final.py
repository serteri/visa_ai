# -*- coding: utf-8 -*-
import fitz

SRC = "public/australia-guide-2026.pdf"
FONT_REG = "C:/Windows/Fonts/segoeui.ttf"
FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
COLOR_REG = (0x1B/255, 0x24/255, 0x30/255)
COLOR_BOLD = (0x13/255, 0x28/255, 0x44/255)
WHITE = (1, 1, 1)
SIZE = 10.12

doc = fitz.open(SRC)
page = doc[32]  # page 33 (1-indexed)

page.add_redact_annot(fitz.Rect(408.7, 45.3, 445.0, 58.8), fill=WHITE)   # $4,640
page.add_redact_annot(fitz.Rect(408.7, 182.6, 480.0, 196.0), fill=WHITE) # $6,500-7,500

page.apply_redactions()

page.insert_text((408.7, 56.8), "$6,140", fontsize=SIZE, fontfile=FONT_REG, fontname="SegoeCustom", color=COLOR_REG)
page.insert_text((408.7, 194.0), "$7,700–8,800", fontsize=SIZE, fontfile=FONT_BOLD, fontname="SegoeBoldCustom", color=COLOR_BOLD)

doc.save("scratch/pdf-edit-test/en-live-new.pdf")
print("Saved staged file: scratch/pdf-edit-test/en-live-new.pdf")
