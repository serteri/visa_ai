import { chromium } from "playwright";

const shotDir = "/tmp/claude-0/-home-user-visa-ai/d85c2284-7846-5bad-8abb-f00daa175bf7/scratchpad";

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

// Confirm the 485 option exists with the expected value/label
const options = await page.locator("#waitlist-visa-interest option").allTextContents();
console.log("Dropdown options:", options);

await page.selectOption("#waitlist-visa-interest", "485");
const selectedValue = await page.locator("#waitlist-visa-interest").inputValue();
console.log("\nSelected visaInterest value:", selectedValue);

// Confirm the "currently international student / planning 485" field exists
// and set it to "yes" too, exercising both real 485 detection signals.
const gradIntentSelector = "#waitlist-graduate-visa-intent";
const gradIntentCount = await page.locator(gradIntentSelector).count();
console.log("Graduate-visa-intent field present:", gradIntentCount > 0);
if (gradIntentCount > 0) {
  await page.selectOption(gradIntentSelector, "yes");
  console.log("Graduate-visa-intent value:", await page.locator(gradIntentSelector).inputValue());
}

await page.screenshot({ path: `${shotDir}/485-selected.png`, fullPage: false });

// Fill the rest of the required fields with plausible values, then submit and
// capture the actual outgoing multipart form-data payload (the real network
// request the browser sends), independent of whether the server action can
// complete (it can't fully, since DB access is blocked in this sandbox) —
// this proves the CLIENT correctly transmits preferredPathway=485 and
// hasGraduateVisaPathwayIntent=yes exactly as detectSubclasses expects.
await page.fill('input[name="fullName"]', "Test User");
await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
await page.fill('input[name="currentCountry"]', "Australia");
await page.fill('textarea[name="mainGoal"]', "I recently graduated and want to stay and work in Australia");
await page.fill('input[name="passportCountry"]', "India");
await page.fill('input[name="age"]', "26");

let capturedFormData = null;
page.on("request", (req) => {
  if (req.method() === "POST" && req.postData() === null && req.postDataBuffer()) {
    // multipart form actions don't have a simple text body; handled via formData() below instead
  }
});

// Playwright can give us the actual multipart fields via request.postDataJSON()
// only for JSON bodies; for a native <form action> submit (React Server Action),
// intercept via route and read the multipart body fields directly.
await page.route("**/full-check*", async (route) => {
  const request = route.request();
  if (request.method() === "POST") {
    const buffer = request.postDataBuffer();
    if (buffer) {
      const text = buffer.toString("utf-8");
      console.log("\n--- RAW REQUEST BODY (first 4000 chars) ---");
      console.log(text.slice(0, 4000));
      console.log("--- END RAW BODY ---\n");
      const visaInterestMatch = text.match(/name="visaInterest"\r?\n\r?\n([^\r\n]*)/);
      const gradIntentMatch = text.match(/name="hasGraduateVisaPathwayIntent"\r?\n\r?\n([^\r\n]*)/);
      capturedFormData = {
        visaInterest: visaInterestMatch?.[1] ?? null,
        hasGraduateVisaPathwayIntent: gradIntentMatch?.[1] ?? null,
      };
      console.log("\nCaptured outgoing form submission fields:", capturedFormData);
    }
  }
  await route.continue();
});

// Required legal gate: submission is blocked client-side (preventDefault)
// until this is checked.
await page.check('input[type="checkbox"]');

const submitButton = page.locator('button[type="submit"]').first();
await submitButton.click({ timeout: 5000 }).catch((e) => console.log("Submit click issue (expected if DB fails):", e.message));
await page.waitForTimeout(3000);

console.log("\nFinal captured form data:", capturedFormData);
console.log("\nConsole errors (DB-related failures expected/OK, checking for anything else):");
console.log(consoleErrors.length === 0 ? "none" : consoleErrors.slice(0, 5).join("\n"));

await browser.close();
