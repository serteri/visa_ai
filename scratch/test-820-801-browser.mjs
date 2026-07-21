import { chromium } from "playwright";

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));

await page.goto("http://localhost:3000/en/full-check", { waitUntil: "networkidle" });
await page.waitForSelector("#waitlist-visa-interest", { timeout: 15000 });

await page.selectOption("#waitlist-visa-interest", "820_801");
console.log("Selected visaInterest value:", await page.locator("#waitlist-visa-interest").inputValue());

// Confirm no 186-only fields leaked in for this selection (regression: those
// should only appear for value=186)
console.log("186 nominationStream field present (should be false):", (await page.locator("#waitlist-nomination-stream").count()) > 0);

await page.fill('input[name="fullName"]', "Test User");
await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
await page.fill('input[name="currentCountry"]', "Australia");
await page.fill('textarea[name="mainGoal"]', "My partner is an Australian citizen, we are engaged");
await page.fill('input[name="passportCountry"]', "India");
await page.fill('input[name="age"]', "30");

// Occupation field - fill with confirmed-MLTSSL occupation via the ANZSCO search box
const occupationBox = page.locator('input[placeholder*="occupation" i], input[name="occupation"], input[id*="anzsco" i], input[id*="occupation" i]').first();
const occCount = await occupationBox.count();
console.log("Occupation input found:", occCount > 0);
if (occCount > 0) {
  await occupationBox.fill("Accountant");
  await page.waitForTimeout(500);
}

let capturedFormData = null;
await page.route("**/full-check*", async (route) => {
  const request = route.request();
  if (request.method() === "POST") {
    const buffer = request.postDataBuffer();
    if (buffer) {
      const text = buffer.toString("utf-8");
      const visaInterestMatch = text.match(/name="1_visaInterest"\r?\n\r?\n([^\r\n]*)/);
      const occupationMatch = text.match(/name="1_occupation"\r?\n\r?\n([^\r\n]*)/);
      capturedFormData = {
        visaInterest: visaInterestMatch?.[1] ?? null,
        occupation: occupationMatch?.[1] ?? null,
      };
      console.log("\nCaptured outgoing form submission fields:", capturedFormData);
    }
  }
  await route.continue();
});

await page.check('input[type="checkbox"]');
const submitButton = page.locator('button[type="submit"]').first();
await submitButton.click({ timeout: 5000 }).catch((e) => console.log("Submit click issue (expected if DB fails):", e.message));
await page.waitForTimeout(3000);

console.log("\nFinal captured form data:", capturedFormData);
console.log("\nConsole errors (DB-related failures expected/OK):");
console.log(consoleErrors.length === 0 ? "none" : consoleErrors.slice(0, 5).join("\n"));

await browser.close();
