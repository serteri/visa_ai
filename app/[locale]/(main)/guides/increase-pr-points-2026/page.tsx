import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Info, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

const tx = (locale: string, zh: string, tr: string, en: string) =>
  locale === "tr" ? tr : locale === "zh-Hans" ? zh : en;

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = new URL(BASE_URL);

  const meta = {
    en: {
      title: "How to Increase Your Australian PR Points in 2026 | LogiVisa Guide",
      description:
        "A practical, data-backed playbook for raising your Australian skilled migration points score in 2026 — PTE vs IELTS, partner points, NAATI CCL, regional visas, and ANZSCO demand checks.",
    },
    tr: {
      title: "2026'da Avustralya PR Puanınızı Nasıl Artırırsınız | LogiVisa Rehberi",
      description:
        "2026 için pratik, veri destekli bir yol haritası: PTE mi IELTS mi, eş puanları, NAATI CCL, bölgesel vizeler ve ANZSCO talep kontrolü ile puanınızı nasıl yükseltirsiniz.",
    },
    "zh-Hans": {
      title: "2026年如何提高您的澳大利亚PR积分 | LogiVisa 指南",
      description:
        "一份实用的、基于数据的2026年技术移民加分攻略：PTE与雅思的取舍、配偶加分、NAATI CCL、偏远地区签证与ANZSCO需求核查。",
    },
  }[locale as "en" | "tr" | "zh-Hans"] || {
    title: "How to Increase Your Australian PR Points in 2026 | LogiVisa Guide",
    description:
      "A practical, data-backed playbook for raising your Australian skilled migration points score in 2026.",
  };

  return {
    metadataBase: siteUrl,
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}/guides/increase-pr-points-2026`,
      languages: {
        en: `/en/guides/increase-pr-points-2026`,
        tr: `/tr/guides/increase-pr-points-2026`,
        "zh-Hans": `/zh-Hans/guides/increase-pr-points-2026`,
      },
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      type: "article",
      url: `/${locale}/guides/increase-pr-points-2026`,
      publishedTime: "2026-08-28T00:00:00.000Z",
      images: [{ url: "/og/default-og.png", width: 1200, height: 630 }],
    },
  };
}

function Callout({ locale, children }: { locale: string; children: React.ReactNode }) {
  return (
    <aside className="my-6 rounded-2xl border border-[var(--color-electric-iris)]/30 bg-[var(--color-electric-iris)]/10 p-5 not-prose">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--color-electric-iris)]">
        <Info className="h-4 w-4 shrink-0" />
        {tx(locale, "要点提示", "Önemli Not", "Key Insight")}
      </p>
      <div className="text-sm leading-relaxed text-gray-300">{children}</div>
    </aside>
  );
}

function MidCta({ locale }: { locale: string }) {
  return (
    <div className="not-prose my-12 flex flex-col items-center gap-4 rounded-3xl border border-[var(--color-saffron-spark)]/30 bg-gradient-to-br from-[var(--color-electric-iris)]/15 via-black to-black p-8 text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-saffron-spark)]/40 bg-[var(--color-saffron-spark)]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[var(--color-saffron-spark)]">
        <Sparkles className="h-3.5 w-3.5" />
        {tx(locale, "免费评估", "Ücretsiz Değerlendirme", "Free Assessment")}
      </span>
      <p className="max-w-xl text-lg font-semibold text-white">
        {tx(
          locale,
          "别再猜测您的真实分数了 — 2分钟内获取精确评估。",
          "Puanınızı tahmin etmeyi bırakın — 2 dakikada net sonucu görün.",
          "Stop guessing your real score — see the exact number in 2 minutes."
        )}
      </p>
      <Button
        asChild
        size="lg"
        className="h-12 rounded-2xl bg-[var(--color-electric-iris)] px-8 font-bold text-white hover:opacity-90"
      >
        <Link href={`/${locale}/full-check`}>
          {tx(locale, "免费生成我的分数报告", "Ücretsiz Puan Raporumu Al", "Get My Free Points Report")}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

export default async function IncreasePrPoints2026GuidePage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <main className="ambient-bg relative flex-1 overflow-hidden py-12 sm:py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(128,82,255,0.16),transparent_55%)]" />

      <article className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link
          href={`/${locale}/guides`}
          className="inline-flex items-center gap-2 text-sm font-bold text-[var(--color-electric-iris)] transition-colors hover:opacity-80"
        >
          <ArrowLeft className="h-4 w-4" />
          {tx(locale, "返回指南", "Rehberlere dön", "Back to guides")}
        </Link>

        <header className="mt-10 border-b border-white/10 pb-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-[var(--color-electric-iris)]/30 bg-[var(--color-electric-iris)]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[var(--color-electric-iris)]">
              {tx(locale, "打分策略", "Puan Stratejisi", "Points Strategy")}
            </span>
            <time className="text-sm font-medium text-[var(--color-ash-gray)]" dateTime="2026-08-28">
              August 28, 2026
            </time>
            <span className="text-sm font-medium text-[var(--color-ash-gray)]">
              7 {tx(locale, "分钟阅读", "dk okuma", "min read")}
            </span>
          </div>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
            {tx(
              locale,
              "2026年如何提高您的澳大利亚PR积分",
              "2026'da Avustralya PR Puanınızı Nasıl Artırırsınız",
              "How to Increase Your Australian PR Points in 2026"
            )}
          </h1>
          <p className="mt-6 text-xl leading-8 text-gray-300">
            {tx(
              locale,
              "65分只是入场券，不是邀请函。以下是五个真正能把您的分数从边缘拉到安全区的杠杆——附带真实场景计算。",
              "65 puan yalnızca havuza giriş biletidir, davet garantisi değil. Puanınızı sınırdan güvenli bölgeye taşıyan beş gerçek kaldıraç — gerçekçi senaryolarla birlikte.",
              "65 points gets you into the database, not an invitation. Here are five real levers that move your score from the danger zone into the safe zone — with worked examples."
            )}
          </p>
        </header>

        <div className="prose prose-invert mt-10 max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-p:leading-8 prose-p:text-gray-300 prose-strong:text-white prose-a:text-[var(--color-electric-iris)]">
          <section>
            <h2>
              {tx(
                locale,
                "1. 掌握英语考试：PTE还是雅思？",
                "1. İngilizce Sınavında Ustalaşın: PTE mi, IELTS mi?",
                "1. Master the English Test (PTE over IELTS)"
              )}
            </h2>
            <p>
              {tx(
                locale,
                "语言分数是提升最快、最可控的加分项——因为它不依赖雇主、不依赖州政府，完全取决于您的备考。IELTS长期以来是默认选择，但过去几年里，越来越多的申请人转向PTE学术类考试，原因很简单：PTE是纯AI评分，没有考官主观判断的波动，题型也更适合系统性刷题提分，尤其是口语和写作部分。",
                "Dil puanı, artırılması en hızlı ve en kontrol edilebilir puan kalemidir — çünkü işverene veya eyalete değil, tamamen sizin hazırlığınıza bağlıdır. IELTS uzun süredir varsayılan tercih oldu, ancak son yıllarda başvuru sahiplerinin büyük bir kısmı PTE Academic'e yöneliyor. Sebebi basit: PTE tamamen yapay zeka tarafından değerlendirilir, sınav görevlisinin subjektif yorumuna bağlı dalgalanma yoktur ve soru formatı, özellikle konuşma ve yazma bölümlerinde, sistematik pratikle puan yükseltmeye çok daha uygundur.",
                "Language is the fastest, most controllable points lever — it depends on nobody but you. IELTS has long been the default, but a growing share of applicants are switching to PTE Academic for one reason: it's scored entirely by AI, removing the subjective variance of a human examiner, and its question formats respond far better to systematic, drillable practice, especially in speaking and writing."
              )}
            </p>
            <p>
              {tx(
                locale,
                "一个真实案例：Ahmet最初考IELTS，四科均分卡在6.5，只拿到了\"合格\"英语的0分。转考PTE后，通过针对性训练口语的重复句型和写作模板，他在两次尝试内拿到了四项全部79+，直接锁定20分的\"优秀\"英语加分——这是单一最大的可控分数来源。",
                "Gerçek bir örnek: Ahmet başlangıçta IELTS'e girdi ve dört bölümde de 6.5 ortalamada takılı kaldı — bu da 'yeterli' İngilizce için tam olarak sıfır puan demekti. PTE'ye geçtikten ve konuşma bölümünde tekrarlanan cümle kalıplarını, yazmada ise şablonları hedefli şekilde çalıştıktan sonra, iki denemede dört bölümün de 79 üzerine çıkmasını sağladı — tek başına en büyük kontrol edilebilir puan kaynağını kilitledi: 20 puan.",
                "A real example: Ahmet initially sat IELTS and got stuck at a 6.5 average across all four bands — worth exactly zero points for \"competent\" English. After switching to PTE and drilling repeat-sentence patterns for speaking plus structured templates for writing, he cleared 79+ across all four bands within two attempts, locking in the single largest controllable points source: 20 points."
              )}
            </p>
            <Callout locale={locale}>
              {tx(
                locale,
                "\"合格\"英语（雅思6分/PTE 50分档）加0分。\"优秀\"英语（雅思8分/PTE 79分档）加20分。这20分的差距，相当于四年额外海外工作经验才能积累的分数。",
                "'Yeterli' İngilizce (IELTS 6 / PTE 50 bandı) 0 puan getirir. 'Üstün' İngilizce (IELTS 8 / PTE 79 bandı) 20 puan getirir. Bu 20 puanlık fark, dört yıllık ek yurt dışı iş deneyimiyle eşdeğerdir.",
                "\"Competent\" English (IELTS 6 / PTE 50 band) is worth zero points. \"Superior\" English (IELTS 8 / PTE 79 band) is worth 20 points. That 20-point gap is equivalent to four extra years of overseas work experience."
              )}
            </Callout>
          </section>

          <section>
            <h2>
              {tx(locale, "2. 策略性地争取配偶加分", "2. Eş Puanlarını Stratejik Olarak Kullanın", "2. Claim Partner Points Strategically")}
            </h2>
            <p>
              {tx(
                locale,
                "如果您已婚或有事实伴侣，配偶的资质本身就是一个被严重低估的分数来源。如果配偶年龄在45岁以下、职业在相关技术清单上、通过技能评估并达到功能性英语水平，可以额外获得5分；如果配偶自己也达到\"优秀\"英语并通过评估，则可获得完整的10分配偶加分。很多申请人完全忽略了这一项，或者以为配偶职业不匹配就自动放弃——但配偶的加分标准比主申请人宽松得多，配偶不需要职业与主申请人一致，只需要出现在相关技术清单上即可。",
                "Evliyseniz veya de facto bir ilişkiniz varsa, eşinizin nitelikleri ciddi şekilde göz ardı edilen bir puan kaynağıdır. Eşiniz 45 yaşın altındaysa, mesleği ilgili listede yer alıyorsa, mesleki değerlendirmeden geçmişse ve işlevsel İngilizce seviyesindeyse, 5 ek puan kazanabilirsiniz; eşiniz de 'üstün' İngilizce seviyesine ulaşıp değerlendirmeyi geçerse, tam 10 puanlık eş puanı elde edersiniz. Birçok başvuru sahibi bu kalemi tamamen atlıyor ya da eşinin mesleği uyuşmuyor diye otomatik olarak vazgeçiyor — oysa eş puanı kriterleri ana başvurana göre çok daha esnektir; eşin mesleğinin ana başvuranla aynı olması gerekmez, sadece ilgili listede yer alması yeterlidir.",
                "If you're married or in a de facto relationship, your partner's qualifications are a badly underused points source. A partner under 45, with an occupation on a relevant skilled list, a positive skills assessment, and functional English earns you 5 extra points; if your partner also clears \"superior\" English and a positive assessment, you get the full 10-point partner allocation. Many applicants skip this entirely or assume their partner's occupation \"doesn't match\" and give up — but partner-points criteria are far more lenient than the primary applicant's: the occupation doesn't need to match yours, it just needs to appear on a relevant list."
              )}
            </p>
            <p>
              {tx(
                locale,
                "回到Ahmet的例子：他的妻子是注册护士，职业本身就在MLTSSL清单上。她只花了六周完成技能评估并考出功能性英语，就为家庭申请增加了5分——几乎没有额外成本，却是纯增量。",
                "Ahmet'in örneğine dönersek: eşi kayıtlı bir hemşireydi ve mesleği zaten MLTSSL listesindeydi. Sadece altı hafta içinde mesleki değerlendirmesini tamamlayıp işlevsel İngilizce seviyesine ulaşarak aile başvurusuna 5 puan ekledi — neredeyse hiç ek maliyet olmadan tamamen net bir kazanç.",
                "Back to Ahmet's case: his wife was a registered nurse, an occupation already sitting on the MLTSSL. It took her six weeks to complete a skills assessment and clear functional English, adding 5 points to the household application — almost no extra cost, pure upside."
              )}
            </p>
          </section>

          <section>
            <h2>{tx(locale, "3. NAATI CCL 优势", "3. NAATI CCL Avantajı", "3. The NAATI CCL Advantage")}</h2>
            <p>
              {tx(
                locale,
                "NAATI社区语言证书（CCL）考试是整个打分系统里性价比最高的5分来源，却常常被完全忽视。如果您的母语（或流利掌握的第二语言）在NAATI认可语言列表上——包括土耳其语、中文普通话在内的六十多种语言——通过CCL口译考试即可获得5分加分，且这5分与英语考试成绩完全独立、可叠加。备考通常只需4到8周，成本远低于重考一次语言考试或多等一年经验。",
                "NAATI Topluluk Dili Sertifikası (CCL) sınavı, tüm puan sisteminin en verimli 5 puanlık kaynağıdır, ancak sıklıkla tamamen göz ardı edilir. Ana diliniz (veya akıcı bildiğiniz ikinci bir dil) NAATI'nin tanıdığı diller listesindeyse — Türkçe ve Mandarin Çincesi dahil altmışın üzerinde dil — CCL sözlü çeviri sınavını geçerek 5 puan kazanırsınız ve bu puan İngilizce sınav sonucunuzdan tamamen bağımsızdır, üzerine eklenir. Hazırlık genellikle 4 ila 8 hafta sürer ve maliyeti, dil sınavını tekrar almaktan veya bir yıl daha deneyim beklemekten çok daha düşüktür.",
                "The NAATI Community Language (CCL) test is the single most efficient 5 points in the entire scoring system, and it's routinely ignored. If your native language (or a language you speak fluently) is on NAATI's recognized list — over sixty languages, including Turkish and Mandarin — passing the CCL interpreting exam earns you 5 points, fully independent of and stackable with your English test result. Preparation typically takes 4 to 8 weeks, far cheaper than resitting a language exam or waiting another year for experience points."
              )}
            </p>
            <p>
              {tx(
                locale,
                "对土耳其语或中文母语者而言，这几乎是\"免费\"的5分：您已经具备语言能力，需要做的只是熟悉考试的对话场景和术语。Ahmet正是靠NAATI CCL拿下了他85分组合中的最后5分。",
                "Türkçe veya Çince ana dili konuşanlar için bu neredeyse 'bedava' bir 5 puandır: dil yeterliliğine zaten sahipsiniz, tek yapmanız gereken sınavın diyalog senaryolarına ve terminolojisine aşina olmaktır. Ahmet'in 85 puanlık kombinasyonundaki son 5 puanı tam olarak NAATI CCL'den geldi.",
                "For native Turkish or Chinese speakers, this is close to a \"free\" 5 points: you already have the language ability, you just need to get comfortable with the exam's dialogue scenarios and terminology. This is exactly how Ahmet closed out the last 5 points of his 85-point combination."
              )}
            </p>
            <Callout locale={locale}>
              {tx(
                locale,
                "Ahmet的完整分数变化：65分（起始）→ +20（PTE优秀英语）→ +5（配偶加分）→ +5（NAATI CCL）→ 85分，达到189独立技术移民的现实邀请区间。整个过程约用时5个月，没有等待任何一年的额外工作经验。",
                "Ahmet'in tam puan değişimi: 65 puan (başlangıç) → +20 (PTE üstün İngilizce) → +5 (eş puanı) → +5 (NAATI CCL) → 85 puan, subclass 189 bağımsız göçmenlik için gerçekçi davet aralığına ulaştı. Tüm süreç yaklaşık 5 ay sürdü ve bir yıllık ek deneyim beklemeye gerek kalmadı.",
                "Ahmet's full points movement: 65 (starting point) → +20 (PTE superior English) → +5 (partner points) → +5 (NAATI CCL) → 85, landing in the realistic invitation range for subclass 189 independent migration. The whole process took about 5 months — no waiting an extra year for experience."
              )}
            </Callout>
          </section>

          <section>
            <h2>
              {tx(
                locale,
                "4. 把重心转向偏远地区签证（190类别与491类别）",
                "4. Odağınızı Bölgesel Vizelere Kaydırın (Subclass 190 & 491)",
                "4. Shift Your Focus to Regional Visas (Subclass 190 & 491)"
              )}
            </h2>
            <p>
              {tx(
                locale,
                "189类别独立技术移民面向全球所有申请人开放，竞争最激烈，热门职业的实际邀请分数经常在90分以上徘徊。如果您的分数在80到85分之间难以突破，与其死守189，不如主动转向州担保（190类别，+5分）或偏远地区担保（491类别，+15分）。这不仅仅是加分——更重要的是，它把您的档案从拥挤的全球池子里抽离出来，放进各州相对宽松的独立筛选管道，许多州在特定职业清单短缺时，会以远低于联邦邀请线的分数发出邀请。",
                "Subclass 189 bağımsız göçmenliği tüm dünyaya açıktır ve rekabet en yoğun olanıdır; popüler mesleklerde gerçek davet puanları sıklıkla 90'ın üzerinde seyreder. Puanınız 80-85 aralığında takılıp kalıyorsa, 189'da ısrar etmek yerine eyalet adaylığına (subclass 190, +5 puan) veya bölgesel adaylığa (subclass 491, +15 puan) yönelmek çok daha mantıklıdır. Bu sadece puan eklemekle kalmaz — daha da önemlisi, profilinizi kalabalık küresel havuzdan çıkarıp eyaletlerin görece daha rahat bağımsız değerlendirme hatlarına yerleştirir; birçok eyalet, belirli meslek listelerinde açık olduğunda federal davet sınırının çok altındaki puanlarla davet gönderir.",
                "Subclass 189 independent migration is open to the entire world and draws the fiercest competition — real invitation scores for popular occupations regularly sit above 90. If you're stuck between 80 and 85, the smarter move isn't grinding for 189; it's pivoting to state nomination (subclass 190, +5 points) or regional nomination (subclass 491, +15 points). This isn't just about the point boost — more importantly, it pulls your profile out of the crowded global pool and into a state's own, comparatively relaxed selection lane, where shortages on a specific occupation list often get invited at scores well below the federal cut-off."
              )}
            </p>
            <p>
              {tx(
                locale,
                "491类别（偏远地区技术工作与技能签证）额外提供15分，是所有单项加分里数值最大的一项，代价是需要在指定偏远地区居住和工作至少三年后才能转为永居。对于分数长期卡在70到80分区间的申请人，这往往是唯一现实的路径——与其在189池子里无限期等待一个永远不会到来的邀请，不如用15分立刻打开一条真实的通道。",
                "Subclass 491 (Bölgesel İşgücü ve Yetenek Vizesi) ek olarak 15 puan sunar; bu, tüm bireysel puan kalemleri arasındaki en yüksek rakamdır. Bedeli, kalıcı oturuma geçmeden önce belirlenen bölgesel bir alanda en az üç yıl yaşamak ve çalışmaktır. Puanı uzun süredir 70-80 aralığında takılı kalan başvuru sahipleri için bu, genellikle tek gerçekçi yoldur — 189 havuzunda asla gelmeyecek bir daveti süresiz beklemek yerine, 15 puanla gerçek bir kapıyı hemen açmak.",
                "Subclass 491 (Skilled Work Regional visa) adds 15 points on its own — the single largest points lever available — at the cost of living and working in a designated regional area for at least three years before you can transition to permanent residence. For applicants stuck in the 70-80 range, this is often the only realistic path: rather than waiting indefinitely in the 189 pool for an invitation that never comes, 15 points opens a real door immediately."
              )}
            </p>
          </section>

          <MidCta locale={locale} />

          <section>
            <h2>
              {tx(
                locale,
                "5. 核实您的ANZSCO职业代码真实需求",
                "5. ANZSCO Kodunuzun Gerçek Talebini Doğrulayın",
                "5. Verify Your ANZSCO Code's Real Demand"
              )}
            </h2>
            <p>
              {tx(
                locale,
                "在您投入数月时间和数千澳元备考语言、评估、NAATI之前，第一步应该是确认您的ANZSCO职业代码是否真的处于需求状态。同一个宽泛的职业名称下，不同的6位ANZSCO代码可能对应完全不同的评估机构、不同的技术清单归属（MLTSSL、STSOL、ROL）、以及天差地别的实际邀请分数线——有些代码常年邀请分数在70分左右，有些则从未低于95分。盲目按照\"软件工程师\"或\"会计师\"这样宽泛的头衔去规划策略，而不核实具体代码，是许多申请人浪费半年时间备考却发现自己职业根本不在任何清单上的根本原因。",
                "Dil, değerlendirme ve NAATI için aylarca zaman ve binlerce dolar harcamadan önce ilk adımınız, ANZSCO meslek kodunuzun gerçekten talep gördüğünü doğrulamak olmalıdır. Aynı geniş meslek adı altında, farklı 6 haneli ANZSCO kodları tamamen farklı değerlendirme kurumlarına, farklı liste kategorilerine (MLTSSL, STSOL, ROL) ve birbirinden çok farklı gerçek davet puanlarına karşılık gelebilir — bazı kodlar yıllar boyunca 70 puan civarında davet alırken, bazıları hiçbir zaman 95 puanın altına inmez. 'Yazılım mühendisi' veya 'muhasebeci' gibi geniş unvanlara göre strateji kurup spesifik kodu doğrulamamak, birçok başvuru sahibinin altı ay hazırlandıktan sonra mesleğinin hiçbir listede olmadığını fark etmesinin temel nedenidir.",
                "Before you spend months and thousands of dollars on language prep, assessments, and NAATI, your first move should be confirming your ANZSCO occupation code is actually in demand. Under the same broad job title, different 6-digit ANZSCO codes can map to completely different assessing authorities, different list categories (MLTSSL, STSOL, ROL), and wildly different real invitation cut-offs — some codes have invited around 70 points for years, others have never dropped below 95. Planning a strategy around a broad title like \"software engineer\" or \"accountant\" without verifying the specific code is exactly how applicants spend six months preparing only to find out their occupation isn't on any list at all."
              )}
            </p>
            <p>
              {tx(
                locale,
                "在开始任何备考之前，先在我们的",
                "Herhangi bir hazırlığa başlamadan önce, kendi",
                "Before you start any preparation, look up your exact"
              )}{" "}
              <Link href={`/${locale}/occupations`}>
                {tx(locale, "职业数据库", "meslek kodunuzu veri tabanımızdan", "ANZSCO occupation code in our database")}
              </Link>{" "}
              {tx(
                locale,
                "中查询您的具体职业代码，核实评估机构、所属清单和相关签证子类，再决定把时间投入到哪个加分项上。",
                "kontrol edin; değerlendirme kurumunu, hangi listede yer aldığınızı ve ilgili vize alt sınıflarını doğrulayın, ardından zamanınızı hangi puan kalemine yatıracağınıza karar verin.",
                "— confirm the assessing authority, which list it sits on, and the relevant visa subclasses before deciding where to invest your time."
              )}
            </p>
          </section>

          <section>
            <h2>
              {tx(locale, "别再猜测，开始规划", "Tahmin Etmeyi Bırakın, Planlamaya Başlayın", "Stop Guessing, Start Planning")}
            </h2>
            <p>
              {tx(
                locale,
                "这五个杠杆——英语考试、配偶加分、NAATI CCL、地区签证转向、ANZSCO核实——共同构成了一套可执行、可衡量的加分体系，而不是被动等待政策变化的赌博。Ahmet的85分不是运气，而是把每一个可控变量都算清楚之后的结果。您的分数缺口是多少，取决于您从65分（或您当前的分数）出发，具体需要组合哪几项。",
                "Bu beş kaldıraç — dil sınavı, eş puanları, NAATI CCL, bölgesel vizeye yönelim ve ANZSCO doğrulaması — birlikte, politika değişikliğini pasif olarak beklemek yerine uygulanabilir, ölçülebilir bir puan artırma sistemi oluşturur. Ahmet'in 85 puanı şans değildi; kontrol edilebilir her değişkenin dikkatle hesaplanmasının sonucuydu. Sizin puan açığınızın ne kadar olduğu, mevcut puanınızdan başlayarak hangi kalemleri birleştirmeniz gerektiğine bağlıdır.",
                "These five levers — the language test, partner points, NAATI CCL, a regional pivot, and ANZSCO verification — together form an executable, measurable points system, not a passive bet on policy changing in your favor. Ahmet's 85 points weren't luck; they were the result of calculating every controllable variable. How big your own points gap is, and which combination of these levers closes it, depends on where you're starting from."
              )}
            </p>
          </section>

          <section className="not-prose mt-4 rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            <h3 className="mx-auto max-w-xl text-2xl font-bold text-white">
              {tx(
                locale,
                "计算您的确切分数差距",
                "Tam Puan Açığınızı Hesaplayın",
                "Calculate Your Exact Points Gap"
              )}
            </h3>
            <p className="mx-auto mt-3 max-w-xl text-gray-300">
              {tx(
                locale,
                "上传您的资料，2分钟内获取分数明细、可行路径排名，以及您专属的加分建议。",
                "Bilgilerinizi girin, 2 dakika içinde puan dökümünüzü, uygun yollarınızın sıralamasını ve size özel puan artırma önerilerini alın.",
                "Enter your details and get your points breakdown, ranked viable pathways, and a personalized action plan in 2 minutes."
              )}
            </p>
            <div className="mt-6 flex justify-center">
              <Button
                asChild
                size="lg"
                className="h-14 rounded-2xl bg-[var(--color-electric-iris)] px-10 text-base font-bold text-white shadow-xl hover:opacity-90"
              >
                <Link href={`/${locale}/full-check`}>
                  {tx(locale, "生成我的签证准备度报告", "Vize Hazırlık Raporumu Oluştur", "Generate My Visa Readiness Report")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </section>
        </div>

        <footer className="mt-12 flex items-center justify-between border-t border-white/10 pt-8 text-sm text-[var(--color-ash-gray)]">
          <span>{tx(locale, "发布日期：2026年8月28日", "Yayınlanma: 28 Ağustos 2026", "Published: August 28, 2026")}</span>
          <span>{tx(locale, "LogiVisa 资讯中心", "LogiVisa Rehber Merkezi", "LogiVisa Insights Hub")}</span>
        </footer>
      </article>
    </main>
  );
}
