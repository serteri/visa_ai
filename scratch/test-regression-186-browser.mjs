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

await page.selectOption("#waitlist-visa-interest", "186");
await page.waitForSelector("#waitlist-nomination-stream", { timeout: 5000 });
await page.waitForSelector("#waitlist-years-sponsored-position", { timeout: 5000 });
console.log("186 conditional fields still present after this turn's changes: OK");

// Confirm 500/482/189/190/491 dropdown options are still all intact
const optionValues = await page.locator("#waitlist-visa-interest option").evaluateAll((opts) =>
  opts.map((o) => o.getAttribute("value"))
);
console.log("All dropdown option values:", optionValues);

console.log("\nConsole errors:", consoleErrors.length === 0 ? "none" : consoleErrors.slice(0, 5).join("\n"));

await browser.close();
