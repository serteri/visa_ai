import Link from "next/link";
import { publicPath } from "@/lib/seo/urls";
import { researchText } from "@/lib/marketing/research-journey";

/**
 * Static, fictional mock of the structure of a LogiVisa Assessment report. Nothing here is generated, fetched or read from a
 * report: no report engine, no database, no real applicant. The figures are the published points-table values for the
 * example entries; no total is added and no visa is selected or ranked.
 */
export function SampleReportDocument({ locale, full = false }: { locale: string; full?: boolean }) {
  const t = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  const label = "cf-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--cf-accent)]";
  const row = "flex justify-between gap-4 border-b border-[var(--cf-line)] py-2 text-sm last:border-0";
  const supplied: [string, string][] = [
    [t("Age range", "Yaş aralığı", "年龄段"), "25–32"],
    [t("Occupation", "Meslek", "职业"), t("Software Engineer (ANZSCO 261313)", "Yazılım Mühendisi (ANZSCO 261313)", "软件工程师（ANZSCO 261313）")],
    [t("Qualification", "Nitelik", "学历"), t("Bachelor degree (example entry)", "Lisans derecesi (örnek girdi)", "学士学位（示例输入）")],
    [t("English evidence", "İngilizce kanıtı", "英语证明"), t("Test result entered (example)", "Test sonucu girildi (örnek)", "已填写考试成绩（示例）")],
    [t("Work history", "Çalışma geçmişi", "工作经历"), t("4 years (example entry)", "4 yıl (örnek girdi)", "4 年（示例输入）")],
    [t("Target visa", "Hedef vize", "目标签证"), t("Not sure", "Emin değilim", "不确定")],
  ];
  const published: [string, string][] = [
    [t("Points table: age 25–32", "Puan tablosu: yaş 25–32", "积分表：年龄 25–32"), t("30 points (published)", "30 puan (yayımlanmış)", "30 分（已公布）")],
    [t("Points table: bachelor degree", "Puan tablosu: lisans", "积分表：学士学位"), t("15 points (published)", "15 puan (yayımlanmış)", "15 分（已公布）")],
    [t("Occupation information", "Meslek bilgisi", "职业信息"), t("ANZSCO duties and list context", "ANZSCO görevleri ve liste bağlamı", "ANZSCO 职责与清单背景")],
    [t("Skills-assessment reference", "Beceri değerlendirmesi kaynağı", "技能评估参考"), t("Assessing authority: ACS", "Değerlendirme kurumu: ACS", "评估机构：ACS")],
    [t("Visa facts", "Vize bilgileri", "签证信息"), t("Published requirements, source and date for each visa, in a fixed order", "Her vize için yayımlanmış şartlar, kaynak ve tarih; sabit sırada", "每类签证的公开要求、来源和日期，按固定顺序排列")],
  ];
  const verify = [
    t("Qualification evidence", "Nitelik kanıtı", "学历证明"),
    t("Assessing-authority requirements", "Değerlendirme kurumu şartları", "评估机构要求"),
    t("English evidence", "İngilizce kanıtı", "英语证明"),
    t("Current state criteria", "Güncel eyalet kriterleri", "当前州/领地标准"),
  ];
  const sources: [string, string][] = [
    [t("Department of Home Affairs: visa listing", "İçişleri Bakanlığı: vize listesi", "内政部：签证列表"), "https://immi.homeaffairs.gov.au/"],
    [t("Australian Computer Society (assessing authority)", "Australian Computer Society (değerlendirme kurumu)", "澳大利亚计算机协会（评估机构）"), "https://www.acs.org.au/"],
  ];
  const next: [string, string][] = [
    [t("Occupation research", "Meslek araştırması", "职业研究"), "/occupations/261313-software-engineer"],
    [t("Skills assessment finder", "Beceri değerlendirmesi bulucu", "技能评估查询"), "/tools/skills-assessment"],
    [t("Points calculator", "Puan hesaplayıcı", "积分计算器"), "/tools/points-calculator/australia"],
    [t("Visa comparison", "Vize karşılaştırması", "签证对比"), "/tools/visa-comparison"],
  ];
  return (
    <div data-sample-report className="rounded-2xl border border-[var(--cf-line)] bg-white p-5 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--cf-line)] pb-4">
        <p className="cf-serif text-lg text-slate-900">LogiVisa {t("Assessment report", "Değerlendirme raporu", "评估报告")}</p>
        <p data-sample-label className="rounded-full bg-[var(--cf-accent-dim)] px-3 py-1 text-xs font-semibold text-[var(--cf-accent)]">{t("Example report — fictional information", "Örnek rapor — kurgusal bilgiler", "示例报告 — 虚构信息")}</p>
      </div>
      <section className="mt-5">
        <h3 className={label}>{t("Information supplied", "Sağlanan bilgiler", "已提供的信息")}</h3>
        <div className="mt-2">{supplied.map(([k, v]) => <div key={k} className={row}><span className="text-slate-500">{k}</span><span className="text-right text-slate-900">{v}</span></div>)}</div>
      </section>
      <section className="mt-6">
        <h3 className={label}>{t("Published information", "Yayımlanmış bilgiler", "公开信息")}</h3>
        <div className="mt-2">{published.map(([k, v]) => <div key={k} className={row}><span className="text-slate-500">{k}</span><span className="text-right text-slate-900">{v}</span></div>)}</div>
      </section>
      {full && (
        <>
          <section className="mt-6">
            <h3 className={label}>{t("Things to verify", "Doğrulanacak noktalar", "需要核实的事项")}</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-900">{verify.map((v) => <li key={v}>{v}</li>)}</ul>
          </section>
          <section className="mt-6">
            <h3 className={label}>{t("Official sources", "Resmî kaynaklar", "官方来源")}</h3>
            <ul className="mt-2 space-y-1 text-sm">{sources.map(([k, href]) => <li key={href}><a className="text-[var(--cf-accent)] underline underline-offset-4" href={href} target="_blank" rel="noopener noreferrer">{k}</a></li>)}</ul>
          </section>
          <section className="mt-6">
            <h3 className={label}>{t("Research next steps", "Sonraki araştırma adımları", "后续研究步骤")}</h3>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm">{next.map(([k, p]) => <li key={p}><Link className="text-[var(--cf-accent)] underline underline-offset-4" href={publicPath(locale, p)}>{k} →</Link></li>)}</ul>
          </section>
        </>
      )}
      <p className="mt-6 border-t border-[var(--cf-line)] pt-4 text-xs leading-relaxed text-slate-500">{t("Illustration of structure only. It does not show eligibility, a recommended visa or any prediction, and is not migration advice.", "Yalnızca yapı örneğidir. Uygunluk, önerilen vize veya herhangi bir tahmin göstermez ve göçmenlik danışmanlığı değildir.", "仅为结构示意，不显示资格、推荐签证或任何预测，也不构成移民建议。")}</p>
    </div>
  );
}
