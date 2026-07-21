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

console.log("=== BEFORE selecting 186 ===");
console.log("nominationStream field present:", await page.locator("#waitlist-nomination-stream").count());
console.log("yearsInSponsoredPosition field present:", await page.locator("#waitlist-years-sponsored-position").count());

await page.screenshot({ path: `${shotDir}/186-before.png`, fullPage: false });

// Select the 186 option
await page.selectOption("#waitlist-visa-interest", "186");
await page.waitForSelector("#waitlist-nomination-stream", { timeout: 5000 });
await page.waitForSelector("#waitlist-years-sponsored-position", { timeout: 5000 });

console.log("\n=== AFTER selecting 186 ===");
console.log("nominationStream field present:", await page.locator("#waitlist-nomination-stream").count());
console.log("yearsInSponsoredPosition field present:", await page.locator("#waitlist-years-sponsored-position").count());

// Select TRT stream and fill years
await page.selectOption("#waitlist-nomination-stream", "trt");
await page.fill("#waitlist-years-sponsored-position", "3");

const nominationValue = await page.locator("#waitlist-nomination-stream").inputValue();
const yearsValue = await page.locator("#waitlist-years-sponsored-position").inputValue();
console.log("nominationStream value:", nominationValue);
console.log("yearsInSponsoredPosition value:", yearsValue);

// Confirm the actual <select name> and <input name> attributes match what actions.ts expects
const nominationName = await page.locator("#waitlist-nomination-stream").getAttribute("name");
const yearsName = await page.locator("#waitlist-years-sponsored-position").getAttribute("name");
console.log("nominationStream name attr:", nominationName);
console.log("yearsInSponsoredPosition name attr:", yearsName);

await page.screenshot({ path: `${shotDir}/186-trt-selected.png`, fullPage: false });

// Now switch to a different pathway (e.g. 189) and confirm the 186-only fields disappear
await page.selectOption("#waitlist-visa-interest", "189");
await page.waitForTimeout(300);
console.log("\n=== AFTER switching to 189 ===");
console.log("nominationStream field present:", await page.locator("#waitlist-nomination-stream").count());
console.log("yearsInSponsoredPosition field present:", await page.locator("#waitlist-years-sponsored-position").count());

// Switch back to 186 to test the "two different sponsors, aggregated" scenario
await page.selectOption("#waitlist-visa-interest", "186");
await page.waitForSelector("#waitlist-nomination-stream", { timeout: 5000 });
await page.selectOption("#waitlist-nomination-stream", "trt");
await page.fill("#waitlist-years-sponsored-position", "3");
// Describe two different sponsors in the main goal / sponsor freetext fields to exercise the aggregation scenario
const mainGoalBox = page.locator('textarea[name="mainGoal"], input[name="mainGoal"]').first();
if (await mainGoalBox.count()) {
  await mainGoalBox.fill(
    "Permanent residency via employer nomination. Worked 1.5 years for Employer A (approved sponsor) then 1.5 years for Employer B (approved sponsor), both under 482, different employers, total 3 years sponsored."
  );
}

console.log("\n=== Aggregated-sponsor scenario (2 different employers, 3 years total) ===");
console.log("nominationStream value:", await page.locator("#waitlist-nomination-stream").inputValue());
console.log("yearsInSponsoredPosition value:", await page.locator("#waitlist-years-sponsored-position").inputValue());

await page.screenshot({ path: `${shotDir}/186-aggregated-sponsors.png`, fullPage: false });

console.log("\n=== Console errors captured ===");
console.log(consoleErrors.length === 0 ? "none" : consoleErrors.join("\n"));

await browser.close();
