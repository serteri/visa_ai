import json, os, sys
from pathlib import Path
import openai
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / "../.env")
load_dotenv(Path(__file__).parent / "../.env.local", override=True)

client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

with open(Path(__file__).parent / "../public/cleaned-osca-list.json", "r", encoding="utf-8") as f:
    records = json.load(f)

# Take first 5 records (which failed in Batch 1)
test_batch = records[:5]
items = [{"code": r["code"], "title_en": r["title_en"]} for r in test_batch]
user_msg = json.dumps(items)

SYSTEM_PROMPT = """You are a professional translator specialised in Australian immigration and
occupation classification (ANZSCO / OSCA).

You will receive a JSON array of occupation objects. For each object return:
  - "code": same code (string)
  - "title_tr": official Turkish translation of title_en (use professional
     immigration terminology, e.g. "Yazilim Muhendisi" not "Yazilimci")
  - "title_zh": official Simplified-Chinese translation
  - "duties_en": exactly 3 concise bullet-point duty descriptions in English
     aligned with Australian occupation standards
  - "duties_tr": Turkish translations of the 3 duties
  - "duties_zh": Simplified-Chinese translations of the 3 duties

Rules:
  - Return ONLY a raw JSON array (no markdown fences, no explanation).
  - Keep the same order and the same "code" values.
  - Each duty should be one sentence, max 25 words.
  - Use formal register in all languages.
"""

resp = client.chat.completions.create(
    model="gpt-4o-mini",
    temperature=0.2,
    response_format={"type": "json_object"},
    messages=[
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_msg},
    ],
)

print("Raw content:")
print(resp.choices[0].message.content.encode('utf-8'))
