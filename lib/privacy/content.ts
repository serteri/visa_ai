/**
 * Privacy Policy copy (/privacy, /tr/privacy, /zh-Hans/privacy). Every statement here is backed by code or configuration; the evidence for each one is in
 * docs/privacy-data-inventory.md. Where a fact could not be verified in the repository (data regions of most providers, retention periods) the text says so
 * in neutral words instead of guessing.
 *
 * Inline markup: [text](url). The url "{legal}" resolves to the locale's /legal page; any other url is used as written.
 * scripts/test-privacy-page.ts checks that the three locales keep the same sections, the same contact address and the same numbers and provider names.
 */
export type PrivacyLocale = "en" | "tr" | "zh-Hans";

export type PrivacyBlock = { p: string } | { ul: string[] };
export type PrivacySection = { id: string; title: string; blocks: PrivacyBlock[] };
export type PrivacyCopy = {
  title: string;
  metaTitle: string;
  metaDescription: string;
  updatedLabel: string;
  sections: PrivacySection[];
};

export const PRIVACY_PATH = "/privacy";
export const PRIVACY_CONTACT_EMAIL = "info@logivisa.com";
/** The date this version takes effect. */
export const PRIVACY_EFFECTIVE_DATE = "2026-11-06";

const EN: PrivacyCopy = {
  title: "Privacy Policy",
  metaTitle: "Privacy Policy",
  metaDescription: "What personal information LogiVisa collects, why, which services receive it, how long some data lasts and how to ask for access, correction or deletion.",
  updatedLabel: "Last updated: 6 November 2026",
  sections: [
    {
      id: "who",
      title: "Who we are and how to contact us",
      blocks: [
        { p: "LogiVisa (logivisa.com) is an independent information and research platform. It does not give migration or legal advice and is not a registered migration agent." },
        { p: "For any question about this page, or to ask for access to, correction of or deletion of your information, write to info@logivisa.com." },
      ],
    },
    {
      id: "collect",
      title: "What we collect",
      blocks: [
        { p: "What we collect depends on what you use." },
        {
          ul: [
            "Visa Information Report form: your name and email, the country and visa topic you are researching, your current country and passport country, age, employer sponsorship status, occupation, English level, education level and whether it was completed in Australia, years of skilled work experience, relationship information used for partner points, and any other answers you give on the form. If you give a phone number when you open the report, we keep it. We also keep the report we generate from your answers.",
            "Free guides and PDF downloads: your name, your email, a phone number if you give one, and the time you accepted the terms.",
            "Contact form: your name, email, phone number and message.",
            "Payments: card details are entered on the Stripe payment page and are not stored by us. We keep your email address, the amount, the GST amount and the Stripe session reference. Stripe also collects your billing address.",
            "AI Assistant: the messages you type; the IP address and browser details (user agent) of your device, which we use to recognise the browser and apply the free message limit; your message count and credit balance; and, if you fill in the quick profile card or link a report, the answers on it. If you restore credits, your email address.",
            "Occupation tools that read a CV: the CV text you paste is sent to OpenAI to produce a suggestion. We do not save it in our database.",
            "Points alerts: your email address, target points and visa subclass.",
            "Accounts: if you sign in with Google, your name, email and profile picture; if you use an email link or a password, your email and, for a password, a hash of it. Items you save in your dashboard, and documents you upload to the document vault or the Visa Journey page.",
            "Technical records: your IP address is stored with report requests, guide requests and assistant visitor records.",
            "Internal scoring: we calculate an internal interest score and tier from the answers in a report request. It is for our own prioritisation and is not shown to migration agents.",
          ],
        },
      ],
    },
    {
      id: "use",
      title: "Why we use it",
      blocks: [
        {
          ul: [
            "to produce your report, send you the access link and deliver the PDF;",
            "to take payment and keep payment records;",
            "to answer your messages;",
            "to run the AI Assistant, apply its free message limit and keep your credit balance;",
            "to sign you in and run your dashboard;",
            "to send the points alerts you ask for;",
            "to deliver the guides you request;",
            "to email LogiVisa staff a notification when a report is opened, a payment is made or a guide is requested; these notifications include the answers on the form;",
            "to limit abuse, for example by capping credit-restore requests per email address and per IP address;",
            "to credit a migration agent when you arrive through their link (see Agent referral);",
            "to understand how the site is used and to measure advertising, only if you allow it (see Cookies and analytics).",
          ],
        },
      ],
    },
    {
      id: "share",
      title: "Who we share it with",
      blocks: [
        { p: "We use these services to run LogiVisa:" },
        {
          ul: [
            "Stripe takes payments.",
            "Resend sends our emails: report links, PDF links, sign-in links, credit-restore links, points alerts and notifications to us.",
            "OpenAI answers AI Assistant messages, reads CV text in the occupation tools and creates search embeddings of our reference documents. The assistant receives what you type and reference text from our sources. If you use the quick profile card or have a linked report, it also receives the occupation, points figures, current visa and residence from it. We do not add your name or email to these requests, but anything you type is sent. LogiVisa staff can also send a document, together with the lead's name, email and details, to OpenAI to check it.",
            "Google runs Google Analytics, only if you accept analytics, and Google sign-in, if you use it.",
            "Meta runs the Meta Pixel, only if you accept advertising measurement.",
            "Vercel hosts the site.",
            "Neon hosts our database.",
            "Cloudflare stores uploaded files (R2 storage).",
            "Migration agents receive your details only when you tick the consent box that names the agent (see Agent referral).",
          ],
        },
        { p: "We do not send your name, email, answers or report links to Google Analytics or Meta. Report, dashboard, sign-in, registration, Visa Journey, agent and admin pages send them nothing." },
      ],
    },
    {
      id: "overseas",
      title: "Overseas transfers",
      blocks: [
        { p: "According to our configuration, our database is hosted with Neon in the Sydney region (ap-southeast-2)." },
        { p: "Our configuration does not fix where Vercel, Cloudflare, Stripe, Resend, OpenAI, Google or Meta process information, so we cannot tell you in which countries each of them does. Their own terms and privacy notices apply to what they do." },
      ],
    },
    {
      id: "agent",
      title: "Agent referral",
      blocks: [
        { p: "If you arrive through a migration agent's link, we keep the agent's reference in a cookie for 30 days. We share your name, email, phone number and report with that agent only if you tick the optional consent box that names the agent; you can buy and use your report without ticking it. You can withdraw consent at any time with the link in your report email. The agent may receive a commission if you buy a report. Details are on the [Legal page]({legal})." },
      ],
    },
    {
      id: "cookies",
      title: "Cookies and analytics",
      blocks: [
        { p: "Cookies and similar storage we use:" },
        {
          ul: [
            "your privacy choice, kept for one year in a cookie (lv_consent) and in your browser storage;",
            "a signed, httpOnly cookie that remembers for 7 days which reports were created in this browser;",
            "a cookie that stores an agent's reference for 30 days, if you arrive through an agent link;",
            "sign-in cookies, if you sign in; a sign-in session ends after 5 minutes without activity;",
            "browser storage for your theme, document checklist, Visa Journey progress and a site-guide hint, which stays on your device;",
            "Google Analytics cookies (_ga, _gid, _gat), only if you accept analytics, and Meta cookies (_fbp, _fbc), only if you accept advertising measurement.",
          ],
        },
        { p: "A banner asks you to choose between Accept all, Essential only or choosing each. Neither Google Analytics nor the Meta Pixel loads until you choose, and Essential only keeps both off. You can change your choice at any time with “Privacy choices” in the footer; withdrawing a choice stops sending and removes those cookies. Google Analytics is set not to use Google signals or ad personalisation." },
      ],
    },
    {
      id: "retention",
      title: "How long we keep it",
      blocks: [
        { p: "We keep information for as long as we need it for the purpose it was collected, for our payment and consent records, and for as long as the law requires. We have not set fixed retention periods for most records yet. Time limits built into the site:" },
        {
          ul: [
            "sign-in email links work for 10 minutes;",
            "credit-restore links work for 30 minutes;",
            "each link to an uploaded file works for 15 minutes;",
            "the report-browser cookie lasts 7 days, the agent cookie 30 days and your privacy choice one year.",
          ],
        },
      ],
    },
    {
      id: "security",
      title: "Security",
      blocks: [
        {
          ul: [
            "A report opens from the browser that created it, from the link in your email (which contains a signed token), when you are signed in with the report's email address, or for LogiVisa staff.",
            "Report, results and checkout pages tell your browser not to send their address to other sites as a referrer.",
            "Uploaded files sit in a storage bucket that our code opens only through short-lived links.",
            "Passwords are stored as hashes.",
            "Please do not enter passport numbers or upload identity, health or financial documents on the report form; the form tells you this.",
          ],
        },
        { p: "No online service can promise that information will never be accessed without permission." },
      ],
    },
    {
      id: "rights",
      title: "Your rights: access, correction and deletion",
      blocks: [
        { p: "Write to info@logivisa.com from the email address you used, say what you want, and we will handle the request. We process these requests by hand." },
        {
          ul: [
            "Access and correction: ask for a copy of what we hold about you, or for a correction.",
            "Deletion: ask us to delete your information. We may need to keep payment records and the agent consent log described below.",
            "Agent consent log: each entry records the consent wording and version, the date, a hashed IP address, your browser details, the report reference and the agent reference. It holds no name or email. The log is append-only: entries cannot be edited or deleted, and a withdrawal adds a new entry. The hashed IP address is a one-way code made from your IP address and a secret value.",
            "Self-service: you can delete saved calculations, quiz results, visa tracking and journeys from your dashboard, unsubscribe from points alerts with the link in each alert email, withdraw agent consent with the link in your report email, and change your analytics choice at any time.",
          ],
        },
      ],
    },
    {
      id: "complaints",
      title: "Complaints",
      blocks: [
        { p: "If you are not happy with how we handled your information, write to us first at info@logivisa.com. You can also contact the Office of the Australian Information Commissioner (OAIC) at [oaic.gov.au](https://www.oaic.gov.au)." },
      ],
    },
    {
      id: "children",
      title: "Children",
      blocks: [
        { p: "LogiVisa is not designed for children. If you think a child has given us personal information, write to info@logivisa.com and we will treat it as a deletion request." },
      ],
    },
    {
      id: "changes",
      title: "Changes and effective date",
      blocks: [
        { p: "We will post changes on this page and update the date at the top. This version takes effect on 6 November 2026." },
      ],
    },
  ],
};

const TR: PrivacyCopy = {
  title: "Gizlilik Politikası",
  metaTitle: "Gizlilik Politikası",
  metaDescription: "LogiVisa'nın hangi kişisel bilgileri neden topladığı, hangi hizmetlerin bu bilgileri aldığı, bazı verilerin ne kadar süre geçerli olduğu ve erişim, düzeltme veya silme talebinin nasıl yapılacağı.",
  updatedLabel: "Son güncelleme: 6 Kasım 2026",
  sections: [
    {
      id: "who",
      title: "Biz kimiz ve bize nasıl ulaşırsınız",
      blocks: [
        { p: "LogiVisa (logivisa.com) bağımsız bir bilgi ve araştırma platformudur. Göç veya hukuki tavsiye vermez ve kayıtlı bir göç danışmanı değildir." },
        { p: "Bu sayfayla ilgili sorularınız için ya da bilgilerinize erişim, bilgilerinizin düzeltilmesi veya silinmesi talebiniz için info@logivisa.com adresine yazın." },
      ],
    },
    {
      id: "collect",
      title: "Hangi bilgileri topluyoruz",
      blocks: [
        { p: "Topladığımız bilgiler, hangi özelliği kullandığınıza bağlıdır." },
        {
          ul: [
            "Vize Bilgi Raporu formu: adınız ve e-postanız, araştırdığınız ülke ve vize konusu, bulunduğunuz ülke ve pasaport ülkeniz, yaş, işveren sponsorluğu durumu, meslek, İngilizce düzeyi, eğitim düzeyi ve bunun Avustralya'da tamamlanıp tamamlanmadığı, nitelikli iş deneyimi yılı, eş puanı için kullanılan ilişki bilgisi ve formda verdiğiniz diğer yanıtlar. Raporu açarken telefon numarası verirseniz onu da saklarız. Yanıtlarınızdan ürettiğimiz raporu da saklarız.",
            "Ücretsiz rehberler ve PDF indirmeleri: adınız, e-postanız, verirseniz telefon numaranız ve koşulları kabul ettiğiniz zaman.",
            "İletişim formu: adınız, e-postanız, telefon numaranız ve mesajınız.",
            "Ödemeler: kart bilgileri Stripe ödeme sayfasında girilir ve bizde saklanmaz. E-posta adresinizi, tutarı, GST tutarını ve Stripe oturum referansını saklarız. Fatura adresinizi Stripe toplar.",
            "Yapay zekâ asistanı: yazdığınız mesajlar; cihazınızın IP adresi ve tarayıcı bilgileri (user agent), ki bunları tarayıcıyı tanımak ve ücretsiz mesaj sınırını uygulamak için kullanırız; mesaj sayınız ve kredi bakiyeniz; hızlı profil kartını doldurursanız ya da bir raporu bağlarsanız üzerindeki yanıtlar. Kredi geri yüklerseniz e-posta adresiniz.",
            "CV okuyan meslek araçları: yapıştırdığınız CV metni, bir öneri üretmek için OpenAI'ye gönderilir. Bunu veritabanımıza kaydetmeyiz.",
            "Puan uyarıları: e-posta adresiniz, hedef puan ve vize alt sınıfı.",
            "Hesaplar: Google ile giriş yaparsanız adınız, e-postanız ve profil resminiz; e-posta bağlantısı veya parola kullanırsanız e-postanız ve parola için onun özeti (hash). Panelinizde kaydettikleriniz ile belge kasasına veya Vize Yolculuğu sayfasına yüklediğiniz belgeler.",
            "Teknik kayıtlar: IP adresiniz rapor taleplerinde, rehber taleplerinde ve asistan ziyaretçi kayıtlarında saklanır.",
            "Dahili puanlama: bir rapor talebindeki yanıtlardan dahili bir ilgi puanı ve seviyesi hesaplarız. Bu, kendi önceliklendirmemiz içindir ve göç danışmanlarına gösterilmez.",
          ],
        },
      ],
    },
    {
      id: "use",
      title: "Neden kullanıyoruz",
      blocks: [
        {
          ul: [
            "raporunuzu üretmek, erişim bağlantısını göndermek ve PDF'i teslim etmek;",
            "ödemeyi almak ve ödeme kayıtlarını tutmak;",
            "mesajlarınızı yanıtlamak;",
            "yapay zekâ asistanını çalıştırmak, ücretsiz mesaj sınırını uygulamak ve kredi bakiyenizi tutmak;",
            "giriş yapmanızı sağlamak ve panelinizi çalıştırmak;",
            "istediğiniz puan uyarılarını göndermek;",
            "talep ettiğiniz rehberleri teslim etmek;",
            "bir rapor açıldığında, ödeme yapıldığında veya rehber istendiğinde LogiVisa ekibine bildirim e-postası göndermek; bu bildirimler formdaki yanıtları içerir;",
            "kötüye kullanımı sınırlamak, örneğin e-posta adresi ve IP adresi başına kredi geri yükleme taleplerini sınırlamak;",
            "bir ajanın bağlantısıyla geldiğinizde ajanı kayda geçirmek (bkz. Ajan yönlendirme);",
            "siteyi nasıl kullandığınızı anlamak ve reklamları ölçmek; yalnızca izin verirseniz (bkz. Çerezler ve analitik).",
          ],
        },
      ],
    },
    {
      id: "share",
      title: "Kimlerle paylaşıyoruz",
      blocks: [
        { p: "LogiVisa'yı çalıştırmak için şu hizmetleri kullanıyoruz:" },
        {
          ul: [
            "Stripe ödemeleri alır.",
            "Resend e-postalarımızı gönderir: rapor bağlantıları, PDF bağlantıları, giriş bağlantıları, kredi geri yükleme bağlantıları, puan uyarıları ve bize giden bildirimler.",
            "OpenAI yapay zekâ asistanı mesajlarını yanıtlar, meslek araçlarında CV metnini okur ve başvuru belgelerimizin arama gömmelerini üretir. Asistan, yazdıklarınızı ve kaynaklarımızdaki başvuru metnini alır. Hızlı profil kartını kullanırsanız veya bağlı bir raporunuz varsa, ondan meslek, puan rakamları, mevcut vize ve ikamet bilgisini de alır. Bu isteklere adınızı veya e-postanızı eklemeyiz; ancak yazdığınız her şey gönderilir. LogiVisa ekibi ayrıca bir belgeyi, adayın adı, e-postası ve bilgileriyle birlikte, kontrol etmek için OpenAI'ye gönderebilir.",
            "Google, yalnızca analitiği kabul ederseniz Google Analytics'i ve kullanırsanız Google ile girişi çalıştırır.",
            "Meta, yalnızca reklam ölçümünü kabul ederseniz Meta Pixel'i çalıştırır.",
            "Vercel siteyi barındırır.",
            "Neon veritabanımızı barındırır.",
            "Cloudflare yüklenen dosyaları saklar (R2 depolama).",
            "Göç danışmanları, bilgilerinizi yalnızca ajanı adıyla belirten onay kutusunu işaretlerseniz alır (bkz. Ajan yönlendirme).",
          ],
        },
        { p: "Adınızı, e-postanızı, yanıtlarınızı veya rapor bağlantılarınızı Google Analytics'e ya da Meta'ya göndermeyiz. Rapor, panel, giriş, kayıt, Vize Yolculuğu, ajan ve yönetici sayfaları onlara hiçbir şey göndermez." },
      ],
    },
    {
      id: "overseas",
      title: "Yurt dışına aktarım",
      blocks: [
        { p: "Yapılandırmamıza göre veritabanımız Neon'da Sydney bölgesinde (ap-southeast-2) barındırılıyor." },
        { p: "Yapılandırmamız Vercel, Cloudflare, Stripe, Resend, OpenAI, Google veya Meta'nın bilgileri nerede işlediğini belirlemiyor; bu yüzden her birinin hangi ülkelerde işlem yaptığını söyleyemeyiz. Yaptıkları işlemler için kendi koşulları ve gizlilik bildirimleri geçerlidir." },
      ],
    },
    {
      id: "turkey",
      title: "Türkiye'deki kullanıcılar",
      blocks: [
        {
          ul: [
            "Türkçe sayfalar (/tr) diğer dillerle aynı sitedir ve aynı sistemlerde çalışır; Türkiye için ayrı bir veri deposu yoktur.",
            "Türkçe bir formu doldurduğunuzda dil tercihiniz kayıtla birlikte saklanır.",
            "Çerez ve analitik seçimleri, e-posta gönderen hizmetler ve ödeme bu sayfada anlatıldığı gibi işler.",
            "Taleplerinizi Türkçe yazabilirsiniz: info@logivisa.com.",
          ],
        },
      ],
    },
    {
      id: "agent",
      title: "Ajan yönlendirme",
      blocks: [
        { p: "Bir göç danışmanının bağlantısıyla gelirseniz, danışmanın referansını 30 gün boyunca bir çerezde tutarız. Adınızı, e-postanızı, telefon numaranızı ve raporunuzu o danışmanla yalnızca danışmanı adıyla belirten isteğe bağlı onay kutusunu işaretlerseniz paylaşırız; kutuyu işaretlemeden de raporunuzu satın alıp kullanabilirsiniz. Onayınızı rapor e-postanızdaki bağlantıyla istediğiniz zaman geri çekebilirsiniz. Bir rapor satın alırsanız danışman komisyon alabilir. Ayrıntılar [Yasal Uyarı sayfasındadır]({legal})." },
      ],
    },
    {
      id: "cookies",
      title: "Çerezler ve analitik",
      blocks: [
        { p: "Kullandığımız çerezler ve benzeri depolama:" },
        {
          ul: [
            "gizlilik tercihiniz; bir yıl boyunca bir çerezde (lv_consent) ve tarayıcı depolamanızda tutulur;",
            "hangi raporların bu tarayıcıda oluşturulduğunu 7 gün hatırlayan, imzalı ve httpOnly bir çerez;",
            "bir ajan bağlantısıyla gelirseniz ajanın referansını 30 gün saklayan bir çerez;",
            "giriş yaparsanız oturum çerezleri; bir oturum 5 dakika etkinlik olmazsa sona erer;",
            "temanız, belge kontrol listeniz, Vize Yolculuğu ilerlemeniz ve bir site rehberi ipucu için cihazınızda kalan tarayıcı depolaması;",
            "yalnızca analitiği kabul ederseniz Google Analytics çerezleri (_ga, _gid, _gat) ve yalnızca reklam ölçümünü kabul ederseniz Meta çerezleri (_fbp, _fbc).",
          ],
        },
        { p: "Bir bildirim, Tümünü kabul et, Yalnızca gerekli olanlar veya her birini seçme arasında seçim yapmanızı ister. Siz seçene kadar ne Google Analytics ne de Meta Pixel yüklenir; Yalnızca gerekli olanlar ikisini de kapalı tutar. Seçiminizi alt bilgideki “Gizlilik tercihleri” ile istediğiniz zaman değiştirebilirsiniz; bir seçimi geri çekmek gönderimi durdurur ve bu çerezleri siler. Google Analytics, Google sinyallerini veya reklam kişiselleştirmesini kullanmayacak şekilde ayarlanmıştır." },
      ],
    },
    {
      id: "retention",
      title: "Ne kadar süre saklıyoruz",
      blocks: [
        { p: "Bilgileri, toplandıkları amaç için ihtiyaç duyduğumuz sürece, ödeme ve onay kayıtlarımız için ve yasanın gerektirdiği süre boyunca saklarız. Kayıtların çoğu için henüz sabit bir saklama süresi belirlemedik. Sitede yerleşik zaman sınırları:" },
        {
          ul: [
            "e-posta ile giriş bağlantıları 10 dakika çalışır;",
            "kredi geri yükleme bağlantıları 30 dakika çalışır;",
            "yüklenen bir dosyaya giden her bağlantı 15 dakika çalışır;",
            "rapor tarayıcı çerezi 7 gün, ajan çerezi 30 gün, gizlilik tercihiniz bir yıl sürer.",
          ],
        },
      ],
    },
    {
      id: "security",
      title: "Güvenlik",
      blocks: [
        {
          ul: [
            "Bir rapor, onu oluşturan tarayıcıdan, e-postanızdaki bağlantıdan (imzalı bir belirteç içerir), raporun e-posta adresiyle giriş yaptığınızda ya da LogiVisa ekibi için açılır.",
            "Rapor, sonuç ve ödeme sayfaları, tarayıcınıza adreslerini başka sitelere yönlendiren sayfa (referrer) olarak göndermemesini söyler.",
            "Yüklenen dosyalar, kodumuzun yalnızca kısa ömürlü bağlantılarla açtığı bir depolama kovasında durur.",
            "Parolalar özet (hash) olarak saklanır.",
            "Lütfen rapor formuna pasaport numarası girmeyin ve kimlik, sağlık veya mali belge yüklemeyin; form size bunu söyler.",
          ],
        },
        { p: "Hiçbir çevrimiçi hizmet, bilgilerin izinsiz erişime hiçbir zaman uğramayacağını vaat edemez." },
      ],
    },
    {
      id: "rights",
      title: "Haklarınız: erişim, düzeltme ve silme",
      blocks: [
        { p: "Kullandığınız e-posta adresinden info@logivisa.com adresine yazın, ne istediğinizi belirtin; talebi biz yürütürüz. Bu talepleri elle işleriz." },
        {
          ul: [
            "Erişim ve düzeltme: sizinle ilgili tuttuğumuz bilgilerin bir kopyasını veya bir düzeltmeyi isteyin.",
            "Silme: bilgilerinizin silinmesini isteyin. Ödeme kayıtlarını ve aşağıda anlatılan ajan onay günlüğünü tutmamız gerekebilir.",
            "Ajan onay günlüğü: her kayıt, onay metnini ve sürümünü, tarihi, özetlenmiş bir IP adresini, tarayıcı bilgilerinizi, rapor referansını ve ajan referansını içerir. İçinde ad veya e-posta yoktur. Günlük yalnızca eklemelidir: kayıtlar düzenlenemez veya silinemez, geri çekme yeni bir kayıt ekler. Özetlenmiş IP adresi, IP adresinizden ve gizli bir değerden üretilen tek yönlü bir koddur.",
            "Kendi kendinize: panelinizden kayıtlı hesaplamaları, test sonuçlarını, vize takibini ve yolculukları silebilir, her uyarı e-postasındaki bağlantıyla puan uyarılarından çıkabilir, rapor e-postanızdaki bağlantıyla ajan onayını geri çekebilir ve analitik seçiminizi istediğiniz zaman değiştirebilirsiniz.",
          ],
        },
      ],
    },
    {
      id: "complaints",
      title: "Şikayet",
      blocks: [
        { p: "Bilgilerinizi nasıl ele aldığımızdan memnun değilseniz önce info@logivisa.com adresinden bize yazın. Ayrıca Avustralya Bilgi Komiserliği Ofisi'ne (OAIC) [oaic.gov.au](https://www.oaic.gov.au) üzerinden başvurabilirsiniz." },
      ],
    },
    {
      id: "children",
      title: "Küçükler",
      blocks: [
        { p: "LogiVisa çocuklar için tasarlanmamıştır. Bir çocuğun bize kişisel bilgi verdiğini düşünüyorsanız info@logivisa.com adresine yazın; bunu bir silme talebi olarak ele alırız." },
      ],
    },
    {
      id: "changes",
      title: "Değişiklikler ve yürürlük tarihi",
      blocks: [
        { p: "Değişiklikleri bu sayfada yayımlar ve üstteki tarihi güncelleriz. Bu sürüm 6 Kasım 2026'da yürürlüğe girer." },
      ],
    },
  ],
};

const ZH: PrivacyCopy = {
  title: "隐私政策",
  metaTitle: "隐私政策",
  metaDescription: "LogiVisa 收集哪些个人信息、为何收集、哪些服务会接收这些信息、部分数据保留多久，以及如何申请查阅、更正或删除。",
  updatedLabel: "最后更新：2026年11月6日",
  sections: [
    {
      id: "who",
      title: "我们是谁以及如何联系我们",
      blocks: [
        { p: "LogiVisa（logivisa.com）是一个独立的信息与研究平台。它不提供移民或法律建议，也不是注册移民代理。" },
        { p: "如对本页有疑问，或希望查阅、更正或删除您的信息，请发送邮件至 info@logivisa.com。" },
      ],
    },
    {
      id: "collect",
      title: "我们收集哪些信息",
      blocks: [
        { p: "我们收集的信息取决于您使用的功能。" },
        {
          ul: [
            "签证信息报告表单：您的姓名和邮箱、您研究的国家和签证主题、您目前所在国家和护照国家、年龄、雇主担保情况、职业、英语水平、学历以及是否在澳大利亚完成、技术工作经验年数、用于配偶加分的关系信息，以及您在表单中提供的其他答案。如果您在打开报告时提供电话号码，我们会保存。我们也会保存根据您的答案生成的报告。",
            "免费指南和 PDF 下载：您的姓名、邮箱、您提供的电话号码，以及您接受条款的时间。",
            "联系表单：您的姓名、邮箱、电话号码和留言。",
            "付款：银行卡信息在 Stripe 付款页面输入，我们不保存。我们保存您的邮箱地址、金额、GST 金额和 Stripe 会话编号。账单地址由 Stripe 收集。",
            "AI 助手：您输入的消息；您设备的 IP 地址和浏览器信息（user agent），我们用它们识别浏览器并执行免费消息次数限制；您的消息计数和积分余额；如果您填写快速资料卡或关联报告，还包括其中的答案。如果您恢复积分，则包括您的邮箱地址。",
            "读取简历的职业工具：您粘贴的简历文本会发送给 OpenAI 以生成建议。我们不会把它保存到我们的数据库。",
            "分数提醒：您的邮箱地址、目标分数和签证子类。",
            "账户：如果您使用 Google 登录，则包括姓名、邮箱和头像；如果您使用邮件链接或密码，则包括邮箱，密码则保存其哈希值。您在个人面板中保存的内容，以及您上传到文件保管库或签证旅程页面的文件。",
            "技术记录：您的 IP 地址会与报告请求、指南请求和助手访客记录一起保存。",
            "内部评分：我们根据报告请求中的答案计算内部兴趣分数和等级。它仅用于我们自己的优先级排序，不会显示给移民代理。",
          ],
        },
      ],
    },
    {
      id: "use",
      title: "我们为何使用这些信息",
      blocks: [
        {
          ul: [
            "生成您的报告、向您发送访问链接并交付 PDF；",
            "收取付款并保存付款记录；",
            "回复您的留言；",
            "运行 AI 助手、执行免费消息次数限制并保存您的积分余额；",
            "让您登录并运行您的个人面板；",
            "发送您要求的分数提醒；",
            "交付您申请的指南；",
            "在报告被打开、付款完成或有人申请指南时，向 LogiVisa 工作人员发送通知邮件；这些通知包含表单中的答案；",
            "限制滥用，例如按邮箱地址和 IP 地址限制积分恢复请求；",
            "当您通过代理的链接访问时记录该代理（见“代理推荐”）；",
            "仅在您允许时，了解网站的使用情况并衡量广告效果（见“Cookie 与分析”）。",
          ],
        },
      ],
    },
    {
      id: "share",
      title: "我们与谁共享",
      blocks: [
        { p: "我们使用以下服务来运营 LogiVisa：" },
        {
          ul: [
            "Stripe 处理付款。",
            "Resend 发送我们的邮件：报告链接、PDF 链接、登录链接、积分恢复链接、分数提醒以及发给我们的通知。",
            "OpenAI 回答 AI 助手的消息，在职业工具中读取简历文本，并为我们的参考文件生成搜索向量。助手会接收您输入的内容和来自我们资料来源的参考文本。如果您使用快速资料卡或有已关联的报告，它还会接收其中的职业、分数数字、当前签证和居住信息。我们不会在这些请求中加入您的姓名或邮箱，但您输入的任何内容都会被发送。LogiVisa 工作人员也可能把文件连同线索的姓名、邮箱和详情发送给 OpenAI 进行核对。",
            "Google 仅在您接受分析时运行 Google Analytics，并在您使用时提供 Google 登录。",
            "Meta 仅在您接受广告效果衡量时运行 Meta Pixel。",
            "Vercel 托管网站。",
            "Neon 托管我们的数据库。",
            "Cloudflare 存储上传的文件（R2 存储）。",
            "移民代理仅在您勾选了写明该代理的同意框时才会收到您的信息（见“代理推荐”）。",
          ],
        },
        { p: "我们不会把您的姓名、邮箱、答案或报告链接发送给 Google Analytics 或 Meta。报告、个人面板、登录、注册、签证旅程、代理和管理页面不会向它们发送任何内容。" },
      ],
    },
    {
      id: "overseas",
      title: "跨境传输",
      blocks: [
        { p: "根据我们的配置，我们的数据库托管在 Neon 的悉尼区域（ap-southeast-2）。" },
        { p: "我们的配置没有指定 Vercel、Cloudflare、Stripe、Resend、OpenAI、Google 或 Meta 在何处处理信息，因此我们无法告诉您它们各自在哪些国家处理。它们的行为适用其自身的条款和隐私声明。" },
      ],
    },
    {
      id: "agent",
      title: "代理推荐",
      blocks: [
        { p: "如果您通过移民代理的链接访问，我们会在 Cookie 中保存该代理的编号 30 天。仅当您勾选了写明该代理的可选同意框时，我们才会与该代理共享您的姓名、邮箱、电话号码和报告；不勾选也可以购买并使用您的报告。您可以随时通过报告邮件中的链接撤回同意。如果您购买报告，代理可能获得佣金。详情见[法律声明页面]({legal})。" },
      ],
    },
    {
      id: "cookies",
      title: "Cookie 与分析",
      blocks: [
        { p: "我们使用的 Cookie 和类似存储：" },
        {
          ul: [
            "您的隐私选择，在 Cookie（lv_consent）和浏览器存储中保存一年；",
            "一个带签名的 httpOnly Cookie，用于记住 7 天内在此浏览器中创建了哪些报告；",
            "如果您通过代理链接访问，一个保存代理编号 30 天的 Cookie；",
            "如果您登录，则有登录 Cookie；登录会话在 5 分钟无操作后结束；",
            "用于主题、文件清单、签证旅程进度和网站向导提示的浏览器存储，保留在您的设备上；",
            "仅在您接受分析时使用 Google Analytics Cookie（_ga、_gid、_gat），仅在您接受广告效果衡量时使用 Meta Cookie（_fbp、_fbc）。",
          ],
        },
        { p: "横幅会请您在“全部接受”、“仅必要项”或逐项选择之间做出选择。在您选择之前，Google Analytics 和 Meta Pixel 都不会加载，“仅必要项”会让两者保持关闭。您可以随时通过页脚的“隐私选择”更改选择；撤回选择会停止发送并删除这些 Cookie。Google Analytics 已设置为不使用 Google 信号或广告个性化。" },
      ],
    },
    {
      id: "retention",
      title: "保留多久",
      blocks: [
        { p: "我们会在为收集目的所需的期间、为保存付款和同意记录以及法律要求的期间内保留信息。对大多数记录，我们尚未设定固定的保留期限。网站内置的时间限制：" },
        {
          ul: [
            "登录邮件链接 10 分钟内有效；",
            "积分恢复链接 30 分钟内有效；",
            "每个指向已上传文件的链接 15 分钟内有效；",
            "报告浏览器 Cookie 保留 7 天，代理 Cookie 保留 30 天，您的隐私选择保留一年。",
          ],
        },
      ],
    },
    {
      id: "security",
      title: "安全",
      blocks: [
        {
          ul: [
            "报告可从创建它的浏览器、您邮件中的链接（包含带签名的令牌）、使用报告邮箱地址登录时，或由 LogiVisa 工作人员打开。",
            "报告、结果和结账页面会告知您的浏览器，不要把它们的地址作为来源页发送给其他网站。",
            "上传的文件存放在一个存储桶中，我们的代码仅通过短时效链接打开它们。",
            "密码以哈希值保存。",
            "请不要在报告表单中输入护照号码，也不要上传身份、健康或财务文件；表单会提示您这一点。",
          ],
        },
        { p: "没有任何在线服务能保证信息永远不会被未经许可地访问。" },
      ],
    },
    {
      id: "rights",
      title: "您的权利：查阅、更正和删除",
      blocks: [
        { p: "请用您使用的邮箱地址发送邮件至 info@logivisa.com，说明您的请求，我们会处理。这些请求由我们手动处理。" },
        {
          ul: [
            "查阅与更正：要求获取我们持有的您的信息副本，或要求更正。",
            "删除：要求我们删除您的信息。我们可能需要保留付款记录和下文所述的代理同意日志。",
            "代理同意日志：每条记录包含同意文本及版本、日期、哈希处理后的 IP 地址、您的浏览器信息、报告编号和代理编号，不包含姓名或邮箱。该日志只能追加：记录不可编辑或删除，撤回会新增一条记录。哈希处理后的 IP 地址是由您的 IP 地址和一个秘密值生成的单向代码。",
            "自助操作：您可以在个人面板中删除已保存的计算、测验结果、签证跟踪和旅程，通过每封提醒邮件中的链接退订分数提醒，通过报告邮件中的链接撤回代理同意，并随时更改您的分析选择。",
          ],
        },
      ],
    },
    {
      id: "complaints",
      title: "投诉",
      blocks: [
        { p: "如果您对我们处理您信息的方式不满意，请先发送邮件至 info@logivisa.com。您也可以联系澳大利亚信息专员办公室（OAIC）：[oaic.gov.au](https://www.oaic.gov.au)。" },
      ],
    },
    {
      id: "children",
      title: "儿童",
      blocks: [
        { p: "LogiVisa 并非为儿童设计。如果您认为有儿童向我们提供了个人信息，请发送邮件至 info@logivisa.com，我们会将其视为删除请求。" },
      ],
    },
    {
      id: "changes",
      title: "变更与生效日期",
      blocks: [
        { p: "我们会在本页发布变更并更新顶部的日期。本版本自 2026年11月6日 起生效。" },
      ],
    },
  ],
};

export const PRIVACY_COPY: Record<PrivacyLocale, PrivacyCopy> = { en: EN, tr: TR, "zh-Hans": ZH };

export function privacyCopyFor(locale: string): PrivacyCopy {
  return locale === "tr" ? TR : locale === "zh-Hans" ? ZH : EN;
}
