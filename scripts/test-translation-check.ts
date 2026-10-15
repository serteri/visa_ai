/**
 * The "Draft translation" check compares numbers, amounts and dates as normalised values, so Chinese and Turkish drafts (which write them differently
 * from English) are accepted, and a draft that really changes a value is refused with the exact value named. Database-free.
 *
 *   npx tsx scripts/test-translation-check.ts
 */
import "./lib/stub-request-context";

import { ADMIN_TRANSLATION_LOCALES } from "../lib/admin-data/locales";
import { localizedText } from "../lib/admin-data/localized";
import { buildSeedPrograms } from "../lib/admin-data/seed";
import { checkValuesPreserved, draftTranslation } from "../lib/admin-data/translate";
import { compareValues, extractValues } from "../lib/admin-data/value-normalise";
import { validateProgram } from "../lib/admin-data/validate";
import { readFileSync } from "node:fs";

let failures = 0;
const t = (label: string, cond: boolean, detail = "") => {
  if (cond) console.log(`  ✅ ${label}`);
  else {
    failures++;
    console.error(`  ❌ ${label}${detail ? ` -- ${detail}` : ""}`);
  }
};

async function main() {
  const fee = "Fee page (updated 27 July 2026): AUD 325 excl. GST, AUD 357.50 incl. GST, subclass 190.";
  const zh = "费用页面（2026年7月27日更新）：不含商品及服务税325澳元，含商品及服务税357.50澳元，190子类。";
  const tr = "Ücret sayfası (27 Temmuz 2026 güncellemesi): GST hariç AUD 325, GST dahil AUD 357,50, 190 alt sınıfı.";
  console.log("accepted: the same values written the target language's way");
  t("zh-Hans: '27 July 2026' = '2026年7月27日', 'AUD 325' = '325澳元'", checkValuesPreserved(fee, zh, "zh-Hans").ok === true, JSON.stringify(checkValuesPreserved(fee, zh, "zh-Hans")));
  t("tr: '27 July 2026' = '27 Temmuz 2026', 'AUD 357.50' = 'AUD 357,50'", checkValuesPreserved(fee, tr, "tr").ok === true, JSON.stringify(checkValuesPreserved(fee, tr, "tr")));
  const alloc = "2026-27 allocations: 2,050 in total -- 1,250 for subclass 190 and 800 for subclass 491. Opened on 17 August 2026; the program closes on 30 Sep 2027.";
  t("zh-Hans: program year, thousands separators, dates", checkValuesPreserved(alloc, "2026-27年配额：共2050个，其中190子类1250个，491子类800个。2026年8月17日开放；该项目于2027年9月30日关闭。", "zh-Hans").ok);
  t("tr: thousands separators written 2.050 / 1.250", checkValuesPreserved(alloc, "2026-27 kontenjanı: toplam 2.050 -- 190 alt sınıfı için 1.250 ve 491 alt sınıfı için 800. 17 Ağustos 2026'da açıldı; program 30 Eylül 2027'de kapanır.", "tr").ok);
  t("fullwidth digits and the 万 unit are read as numbers (1万 = 10,000)", checkValuesPreserved("A fee of AUD 10,000 applies.", "须缴纳１万澳元的费用。", "zh-Hans").ok);
  t("a date written 'July 27, 2026' and '27th July 2026' are the same value", compareValues("July 27, 2026", "27th July 2026").same);
  t("a month and year: 'July 2026' = '2026年7月'", checkValuesPreserved("Updated in July 2026.", "2026年7月更新。", "zh-Hans").ok);
  t("a day and month without a year: '12 October' = '10月12日'", checkValuesPreserved("The round starts on 12 October.", "该轮次于10月12日开始。", "zh-Hans").ok);
  t("a draft that drops the currency word but keeps the figure is accepted", checkValuesPreserved("AUD 325", "325", "zh-Hans").ok);

  console.log("refused: a value that really changed, with the value named");
  const wrongDate = checkValuesPreserved(fee, zh.replace("27日", "28日"), "zh-Hans");
  t("a changed date is refused and both dates are named", !wrongDate.ok && /27 July 2026/.test(wrongDate.difference) && /2026-07-28/.test(wrongDate.difference), JSON.stringify(wrongDate));
  const wrongFee = checkValuesPreserved(fee, zh.replace("325澳元", "352澳元"), "zh-Hans");
  t("a changed fee is refused and names 325 and 352", !wrongFee.ok && /325/.test(wrongFee.difference) && /352/.test(wrongFee.difference), JSON.stringify(wrongFee));
  const dropped = checkValuesPreserved(fee, "费用页面（2026年7月27日更新）：不含商品及服务税325澳元，含商品及服务税357.50澳元。", "zh-Hans");
  t("a dropped subclass number is refused and named", !dropped.ok && /190/.test(dropped.difference), JSON.stringify(dropped));
  const added = checkValuesPreserved("Applies to subclass 190.", "适用于190和491子类。", "zh-Hans");
  t("an added number is refused and named", !added.ok && /491/.test(added.difference));
  t("a different currency is refused", !checkValuesPreserved("AUD 325", "325美元", "zh-Hans").ok);
  t("a changed month is refused (August for July)", !checkValuesPreserved("Opened on 17 July 2026.", "2026年8月17日开放。", "zh-Hans").ok);
  t("a Turkish draft with the wrong month is refused", !checkValuesPreserved("Opened on 17 July 2026.", "17 Ağustos 2026'da açıldı.", "tr").ok);
  t("the extracted values are normalised (date, amount, number)", (() => { const v = extractValues("27 July 2026 AUD 325 subclass 190"); return v.some((x) => x.kind === "date" && x.value === "2026-07-27") && v.some((x) => x.kind === "amount" && x.value === "325" && x.currency === "AUD") && v.some((x) => x.kind === "number" && x.value === "190"); })());

  console.log("draftTranslation end to end (stubbed model)");
  const okZh = await draftTranslation(fee, "zh-Hans", async () => zh);
  t("zh-Hans draft is no longer refused", okZh.ok && okZh.entry.reviewed === false && okZh.entry.origin === "machine_draft", JSON.stringify(okZh));
  const okTr = await draftTranslation(fee, "tr", async () => tr);
  t("tr draft is accepted", okTr.ok);
  const bad = await draftTranslation(fee, "zh-Hans", async () => zh.replace("357.50", "375.50"));
  t("a draft that changes a figure is refused and the message names it", !bad.ok && /357\.5/.test(bad.error) && /375\.5/.test(bad.error) && /refused/.test(bad.error), JSON.stringify(bad));

  console.log("languages are configuration");
  t("the admin translation languages are the site's locales without English", ADMIN_TRANSLATION_LOCALES.join(",") === "tr,zh-Hans");
  const editor = readFileSync("app/[locale]/(portal)/admin/crm/states/[code]/StateEditor.tsx", "utf8");
  const { activeLocales } = await import("../lib/i18n/config");
  const { enabledLanguages } = await import("../lib/languages");
  t("the site's supported locales and the enabled languages of lib/languages.ts are the same list", [...activeLocales].sort().join(",") === enabledLanguages.map((l) => l.code).sort().join(","));
  t("the editor takes its languages from the list, not from literals", /ADMIN_TRANSLATION_LOCALES\.map/.test(editor) && !/\["tr", "zh-Hans"\]/.test(editor));
  const translateSrc = readFileSync("lib/admin-data/translate.ts", "utf8");
  t("the translation check and prompt have no language literal", !/"zh-Hans"|Simplified Chinese|Turkish/.test(translateSrc));
  const p = JSON.parse(JSON.stringify(buildSeedPrograms().TAS));
  p.notes.hi = { text: "हिन्दी पाठ", reviewed: true, origin: "manual" };
  t("a translation in a language not named anywhere in the code validates and is shown once reviewed", validateProgram(p, p).ok && localizedText(p.notes, "hi") === "हिन्दी पाठ");

  console.log(failures === 0 ? "\n✅ ALL CHECKS PASSED" : `\n❌ ${failures} CHECK(S) FAILED`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
