/**
 * Post-deploy smoke test for PAID reports on production, through the real customer path -- no bypass route.
 *
 *   form (/en/full-check) -> report row -> "Unlock report" -> /api/checkout -> Stripe Checkout (live) -> webhook
 *   unlocks the report -> /api/reports/<id>/pdf -> text assertions
 *
 * Stripe Checkout is completed BY YOU in the browser window this script opens (apply the 100%-off promotion code,
 * fill the billing address, press Pay): the script never enters payment details or promotion codes, and there is
 * no way to unlock a report from here. See docs/smoke-prod-report.md for setup (the smoke email must be in
 * KNOWN_TEST_EMAILS and NOT in ADMIN_EMAILS, so the order takes the paid path and no report email is sent).
 *
 * Personas and assertions (the fee work shipped in c2e49a0 / 48372d4):
 *   civil-offshore   Civil Engineer 233211, living in India      -> EA, "AUD 940 (CDR; applying from outside Australia"
 *   civil-onshore    Civil Engineer 233211, living in Australia  -> EA, "AUD 1,034 (CDR; applying from within Australia"
 *   mlt-offshore     Medical Laboratory Technician 311213, India -> AIMS, "AUD 900 (applying from outside Australia"
 *
 * Usage (credentials only via environment variables; nothing is written to the repo):
 *   SMOKE_EMAIL=you+smoke@example.com npx tsx scripts/smoke-prod-report.ts            full run, headed browser
 *   SMOKE_EMAIL=... npx tsx scripts/smoke-prod-report.ts --dry-run                    fill the form, stop before submit
 *   npx tsx scripts/smoke-prod-report.ts --verify civil-offshore=<id> civil-onshore=<id> mlt-offshore=<id>
 *                                                                                      re-check existing unlocked reports
 * Optional: SMOKE_BASE_URL (default https://www.logivisa.com), SMOKE_PERSONAS=civil-offshore,mlt-offshore.
 * PDF text is saved to temp_tests/smoke/ (gitignored).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium, type Page } from "playwright";
import { PDFParse } from "pdf-parse";

const BASE_URL = (process.env.SMOKE_BASE_URL ?? "https://www.logivisa.com").replace(/\/$/, "");
const OUT_DIR = path.join(process.cwd(), "temp_tests", "smoke");
const CHECKOUT_TIMEOUT_MS = 15 * 60 * 1000;

type Persona = {
  id: string;
  occupationQuery: string;
  occupationOption: RegExp;
  currentCountry: string;
  passportCountry: string;
  expect: { authority: RegExp; line: RegExp; absent: RegExp[] };
};

const PERSONAS: Persona[] = [
  {
    id: "civil-offshore",
    occupationQuery: "Civil Engineer",
    occupationOption: /^\s*Civil Engineer\s*233211\s*$/,
    currentCountry: "India",
    passportCountry: "India",
    expect: {
      authority: /Skills assessment \(Engineers Australia \(The Institution of Engineers Australia\) \(EA\)\)/,
      line: /AUD 940 \(CDR; applying from outside Australia, excl\. GST\)/,
      absent: [/AUD 1,034 \(CDR/, /AUD 940–1,034/],
    },
  },
  {
    id: "civil-onshore",
    occupationQuery: "Civil Engineer",
    occupationOption: /^\s*Civil Engineer\s*233211\s*$/,
    currentCountry: "Australia",
    passportCountry: "India",
    expect: {
      authority: /Skills assessment \(Engineers Australia \(The Institution of Engineers Australia\) \(EA\)\)/,
      line: /AUD 1,034 \(CDR; applying from within Australia, incl\. GST\)/,
      absent: [/AUD 940 \(CDR/, /AUD 940–1,034/],
    },
  },
  {
    id: "mlt-offshore",
    occupationQuery: "Medical Laboratory Technician",
    occupationOption: /^\s*Medical Laboratory Technician\s*311213\s*$/,
    currentCountry: "India",
    passportCountry: "India",
    expect: {
      authority: /Skills assessment \(Australian Institute of Medical Scientists \(AIMS\)/,
      line: /AUD 900 \(applying from outside Australia; excl\. GST; AIMS p\.18\)/,
      absent: [/Vocational Education and Training Assessment Services \(VETASSESS\)\): AUD/, /AUD 990 \(applying/],
    },
  },
];

const flat = (s: string) => s.replace(/\s+/g, " ");

async function pdfText(reportId: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/reports/${encodeURIComponent(reportId)}/pdf`);
  if (!res.ok) throw new Error(`GET /api/reports/${reportId}/pdf -> HTTP ${res.status} (${(await res.text()).slice(0, 120)})`);
  const parser = new PDFParse({ data: new Uint8Array(await res.arrayBuffer()) });
  const parsed = await parser.getText();
  await parser.destroy();
  return parsed.pages.map((p: { text: string }) => p.text).join("\n");
}

/** Checks one report's PDF; returns failure messages (empty = pass) and prints the matching lines. */
async function verify(persona: Persona, reportId: string): Promise<string[]> {
  const raw = await pdfText(reportId);
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, `${persona.id}-${reportId}.txt`), raw);
  const text = flat(raw);
  const failures: string[] = [];
  if (!persona.expect.authority.test(text)) failures.push(`authority not found: ${persona.expect.authority}`);
  if (!persona.expect.line.test(text)) failures.push(`fee line not found: ${persona.expect.line}`);
  for (const re of persona.expect.absent) if (re.test(text)) failures.push(`unexpected text present: ${re}`);
  const sentence = text.match(/Skills assessment \([^:]*\)\): AUD [^.]*\./)?.[0];
  console.log(`\n[${persona.id}] report ${reportId}`);
  console.log(`  PDF: ${sentence ?? "(no \"Skills assessment (...): AUD ...\" sentence found)"}`);
  console.log(failures.length ? failures.map((f) => `  ❌ ${f}`).join("\n") : "  ✅ pass");
  return failures;
}

/** Opens a base-ui combobox (by its label) and picks the option with exactly this text. */
async function pickCombobox(page: Page, labelFor: string, option: string) {
  const direct = page.locator(`#${labelFor}[role="combobox"]`);
  const trigger = (await direct.count()) ? direct : page.locator(`label[for="${labelFor}"]`).locator("xpath=..").getByRole("combobox").first();
  await trigger.click();
  await page.getByRole("listbox").getByRole("option", { name: option, exact: true }).first().click();
}

async function fillForm(page: Page, persona: Persona, email: string) {
  await page.goto(`${BASE_URL}/en/full-check`, { waitUntil: "networkidle" });
  // Step 1 -- Personal. The hidden "fake_email" honeypot is left empty.
  await page.fill("#waitlist-full-name", "Smoke Test");
  await page.fill("#waitlist-e", email);
  await page.getByRole("button", { name: /Direct Permanent Residency/ }).click();
  await pickCombobox(page, "waitlist-current-country", persona.currentCountry);
  await pickCombobox(page, "waitlist-passport-country", persona.passportCountry);
  await page.fill("#waitlist-age", "30");
  await page.getByRole("button", { name: /^Next$/ }).click();
  // Step 2 -- Career: the occupation typeahead (needs real key events; suggestions are <li> "Title<code>").
  await page.locator("#waitlist-occupation").pressSequentially(persona.occupationQuery, { delay: 30 });
  await page.locator("li").filter({ hasText: persona.occupationOption }).first().click();
  await page.getByRole("button", { name: /^Next$/ }).click();
  // Step 3 -- Language & profile.
  await pickCombobox(page, "waitlist-english", "Proficient (IELTS 7)");
  await pickCombobox(page, "waitlist-education", "Bachelor's Degree");
  await page.selectOption("#waitlist-qualification-awarded-in-australia", { label: "No" });
  await page.fill("#waitlist-salary-aud", "85000");
  await page.fill("#waitlist-offshore-experience-years", "5");
  await page.fill("#waitlist-onshore-experience-years", "0");
  await pickCombobox(page, "waitlist-sponsor", "Single / No Dependants");
}

async function hiddenValues(page: Page): Promise<Record<string, string>> {
  const names = ["occupation", "currentCountry", "passportCountry", "englishLevel", "qualificationLevel", "sponsorOrFamily", "mainGoal", "fake_email"];
  const out: Record<string, string> = {};
  for (const n of names) {
    const input = page.locator(`input[name="${n}"]`).first();
    out[n] = (await input.count()) ? await input.inputValue() : "";
  }
  return out;
}

async function runPersona(page: Page, persona: Persona, email: string, dryRun: boolean): Promise<string | null> {
  console.log(`\n=== ${persona.id}: filling the form on ${BASE_URL} ===`);
  await fillForm(page, persona, email);
  const values = await hiddenValues(page);
  console.log("  form values:", JSON.stringify(values));
  if (!values.occupation || !values.currentCountry || values.fake_email) throw new Error(`${persona.id}: the form did not take the persona's values`);
  if (dryRun) {
    console.log("  --dry-run: stopping before submit (nothing created)");
    return null;
  }

  await page.locator('form button[type="submit"]').first().click();
  await page.getByRole("button", { name: /Unlock Your Full Readiness Report/ }).click({ timeout: 180_000 });
  await page.fill("#unlock-email", email);
  await page.fill("#unlock-full-name", "Smoke Test");
  await page.getByRole("button", { name: /^Unlock report$/ }).click();
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 });
  console.log("  ➜ Stripe Checkout is open in the browser window: apply the promotion code, enter the billing address, press Pay.");
  console.log(`    Waiting up to ${CHECKOUT_TIMEOUT_MS / 60000} minutes for the success page...`);
  await page.waitForURL(/\/checkout\/success\?.*reportId=/, { timeout: CHECKOUT_TIMEOUT_MS });
  const reportId = new URL(page.url()).searchParams.get("reportId");
  if (!reportId) throw new Error(`${persona.id}: success page URL has no reportId`);
  console.log(`  report ${reportId} paid; waiting for the webhook to unlock it...`);
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${BASE_URL}/api/reports/${reportId}/pdf`, { method: "GET" });
    if (res.ok) return reportId;
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`${persona.id}: report ${reportId} was not unlocked within 150 s of payment`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const selected = (process.env.SMOKE_PERSONAS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const personas = selected.length ? PERSONAS.filter((p) => selected.includes(p.id)) : PERSONAS;
  const failures: string[] = [];

  if (args.includes("--verify")) {
    const pairs = args.filter((a) => a.includes("=")).map((a) => a.split("=") as [string, string]);
    if (!pairs.length) throw new Error("--verify needs persona=reportId pairs, e.g. civil-offshore=<uuid>");
    for (const [id, reportId] of pairs) {
      const persona = PERSONAS.find((p) => p.id === id);
      if (!persona) throw new Error(`unknown persona "${id}" (${PERSONAS.map((p) => p.id).join(", ")})`);
      failures.push(...(await verify(persona, reportId)).map((f) => `${id}: ${f}`));
    }
  } else {
    const email = process.env.SMOKE_EMAIL?.trim();
    if (!email) throw new Error("SMOKE_EMAIL is not set (an address in KNOWN_TEST_EMAILS, not in ADMIN_EMAILS) -- see docs/smoke-prod-report.md");
    const browser = await chromium.launch({ headless: dryRun });
    try {
      for (const persona of personas) {
        const page = await browser.newPage();
        const reportId = await runPersona(page, persona, email, dryRun);
        if (reportId) failures.push(...(await verify(persona, reportId)).map((f) => `${persona.id}: ${f}`));
        await page.close();
      }
    } finally {
      await browser.close();
    }
    if (dryRun) {
      console.log(`\n✅ dry run: the form accepted all ${personas.length} personas (nothing submitted)`);
      return;
    }
  }

  console.log(`\n${failures.length === 0 ? "✅ SMOKE PASSED" : `❌ SMOKE FAILED (${failures.length})\n${failures.join("\n")}`}`);
  process.exitCode = failures.length === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(`❌ smoke run crashed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
