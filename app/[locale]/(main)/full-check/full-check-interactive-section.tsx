"use client";

import { useState, type ReactNode } from "react";
import { FileText, ListChecks } from "lucide-react";

import { FullCheckWaitlistForm } from "./full-check-waitlist-form";
import { defaultCountry, isSupportedCountry, type SupportedCountry } from "@/lib/countries";
import { reportDisclaimer } from "@/lib/reports/report-disclaimer";
import { REPORT_SECTION_IDS, reportSectionTitle, type ReportSectionId } from "@/lib/reports/report-section-titles";

type Locale = "en" | "tr" | "zh-Hans";

/** One neutral line per section of the Visa Information Report: what it lists, nothing it concludes. */
const SECTION_NOTE: Record<ReportSectionId, [string, string, string]> = {
  summary: ["What was entered, what was not, the published areas covered and what remains to be verified", "Nelerin girildiği, nelerin girilmediği, kapsanan yayımlanmış alanlar ve doğrulanması gerekenler", "已填写与未填写的内容、涵盖的公开数据领域及有待核实的事项"],
  pointsExamples: ["Arithmetic examples using published points-table values only", "Yalnızca yayımlanmış puan tablosu değerleriyle aritmetik örnekler", "仅使用已公布积分表数值的算术示例"],
  stateDetail: ["Further published detail for each state and territory", "Her eyalet ve bölge için ek yayımlanmış ayrıntılar", "各州和领地的补充已公布细节"],
  details: ["Everything you entered, labelled supplied or not provided", "Girdiğiniz her bilgi, girildi veya girilmedi olarak etiketlenir", "您填写的全部信息，标明已提供或未提供"],
  glance: ["One row per visa: how many published requirements have information entered, and your figures next to the published figures", "Her vize için bir satır: kaç yayımlanmış gereklilik için bilgi girildiği ve rakamlarınız ile yayımlanmış rakamlar yan yana", "每种签证一行：已公布要求中有多少项已填写信息，以及您的数字与已公布数字并列"],
  points: ["The points table from your entries", "Girdilerinizden puan tablosu", "根据您的填写计算的积分表"],
  visas: ["Each visa: published requirements, charges and processing information, with sources", "Her vize: yayımlanmış gereklilikler, ücretler ve işlem bilgisi, kaynaklarıyla", "每种签证：已公布的要求、费用和处理信息及来源"],
  states: ["All eight state and territory programs as published, with the date checked", "Sekiz eyalet ve bölge programının tamamı, yayımlandığı şekliyle ve kontrol tarihiyle", "八个州和领地项目的公开信息及核对日期"],
  invitations: ["Published invitation rounds", "Yayımlanmış davet turları", "已公布的邀请轮次"],
  costs: ["Published charges by subclass, assessing-authority fees and other listed items", "Subclass'a göre yayımlanmış ücretler, değerlendirme kurumu ücretleri ve diğer kalemler", "按子类列出的已公布费用、评估机构费用及其他项目"],
  process: ["The usual steps for each pathway family", "Her yol ailesi için olağan adımlar", "各类路径的常见步骤"],
  documents: ["Documents commonly requested and general points", "Sık istenen belgeler ve genel noktalar", "常见所需文件与一般事项"],
  sources: ["Every source with its date", "Tüm kaynaklar ve tarihleri", "全部来源及日期"],
};

export function FullCheckInteractiveSection({
  locale,
  formHeader,
  initialValues,
  isFreeActive,
  remainingSpots,
  paidCheckoutEnabled = true,
  canadaReportEnabled = false,
}: {
  locale: string;
  formHeader: ReactNode;
  initialValues: {
    visaInterest?: string;
    targetCountry?: string;
    destination?: string;
    currentCountry?: string;
    occupation?: string;
    mainGoal?: string;
    source?: string;
  };
  isFreeActive: boolean;
  remainingSpots: number;
  /** Server-side paid-checkout flag (lib/readiness/paid-checkout.ts); on unless explicitly "false". */
  paidCheckoutEnabled?: boolean;
  /** Server-side Canada switch (lib/readiness/report-mode.ts); off = Canada is not offered during the beta. */
  canadaReportEnabled?: boolean;
}) {
  const loc: Locale = locale === "tr" ? "tr" : locale === "zh-Hans" ? "zh-Hans" : "en";
  const tx = (en: string, tr: string, zh: string) => (loc === "tr" ? tr : loc === "zh-Hans" ? zh : en);

  const [, setSelectedCountry] = useState<SupportedCountry>(
    isSupportedCountry(initialValues.targetCountry) && (initialValues.targetCountry !== "CA" || canadaReportEnabled) ? initialValues.targetCountry : defaultCountry
  );
  const noteIndex = loc === "tr" ? 1 : loc === "zh-Hans" ? 2 : 0;
  const [selectedVisa, setSelectedVisa] = useState(initialValues.visaInterest ?? "");
  const partnerReport = selectedVisa === "820_801";
  const shownSections = partnerReport ? (["details", "costs", "documents", "sources"] as ReportSectionId[]) : REPORT_SECTION_IDS.filter((id) => id !== "invitations" && id !== "stateDetail");

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-12 lg:grid-cols-12">
      {/* Form Container */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:col-span-7">
        {formHeader}
        <FullCheckWaitlistForm
          locale={locale}
          initialValues={initialValues}
          isFreeActive={isFreeActive}
          remainingSpots={remainingSpots}
          paidCheckoutEnabled={paidCheckoutEnabled}
          canadaReportEnabled={canadaReportEnabled}
          onCountryChange={setSelectedCountry}
          onVisaInterestChange={setSelectedVisa}
        />
      </div>

      {/* Sidebar: what the report contains */}
      <div className="space-y-6 lg:sticky lg:top-24 lg:col-span-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" data-report-contents>
          <div className="flex items-center gap-2">
            <ListChecks className="size-5 text-slate-700" aria-hidden="true" />
            <h3 className="text-lg font-bold text-slate-900">{tx("What the Visa Information Report contains", "Vize Bilgi Raporu neler içerir", "签证信息报告包含什么")}</h3>
          </div>
          <ul className="mt-5 space-y-3">
            {shownSections.map((id) => (
              <li key={id} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-sm font-medium text-slate-900">{reportSectionTitle(id, loc)}</p>
                <p className="mt-0.5 text-xs text-slate-700">{partnerReport ? ({
                  details: tx("Your relationship and sponsor entries; documents are not reviewed", "İlişki ve sponsor girdileriniz; belgeler incelenmez", "您的关系及担保人填写内容；不审阅文件"),
                  costs: tx("General published charges and labelled cost estimates", "Genel yayımlanmış ücretler ve tahmin olarak etiketlenen maliyetler", "一般公开费用及标明的估算"),
                  documents: tx("Document types you marked or did not enter, not an evidence decision", "İşaretlediğiniz veya belirtmediğiniz belge türleri; belge kararı değildir", "您勾选或未提供的文件类型，并非材料判定"),
                  sources: tx("Home Affairs reference and professional-verification boundary", "Home Affairs kaynağı ve profesyonel doğrulama sınırı", "内政部参考与专业核实界限"),
                } as Partial<Record<ReportSectionId, string>>)[id] : SECTION_NOTE[id][noteIndex]}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-slate-700" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-900">{tx("What this report is", "Bu rapor nedir", "这份报告是什么")}</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-700">
            {tx(
              partnerReport ? "The Partner report records your entries and general cost and document information. It does not decide sponsorship restrictions, relationship evidence or visa eligibility." : "Information from published sources about every visa and every state and territory program, with the source and date of each fact. The visa you select is listed first; everything else is in a fixed order. It does not assess your situation.",
              partnerReport ? "Partner raporu girdilerinizi, genel maliyet ve belge bilgilerini kaydeder. Sponsorluk kısıtlamaları, ilişki belgeleri veya vize uygunluğu hakkında karar vermez." : "Her vize ile her eyalet ve bölge programı hakkında, her bilginin kaynağı ve tarihiyle, yayımlanmış kaynaklardan bilgi. Seçtiğiniz vize ilk sırada listelenir; diğer her şey sabit bir sıradadır. Durumunuzu değerlendirmez.",
              partnerReport ? "伴侣报告记录您的填写内容，以及一般费用和文件信息。不判定担保限制、关系材料或签证资格。" : "来自公开来源的信息，涵盖每种签证及每个州和领地项目，并标明每项事实的来源和日期。您选择的签证排在最前，其余按固定顺序排列。不评估您的情况。"
            )}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-slate-700">{reportDisclaimer(loc)}</p>
        </div>
      </div>
    </div>
  );
}
