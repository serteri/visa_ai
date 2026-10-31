import Link from "next/link";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { researchText } from "@/lib/marketing/research-journey";
import { ABS_ANZSCO_URL } from "@/lib/occupations/facts";
import { HOME_AFFAIRS_SOL_URL, OCCUPATION_DATASET_DATE, type OccupationPageContent } from "@/lib/occupations/page-content";
import type { ResearchBlock } from "@/lib/occupations/research-types";
import { longDate } from "@/lib/reports/public-sources";
import { publicPath } from "@/lib/seo/urls";

const LIST_LABEL: Record<string, string> = { CSOL: "CSOL", MLTSSL: "MLTSSL", STSOL: "STSOL", ROL: "ROL", RSOL: "RSOL" };

const cta = "inline-flex min-h-12 items-center justify-center rounded-full border border-cyan-200 bg-cyan-50 px-5 py-3 text-sm font-semibold text-cyan-900 hover:bg-cyan-100 focus-visible:outline-2 focus-visible:outline-offset-2";
const link = "font-medium text-cyan-800 underline";
const sectionClass = "border-slate-200/80 bg-white/95 shadow-lg shadow-slate-900/5";
const h2 = "text-lg font-semibold leading-none tracking-tight";

function Blocks({ blocks }: { blocks: ResearchBlock[] }) {
  return (
    <>
      {blocks.map((b, i) => (
        <div key={i} className="space-y-3">
          {b.heading && <h3 className="pt-1 font-semibold text-slate-900">{b.heading}</h3>}
          {b.paragraphs?.map((p) => <p key={p}>{p}</p>)}
          {b.bullets && (
            <ul className="list-disc space-y-1 pl-5">
              {b.bullets.map((x) => <li key={x}>{x}</li>)}
            </ul>
          )}
          {b.note && <p className="text-xs text-slate-500">{b.note}</p>}
        </div>
      ))}
    </>
  );
}

/** The source-backed research sections of an occupation page that has a research module (lib/occupations/research.ts); renders nothing otherwise. */
export function OccupationResearch({ c, locale, part }: { c: OccupationPageContent; locale: string; part: "main" | "faq" }) {
  const r = c.research;
  if (!r) return null;
  const t = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  const checked = longDate(r.checked, c.locale);
  const dataset = longDate(OCCUPATION_DATASET_DATE, c.locale);
  const lists = c.details.listTokens.map((x) => LIST_LABEL[x] ?? x);
  const listText = lists.join(", ");
  const subclasses = (r.lists.subclasses ?? c.details.subclasses).join(", ");
  const src = (href: string, label: string) => (
    <a data-official-source href={href} target="_blank" rel="noopener noreferrer" className={link}>
      {label}
    </a>
  );
  const homeAffairs = t("Department of Home Affairs", "İçişleri Bakanlığı (Home Affairs)", "澳大利亚内政部");
  const finderPath = publicPath(locale, `/tools/skills-assessment?q=${c.code}`);

  if (part === "faq") {
    return (
      <>
        <Card className={sectionClass} data-occupation-faq={c.code}>
          <CardHeader>
            <h2 className={h2}>{t("Frequently asked questions", "Sık sorulan sorular", "常见问题")}</h2>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            {r.faqs.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold text-slate-900">{f.q}</h3>
                <p className="mt-1">{f.a}</p>
              </div>
            ))}
            <p className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
              <span>{t("Sources", "Kaynaklar", "来源")}:</span>
              {src(r.authority.url, r.authority.name)}
              {src(HOME_AFFAIRS_SOL_URL, homeAffairs)}
              {src(ABS_ANZSCO_URL, "ABS ANZSCO")}
              <span>
                {t("Checked", "Kontrol", "核对")} {checked}
              </span>
            </p>
          </CardContent>
        </Card>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <p className="text-sm text-slate-600">
            {t(
              "Create a structured report based on the information you enter.",
              "Girdiğiniz bilgilere dayalı yapılandırılmış bir rapor oluşturun.",
              "根据您输入的信息生成结构化报告。",
            )}
          </p>
          <Link href={publicPath(locale, "/full-check")} data-assessment-entry={`occupation_${c.code}`} className={`${cta} mt-4`}>
            {t("Start Assessment", "Değerlendirme Başlat", "开始评估")}
          </Link>
        </section>
      </>
    );
  }

  const glance: Array<[string, string]> = [
    [t("ANZSCO code", "ANZSCO kodu", "ANZSCO 代码"), c.code],
    [t("Occupation", "Meslek", "职业"), c.displayName],
    [t("Assessing authority", "Değerlendirme kurumu", "评估机构"), r.authority.name],
    ...r.glance,
    [
      t("Occupation lists (LogiVisa dataset)", "Meslek listeleri (LogiVisa veri seti)", "职业清单（LogiVisa 数据集）"),
      listText || t("None held", "Kayıt yok", "暂无记录"),
    ],
    [t("Sources checked", "Kontrol edilen kaynaklar", "来源核对日期"), `${r.authority.name} ${checked}; ${t("dataset", "veri seti", "数据集")} ${dataset}`],
  ];

  return (
    <>
      <Card className={sectionClass} data-occupation-research={c.code}>
        <CardHeader>
          <h2 className={h2}>{t("At a glance", "Bir bakışta", "概览")}</h2>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            {glance.map(([k, v]) => (
              <div key={k}>
                <dt className="font-semibold text-slate-700">{k}</dt>
                <dd className="text-slate-600">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={finderPath} data-tool-destination="skills_assessment" className={cta}>
              {t("Check skills assessment information", "Beceri değerlendirmesi bilgilerini inceleyin", "查看技能评估信息")}
            </Link>
            <Link href={publicPath(locale, "/occupations")} data-tool-destination="occupation_list" className={cta}>
              {t("Search ANZSCO occupations", "ANZSCO mesleklerini arayın", "搜索 ANZSCO 职业")}
            </Link>
            <a href="#related-visa-research" className={cta}>
              {t("View related visa research", "İlgili vize araştırmasına bakın", "查看相关签证研究")}
            </a>
            <Link href={publicPath(locale, "/tools/state-nomination")} data-tool-destination="state_nomination" className={cta}>
              {t("State nomination research", "Eyalet adaylığı araştırması", "州担保研究")}
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card className={sectionClass}>
        <CardHeader>
          <h2 className={h2}>{r.about.heading}</h2>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          {r.about.paragraphs.map((p) => <p key={p}>{p}</p>)}
          <h3 className="pt-1 font-semibold text-slate-900">{r.suitable.heading}</h3>
          <p>{r.suitable.intro}</p>
          <ul className="list-disc space-y-1 pl-5">
            {r.suitable.roles.map((x) => <li key={x}>{x}</li>)}
          </ul>
          <h3 className="pt-1 font-semibold text-slate-900">{r.notConsidered.heading}</h3>
          <p>{r.notConsidered.intro}</p>
          <ul className="list-disc space-y-1 pl-5">
            {r.notConsidered.roles.map((x) => <li key={x}>{x}</li>)}
          </ul>
          <p className="text-xs text-slate-500">
            {t("Source", "Kaynak", "来源")}: {src(r.authority.url, r.authority.name)} · {t("checked", "kontrol", "核对")} {checked}
          </p>
        </CardContent>
      </Card>

      <Card className={sectionClass}>
        <CardHeader>
          <h2 className={h2}>{r.assessment.heading}</h2>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <Blocks blocks={r.assessment.blocks} />
          <div className="flex flex-wrap gap-3">
            <Link href={finderPath} data-tool-destination="skills_assessment" className={cta}>
              {r.assessment.finderLabel}
            </Link>
            <a data-official-source href={r.authority.url} target="_blank" rel="noopener noreferrer" className={cta}>
              {r.assessment.officialLabel}
            </a>
          </div>
        </CardContent>
      </Card>

      <Card className={sectionClass}>
        <CardHeader>
          <h2 className={h2}>{r.dutiesHeading}</h2>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
            {c.duties.map((d) => <li key={d}>{d}</li>)}
          </ul>
        </CardContent>
      </Card>

      {r.afterDuties.map((sec) => (
        <Card key={sec.heading} className={sectionClass} id={sec.id}>
          <CardHeader>
            <h2 className={h2}>{sec.heading}</h2>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <Blocks blocks={sec.blocks} />
            {sec.links && (
              <ul className="flex flex-wrap gap-x-6 gap-y-2">
                {sec.links.map((l) => (
                  <li key={l.path}>
                    <Link href={publicPath(locale, l.path)} data-tool-destination={l.destination} className={link}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}

      <Card className={sectionClass}>
        <CardHeader>
          <h2 className={h2}>{t("Published occupation-list placement", "Yayımlanmış meslek listesi yeri", "已公布的职业清单归属")}</h2>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          {lists.length > 0 ? (
            <p>{r.lists.sentence(listText, subclasses)}</p>
          ) : (
            <p>{t("No list placement is held for this occupation.", "Bu meslek için kayıtlı liste yeri yok.", "暂无该职业的清单归属记录。")}</p>
          )}
          <p className="text-xs text-slate-500">
            {t("Source", "Kaynak", "来源")}: {t("LogiVisa occupation dataset", "LogiVisa meslek veri seti", "LogiVisa 职业数据集")} {dataset} · {src(HOME_AFFAIRS_SOL_URL, homeAffairs)}.{" "}
            {r.lists.sourceNote ?? t("The Home Affairs lists are authoritative and change over time.", "Yetkili kaynak İçişleri Bakanlığı listeleridir ve zamanla değişir.", "澳大利亚内政部清单为权威来源，并会随时间变化。")}
          </p>
        </CardContent>
      </Card>

      {r.visaCaveats && (
        <Card className={sectionClass} id={r.visaCaveats.id}>
          <CardHeader>
            <h2 className={h2}>{r.visaCaveats.heading}</h2>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            {r.visaCaveats.paragraphs.map((p) => <p key={p}>{p}</p>)}
            <p className="font-semibold text-slate-900">{r.visaCaveats.circumstancesIntro}</p>
            <ul className="space-y-3">
              {r.visaCaveats.circumstances.map((x) => (
                <li key={x.number} data-visa-circumstance={x.number}>
                  <span className="font-medium text-slate-900">{x.label}</span>
                  <span className="mt-1 block">{x.summary}</span>
                  <span className="mt-1 block text-xs text-slate-500">{t("Instrument wording (English)", "Düzenleme metni (İngilizce)", "文书原文（英文）")}:</span>
                  <span lang="en" className="mt-1 block space-y-1 border-l-2 border-slate-200 pl-3">
                    {x.wording.map((w) => <span key={w} className="block">{w}</span>)}
                  </span>
                </li>
              ))}
            </ul>
            <h3 className="pt-1 font-semibold text-slate-900">{r.visaCaveats.distinctionHeading}</h3>
            {r.visaCaveats.distinction.map((p) => <p key={p}>{p}</p>)}
            <p className="text-xs text-slate-500">{r.visaCaveats.note}</p>
            <p className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
              <span>{t("Sources", "Kaynaklar", "来源")}:</span>
              {r.visaCaveats.sources.map((x) => <span key={x.url}>{src(x.url, x.label)}</span>)}
              <span>
                {t("Checked", "Kontrol", "核对")} {longDate(r.visaCaveats.checked, c.locale)}
              </span>
            </p>
          </CardContent>
        </Card>
      )}

      <Card className={sectionClass} id="related-visa-research">
        <CardHeader>
          <h2 className={h2}>{t("Related visa research", "İlgili vize araştırması", "相关签证研究")}</h2>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <p>{t("Visa programs that use these published occupation lists:", "Bu yayımlanmış meslek listelerini kullanan vize programları:", "使用这些已公布职业清单的签证项目：")}</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {r.visaSubclassPaths.map((v) => (
              <li key={v}>
                <Link href={publicPath(locale, `/visas/${v}`)} className={link}>
                  {t(`Subclass ${v.split("_")[0]} information`, `Alt sınıf ${v.split("_")[0]} bilgileri`, `子类 ${v.split("_")[0]} 信息`)}
                </Link>
              </li>
            ))}
            <li>
              <Link href={publicPath(locale, "/tools/visa-comparison")} className={link}>
                {t("Compare 189 / 190 / 491", "189 / 190 / 491 karşılaştır", "对比 189 / 190 / 491")}
              </Link>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className={sectionClass}>
        <CardHeader>
          <h2 className={h2}>{t("State and territory nomination research", "Eyalet ve bölge adaylığı araştırması", "州和领地提名研究")}</h2>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <p>
            {c.stateRows.length > 0
              ? t(
                  `The state and territory entries held for ANZSCO ${c.code} are listed with their verification dates in the table further down this page. A listing is published information, not a nomination.`,
                  `ANZSCO ${c.code} için kayıtlı eyalet ve bölge girişleri, doğrulama tarihleriyle bu sayfanın aşağısındaki tabloda listelenir. Bir liste kaydı yayımlanmış bilgidir, aday gösterme değildir.`,
                  `本页下方的表格列出了 ANZSCO ${c.code} 的州和领地条目及其核实日期。清单条目是公开信息，并非提名。`,
                )
              : t(
                  `No state or territory entries are held for ANZSCO ${c.code}. Check each state's official page.`,
                  `ANZSCO ${c.code} için kayıtlı eyalet veya bölge girişi yok. Her eyaletin resmî sayfasını kontrol edin.`,
                  `暂无 ANZSCO ${c.code} 的州或领地条目。请查阅各州官方页面。`,
                )}
          </p>
          <Link href={publicPath(locale, "/tools/state-nomination")} data-tool-destination="state_nomination" className={link}>
            {t("State nomination research", "Eyalet adaylığı araştırması", "州担保研究")}
          </Link>
        </CardContent>
      </Card>
    </>
  );
}
