"""
Reads public/OSCA List.xlsx → produces public/cleaned-osca-list.json
with 2313 unique occupation records following the requested schema.
"""

import json, sys, os
from pathlib import Path
from collections import defaultdict

try:
    import openpyxl
except ImportError:
    os.system(f"{sys.executable} -m pip install openpyxl --quiet")
    import openpyxl

XLSX = Path(__file__).parent / "public" / "OSCA List.xlsx"
OUT  = Path(__file__).parent / "public" / "cleaned-osca-list.json"

# ── 1. Read the workbook ─────────────────────────────────────────────
wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
ws = wb.active

rows = list(ws.iter_rows(values_only=True))

# Row 0 is a title banner, row 1 is the real header
header = [str(c).strip() if c else "" for c in rows[1]]
id_idx   = header.index("Identifier")
desc_idx = header.index("Description")
cat_idx  = header.index("Category")

print(f"Header: {header}")
print(f"Columns -> Identifier={id_idx}, Description={desc_idx}, Category={cat_idx}")
print(f"Total data rows (excl. 2 header rows): {len(rows) - 2}")

# ── 2. Group rows by Identifier ─────────────────────────────────────
groups = defaultdict(list)  # code → [(description, category), ...]

for row in rows[2:]:
    # Pad short rows
    cells = list(row) + [None] * 5
    raw_code = cells[id_idx]
    desc     = str(cells[desc_idx]).strip() if cells[desc_idx] else ""
    cat      = str(cells[cat_idx]).strip()  if cells[cat_idx]  else ""
    if raw_code is None or not desc:
        continue

    # Identifier comes as float (e.g. 242331.0) → convert to int string
    if isinstance(raw_code, float):
        code = str(int(raw_code))
    else:
        code = str(raw_code).replace(".", "").replace(" ", "").strip()

    if not code.isdigit():
        continue

    # Zero-pad to 6 digits if needed
    code = code.zfill(6)

    groups[code].append((desc, cat))

print(f"Unique codes parsed: {len(groups)}")

# ── 3. Build output records ─────────────────────────────────────────
# Skill level from first digit of the 6-digit OSCA/ANZSCO code
SKILL_MAP = {
    "1": 1,  # Managers
    "2": 1,  # Professionals
    "3": 2,  # Technicians and Trades Workers
    "4": 2,  # Community and Personal Service Workers
    "5": 3,  # Clerical and Administrative Workers
    "6": 4,  # Sales Workers
    "7": 4,  # Machinery Operators and Drivers
    "8": 5,  # Labourers
    "9": 5,  # Other
}

records = []

for code in sorted(groups.keys()):
    entries = groups[code]

    # Find the Principal Title
    principal = None
    keywords = []

    for desc, cat in entries:
        if cat == "Principal Title":
            principal = desc
        else:
            keywords.append(desc)

    # Rule 4: no Principal Title → use first entry as title
    if principal is None:
        principal = entries[0][0]
        keywords = [desc for desc, cat in entries[1:]]

    # De-duplicate keywords, preserve order, exclude the title itself
    seen = {principal.lower()}
    unique_kw = []
    for kw in keywords:
        low = kw.lower()
        if low not in seen:
            seen.add(low)
            unique_kw.append(kw)

    first_digit = code[0] if code else "9"
    skill = SKILL_MAP.get(first_digit, 5)

    records.append({
        "code": code,
        "title_en": principal,
        "title_tr": "",
        "title_zh": "",
        "keywords": unique_kw,
        "duties_en": [],
        "duties_tr": [],
        "duties_zh": [],
        "skillLevel": skill,
    })

# ── 4. Write JSON ───────────────────────────────────────────────────
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(records, f, ensure_ascii=False, indent=2)

print(f"Wrote {len(records)} records -> {OUT}")
if len(records) != 1156:
    print(f"WARNING: Expected 1156 records but got {len(records)}. Investigating...")
    # Show a sample of codes for debugging
    print(f"   First 10 codes: {[r['code'] for r in records[:10]]}")
    print(f"   Last  10 codes: {[r['code'] for r in records[-10:]]}")
else:
    print("OK: Record count matches expected 1156 unique OSCA occupation codes.")
