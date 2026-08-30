// Full-length legal prose per locale. Kept as dedicated components rather
// than flat JSON dictionary keys (see lib/i18n/get-translations.ts) because
// this content is long-form, structurally nested (headings/lists/callout),
// and only ever rendered on this one page -- a JSON string blob would be
// harder to review and edit safely than JSX.

export function TermsEn() {
  return (
    <>
      <h1>Terms of Service &amp; Refund Policy</h1>
      <p className="text-sm text-indigo-200">Last updated: 3 July 2026</p>

      <h2>1. Introduction and Acceptance of Terms</h2>
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of the
        website logivisa.com, its associated tools (including the Points Calculator,
        ANZSCO Finder, AI Visa Pathway Matcher, and related occupation-classification
        tools), and all digital products offered for sale, including PDF migration
        guides (collectively, the &quot;Services&quot;), operated by LogiVisa
        (&quot;LogiVisa,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
      </p>
      <p>
        By accessing the Services, creating an account, downloading a free guide, or
        completing a purchase, you (&quot;you,&quot; the &quot;User,&quot; or the
        &quot;Customer&quot;) agree to be bound by these Terms in full. If you do not
        agree with any part of these Terms, you must not use the Services or complete a
        purchase. We may update these Terms from time to time in accordance with Section
        9 below.
      </p>

      <h2>2. Definitions</h2>
      <ul>
        <li>
          <strong>&quot;Digital Products&quot;</strong> means any PDF guide, migration
          blueprint, downloadable document, or other digital content made available for
          purchase or free download through the Services, including but not limited to
          the Turkish Edition (&quot;Avustralya PR Başvuru Rehberi&quot;) and the Global
          English Edition (&quot;The Ultimate Australia Migration &amp; Living
          Blueprint&quot;).
        </li>
        <li>
          <strong>&quot;AI Tools&quot;</strong> means any artificial intelligence or
          machine-learning-assisted feature of the Services, including the AI Visa
          Pathway Matcher, ANZSCO occupation classification tool, points calculators, and
          any similar automated analysis feature.
        </li>
        <li>
          <strong>&quot;Order&quot;</strong> means a completed purchase transaction for a
          Digital Product processed through our third-party payment processor (Stripe).
        </li>
      </ul>

      <h2>3. Digital Goods &amp; Refund Policy</h2>
      <p>
        <strong>
          All Digital Products sold through the Services are delivered electronically
          and are accessible instantly upon completion of your Order.
        </strong>{" "}
        Because of the nature of digital goods — which cannot be returned, and where
        access to the complete content is granted immediately at the point of sale —{" "}
        <strong>all sales are final</strong>.
      </p>
      <p>
        <strong>
          LogiVisa does not offer refunds, exchanges, or cancellations for any Digital
          Product once an Order has been successfully completed and payment has been
          processed, regardless of whether the Digital Product has been downloaded,
          opened, or read.
        </strong>{" "}
        By completing an Order, you expressly acknowledge and agree that you are waiving
        any statutory right to a change-of-mind refund to the fullest extent permitted by
        applicable law, on the basis that the Digital Product is supplied as fully
        accessible digital content from the moment of purchase.
      </p>
      <p>
        This policy does not affect any non-excludable consumer guarantees available to
        you under the Australian Consumer Law (Schedule 2 of the Competition and Consumer
        Act 2010 (Cth)) where those guarantees apply and cannot lawfully be excluded — for
        example, where a Digital Product is materially defective, is not fit for its
        stated purpose, or is not delivered at all due to a technical failure on our
        part. In such circumstances, please contact us using the details in Section 10
        and we will investigate in good faith.
      </p>

      <div className="not-prose my-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
        <h2 className="mt-0 text-xl font-bold text-amber-200">
          4. Immigration Advice Disclaimer (MARA)
        </h2>
        <p className="font-semibold text-amber-100">
          LogiVisa and its AI tools are NOT registered migration agents (MARA). All
          content, PDFs, and AI classifications are for educational and informational
          purposes only and do not constitute legal or official immigration advice.
        </p>
        <p className="text-amber-100">
          Nothing in the Services, including any ANZSCO occupation code suggested by our
          AI Tools, any points estimate generated by our calculators, or any content in
          our Digital Products, should be relied upon as a substitute for personalised
          advice from a migration agent registered with the Office of the Migration
          Agents Registration Authority (MARA), or from an Australian legal practitioner
          authorised to give immigration assistance. Australian immigration law and
          policy change frequently, and outcomes depend on your individual
          circumstances. You are solely responsible for verifying any information
          obtained through the Services against official sources, including the
          Australian Department of Home Affairs, before relying on it or lodging any visa
          application. LogiVisa accepts no liability for decisions made, or visa
          applications lodged, in reliance on the Services.
        </p>
      </div>

      <h2>5. Intellectual Property and Licence to Use</h2>
      <p>
        All Digital Products, website content, tool outputs, trademarks, logos, and
        underlying software are the property of LogiVisa or its licensors and are
        protected by applicable copyright and intellectual property laws.
      </p>
      <p>
        Upon completing an Order, you are granted a limited, non-exclusive,
        non-transferable licence to download and use the purchased Digital Product{" "}
        <strong>for your own personal, non-commercial use only</strong>. You may not:
      </p>
      <ul>
        <li>
          Copy, reproduce, distribute, publish, sell, resell, sublicense, or otherwise
          make any Digital Product available to any third party, whether for payment or
          free of charge;
        </li>
        <li>
          Upload any Digital Product, in whole or in part, to any file-sharing service,
          public repository, forum, or social media platform;
        </li>
        <li>
          Remove, obscure, or alter any copyright notice, watermark, or attribution
          contained in a Digital Product; or
        </li>
        <li>
          Use any Digital Product to create a derivative work intended for distribution
          or resale.
        </li>
      </ul>
      <p>
        Any breach of this Section 5 may result in the immediate termination of your
        access to the Services without refund, and LogiVisa reserves the right to pursue
        all available legal remedies.
      </p>

      <h2>6. Acceptable Use of the Services and AI Tools</h2>
      <p>
        You agree to use the Services, including the AI Tools, only for their intended
        purpose of assessing your own migration pathway. You must not: submit another
        person&apos;s personal or identifying documents without their consent; attempt to
        reverse-engineer, scrape, or systematically extract data from the Services;
        interfere with the proper functioning of the Services; or use the Services in any
        way that is unlawful, fraudulent, or misleading.
      </p>

      <h2>7. No Warranty and Limitation of Liability</h2>
      <p>
        The Services and all Digital Products are provided &quot;as is&quot; and
        &quot;as available,&quot; without warranty of any kind, express or implied,
        including as to accuracy, completeness, currency, or fitness for a particular
        purpose, except for guarantees that cannot be excluded under the Australian
        Consumer Law.
      </p>
      <p>
        To the maximum extent permitted by law, LogiVisa, its directors, employees, and
        contractors will not be liable for any indirect, incidental, special,
        consequential, or punitive damages, or any loss of profits, visa application
        fees, or opportunity, arising out of or in connection with your use of, or
        inability to use, the Services or any Digital Product, even where a visa
        application is refused, delayed, or otherwise unsuccessful.
      </p>

      <h2>8. Payment Processing</h2>
      <p>
        All payments for Digital Products are processed securely by Stripe, Inc. LogiVisa
        does not store your full payment card details. By completing an Order, you also
        agree to Stripe&apos;s applicable terms of service and privacy policy governing
        the processing of your payment.
      </p>

      <h2>9. Changes to These Terms</h2>
      <p>
        We may revise these Terms at any time by updating this page. Material changes
        will be reflected by an updated &quot;Last updated&quot; date at the top of this
        page. Your continued use of the Services after any such update constitutes your
        acceptance of the revised Terms.
      </p>

      <h2>10. Governing Law</h2>
      <p>
        These Terms are governed by the laws of Australia. You irrevocably submit to the
        exclusive jurisdiction of the courts of Australia in respect of any dispute
        arising out of or in connection with these Terms or the Services.
      </p>

      <h2>11. Contact Us</h2>
      <p>
        If you have any questions about these Terms, the Refund Policy, or wish to raise
        a concern about a Digital Product, please contact us at{" "}
        <a href="mailto:info@logivisa.com">info@logivisa.com</a>.
      </p>
    </>
  );
}

export function TermsTr() {
  return (
    <>
      <h1>Kullanım Koşulları &amp; İade Politikası</h1>
      <p className="text-sm text-indigo-200">Son güncelleme: 3 Temmuz 2026</p>

      <h2>1. Giriş ve Koşulların Kabulü</h2>
      <p>
        Bu Kullanım Koşulları (&quot;Koşullar&quot;), logivisa.com web sitesine,
        ilişkili araçlarına (Puan Hesaplayıcı, ANZSCO Finder, AI Vize Yolu Eşleştirici
        ve ilgili meslek sınıflandırma araçları dahil) ve PDF göç rehberleri dahil olmak
        üzere satışa sunulan tüm dijital ürünlere (topluca &quot;Hizmetler&quot;)
        erişiminizi ve bunları kullanımınızı düzenler; bu Hizmetler LogiVisa
        (&quot;LogiVisa,&quot; &quot;biz,&quot; &quot;bize&quot; veya
        &quot;bizim&quot;) tarafından işletilmektedir.
      </p>
      <p>
        Hizmetlere erişerek, bir hesap oluşturarak, ücretsiz bir rehber indirerek veya
        bir satın alma işlemini tamamlayarak, siz (&quot;siz,&quot;
        &quot;Kullanıcı&quot; veya &quot;Müşteri&quot;) bu Koşulların tamamına bağlı
        kalmayı kabul edersiniz. Bu Koşulların herhangi bir bölümünü kabul etmiyorsanız,
        Hizmetleri kullanmamalı veya satın alma işlemini tamamlamamalısınız. Bu
        Koşulları, aşağıdaki Madde 9 uyarınca zaman zaman güncelleyebiliriz.
      </p>

      <h2>2. Tanımlar</h2>
      <ul>
        <li>
          <strong>&quot;Dijital Ürünler&quot;</strong>, Hizmetler aracılığıyla satın
          alma veya ücretsiz indirme için sunulan her türlü PDF rehber, göç planı,
          indirilebilir belge veya diğer dijital içerik anlamına gelir; bunlara Türkçe
          Baskı (&quot;Avustralya PR Başvuru Rehberi&quot;) ve Global İngilizce Baskı
          (&quot;The Ultimate Australia Migration &amp; Living Blueprint&quot;) dahildir
          ancak bunlarla sınırlı değildir.
        </li>
        <li>
          <strong>&quot;AI Araçları&quot;</strong>, Hizmetlerin yapay zeka veya makine
          öğrenimi destekli her türlü özelliği anlamına gelir; AI Vize Yolu Eşleştirici,
          ANZSCO meslek sınıflandırma aracı, puan hesaplayıcıları ve benzeri her türlü
          otomatik analiz özelliği dahildir.
        </li>
        <li>
          <strong>&quot;Sipariş&quot;</strong>, üçüncü taraf ödeme işlemcimiz (Stripe)
          aracılığıyla işlenen, bir Dijital Ürün için tamamlanmış satın alma işlemi
          anlamına gelir.
        </li>
      </ul>

      <h2>3. Dijital Ürünler ve İade Politikası</h2>
      <p>
        <strong>
          Hizmetler aracılığıyla satılan tüm Dijital Ürünler elektronik olarak teslim
          edilir ve Siparişinizin tamamlanmasının ardından anında erişilebilir hale
          gelir.
        </strong>{" "}
        Dijital ürünlerin doğası gereği — iade edilemeyen ve satış anında içeriğin
        tamamına anında erişim sağlanan ürünler olması nedeniyle —{" "}
        <strong>tüm satışlar kesindir</strong>.
      </p>
      <p>
        <strong>
          Bir Sipariş başarıyla tamamlandıktan ve ödeme işlendikten sonra, Dijital Ürün
          indirilmiş, açılmış veya okunmuş olsun olmasın, LogiVisa herhangi bir Dijital
          Ürün için iade, değişim veya iptal sunmamaktadır.
        </strong>{" "}
        Bir Siparişi tamamlayarak, Dijital Ürünün satın alma anından itibaren tam
        erişilebilir dijital içerik olarak sunulduğu esasına dayanarak, yürürlükteki
        mevzuatın izin verdiği azami ölçüde fikir değişikliğine dayalı iade hakkından
        açıkça feragat ettiğinizi kabul ve beyan edersiniz.
      </p>
      <p>
        Bu politika, Avustralya Tüketici Kanunu (Rekabet ve Tüketici Yasası 2010 (Cth)
        Ek 2) kapsamında size tanınan ve hariç tutulamayan tüketici garantilerini — bu
        garantilerin geçerli olduğu ve yasal olarak hariç tutulamadığı durumlarda,
        örneğin bir Dijital Ürünün önemli ölçüde kusurlu olması, belirtilen amaca uygun
        olmaması veya bizim kaynaklı bir teknik arıza nedeniyle hiç teslim edilmemesi
        gibi durumlarda — etkilemez. Bu tür durumlarda, lütfen Madde 10&apos;daki
        bilgileri kullanarak bizimle iletişime geçin; iyi niyetle inceleyeceğiz.
      </p>

      <div className="not-prose my-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
        <h2 className="mt-0 text-xl font-bold text-amber-200">
          4. Göç Danışmanlığı Uyarısı (MARA)
        </h2>
        <p className="font-semibold text-amber-100">
          LogiVisa ve yapay zeka araçları MARA&apos;ya kayıtlı göç acenteleri DEĞİLDİR.
          Tüm içerik, PDF&apos;ler ve AI sınıflandırmaları yalnızca eğitim ve
          bilgilendirme amaçlıdır ve yasal veya resmi göç tavsiyesi teşkil etmez.
        </p>
        <p className="text-amber-100">
          AI Araçlarımız tarafından önerilen herhangi bir ANZSCO meslek kodu,
          hesaplayıcılarımız tarafından üretilen herhangi bir puan tahmini veya Dijital
          Ürünlerimizdeki herhangi bir içerik dahil olmak üzere Hizmetlerdeki hiçbir
          şey, Göç Acenteleri Kayıt Otoritesi&apos;ne (MARA) kayıtlı bir göç
          acentesinden veya göç yardımı vermeye yetkili bir Avustralyalı hukukçudan
          alınan kişiselleştirilmiş tavsiyenin yerine geçecek şekilde
          değerlendirilmemelidir. Avustralya göç mevzuatı ve politikası sık sık
          değişmektedir ve sonuçlar bireysel koşullarınıza bağlıdır. Hizmetler
          aracılığıyla elde edilen herhangi bir bilgiye güvenmeden veya herhangi bir
          vize başvurusu yapmadan önce, bu bilgiyi Avustralya İçişleri Bakanlığı dahil
          resmi kaynaklarla doğrulamaktan yalnızca siz sorumlusunuz. LogiVisa,
          Hizmetlere güvenilerek alınan kararlardan veya yapılan vize başvurularından
          hiçbir sorumluluk kabul etmez.
        </p>
      </div>

      <h2>5. Fikri Mülkiyet ve Kullanım Lisansı</h2>
      <p>
        Tüm Dijital Ürünler, web sitesi içeriği, araç çıktıları, ticari markalar,
        logolar ve alttaki yazılım LogiVisa&apos;ya veya lisans verenlerine aittir ve
        geçerli telif hakkı ve fikri mülkiyet yasalarıyla korunmaktadır.
      </p>
      <p>
        Bir Siparişi tamamladığınızda, satın alınan Dijital Ürünü{" "}
        <strong>yalnızca kendi kişisel, ticari olmayan kullanımınız için</strong>{" "}
        indirme ve kullanma hakkına sahip sınırlı, münhasır olmayan, devredilemez bir
        lisans verilir. Aşağıdakileri yapamazsınız:
      </p>
      <ul>
        <li>
          Herhangi bir Dijital Ürünü, ücretli veya ücretsiz olsun, üçüncü bir tarafa
          kopyalamak, çoğaltmak, dağıtmak, yayınlamak, satmak, yeniden satmak, alt
          lisanslamak veya başka bir şekilde erişilebilir kılmak;
        </li>
        <li>
          Herhangi bir Dijital Ürünü, tamamen veya kısmen, herhangi bir dosya paylaşım
          hizmetine, kamuya açık depoya, foruma veya sosyal medya platformuna yüklemek;
        </li>
        <li>
          Bir Dijital Ürün içinde yer alan herhangi bir telif hakkı bildirimini,
          filigranı veya atfı kaldırmak, gizlemek veya değiştirmek; veya
        </li>
        <li>
          Herhangi bir Dijital Ürünü, dağıtım veya yeniden satış amaçlı türev bir
          çalışma oluşturmak için kullanmak.
        </li>
      </ul>
      <p>
        Bu Madde 5&apos;in ihlali, Hizmetlere erişiminizin iade yapılmaksızın derhal
        sona erdirilmesiyle sonuçlanabilir ve LogiVisa mevcut tüm yasal yollara başvurma
        hakkını saklı tutar.
      </p>

      <h2>6. Hizmetlerin ve AI Araçlarının Kabul Edilebilir Kullanımı</h2>
      <p>
        Hizmetleri, AI Araçları dahil, yalnızca kendi göç yolunuzu değerlendirmek
        amacıyla kullanmayı kabul edersiniz. Başka bir kişinin kişisel veya kimlik
        belgelerini onayı olmadan göndermemeli; Hizmetleri tersine mühendislik yapmaya,
        kazımaya veya sistematik olarak veri çıkarmaya çalışmamalı; Hizmetlerin düzgün
        işleyişine müdahale etmemeli; veya Hizmetleri yasa dışı, hileli veya yanıltıcı
        herhangi bir şekilde kullanmamalısınız.
      </p>

      <h2>7. Garanti Verilmemesi ve Sorumluluğun Sınırlandırılması</h2>
      <p>
        Hizmetler ve tüm Dijital Ürünler, Avustralya Tüketici Kanunu kapsamında hariç
        tutulamayan garantiler dışında, doğruluk, eksiksizlik, güncellik veya belirli
        bir amaca uygunluk dahil olmak üzere açık veya zımni hiçbir garanti olmaksızın
        &quot;olduğu gibi&quot; ve &quot;mevcut olduğu şekliyle&quot; sunulmaktadır.
      </p>
      <p>
        Yasaların izin verdiği azami ölçüde, LogiVisa, yöneticileri, çalışanları ve
        yüklenicileri; bir vize başvurusunun reddedilmesi, gecikmesi veya başka bir
        şekilde başarısız olması durumunda dahi, Hizmetlerin veya herhangi bir Dijital
        Ürünün kullanımınızdan veya kullanamamanızdan kaynaklanan veya bunlarla
        bağlantılı hiçbir dolaylı, arızi, özel, sonuç niteliğinde veya cezai zarardan ya
        da kâr kaybından, vize başvuru ücretlerinden veya fırsat kaybından sorumlu
        olmayacaktır.
      </p>

      <h2>8. Ödeme İşleme</h2>
      <p>
        Dijital Ürünler için tüm ödemeler Stripe, Inc. tarafından güvenli bir şekilde
        işlenir. LogiVisa, tam ödeme kartı bilgilerinizi saklamaz. Bir Siparişi
        tamamlayarak, ödemenizin işlenmesini yöneten Stripe&apos;ın geçerli hizmet
        şartlarını ve gizlilik politikasını da kabul etmiş olursunuz.
      </p>

      <h2>9. Bu Koşullardaki Değişiklikler</h2>
      <p>
        Bu Koşulları bu sayfayı güncelleyerek istediğimiz zaman revize edebiliriz.
        Önemli değişiklikler, bu sayfanın en üstünde güncellenmiş bir &quot;Son
        güncelleme&quot; tarihiyle yansıtılacaktır. Herhangi bir güncellemenin ardından
        Hizmetleri kullanmaya devam etmeniz, revize edilmiş Koşulları kabul ettiğiniz
        anlamına gelir.
      </p>

      <h2>10. Uygulanacak Hukuk</h2>
      <p>
        Bu Koşullar Avustralya yasalarına tabidir. Bu Koşullar veya Hizmetlerle ilgili
        veya bunlardan kaynaklanan herhangi bir uyuşmazlık konusunda geri alınamaz
        şekilde Avustralya mahkemelerinin münhasır yargı yetkisini kabul edersiniz.
      </p>

      <h2>11. Bize Ulaşın</h2>
      <p>
        Bu Koşullar, İade Politikası hakkında herhangi bir sorunuz varsa veya bir
        Dijital Ürünle ilgili bir endişenizi iletmek istiyorsanız, lütfen
        info@logivisa.com adresinden bizimle iletişime geçin.
      </p>
    </>
  );
}

export function TermsZh() {
  return (
    <>
      <h1>服务条款与退款政策</h1>
      <p className="text-sm text-indigo-200">最后更新日期：2026年7月3日</p>

      <h2>1. 引言与条款接受</h2>
      <p>
        本《服务条款》（"条款"）规范您对 logivisa.com
        网站及其相关工具（包括积分计算器、ANZSCO 职业代码查找工具、AI
        签证路径匹配器及相关职业分类工具）以及所有出售的数字产品（包括 PDF
        移民指南，统称"服务"）的访问和使用，该等服务由 LogiVisa（"LogiVisa"、"我们"）运营。
      </p>
      <p>
        通过访问服务、创建账户、下载免费指南或完成购买，您（"您"、"用户"或"客户"）同意完全受本条款约束。如果您不同意本条款的任何部分，您不得使用本服务或完成购买。我们可能会根据下文第
        9 条不时更新本条款。
      </p>

      <h2>2. 定义</h2>
      <ul>
        <li>
          <strong>"数字产品"</strong>指通过服务提供的任何可供购买或免费下载的 PDF
          指南、移民规划文件、可下载文档或其他数字内容，包括但不限于土耳其语版（《Avustralya
          PR Başvuru Rehberi》）和全球英语版（《The Ultimate Australia Migration &amp;
          Living Blueprint》）。
        </li>
        <li>
          <strong>"AI 工具"</strong>指服务中任何由人工智能或机器学习辅助的功能，包括
          AI 签证路径匹配器、ANZSCO 职业分类工具、积分计算器及任何类似的自动化分析功能。
        </li>
        <li>
          <strong>"订单"</strong>指通过我们的第三方支付处理商（Stripe）处理完成的数字产品购买交易。
        </li>
      </ul>

      <h2>3. 数字商品与退款政策</h2>
      <p>
        <strong>
          通过服务出售的所有数字产品均以电子方式交付，并在您的订单完成后即可立即访问。
        </strong>{" "}
        鉴于数字商品的性质——无法退货，且在销售时即可立即获得完整内容的访问权限——
        <strong>所有销售均为最终销售，不可撤销</strong>。
      </p>
      <p>
        <strong>
          订单成功完成并处理付款后，无论数字产品是否已被下载、打开或阅读，LogiVisa
          均不为任何数字产品提供退款、换货或取消服务。
        </strong>{" "}
        完成订单即表示您明确承认并同意，鉴于数字产品自购买之时起即以完全可访问的数字内容形式提供，您在适用法律允许的最大范围内放弃因改变主意而要求退款的任何法定权利。
      </p>
      <p>
        本政策不影响澳大利亚消费者法（《2010年竞争与消费者法》（联邦）附表
        2）项下适用且不可排除的消费者保证——例如，当数字产品存在实质性缺陷、不适合其声明用途，或因我方技术故障而根本未能交付时。在此类情况下，请使用第
        10 条中的联系方式与我们联系，我们将本着诚信原则进行调查。
      </p>

      <div className="not-prose my-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
        <h2 className="mt-0 text-xl font-bold text-amber-200">
          4. 移民建议免责声明（MARA）
        </h2>
        <p className="font-semibold text-amber-100">
          LogiVisa 及其 AI
          工具并非注册移民代理（MARA）。所有内容、PDF 及 AI
          分类结果仅供教育和参考之用，不构成法律或官方移民建议。
        </p>
        <p className="text-amber-100">
          服务中的任何内容，包括我们的 AI 工具所建议的任何 ANZSCO
          职业代码、我们的计算器生成的任何积分估算，或我们数字产品中的任何内容，均不应被视为可替代由澳大利亚移民代理注册局（MARA）注册的移民代理，或获授权提供移民协助的澳大利亚执业律师所提供的个性化建议。澳大利亚移民法律及政策经常变化，结果取决于您的个人情况。在依赖通过服务获取的任何信息或提交任何签证申请之前，您有责任自行对照官方来源（包括澳大利亚内政部）核实该信息。对于因依赖服务而做出的决定或提交的签证申请，LogiVisa
          不承担任何责任。
        </p>
      </div>

      <h2>5. 知识产权与使用许可</h2>
      <p>
        所有数字产品、网站内容、工具输出、商标、标识及底层软件均归 LogiVisa
        或其许可方所有，并受适用的版权及知识产权法律保护。
      </p>
      <p>
        订单完成后，您将获得一项有限的、非独占的、不可转让的许可，仅可下载并将所购数字产品
        <strong>用于您个人的非商业用途</strong>。您不得：
      </p>
      <ul>
        <li>
          将任何数字产品复制、传播、分发、发布、出售、转售、再许可或以其他方式提供给任何第三方，无论是否收费；
        </li>
        <li>将任何数字产品的全部或部分上传至任何文件共享服务、公共资源库、论坛或社交媒体平台；</li>
        <li>删除、遮盖或更改数字产品中包含的任何版权声明、水印或署名；或</li>
        <li>利用任何数字产品创作用于分发或转售的衍生作品。</li>
      </ul>
      <p>
        违反本第 5
        条可能导致您对服务的访问权限被立即终止且不予退款，LogiVisa
        保留追究一切可用法律救济的权利。
      </p>

      <h2>6. 服务及 AI 工具的可接受使用</h2>
      <p>
        您同意仅将服务（包括 AI
        工具）用于评估您自身移民路径的既定目的。您不得：未经他人同意提交其个人或身份证明文件；试图对服务进行逆向工程、抓取或系统性提取数据；干扰服务的正常运行；或以任何非法、欺诈或误导性方式使用服务。
      </p>

      <h2>7. 无担保及责任限制</h2>
      <p>
        服务及所有数字产品均按"现状"及"现有"提供，不附带任何明示或暗示的担保，包括准确性、完整性、时效性或特定用途适用性方面的担保，但澳大利亚消费者法规定不可排除的担保除外。
      </p>
      <p>
        在法律允许的最大范围内，即使签证申请被拒绝、延误或以其他方式未获成功，LogiVisa
        及其董事、雇员和承包商亦不对因您使用或无法使用服务或任何数字产品而产生或与之相关的任何间接、附带、特殊、后果性或惩罚性损害，或任何利润损失、签证申请费用损失或机会损失承担责任。
      </p>

      <h2>8. 支付处理</h2>
      <p>
        数字产品的所有付款均由 Stripe, Inc. 安全处理。LogiVisa
        不存储您的完整支付卡信息。完成订单即表示您同意 Stripe
        适用的服务条款及管理您付款处理的隐私政策。
      </p>

      <h2>9. 本条款的变更</h2>
      <p>
        我们可能随时通过更新本页面修订本条款。重大变更将通过本页面顶部更新的"最后更新"日期体现。您在任何此类更新后继续使用服务，即表示您接受修订后的条款。
      </p>

      <h2>10. 适用法律</h2>
      <p>
        本条款受澳大利亚法律管辖。对于因本条款或服务引起或与之相关的任何争议，您不可撤销地接受澳大利亚法院的专属管辖权。
      </p>

      <h2>11. 联系我们</h2>
      <p>
        如果您对本条款、退款政策有任何疑问，或希望就数字产品提出关注事项，请通过{" "}
        <a href="mailto:info@logivisa.com">info@logivisa.com</a> 与我们联系。
      </p>
    </>
  );
}
