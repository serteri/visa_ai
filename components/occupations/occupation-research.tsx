import Link from "next/link";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { researchText } from "@/lib/marketing/research-journey";
import { ABS_ANZSCO_URL } from "@/lib/occupations/facts";
import { HOME_AFFAIRS_SOL_URL, OCCUPATION_DATASET_DATE, type OccupationPageContent } from "@/lib/occupations/page-content";
import {
  NOT_CONSIDERED_ROLES_149311,
  RESEARCH_149311_CHECKED,
  SUITABLE_ROLES_149311,
  VETASSESS_149311_URL,
} from "@/lib/occupations/research-149311";
import { longDate } from "@/lib/reports/public-sources";
import { publicPath } from "@/lib/seo/urls";

const LIST_LABEL: Record<string, string> = { CSOL: "CSOL", MLTSSL: "MLTSSL", STSOL: "STSOL", ROL: "ROL", RSOL: "RSOL" };

const cta = "inline-flex min-h-12 items-center justify-center rounded-full border border-cyan-200 bg-cyan-50 px-5 py-3 text-sm font-semibold text-cyan-900 hover:bg-cyan-100 focus-visible:outline-2 focus-visible:outline-offset-2";
const link = "font-medium text-cyan-800 underline";
const sectionClass = "border-slate-200/80 bg-white/95 shadow-lg shadow-slate-900/5";

/** The source-backed research sections of an occupation page that has them (ANZSCO 149311); renders nothing otherwise. */
export function OccupationResearch({ c, locale, part }: { c: OccupationPageContent; locale: string; part: "main" | "faq" }) {
  const r = c.research;
  if (!r) return null;
  const t = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  const checked = longDate(RESEARCH_149311_CHECKED, c.locale);
  const dataset = longDate(OCCUPATION_DATASET_DATE, c.locale);
  const lists = c.details.listTokens.map((x) => LIST_LABEL[x] ?? x);
  const listText = lists.join(", ");
  const subclasses = c.details.subclasses.join(", ");
  const src = (href: string, label: string) => (
    <a data-official-source href={href} target="_blank" rel="noopener noreferrer" className={link}>
      {label}
    </a>
  );

  if (part === "faq") {
    return (
      <>
        <Card className={sectionClass} data-occupation-faq={c.code}>
          <CardHeader>
            <h2 className="text-lg font-semibold leading-none tracking-tight">{t("Frequently asked questions", "Sık sorulan sorular", "常见问题")}</h2>
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
              {src(VETASSESS_149311_URL, "VETASSESS")}
              {src(HOME_AFFAIRS_SOL_URL, t("Department of Home Affairs", "İçişleri Bakanlığı (Home Affairs)", "澳大利亚内政部"))}
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
          <Link href={publicPath(locale, "/full-check")} data-assessment-entry="occupation_149311" className={`${cta} mt-4`}>
            {t("Start Assessment", "Değerlendirme Başlat", "开始评估")}
          </Link>
        </section>
      </>
    );
  }

  const glance: Array<[string, string]> = [
    [t("ANZSCO code", "ANZSCO kodu", "ANZSCO 代码"), c.code],
    [t("Occupation", "Meslek", "职业"), c.displayName],
    [t("Assessing authority", "Değerlendirme kurumu", "评估机构"), "VETASSESS"],
    ["VETASSESS", t("Group C (professional occupations)", "C Grubu (mesleki meslekler)", "C 组（专业类职业）")],
    [t("Qualification level", "Nitelik düzeyi", "学历层次"), t("AQF Diploma or higher (as VETASSESS states it)", "AQF Diploma veya üzeri (VETASSESS'in belirttiği gibi)", "AQF Diploma 或更高（按 VETASSESS 所述）")],
    [
      t("Occupation lists (LogiVisa dataset)", "Meslek listeleri (LogiVisa veri seti)", "职业清单（LogiVisa 数据集）"),
      listText || t("None held", "Kayıt yok", "暂无记录"),
    ],
    [t("Sources checked", "Kontrol edilen kaynaklar", "来源核对日期"), `VETASSESS ${checked}; ${t("dataset", "veri seti", "数据集")} ${dataset}`],
  ];

  return (
    <>
      <Card className={sectionClass} data-occupation-research={c.code}>
        <CardHeader>
          <h2 className="text-lg font-semibold leading-none tracking-tight">{t("At a glance", "Bir bakışta", "概览")}</h2>
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
            <Link href={publicPath(locale, `/tools/skills-assessment?q=${c.code}`)} data-tool-destination="skills_assessment" className={cta}>
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
          <h2 className="text-lg font-semibold leading-none tracking-tight">{t("Occupation description", "Meslek tanımı", "职业描述")}</h2>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <p>
            {t(
              "A Conference and Event Organiser organises and coordinates services for conferences, events, functions, banquets and seminars.",
              "Conference and Event Organiser; konferans, etkinlik, resepsiyon, ziyafet ve seminer hizmetlerini organize eder ve koordine eder.",
              "Conference and Event Organiser 负责组织和协调会议、活动、宴会及研讨会等服务。",
            )}
          </p>
          <h3 className="pt-1 font-semibold text-slate-900">{t("Roles considered suitable under ANZSCO 149311", "ANZSCO 149311 kapsamında uygun görülen roller", "ANZSCO 149311 下被认为适用的职位")}</h3>
          <p>
            {t(
              "VETASSESS identifies these job titles as suitable under this code:",
              "VETASSESS, bu kod kapsamında şu iş unvanlarını uygun olarak belirler:",
              "VETASSESS 认定以下职位名称适用于此代码：",
            )}
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {SUITABLE_ROLES_149311.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <h3 className="pt-1 font-semibold text-slate-900">{t("Roles VETASSESS does not consider under ANZSCO 149311", "VETASSESS'in ANZSCO 149311 kapsamında değerlendirmediği roller", "VETASSESS 不在 ANZSCO 149311 下考虑的职位")}</h3>
          <p>
            {t(
              "VETASSESS does not consider the following roles under ANZSCO 149311. According to VETASSESS, these occupations are classified elsewhere in ANZSCO or are not at the required skill level.",
              "VETASSESS, aşağıdaki rolleri ANZSCO 149311 kapsamında değerlendirmez. VETASSESS'e göre bu meslekler ANZSCO'da başka yerde sınıflandırılır veya gereken beceri düzeyinde değildir.",
              "VETASSESS 不在 ANZSCO 149311 下考虑以下职位。据 VETASSESS 所述，这些职业在 ANZSCO 中归入其他分类，或未达到所要求的技能水平。",
            )}
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {NOT_CONSIDERED_ROLES_149311.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">
            {t("Source", "Kaynak", "来源")}: {src(VETASSESS_149311_URL, "VETASSESS")} · {t("checked", "kontrol", "核对")} {checked}
          </p>
        </CardContent>
      </Card>

      <Card className={sectionClass}>
        <CardHeader>
          <h2 className="text-lg font-semibold leading-none tracking-tight">{t("Skills assessment — VETASSESS", "Beceri değerlendirmesi — VETASSESS", "技能评估 — VETASSESS")}</h2>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <p>
            {t(
              "ANZSCO 149311 is assessed by VETASSESS, which places it in Group C and refers to a qualification comparable to an AQF Diploma or higher. VETASSESS assesses the level and content of the qualification and relevant employment, and the pathway can vary with how relevant they are.",
              "ANZSCO 149311, VETASSESS tarafından değerlendirilir; VETASSESS bu mesleği C Grubu'na yerleştirir ve AQF Diploma veya daha yüksek düzeyde bir niteliğe atıf yapar. VETASSESS niteliğin düzeyini ve içeriğini ve ilgili istihdamı değerlendirir; yol, bunların ilgililiğine göre değişebilir.",
              "ANZSCO 149311 由 VETASSESS 评估，VETASSESS 将其列入 C 组，并提到相当于 AQF Diploma 或更高的学历。VETASSESS 评估学历的层次与内容以及相关工作经历，具体路径可能因相关程度而异。",
            )}
          </p>
          <p>
            {t(
              "VETASSESS describes Event Management as a highly relevant field of study. Hospitality, Marketing, Media, Communications or Public Relations degrees may need sufficient Event or Conference Management content to be considered relevant.",
              "VETASSESS, Event Management'ı çok ilgili bir çalışma alanı olarak tanımlar. Otelcilik, Pazarlama, Medya, İletişim veya Halkla İlişkiler diplomaları için yeterli Etkinlik veya Konferans Yönetimi içeriği gerekebilir.",
              "VETASSESS 将 Event Management 描述为高度相关的专业领域。酒店管理、市场营销、媒体、传播或公共关系学位可能需要包含足够的活动或会议管理内容才会被视为相关。",
            )}
          </p>
          <p>
            {t(
              "This page does not make a skills assessment determination for anyone.",
              "Bu sayfa kimse için bir beceri değerlendirmesi kararı vermez.",
              "本页不为任何人作出技能评估结论。",
            )}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href={publicPath(locale, `/tools/skills-assessment?q=${c.code}`)} data-tool-destination="skills_assessment" className={cta}>
              {t("LogiVisa Skills Assessment Finder", "LogiVisa Beceri Değerlendirme Bulucu", "LogiVisa 技能评估查询")}
            </Link>
            <a data-official-source href={VETASSESS_149311_URL} target="_blank" rel="noopener noreferrer" className={cta}>
              {t("Official VETASSESS page", "Resmî VETASSESS sayfası", "VETASSESS 官方页面")}
            </a>
          </div>
        </CardContent>
      </Card>

      <Card className={sectionClass}>
        <CardHeader>
          <h2 className="text-lg font-semibold leading-none tracking-tight">{t("Typical duties (paraphrased)", "Tipik görevler (özet)", "典型职责（概述）")}</h2>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
            {c.duties.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className={sectionClass}>
        <CardHeader>
          <h2 className="text-lg font-semibold leading-none tracking-tight">{t("Published occupation-list placement", "Yayımlanmış meslek listesi yeri", "已公布的职业清单归属")}</h2>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          {lists.length > 0 ? (
            <p>
              {t(
                `ANZSCO 149311 appears on ${listText}, which are used by published visa and program contexts including subclasses ${subclasses}. Other visa requirements still apply.`,
                `ANZSCO 149311 ${listText} listelerinde yer alır; bu listeler ${subclasses} alt sınıfları dahil yayımlanmış vize ve program bağlamlarında kullanılır. Diğer vize koşulları da geçerlidir.`,
                `ANZSCO 149311 列于 ${listText}，这些清单被已公布的签证和项目使用，包括子类 ${subclasses}。其他签证要求仍然适用。`,
              )}
            </p>
          ) : (
            <p>{t("No list placement is held for this occupation.", "Bu meslek için kayıtlı liste yeri yok.", "暂无该职业的清单归属记录。")}</p>
          )}
          <p className="text-xs text-slate-500">
            {t("Source", "Kaynak", "来源")}: {t("LogiVisa occupation dataset", "LogiVisa meslek veri seti", "LogiVisa 职业数据集")} {dataset} · {src(HOME_AFFAIRS_SOL_URL, t("Department of Home Affairs", "İçişleri Bakanlığı (Home Affairs)", "澳大利亚内政部"))}.{" "}
            {t("The Home Affairs lists are authoritative and change over time.", "Yetkili kaynak İçişleri Bakanlığı listeleridir ve zamanla değişir.", "澳大利亚内政部清单为权威来源，并会随时间变化。")}
          </p>
        </CardContent>
      </Card>

      <Card className={sectionClass} id="related-visa-research">
        <CardHeader>
          <h2 className="text-lg font-semibold leading-none tracking-tight">{t("Related visa research", "İlgili vize araştırması", "相关签证研究")}</h2>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <p>{t("Visa programs that use these published occupation lists:", "Bu yayımlanmış meslek listelerini kullanan vize programları:", "使用这些已公布职业清单的签证项目：")}</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {(["190", "491", "482"] as const).map((v) => (
              <li key={v}>
                <Link href={publicPath(locale, `/visas/${v}`)} className={link}>
                  {t(`Subclass ${v} information`, `Alt sınıf ${v} bilgileri`, `子类 ${v} 信息`)}
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
          <h2 className="text-lg font-semibold leading-none tracking-tight">{t("State and territory nomination research", "Eyalet ve bölge adaylığı araştırması", "州和领地提名研究")}</h2>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <p>
            {c.stateRows.length > 0
              ? t(
                  `The state and territory entries held for ANZSCO 149311 are listed with their verification dates in the table further down this page. A listing is published information, not a nomination.`,
                  `ANZSCO 149311 için kayıtlı eyalet ve bölge girişleri, doğrulama tarihleriyle bu sayfanın aşağısındaki tabloda listelenir. Bir liste kaydı yayımlanmış bilgidir, aday gösterme değildir.`,
                  `本页下方的表格列出了 ANZSCO 149311 的州和领地条目及其核实日期。清单条目是公开信息，并非提名。`,
                )
              : t(
                  "No state or territory entries are held for ANZSCO 149311. Check each state's official page.",
                  "ANZSCO 149311 için kayıtlı eyalet veya bölge girişi yok. Her eyaletin resmî sayfasını kontrol edin.",
                  "暂无 ANZSCO 149311 的州或领地条目。请查阅各州官方页面。",
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
