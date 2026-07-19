"""
translate-osca.py
=================
Enriches public/cleaned-osca-list.json with:
  - title_tr  / title_zh   (Turkish / Chinese translations)
  - duties_en / duties_tr / duties_zh  (3 bullet-point job duties per language)

Uses the OpenAI API (gpt-4o-mini for cost efficiency) in 30-item sub-batches.
Idempotent: skips records that already have title_tr filled, saves after every
successful batch so progress survives interruptions.

Usage:
    pip install openai python-dotenv
    python translate-osca.py
"""

import json, os, sys, time, re, textwrap
from pathlib import Path

# ── 0. Dependencies ─────────────────────────────────────────────────
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

load_dotenv(Path(__file__).parent / ".env")
load_dotenv(Path(__file__).parent / ".env.local", override=True)

# ── 1. API client ───────────────────────────────────────────────────
api_key = os.getenv("OPENAI_API_KEY", "")
if not api_key:
    sys.exit("ERROR: OPENAI_API_KEY not found in .env or .env.local")

client = openai.OpenAI(api_key=api_key)
MODEL = "gpt-4o-mini"
BATCH_SIZE = 30
MAX_RETRIES = 3
RETRY_DELAY = 5  # seconds

DATA_PATH = Path(__file__).parent / "public" / "cleaned-osca-list.json"

# ── 2. Load data ────────────────────────────────────────────────────
with open(DATA_PATH, "r", encoding="utf-8") as f:
    records = json.load(f)

print(f"Loaded {len(records)} records from {DATA_PATH.name}")

# ── 3. Identify records needing translation ─────────────────────────
pending_indices = [
    i for i, r in enumerate(records)
    if not r.get("title_tr")
]
print(f"Records needing translation: {len(pending_indices)} / {len(records)}")

if not pending_indices:
    print("All records already translated. Nothing to do.")
    sys.exit(0)

# ── 4. Build the system prompt ──────────────────────────────────────
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
    """Minimal payload: code + title_en only."""
    items = [{"code": r["code"], "title_en": r["title_en"]} for r in batch]
    return json.dumps(items, ensure_ascii=False)

# ── 5. Call API with retries ────────────────────────────────────────
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
                # Fallback: find any array inside the dict
                for v in parsed.values():
                    if isinstance(v, list):
                        parsed = v
                        break
            if not isinstance(parsed, list):
                raise ValueError(f"Expected list, got {type(parsed)}")
            
            # Stringify codes to prevent string/int mismatch
            for item in parsed:
                if "code" in item:
                    item["code"] = str(item["code"])
            return parsed

        except (openai.RateLimitError, openai.APITimeoutError) as e:
            wait = RETRY_DELAY * attempt
            print(f"  Rate limit / timeout (attempt {attempt}/{MAX_RETRIES}), waiting {wait}s...")
            time.sleep(wait)
        except openai.APIError as e:
            print(f"  API error (attempt {attempt}/{MAX_RETRIES}): {e}")
            time.sleep(RETRY_DELAY)
        except (json.JSONDecodeError, ValueError) as e:
            print(f"  Parse error (attempt {attempt}/{MAX_RETRIES}): {e}")
            if attempt < MAX_RETRIES:
                time.sleep(2)

    print(f"  FAILED after {MAX_RETRIES} attempts. Skipping this batch.")
    return None

# ── 6. Process in sub-batches ───────────────────────────────────────
def save():
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

total_enriched = 0
total_batches = (len(pending_indices) + BATCH_SIZE - 1) // BATCH_SIZE

for batch_num in range(total_batches):
    start = batch_num * BATCH_SIZE
    end = min(start + BATCH_SIZE, len(pending_indices))
    idx_slice = pending_indices[start:end]
    batch_records = [records[i] for i in idx_slice]

    print(f"\n--- Batch {batch_num + 1}/{total_batches}  "
          f"(records {start + 1}-{end} of {len(pending_indices)}) ---")

    result = call_llm(batch_records)
    if result is None:
        continue

    # Map results back by code
    result_map = {item["code"]: item for item in result if "code" in item}

    applied = 0
    for idx in idx_slice:
        code = records[idx]["code"]
        enriched = result_map.get(code)
        if not enriched:
            continue

        records[idx]["title_tr"] = enriched.get("title_tr", "")
        records[idx]["title_zh"] = enriched.get("title_zh", "")
        records[idx]["duties_en"] = enriched.get("duties_en", [])[:3]
        records[idx]["duties_tr"] = enriched.get("duties_tr", [])[:3]
        records[idx]["duties_zh"] = enriched.get("duties_zh", [])[:3]
        applied += 1

    total_enriched += applied
    print(f"  Applied {applied}/{len(idx_slice)} translations.")

    # Save after every successful batch (idempotent checkpoint)
    save()
    print(f"  Saved. Progress: {total_enriched}/{len(pending_indices)}")

    # Small delay to stay within rate limits
    time.sleep(1)

# ── 7. Final report ─────────────────────────────────────────────────
remaining = sum(1 for r in records if not r.get("title_tr"))
print(f"\n{'='*60}")
print(f"DONE. Enriched {total_enriched} records this run.")
print(f"Total records: {len(records)}")
print(f"Still missing translation: {remaining}")
print(f"Output: {DATA_PATH}")
print(f"{'='*60}")
