import Image from "next/image";
import img2 from "@/public/2.png";
import img3 from "@/public/3.png";
import img4 from "@/public/4.png";

interface SampleReportMockupProps {
  locale: string;
}

export function SampleReportMockup({ locale }: SampleReportMockupProps) {
  function tx<T>(en: T, tr: T, zh: T): T {
    if (locale === "tr") return tr;
    if (locale === "zh-Hans") return zh;
    return en;
  }

  return (
    <div className="relative mx-auto w-full max-w-6xl px-2 sm:px-4">
      <div className="pointer-events-none absolute inset-x-6 top-8 -z-10 h-40 rounded-full bg-gradient-to-r from-cyan-200/40 via-sky-100/25 to-emerald-200/40 blur-3xl" />

      <p className="mb-6 text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 sm:mb-8 sm:text-xs lg:text-sm">
        PREMIUM 80-PAGE VISA ROADMAP PREVIEW
      </p>

      <div className="lg:hidden">
        <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2">
          <div className="group relative w-[85%] shrink-0 snap-center overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:z-50 sm:w-[66%]">
            <Image
              src={img2}
              alt={tx("Report preview page 1", "Rapor önizleme sayfa 1", "报告预览第 1 页")}
              priority
              className="block h-auto w-full"
            />
          </div>
          <div className="group relative w-[85%] shrink-0 snap-center overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:z-50 sm:w-[66%]">
            <Image
              src={img3}
              alt={tx("Report preview page 2", "Rapor önizleme sayfa 2", "报告预览第 2 页")}
              className="block h-auto w-full"
            />
          </div>
          <div className="group relative w-[85%] shrink-0 snap-center overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:z-50 sm:w-[66%]">
            <Image
              src={img4}
              alt={tx("Report preview page 3", "Rapor önizleme sayfa 3", "报告预览第 3 页")}
              className="block h-auto w-full"
            />
          </div>
        </div>
      </div>

      <div className="relative mx-auto hidden h-[660px] w-full max-w-5xl overflow-visible lg:block">
        <div className="group absolute left-1/2 top-10 z-20 w-[30%] min-w-[240px] -translate-x-[102%] -rotate-3 transform overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:scale-105 hover:z-50">
          <Image
            src={img2}
            alt={tx("Report preview page 1", "Rapor önizleme sayfa 1", "报告预览第 1 页")}
            priority
            className="block h-auto w-full"
          />
        </div>

        <div className="group absolute left-1/2 top-2 z-30 w-[34%] min-w-[280px] -translate-x-1/2 transform overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:scale-105 hover:z-50">
          <Image
            src={img3}
            alt={tx("Report preview page 2", "Rapor önizleme sayfa 2", "报告预览第 2 页")}
            priority
            className="block h-auto w-full"
          />
        </div>

        <div className="group absolute left-1/2 top-10 z-20 w-[30%] min-w-[240px] -translate-x-[2%] rotate-3 transform overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:scale-105 hover:z-50">
          <Image
            src={img4}
            alt={tx("Report preview page 3", "Rapor önizleme sayfa 3", "报告预览第 3 页")}
            className="block h-auto w-full"
          />
        </div>
      </div>
    </div>
  );
}
