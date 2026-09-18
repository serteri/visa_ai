import type { EmployerSponsorshipSignal, Locale } from "../types";

export type EmployerSponsorshipContent = {
  title: string;
  /** Only rendered when the section is relevant enough to show (signal.applies, or country-neutral always-show policy -- caller decides). */
  intro: string;
  rows: Array<{ label: string; value: string; met?: boolean }>;
  /** Localized note shown below the rows -- e.g. the CA "not modeled yet" disclosure, or an AU CSIT-not-provided prompt. */
  note?: string;
};

/**
 * Employer Sponsorship module content -- see EmployerSponsorshipSignal's
 * doc comment in types.ts for the design rationale (AU/CA are parallel
 * branches of one shared shape, not an AU default with a CA exception).
 *
 * This function is written as an exhaustive switch on signal.country
 * specifically so a third country added later, or a typo, is a TypeScript
 * error here rather than a silent fallback to AU content -- the exact
 * failure mode that caused the AU-text-leaking-into-CA-reports bugs fixed
 * in prior sessions.
 */
export function getEmployerSponsorshipContent(locale: Locale, signal: EmployerSponsorshipSignal): EmployerSponsorshipContent {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  switch (signal.country) {
    case "AU":
      return buildAuContent(isTr, isZh, signal.au);
    case "CA":
      return buildCaContent(isTr, isZh, signal.ca);
    default: {
      // Exhaustiveness guard -- if EmployerSponsorshipSignal ever gains a
      // third country branch, this becomes a compile error instead of a
      // silent AU/CA fallback.
      const _exhaustive: never = signal;
      throw new Error(`getEmployerSponsorshipContent: unhandled country in signal ${JSON.stringify(_exhaustive)}`);
    }
  }
}

function buildAuContent(isTr: boolean, isZh: boolean, au: Extract<EmployerSponsorshipSignal, { country: "AU" }>["au"]): EmployerSponsorshipContent {
  const title = isTr ? "İşveren Sponsorluğu (482 → 186)" : isZh ? "雇主担保 (482 → 186)" : "Employer Sponsorship (482 → 186)";
  const intro = isTr
    ? "Subclass 482 (Skills in Demand vizesi), onaylı bir işveren sponsorluğu, Core Skills Occupation List'te (CSOL) yer alan bir meslek ve asgari Core Skills Income Threshold (CSIT) maaş seviyesini gerektirir. 482'de belirli bir süre çalıştıktan sonra, puan testine tabi olmayan Subclass 186 (Employer Nomination Scheme) ile kalıcı oturuma geçiş mümkündür."
    : isZh
      ? "482 类（紧缺技能签证）需要获批的担保雇主、职业列入核心技能职业清单（CSOL），以及达到核心技能收入门槛（CSIT）的最低薪资。在 482 签证下工作一段时间后，可通过不受积分测试限制的 186 类（雇主提名计划）转为永久居留。"
      : "Subclass 482 (Skills in Demand visa) requires an approved sponsoring employer, an occupation on the Core Skills Occupation List (CSOL), and salary at or above the Core Skills Income Threshold (CSIT). After time on a 482 visa, permanent residency is possible via Subclass 186 (Employer Nomination Scheme), which is not points-tested.";

  const rows: EmployerSponsorshipContent["rows"] = [];
  const csitLabel = `AUD $${au.csitThresholdAud.toLocaleString("en-AU")}`;

  if (au.salaryProvided && au.annualSalaryAud !== undefined) {
    rows.push({
      label: isTr ? "Maaş Durumu (CSIT)" : isZh ? "薪资状况 (CSIT)" : "Salary Status (CSIT)",
      value: au.meetsCsit
        ? (isTr
            ? `✅ AUD $${au.annualSalaryAud.toLocaleString("en-AU")} — ${csitLabel} eşiğini karşılıyor.`
            : isZh
              ? `✅ AUD $${au.annualSalaryAud.toLocaleString("en-AU")} — 已达到 ${csitLabel} 门槛。`
              : `✅ AUD $${au.annualSalaryAud.toLocaleString("en-AU")} — meets the ${csitLabel} threshold.`)
        : (isTr
            ? `❌ AUD $${au.annualSalaryAud.toLocaleString("en-AU")} — ${csitLabel} eşiğinin altında.`
            : isZh
              ? `❌ AUD $${au.annualSalaryAud.toLocaleString("en-AU")} — 低于 ${csitLabel} 门槛。`
              : `❌ AUD $${au.annualSalaryAud.toLocaleString("en-AU")} — below the ${csitLabel} threshold.`),
      met: au.meetsCsit,
    });
  } else {
    rows.push({
      label: isTr ? "Maaş Durumu (CSIT)" : isZh ? "薪资状况 (CSIT)" : "Salary Status (CSIT)",
      value: isTr
        ? `⚠️ Maaş bilgisi girilmedi — asgari eşik: ${csitLabel}.`
        : isZh
          ? `⚠️ 未提供薪资信息——最低门槛：${csitLabel}。`
          : `⚠️ Salary not provided — minimum threshold: ${csitLabel}.`,
    });
  }

  const note = isTr
    ? "Sponsorluk uygunluğu ayrıca işvereninizin onaylı sponsor statüsüne ve mesleğinizin CSOL'de yer almasına bağlıdır — bu rapor bu iki koşulu doğrulamaz."
    : isZh
      ? "担保资格还取决于您的雇主是否具有获批担保方身份，以及您的职业是否列入 CSOL——本报告不核实这两项条件。"
      : "Sponsorship eligibility also depends on your employer holding approved sponsor status and your occupation being on the CSOL — this report does not verify either of those.";

  return { title, intro, rows, note };
}

function buildCaContent(isTr: boolean, isZh: boolean, ca: Extract<EmployerSponsorshipSignal, { country: "CA" }>["ca"]): EmployerSponsorshipContent {
  const title = isTr ? "İşveren Bağlantılı Yollar" : isZh ? "雇主相关途径" : "Employer-Linked Pathways";
  const intro = isTr
    ? "Kanada'da işveren bağlantılı yollar arasında LMIA (Labour Market Impact Assessment) destekli çalışma izinleri ve eyalet düzeyinde işveren odaklı PNP akımları (ör. Ontario Employer Job Offer, BC PNP Skilled Worker) bulunur."
    : isZh
      ? "加拿大的雇主相关途径包括基于 LMIA（劳动力市场影响评估）的工作许可，以及省级雇主导向的 PNP 通道（例如安大略省雇主聘用通道、BC 省技术工人通道）。"
      : "Employer-linked pathways in Canada include LMIA (Labour Market Impact Assessment)-backed work permits and province-level employer-driven PNP streams (e.g. Ontario's Employer Job Offer stream, BC PNP Skilled Worker).";

  const rows: EmployerSponsorshipContent["rows"] = [
    {
      label: isTr ? "Değerlendirme Durumu" : isZh ? "评估状态" : "Assessment Status",
      value: isTr
        ? "⚠️ Bu bölüm için gerekli bilgiler (iş teklifi durumu, LMIA durumu) henüz toplanmamaktadır."
        : isZh
          ? "⚠️ 本部分所需信息（工作邀请状态、LMIA 状态）目前尚未收集。"
          : "⚠️ The information required for this section (job offer status, LMIA status) is not currently collected.",
    },
    {
      label: isTr ? "CRS İş Teklifi Bonusu" : isZh ? "CRS 工作邀请加分" : "CRS Job Offer Bonus",
      // Confirmed fact (see EmployerSponsorshipSignal's doc comment): IRCC
      // removed arranged-employment CRS bonus points effective 2025-03-25.
      // Not modeled as current or pending -- stated plainly, no numbers.
      value: ca.arrangedEmploymentCrsPointsRemoved
        ? (isTr
            ? "IRCC, 25 Mart 2025 tarihinden itibaren düzenlenmiş istihdam (iş teklifi) için CRS bonus puanlarını kaldırmıştır. Şu anda bir iş teklifi CRS puanınıza otomatik bonus eklemez."
            : isZh
              ? "IRCC 自 2025 年 3 月 25 日起取消了安排就业（工作邀请）的 CRS 加分。目前，工作邀请不会自动为您的 CRS 分数增加加分。"
              : "IRCC removed CRS bonus points for arranged employment (job offers) effective March 25, 2025. A job offer does not currently add any automatic bonus to your CRS score.")
        : "",
    },
  ];

  const note = isTr
    ? "İşveren bağlantılı yollar için tam bir uygunluk değerlendirmesi, bu raporun şu anki kapsamına dahil değildir. Bu bölüm gelecekte iş teklifi ve LMIA durumu bilgisi toplandığında genişletilecektir."
    : isZh
      ? "雇主相关途径的完整资格评估目前不在本报告范围内。待收集工作邀请和 LMIA 状态信息后，本部分将进一步扩展。"
      : "A full eligibility assessment for employer-linked pathways is not yet within this report's scope. This section will be expanded once job offer and LMIA status information is collected.";

  return { title, intro, rows, note };
}
