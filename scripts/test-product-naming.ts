/**
 * The product is the "Visa Information Report" (en) / "Vize Bilgi Raporu" (tr) / "签证信息报告" (zh-Hans), and nothing on the customer side still
 * calls it a Readiness Assessment / Premium report / AI strategy, or a free beta.
 *
 *   1. source scan: no old product name and no beta label in customer-facing code, copy and locale files (comments, the chat code, internal
 *      admin emails and the article data are out of scope);
 *   2. where it shows: the Stripe line item, the PDF cover title, the result page title, the unlock gate, the quick-check email and the
 *      report-ready email carry the name in every language;
 *   3. the one disclaimer text exists in every language.
 *
 *   npx tsx scripts/test-product-naming.ts
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { getCheckoutLineItem } from "../lib/stripe/line-items";
import { reportDisclaimer } from "../lib/reports/report-disclaimer";
import { reportReadyEmailCopy } from "../lib/services/report-email-copy";
import { buildReportHeader } from "../lib/reports/report-header";

let failures = 0;
const t = (label: string, cond: boolean, detail = "") => {
  if (cond) console.log(`  ✅ ${label}`);
  else {
    failures++;
    console.error(`  ❌ ${label}${detail ? ` -- ${detail}` : ""}`);
  }
};
const root = process.cwd();
const NAME = { en: "Visa Information Report", tr: "Vize Bilgi Raporu", "zh-Hans": "签证信息报告" } as const;

const OLD_NAMES = /Readiness Assessment|Premium Readiness|AI-Powered Migration Strategy|Full Visa Readiness Report|Visa Readiness Report|Premium AI Readiness|AI Readiness Report|Tam Vize Hazırlık Raporu|Premium AI Hazırlık|完整签证准备度报告|签证准备度报告|Premium AI Strateji|Premium AI 策略|Premium Report is Ready/;
const BETA = /Free beta|free beta|Ücretsiz beta|免费测试版/;
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "scripts", "temp_tests", "docs", "chat", "ai"]);
const SKIP_FILES = new Set(["lib/email/full-check-admin.ts", "src/data/guides.json", "components/chat-widget.tsx"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|json)$/.test(name)) out.push(p);
  }
  return out;
}

console.log("1. source scan");
const offenders: string[] = [];
for (const top of ["app", "components", "lib", "emails", "public/locales"]) {
  for (const f of walk(path.join(root, top))) {
    const rel = path.relative(root, f);
    if (SKIP_FILES.has(rel) || /assistant|\/chat\//.test(rel)) continue;
    const lines = readFileSync(f, "utf8").split("\n");
    lines.forEach((line, i) => {
      const code = line.trim();
      if (code.startsWith("//") || code.startsWith("*") || code.startsWith("/*")) return; // comments
      if (OLD_NAMES.test(line) || BETA.test(line)) offenders.push(`${rel}:${i + 1}: ${code.slice(0, 90)}`);
    });
  }
}
t("no old product name and no beta label in customer-facing code, copy or locale files", offenders.length === 0, `${offenders.length}: ${offenders.slice(0, 6).join(" || ")}`);

console.log("\n2. where the name shows");
t("the Stripe line item", getCheckoutLineItem("premium").price_data.product_data.name === NAME.en);
for (const L of ["en", "tr", "zh-Hans"] as const) {
  t(`[${L}] the page header title, both report-ready emails`, buildReportHeader({ report: {}, locale: L }).title.includes(NAME[L]) && reportReadyEmailCopy(L, false).subject.includes(NAME[L]) && reportReadyEmailCopy(L, true).subject.includes(NAME[L]));
  t(`[${L}] the one disclaimer exists and says LogiVisa is not a registered migration agent`, /not a registered migration agent|kayıtlı bir göçmenlik danışmanı.*değildir|不是注册移民代理/.test(reportDisclaimer(L)));
}
const view = readFileSync(path.join(root, "lib/reports/report-view.ts"), "utf8");
t("the PDF cover title (report view) is the Visa Information Report in all three languages", /"LogiVisa Visa Information Report", "LogiVisa Vize Bilgi Raporu", "LogiVisa 签证信息报告"/.test(view));
const resultView = readFileSync(path.join(root, "lib/reports/report-header.ts"), "utf8");
t("the result page title and ready line", /Your Visa Information Report is ready/.test(resultView) && /Vize Bilgi Raporunuz hazır/.test(resultView) && /您的签证信息报告已生成/.test(resultView));
const gate = readFileSync(path.join(root, "components/premium-feature-gate.tsx"), "utf8");
t("the unlock gate", /const productName = isTr \? "Vize Bilgi Raporu" : isZh \? "签证信息报告" : "Visa Information Report"/.test(gate));
const quick = readFileSync(path.join(root, "lib/email/quick-check-emails.ts"), "utf8");
t("the quick-check email subject, in all three languages", /Vize Bilgi Raporunuz hazır/.test(quick) && /您的签证信息报告已生成/.test(quick) && /Your Visa Information Report is ready/.test(quick));

console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
process.exitCode = failures === 0 ? 0 : 1;
