import type { Metadata } from "next";
import { PointsCalculatorClient } from "@/app/[locale]/(main)/tools/points-calculator/points-calculator-client";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export const metadata: Metadata = {
  title: "Points Calculator Widget | LogiVisa",
  robots: "noindex, nofollow",
};

export default async function WidgetPointsCalculatorPage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-50 relative flex flex-col min-h-screen">
      <div className="flex-grow">
        <PointsCalculatorClient locale={locale} hideHeader={true} />
      </div>
      
      {/* Truva Atı Button */}
      <div className="sticky bottom-0 z-50 w-full bg-slate-50 border-t border-slate-200 p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
        <a 
          href={`https://www.logivisa.com/${locale}/full-check`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800 hover:shadow-lg active:scale-[0.98]"
        >
          <span className="animate-pulse">⚡</span> Powered by LogiVisa - Get Your Full Visa Strategy Report
        </a>
      </div>
    </div>
  );
}
