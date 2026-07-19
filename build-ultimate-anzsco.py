"""
build-ultimate-anzsco.py
========================
1. Reads public/OSCA List.xlsx directly and groups by Identifier.
2. Deduplicates descriptions as keywords, assigning Principal Title as title_en.
3. Assigns skillLevel (1-5) based on the first digit of the code.
4. Loads existing public/anzsco-list.json to preserve already-translated entries (idempotence).
5. Batches pending records (40 at a time) and translates via OpenAI GPT-4o-mini.
6. Merges and saves checkpoints to public/anzsco-list.json after each successful batch.
"""

import json
import os
import sys
import time
import textwrap
from pathlib import Path
from collections import defaultdict

# ── 0. Dependencies ─────────────────────────────────────────────────
try:
    import openpyxl
except ImportError:
    print("Installing openpyxl...")
    os.system(f"{sys.executable} -m pip install openpyxl --quiet")
    import openpyxl

try:
    import openai
except ImportError:
    print("Installing openai...")
    os.system(f"{sys.executable} -m pip install openai python-dotenv --quiet")
    import openai

try:
    from dotenv import load_dotenv
except ImportError:
    os.system(f"{sys.executable} -m pip install python-dotenv --quiet")
    from dotenv import load_dotenv

# Load env files
load_dotenv(Path(__file__).parent / ".env")
load_dotenv(Path(__file__).parent / ".env.local", override=True)

XLSX_PATH = Path(__file__).parent / "public" / "OSCA List.xlsx"
JSON_PATH = Path(__file__).parent / "public" / "anzsco-list.json"

# ── 1. Read and Parse Excel ─────────────────────────────────────────
if not XLSX_PATH.exists():
    sys.exit(f"ERROR: Excel file not found at {XLSX_PATH}")

print("Loading Excel workbook...")
wb = openpyxl.load_workbook(XLSX_PATH, read_only=True, data_only=True)
ws = wb.active

rows = list(ws.iter_rows(values_only=True))
header = [str(c).strip() if c else "" for c in rows[1]] # Row 1 is header

id_idx = header.index("Identifier")
desc_idx = header.index("Description")
cat_idx = header.index("Category")

groups = defaultdict(list)
for row in rows[2:]:
    cells = list(row) + [None] * 5
    raw_code = cells[id_idx]
    desc = str(cells[desc_idx]).strip() if cells[desc_idx] else ""
    cat = str(cells[cat_idx]).strip() if cells[cat_idx] else ""
    
    if raw_code is None or not desc:
        continue

    if isinstance(raw_code, float):
        code = str(int(raw_code))
    else:
        code = str(raw_code).replace(".", "").replace(" ", "").strip()

    if not code.isdigit():
        continue

    code = code.zfill(6)
    groups[code].append((desc, cat))

print(f"Total unique occupation codes found in Excel: {len(groups)}")

# ── 2. Map Skill Levels ─────────────────────────────────────────────
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

# ── 3. Load Existing JSON Progress (Idempotence) ────────────────────
existing_records = {}

# Paths to search for existing translations
sources_to_load = [
    Path(__file__).parent / "public" / "anzsco-list.json",
    Path(__file__).parent / "src" / "data" / "anzsco-list.json",
    Path(__file__).parent / "public" / "cleaned-osca-list.json"
]

for src in sources_to_load:
    if src.exists():
        try:
            with open(src, "r", encoding="utf-8") as f:
                data = json.load(f)
                count_loaded = 0
                for r in data:
                    if isinstance(r, dict) and "code" in r and r.get("title_tr"):
                        # Only keep if we actually have translations
                        code = r["code"]
                        if code not in existing_records:
                            existing_records[code] = r
                            count_loaded += 1
                if count_loaded > 0:
                    print(f"Loaded {count_loaded} active translations from {src.name}")
        except Exception as e:
            print(f"Warning: Could not parse {src.name} ({e})")

print(f"Total active translations cached: {len(existing_records)}")

import re
def norm_name(s):
    return re.sub(r'[^a-z0-9]+', ' ', s.lower()).strip()

norm_to_existing = {}
for r in existing_records.values():
    # Support both 'title_en' and 'title' keys in sources
    title_en = r.get("title_en") or r.get("title")
    if title_en:
        norm_to_existing[norm_name(title_en)] = r

# ── 4. Build/Merge Architecture Records ─────────────────────────────
final_records = []
pending_translation = []

for code in sorted(groups.keys()):
    entries = groups[code]
    
    # 1. Determine title_en
    principal = None
    keywords = []
    for desc, cat in entries:
        if cat == "Principal Title":
            principal = desc
        elif cat in ("Alternative Title", "Specialisation"):
            keywords.append(desc)
            
    if principal is None:
        principal = entries[0][0]
        keywords = [desc for desc, cat in entries[1:] if cat in ("Alternative Title", "Specialisation")]

    # Deduplicate keywords, preserving order, excluding title itself
    seen = {principal.lower()}
    unique_keywords = []
    for kw in keywords:
        low = kw.lower()
        if low not in seen:
            seen.add(low)
            unique_keywords.append(kw)

    first_digit = code[0] if code else "9"
    skill = SKILL_MAP.get(first_digit, 5)
    # Ensure it is an integer between 1 and 5
    skill = min(5, max(1, int(skill)))

    # 2. Check if already translated
    existing = existing_records.get(code)
    if not existing:
        existing = norm_to_existing.get(norm_name(principal))

    if existing and existing.get("title_tr") and existing.get("title_zh") and existing.get("duties_tr"):
        # Keep translated fields, but refresh structural fields from latest Excel
        record = {
            "code": code,
            "title_en": principal,
            "title_tr": existing.get("title_tr", ""),
            "title_zh": existing.get("title_zh", ""),
            "keywords": unique_keywords,
            "duties_en": existing.get("duties_en", []),
            "duties_tr": existing.get("duties_tr", []),
            "duties_zh": existing.get("duties_zh", []),
            "skillLevel": skill
        }
    else:
        # Needs translation
        record = {
            "code": code,
            "title_en": principal,
            "title_tr": "",
            "title_zh": "",
            "keywords": unique_keywords,
            "duties_en": [],
            "duties_tr": [],
            "duties_zh": [],
            "skillLevel": skill
        }
        pending_translation.append(record)
        
    final_records.append(record)

# Map final_records list by code for quick updates
final_map = {r["code"]: r for r in final_records}

print(f"Mapped {len(final_records)} final structure records.")
print(f"Pending translation: {len(pending_translation)} records.")

# ── 5. OpenAI Translation Setup ─────────────────────────────────────
api_key = os.getenv("OPENAI_API_KEY", "")
if not api_key:
    # If no API key, we will write structure only and warn user
    print("WARNING: OPENAI_API_KEY is not defined in environment variables. Writing base structural JSON only.")
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(final_records, f, ensure_ascii=False, indent=2)
    print(f"Base structural JSON saved to {JSON_PATH.name}. Exiting.")
    sys.exit(0)

client = openai.OpenAI(api_key=api_key)
MODEL = "gpt-4o-mini"
BATCH_SIZE = 40
MAX_RETRIES = 3
RETRY_DELAY = 5

SYSTEM_PROMPT = textwrap.dedent("""\
You are a professional translator specialised in Australian immigration and
occupation classification (ANZSCO / OSCA).

Return a JSON object with a single key "occupations" containing a list of objects.
For each object, include:
  - "code": same code (string)
  - "title_tr": official Turkish translation of title_en (use professional
     immigration terminology, e.g. "Yazilim Muhendisi" not "Yazilimci")
  - "title_zh": official Simplified-Chinese translation
  - "duties_en": exactly 3 concise bullet-point duty descriptions in English
     aligned with Australian occupation standards
  - "duties_tr": Turkish translations of the 3 duties
  - "duties_zh": Simplified-Chinese translations of the 3 duties

Rules:
  - Return ONLY a JSON object of form: {"occupations": [...]}
  - Keep the same order and the same "code" values.
  - Each duty should be one sentence, max 25 words.
  - Use formal register in all languages.
""")

def build_user_prompt(batch):
    items = [{"code": r["code"], "title_en": r["title_en"]} for r in batch]
    return json.dumps(items, ensure_ascii=False)

def call_llm(batch):
    user_msg = build_user_prompt(batch)
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = client.chat.completions.create(
                model=MODEL,
                temperature=0.2,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg},
                ],
            )
            raw = resp.choices[0].message.content.strip()
            parsed = json.loads(raw)
            
            if isinstance(parsed, dict) and "occupations" in parsed:
                parsed = parsed["occupations"]
            elif isinstance(parsed, dict):
                for v in parsed.values():
                    if isinstance(v, list):
                        parsed = v
                        break
            if not isinstance(parsed, list):
                raise ValueError(f"Expected list, got {type(parsed)}")
            
            # Normalize codes to string
            for item in parsed:
                if "code" in item:
                    item["code"] = str(item["code"])
            return parsed
        except (openai.RateLimitError, openai.APITimeoutError) as e:
            wait = RETRY_DELAY * attempt
            print(f"  Rate limit/timeout (attempt {attempt}/{MAX_RETRIES}), waiting {wait}s...")
            time.sleep(wait)
        except openai.APIError as e:
            print(f"  API Error (attempt {attempt}/{MAX_RETRIES}): {e}")
            time.sleep(RETRY_DELAY)
        except (json.JSONDecodeError, ValueError) as e:
            print(f"  Parsing Error (attempt {attempt}/{MAX_RETRIES}): {e}")
            if attempt < MAX_RETRIES:
                time.sleep(2)
    return None

# ── 6. Execute Batches ──────────────────────────────────────────────
total_enriched = 0
total_batches = (len(pending_translation) + BATCH_SIZE - 1) // BATCH_SIZE

def save_checkpoint():
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(final_records, f, ensure_ascii=False, indent=2)

if pending_translation:
    print(f"Starting translation of {len(pending_translation)} pending records in {total_batches} batches...")
    
    for batch_num in range(total_batches):
        start = batch_num * BATCH_SIZE
        end = min(start + BATCH_SIZE, len(pending_translation))
        batch_slice = pending_translation[start:end]
        
        print(f"\n--- Batch {batch_num + 1}/{total_batches} (records {start+1}-{end} of {len(pending_translation)}) ---")
        
        result = call_llm(batch_slice)
        if result is None:
            print("  Batch failed to translate. Skipping...")
            continue
            
        result_map = {item["code"]: item for item in result if "code" in item}
        applied = 0
        
        for item in batch_slice:
            code = item["code"]
            enriched = result_map.get(code)
            if not enriched:
                continue
                
            # Update the master record list in-place
            master_rec = final_map[code]
            master_rec["title_tr"] = enriched.get("title_tr", "")
            master_rec["title_zh"] = enriched.get("title_zh", "")
            master_rec["duties_en"] = enriched.get("duties_en", [])[:3]
            master_rec["duties_tr"] = enriched.get("duties_tr", [])[:3]
            master_rec["duties_zh"] = enriched.get("duties_zh", [])[:3]
            applied += 1
            
        total_enriched += applied
        print(f"  Applied {applied}/{len(batch_slice)} translations.")
        
        # Save state
        save_checkpoint()
        print(f"  Checkpoint saved to {JSON_PATH.name}. Progress: {total_enriched}/{len(pending_translation)}")
        
        time.sleep(1)
else:
    print("No pending translations. Database is fully up to date.")
    save_checkpoint()

# ── 7. Final Report ─────────────────────────────────────────────────
total_translated_count = sum(1 for r in final_records if r.get("title_tr"))
print(f"\n{'='*60}")
print(f"PROCESS COMPLETED.")
print(f"Total Unique Main Occupations Integrated: {len(final_records)}")
print(f"Total Translated/Enriched Occupations: {total_translated_count}")
print(f"Output File: {JSON_PATH}")
print(f"{'='*60}")
