"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type Locale = "en" | "tr" | "zh-Hans";
type VisaKey = "189" | "190" | "491";

type QuizOption = {
  label: string;
  scores: Record<VisaKey, number>;
};

type QuizQuestion = {
  key: string;
  label: string;
  options: QuizOption[];
};

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
  quizTitle: string;
  quizSubtitle: string;
  resultTitle: string;
  resultDescription: string;
  ctaTitle: string;
  ctaText: string;
  ctaButton: string;
  toolCtaTitle: string;
  toolCtaText: string;
  toolCtaButton: string;
};

const COPY: Record<Locale, CopySet> = {
  en: {
    badge: "Visa Strategy Tool",
    title: "189 vs 190 vs 491 Visa Comparison",
    subtitle: "Compare key differences side by side and discover which pathway fits your profile best.",
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
    quizTitle: "Which one is right for me?",
    quizSubtitle: "Answer 3 quick questions to get a recommended pathway.",
    resultTitle: "Recommended pathway",
    resultDescription: "Based on your answers, this visa looks like your strongest strategic fit right now.",
    ctaTitle: "Need an exact score check?",
    ctaText: "Use the points calculator to model your real profile and compare scenarios before you apply.",
    ctaButton: "Open Points Calculator",
    toolCtaTitle: "Want a full strategy report?",
    toolCtaText: "Run a free AI full-check for pathway ranking, points improvements, and next steps.",
    toolCtaButton: "Get Free Report",
  },
  tr: {
    badge: "Vize Strateji Araci",
    title: "189 vs 190 vs 491 Vize Karsilastirmasi",
    subtitle: "Temel farklari yan yana karsilastirin ve profilinize en uygun yolu bulun.",
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
    quizTitle: "Hangisi benim icin dogru?",
    quizSubtitle: "3 kisa soruyu yanitlayin ve onerilen yolu gorun.",
    resultTitle: "Onerilen yol",
    resultDescription: "Yanitlariniza gore bu vize su anda en guclu stratejik uyum gibi gorunuyor.",
    ctaTitle: "Net puan kontrolu ister misiniz?",
    ctaText: "Basvuru oncesi senaryolari karsilastirmak icin puan hesaplayicida profilinizi modelleyin.",
    ctaButton: "Puan Hesaplayiciyi Ac",
    toolCtaTitle: "Tam strateji raporu ister misiniz?",
    toolCtaText: "Yol siralamasi, puan iyilestirme ve sonraki adimlar icin ucretsiz AI full-check alin.",
    toolCtaButton: "Ucretsiz Rapor Al",
  },
  "zh-Hans": {
    badge: "签证策略工具",
    title: "189 vs 190 vs 491 签证对比",
    subtitle: "并排比较核心差异，找出最适合你背景的路径。",
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
    quizTitle: "哪个更适合我？",
    quizSubtitle: "回答3个简短问题，获得推荐路径。",
    resultTitle: "推荐路径",
    resultDescription: "根据你的回答，这个签证目前更符合你的策略。",
    ctaTitle: "想做精确算分吗？",
    ctaText: "在算分器中模拟真实资料，对比不同申请场景后再提交。",
    ctaButton: "打开算分器",
    toolCtaTitle: "需要完整策略报告？",
    toolCtaText: "获取免费的AI完整评估，查看路径优先级、加分机会和下一步。",
    toolCtaButton: "获取免费报告",
  },
};

function getQuestions(locale: Locale): QuizQuestion[] {
  if (locale === "tr") {
    return [
      {
        key: "goal",
        label: "Onceliginiz hangisi?",
        options: [
          { label: "Tam esneklik (her yerde yasama/calisma)", scores: { "189": 3, "190": 1, "491": 0 } },
          { label: "Daha hizli davet sansi", scores: { "189": 0, "190": 2, "491": 3 } },
          { label: "Bolgede yasamayi kabul ederim", scores: { "189": 0, "190": 1, "491": 3 } },
        ],
      },
      {
        key: "points",
        label: "Yaklasik puaniniz nedir?",
        options: [
          { label: "80+", scores: { "189": 3, "190": 2, "491": 1 } },
          { label: "75-79", scores: { "189": 1, "190": 3, "491": 2 } },
          { label: "65-74", scores: { "189": 0, "190": 2, "491": 3 } },
        ],
      },
      {
        key: "sponsor",
        label: "Adaylik/sponsorluk tercihiniz?",
        options: [
          { label: "Sponsor istemiyorum", scores: { "189": 3, "190": 0, "491": 0 } },
          { label: "Eyalet adayligi uygun", scores: { "189": 1, "190": 3, "491": 2 } },
          { label: "Eyalet veya aile sponsoru fark etmez", scores: { "189": 0, "190": 1, "491": 3 } },
        ],
      },
    ];
  }

  if (locale === "zh-Hans") {
    return [
      {
        key: "goal",
        label: "你的首要目标是？",
        options: [
          { label: "最大自由度（可全国定居）", scores: { "189": 3, "190": 1, "491": 0 } },
          { label: "更快获得邀请机会", scores: { "189": 0, "190": 2, "491": 3 } },
          { label: "接受在偏远地区发展", scores: { "189": 0, "190": 1, "491": 3 } },
        ],
      },
      {
        key: "points",
        label: "你当前大约多少分？",
        options: [
          { label: "80+", scores: { "189": 3, "190": 2, "491": 1 } },
          { label: "75-79", scores: { "189": 1, "190": 3, "491": 2 } },
          { label: "65-74", scores: { "189": 0, "190": 2, "491": 3 } },
        ],
      },
      {
        key: "sponsor",
        label: "你对担保的偏好是？",
        options: [
          { label: "不需要担保", scores: { "189": 3, "190": 0, "491": 0 } },
          { label: "可接受州提名", scores: { "189": 1, "190": 3, "491": 2 } },
          { label: "州/家庭担保都可以", scores: { "189": 0, "190": 1, "491": 3 } },
        ],
      },
    ];
  }

  return [
    {
      key: "goal",
      label: "What is your top priority?",
      options: [
        { label: "Maximum flexibility (live/work anywhere)", scores: { "189": 3, "190": 1, "491": 0 } },
        { label: "Higher chance of faster invitation", scores: { "189": 0, "190": 2, "491": 3 } },
        { label: "I am comfortable with regional living", scores: { "189": 0, "190": 1, "491": 3 } },
      ],
    },
    {
      key: "points",
      label: "What is your current approximate score?",
      options: [
        { label: "80+", scores: { "189": 3, "190": 2, "491": 1 } },
        { label: "75-79", scores: { "189": 1, "190": 3, "491": 2 } },
        { label: "65-74", scores: { "189": 0, "190": 2, "491": 3 } },
      ],
    },
    {
      key: "sponsor",
      label: "What sponsorship setup do you prefer?",
      options: [
        { label: "No sponsor", scores: { "189": 3, "190": 0, "491": 0 } },
        { label: "State nomination is fine", scores: { "189": 1, "190": 3, "491": 2 } },
        { label: "State or family sponsor is fine", scores: { "189": 0, "190": 1, "491": 3 } },
      ],
    },
  ];
}

function recommend(answers: number[], questions: QuizQuestion[]): VisaKey | null {
  if (answers.some((a) => a < 0)) return null;

  const totals: Record<VisaKey, number> = { "189": 0, "190": 0, "491": 0 };

  answers.forEach((idx, qIdx) => {
    const option = questions[qIdx].options[idx];
    totals["189"] += option.scores["189"];
    totals["190"] += option.scores["190"];
    totals["491"] += option.scores["491"];
  });

  if (totals["491"] >= totals["190"] && totals["491"] >= totals["189"]) return "491";
  if (totals["190"] >= totals["189"]) return "190";
  return "189";
}

export function VisaComparisonClient({ locale }: { locale: string }) {
  const lang: Locale = locale === "tr" || locale === "zh-Hans" ? locale : "en";
  const copy = COPY[lang];
  const questions = useMemo(() => getQuestions(lang), [lang]);
  const [answers, setAnswers] = useState<number[]>([-1, -1, -1]);

  const result = useMemo(() => recommend(answers, questions), [answers, questions]);

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
    <main className="min-h-screen bg-slate-50 pt-28 pb-16">
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            {copy.badge}
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{copy.title}</h1>
          <p className="mt-3 text-base text-slate-600">{copy.subtitle}</p>

          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-800">
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
                    <td className="px-4 py-3 font-medium text-slate-800">{row.label}</td>
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
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold text-slate-900">{copy.quizTitle}</h2>
          <p className="mt-2 text-sm text-slate-600">{copy.quizSubtitle}</p>

          <div className="mt-6 space-y-6">
            {questions.map((q, qIdx) => (
              <div key={q.key}>
                <p className="mb-3 text-sm font-semibold text-slate-800">{qIdx + 1}. {q.label}</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {q.options.map((opt, oIdx) => {
                    const selected = answers[qIdx] === oIdx;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => {
                          setAnswers((prev) => {
                            const next = [...prev];
                            next[qIdx] = oIdx;
                            return next;
                          });
                        }}
                        className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                          selected
                            ? "border-indigo-500 bg-indigo-50 text-indigo-800"
                            : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {result ? (
            <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{copy.resultTitle}</p>
              <p className="mt-1 text-2xl font-bold text-emerald-900">Subclass {result}</p>
              <p className="mt-2 text-sm text-emerald-800">{copy.resultDescription}</p>
            </div>
          ) : null}

          <div className="mt-8 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
            <h3 className="text-base font-bold text-slate-900">{copy.ctaTitle}</h3>
            <p className="mt-1 text-sm text-slate-600">{copy.ctaText}</p>
            <Button asChild className="mt-4 bg-indigo-600 hover:bg-indigo-700">
              <Link href={`/${locale}/tools/points-calculator`}>{copy.ctaButton}</Link>
            </Button>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-bold text-slate-900">{copy.toolCtaTitle}</h3>
            <p className="mt-1 text-sm text-slate-600">{copy.toolCtaText}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href={`/${locale}/full-check`}>{copy.toolCtaButton}</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
