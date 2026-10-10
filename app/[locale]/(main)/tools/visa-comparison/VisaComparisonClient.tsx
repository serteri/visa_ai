import Link from "next/link";

import { Button } from "@/components/ui/button";

type Locale = "en" | "tr" | "zh-Hans";

type CopySet = {
  badge: string;
  title: string;
  subtitle: string;
  feature: string;
  visaType: string;
  extraPoints: string;
  sponsorRequired: string;
  workAnywhere: string;
  pathToPr: string;
  processing: string;
  fee: string;
  minPoints: string;
  competitiveScore: string;
  permanent: string;
  provisional: string;
  no: string;
  stateGovt: string;
  stateFamily: string;
  yes: string;
  regionalOnly: string;
  direct: string;
  via191: string;
  ctaTitle: string;
  ctaText: string;
  ctaButton: string;
};

const COPY: Record<Locale, CopySet> = {
  en: {
    badge: "Visa comparison",
    title: "189 vs 190 vs 491 Visa Comparison",
    subtitle: "Key published differences between subclasses 189, 190 and 491, side by side.",
    feature: "Feature",
    visaType: "Visa Type",
    extraPoints: "Extra Points",
    sponsorRequired: "Sponsor Required",
    workAnywhere: "Work Anywhere",
    pathToPr: "Path to PR",
    processing: "Processing",
    fee: "Fee",
    minPoints: "Min Points",
    competitiveScore: "Competitive Score",
    permanent: "Permanent",
    provisional: "Provisional",
    no: "No",
    stateGovt: "State govt",
    stateFamily: "State/Family",
    yes: "Yes",
    regionalOnly: "Regional only",
    direct: "Direct",
    via191: "Via 191 (3 yrs)",
    ctaTitle: "Calculate points",
    ctaText: "Enter your details in the points calculator to calculate a points total under the published points test.",
    ctaButton: "Open Points Calculator",
  },
  tr: {
    badge: "Vize karsilastirmasi",
    title: "189 vs 190 vs 491 Vize Karsilastirmasi",
    subtitle: "189, 190 ve 491 alt siniflari arasindaki yayimlanmis temel farklar, yan yana.",
    feature: "Ozellik",
    visaType: "Vize Tipi",
    extraPoints: "Ek Puan",
    sponsorRequired: "Sponsor Gerekli mi?",
    workAnywhere: "Her Yerde Calisma",
    pathToPr: "PR Yolu",
    processing: "Islem Suresi",
    fee: "Ucret",
    minPoints: "Minimum Puan",
    competitiveScore: "Rekabetci Puan",
    permanent: "Kalici",
    provisional: "Gecici",
    no: "Hayir",
    stateGovt: "Eyalet hukumeti",
    stateFamily: "Eyalet/Aile",
    yes: "Evet",
    regionalOnly: "Sadece bolgesel",
    direct: "Dogrudan",
    via191: "191 ile (3 yil)",
    ctaTitle: "Puan hesaplama",
    ctaText: "Girdiginiz bilgilerle yayimlanmis puan testine gore puan toplami hesaplamak icin puan hesaplayiciyi kullanin.",
    ctaButton: "Puan Hesaplayiciyi Ac",
  },
  "zh-Hans": {
    badge: "签证对比",
    title: "189 vs 190 vs 491 签证对比",
    subtitle: "189、190 和 491 子类之间已公布的主要差异，并排列出。",
    feature: "对比项",
    visaType: "签证类型",
    extraPoints: "额外加分",
    sponsorRequired: "是否需要担保",
    workAnywhere: "是否可全国工作",
    pathToPr: "PR路径",
    processing: "处理周期",
    fee: "费用",
    minPoints: "最低分",
    competitiveScore: "竞争分数",
    permanent: "永久",
    provisional: "临时",
    no: "否",
    stateGovt: "州政府",
    stateFamily: "州/家庭",
    yes: "是",
    regionalOnly: "仅限偏远地区",
    direct: "直接",
    via191: "通过191（3年）",
    ctaTitle: "计算分数",
    ctaText: "在算分器中输入你的信息，按已公布的积分测试计算分数总和。",
    ctaButton: "打开算分器",
  },
};

export function VisaComparisonClient({ locale }: { locale: string }) {
  const lang: Locale = locale === "tr" || locale === "zh-Hans" ? locale : "en";
  const copy = COPY[lang];

  const rows = [
    { label: copy.visaType, values: [copy.permanent, copy.permanent, copy.provisional] },
    { label: copy.extraPoints, values: ["0", "+5", "+15"] },
    { label: copy.sponsorRequired, values: [copy.no, copy.stateGovt, copy.stateFamily] },
    { label: copy.workAnywhere, values: [copy.yes, copy.yes, copy.regionalOnly] },
    { label: copy.pathToPr, values: [copy.direct, copy.direct, copy.via191] },
    { label: copy.processing, values: ["12-24 mo", "6-12 mo", "6-12 mo"] },
    { label: copy.fee, values: ["$4,640", "$4,640", "$4,640"] },
    { label: copy.minPoints, values: ["65", "65", "65"] },
    { label: copy.competitiveScore, values: ["80+", "75+", "65+"] },
  ];

  return (
    <main className="min-h-screen bg-background pb-16">
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-card p-6 shadow-sm sm:p-8">
          <span className="inline-flex rounded-full border border-[#53917E]/30 bg-[#53917E]/10 px-3 py-1 text-xs font-semibold text-[#53917E]">
            {copy.badge}
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{copy.title}</h1>
          <p className="mt-3 text-base text-slate-600">{copy.subtitle}</p>

          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">{copy.feature}</th>
                  <th className="px-4 py-3 text-left font-semibold">189</th>
                  <th className="px-4 py-3 text-left font-semibold">190</th>
                  <th className="px-4 py-3 text-left font-semibold">491</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.label}</td>
                    <td className="px-4 py-3 text-slate-600">{row.values[0]}</td>
                    <td className="px-4 py-3 text-slate-600">{row.values[1]}</td>
                    <td className="px-4 py-3 text-slate-600">{row.values[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-6xl px-4 sm:px-6">
        <div className="rounded-2xl border border-[#53917E]/20 bg-[#53917E]/10 p-6 sm:p-8">
          <h2 className="text-base font-bold text-slate-900">{copy.ctaTitle}</h2>
          <p className="mt-1 text-sm text-slate-600">{copy.ctaText}</p>
          <Button asChild className="mt-4 bg-[#53917E] hover:bg-[#53917E]/90">
            <Link href={`/${locale}/tools/points-calculator`}>{copy.ctaButton}</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
