import { CheckCircle2, Sparkles } from "lucide-react";

interface SampleReportMockupProps {
  locale: string;
}

/**
 * Pure Tailwind mockup of a premium assessment report — no image assets.
 * Purely illustrative; numbers are fixed sample data, not a live calculation.
 */
export function SampleReportMockup({ locale }: SampleReportMockupProps) {
  function tx<T>(en: T, tr: T, zh: T): T {
    if (locale === "tr") return tr;
    if (locale === "zh-Hans") return zh;
    return en;
  }

  const breakdown = [
    { label: tx("Age", "Yaş", "年龄"), points: 30 },
    { label: tx("English", "İngilizce", "英语"), points: 20 },
    { label: tx("Education", "Eğitim", "学历"), points: 15 },
    { label: tx("Work Experience", "İş Deneyimi", "工作经验"), points: 10 },
    { label: tx("Partner Skills", "Partner Becerisi", "配偶技能"), points: 10 },
  ];
  const total = breakdown.reduce((sum, row) => sum + row.points, 0);
  const minimum = 65;
  const progressPercent = Math.min(100, total);

  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* Decorative glow behind the card for a premium feel */}
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-emerald-500/20 blur-2xl" />

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        {/* Top badge */}
        <div className="mb-5 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
            <Sparkles className="h-3 w-3" />
            {tx("Sample AI Report", "Örnek AI Raporu", "AI 报告示例")}
          </span>
          <span className="text-xs font-medium text-slate-400">2026</span>
        </div>

        {/* Fake user profile header */}
        <div className="mb-6 border-b border-slate-100 pb-5 dark:border-zinc-800">
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {tx("Software Engineer", "Yazılım Mühendisi", "软件工程师")}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">ANZSCO: 261313</p>
        </div>

        {/* Points breakdown */}
        <div className="mb-6 space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {tx("Points Breakdown", "Puan Dökümü", "积分明细")}
          </p>
          {breakdown.map((row) => (
            <div key={row.label} className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-300">{row.label}</span>
              <span className="font-semibold text-slate-900 dark:text-white">+{row.points} pts</span>
            </div>
          ))}
        </div>

        {/* Visual progress bar */}
        <div className="mb-6">
          <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2 text-sm font-bold">
            <span className="text-slate-900 dark:text-white">
              {tx("Total", "Toplam", "总分")}: {total}/{minimum} {tx("Points", "Puan", "分")}
            </span>
            <span className="text-emerald-600 dark:text-emerald-400">{progressPercent}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Success indicator */}
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800/50 dark:bg-emerald-900/20">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
            {tx("Eligible for 189 & 190 Visas", "189 ve 190 Vizeleri için Uygun", "符合 189 和 190 签证资格")}
          </p>
        </div>
      </div>
    </div>
  );
}
