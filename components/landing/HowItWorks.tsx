import { EyeOff, Lock, ShieldCheck } from "lucide-react";
import { ReportPreviewGallery } from "@/components/ReportPreviewGallery";

interface HowItWorksProps {
  locale: string;
}

/** "Process" ledger — the 3-step how-it-works, restyled as numbered ledger
 *  rows (see .ledger-row in the reference mockup) instead of icon cards.
 *  Copy is unchanged from the original home-content.tsx. */
export function HowItWorks({ locale }: HowItWorksProps) {
  const steps = [
    {
      title:
        locale === "tr" ? "Profil ve Mesleki Eşleştirme" : locale === "zh-Hans" ? "档案与职业匹配" : "Profile & Professional Mapping",
      description:
        locale === "tr"
          ? "Yaşınızı, İngilizce seviyenizi, eğitiminizi ve iş tanımlarınızı girin. Sistemimiz kariyer profilinizi anında resmi ANZSCO (Avustralya) veya NOC (Kanada) meslek veri tabanlarıyla eşleştirir."
          : locale === "zh-Hans"
            ? "输入您的年龄、英语水平、学历和具体工作职责。系统会立即将您的职业背景与官方 ANZSCO（澳大利亚）或 NOC（加拿大）职业数据库进行匹配。"
            : "Input your age, English proficiency, education, and specific duties. Our system instantly maps your career profile to official ANZSCO (Australia) or NOC (Canada) occupational databases.",
    },
    {
      title:
        locale === "tr"
          ? "Yasal ve Puan Uyumluluk Kontrolleri"
          : locale === "zh-Hans"
            ? "法律与分数合规审查"
            : "Legal & Point Compliance Checks",
      description:
        locale === "tr"
          ? "Yapay zeka motorumuz geçmişinizi sıkı göçmenlik mevzuatlarına göre değerlendirir. Yasal sınırları çapraz kontrol eder, puan barajlarını doğrular ve başvurulara binlerce dolar harcamadan önce karşınıza çıkabilecek tüm engelleri raporlar."
          : locale === "zh-Hans"
            ? "我们的引擎依据严格的移民法规评估您的背景，交叉核对法定门槛、验证打分限制，并在您为申请投入大量资金之前，提前标记出任何可能构成\"硬性门槛（Hard Gate）\"的障碍。"
            : "The engine evaluates your background against strict immigration frameworks. It cross-references legal thresholds, verifies point limits, and flags any 'Hard Gate' roadblocks before you spend thousands on applications.",
    },
    {
      title:
        locale === "tr" ? "Uygulanabilir Strateji Raporu" : locale === "zh-Hans" ? "可执行策略报告" : "Actionable Strategy Report",
      description:
        locale === "tr"
          ? "Kişiselleştirilmiş ve veriye dayalı puan dökümünüzü, kesin uygunluk durumunuzu ve geçme puanlarına ulaşmak için profilinizi tam olarak nasıl optimize edeceğinizi gösteren hedefli matematiksel projeksiyonları anında alın."
          : locale === "zh-Hans"
            ? "获取个性化的、基于数据的分数明细、明确的资格状态，以及有针对性的数学预测，精确展示如何优化您的档案以达到及格分数。"
            : "Get your personalized data-driven score breakdown, absolute eligibility status, and targeted mathematical projections showing exactly how to optimize your profile to reach passing scores.",
    },
  ];

  return (
    <section className="case-file bg-[var(--cf-bg)] py-20">
      <div className="section-shell">
        <p className="cf-mono mb-3 text-xs uppercase tracking-[0.14em] text-[var(--cf-accent)]">
          {locale === "tr" ? "Süreç" : locale === "zh-Hans" ? "流程" : "Process"}
        </p>
        <h2 className="cf-serif max-w-[20ch] text-3xl font-medium text-[var(--cf-fg)] sm:text-4xl">
          {locale === "tr" ? "Profilden vize yoluna, kayıt altında." : locale === "zh-Hans" ? "从档案到路径，全程留痕。" : "From profile to pathway, on the record."}
        </h2>
        <p className="mt-3 max-w-[52ch] text-[var(--cf-muted)]">
          {locale === "tr"
            ? "Profilden vize yoluna üç basit adımda."
            : locale === "zh-Hans"
              ? "三步即可从个人资料找到签证路径。"
              : "From profile to pathway in three simple steps."}
        </p>

        <div className="mt-12 border-t border-[var(--cf-line)]">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="grid grid-cols-[56px_1fr] gap-6 border-b border-[var(--cf-line)] py-8 sm:grid-cols-[90px_1.1fr_1.6fr] sm:gap-8"
            >
              <div className="cf-serif text-3xl text-[var(--cf-fg)]/25">0{index + 1}</div>
              <h3 className="cf-serif col-span-2 text-xl text-[var(--cf-fg)] sm:col-span-1">{step.title}</h3>
              <p className="col-span-2 text-sm leading-relaxed text-[var(--cf-muted)] sm:col-span-1">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16">
          <p className="cf-mono mb-6 text-center text-xs uppercase tracking-wide text-[var(--cf-muted)]">
            {locale === "tr" ? "Raporunuz Bu Şekilde Görünecek" : locale === "zh-Hans" ? "您的报告将是这样的" : "Here's What Your Report Looks Like"}
          </p>
          <ReportPreviewGallery />
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-[var(--cf-line)] pt-8 text-sm font-medium text-[var(--cf-muted)]">
          <div className="flex items-center gap-2">
            <EyeOff className="h-4 w-4" />
            {locale === "tr" ? "Anonim Değerlendirme" : locale === "zh-Hans" ? "匿名评估" : "Anonymous Assessment"}
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            {locale === "tr" ? "Üçüncü Taraflarla Veri Paylaşımı Yok" : locale === "zh-Hans" ? "不与第三方共享数据" : "No 3rd-Party Data Sharing"}
          </div>
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {locale === "tr" ? "Banka Düzeyinde Şifreleme" : locale === "zh-Hans" ? "银行级加密" : "Bank-Level Encryption"}
          </div>
        </div>
      </div>
    </section>
  );
}
