# LogiVisa: kişisel veri envanteri

Hazırlanma tarihi: 6 Kasım 2026. Yöntem: depo (kod, `prisma/schema.prisma`, `db/schema.ts`, `package.json`, `vercel.json`, `.env.example`, `next.config.ts`) tarandı. Canlı sistemde form gönderilmedi, ödeme yapılmadı, veritabanına sorgu atılmadı, hiçbir veri silinmedi. Ortam değişkenlerinin yalnızca adları okundu; tek istisna, yerel `DATABASE_URL` ana makine adındaki bölge soneki (değer değil, yalnızca `ap-southeast-2` kısmı).

Etiketler: **KOD** = kodda ya da yapılandırmada görüldü. **DOĞRULANAMADI** = depodan anlaşılamıyor (hesap paneli, sağlayıcı ayarı ya da canlı veritabanı gerekiyor). Bu envanter hukuki görüş değildir.

## 1. Toplanan kişisel veriler

| Akış / uç nokta | Alanlar | Nerede saklanıyor | Amaç | Saklama süresi (kodda temizleme var mı) | Kimler görebilir |
|---|---|---|---|---|---|
| Vize Bilgi Raporu formu, `/full-check` (`app/[locale]/(main)/full-check/actions.ts`) | Ad soyad, e-posta, ülke, vize konusu, mevcut ülke, pasaport ülkesi, yaş, mesleğin adı/kodu, İngilizce düzeyi, eğitim düzeyi, Avustralya'da mı alındığı, yurt dışı/yurt içi deneyim yılı, sponsor/aile durumu, ilişki bilgisi, hedef şehir/eyalet, bütçe aralığı, zaman çizelgesi, en büyük endişe (serbest metin), ana hedef; sunucu tarafında istemci IP adresi (`x-forwarded-for`) | Prisma `user_reports`: `full_name`, `email`, `phone`, `locale`, `input_json` (tüm yanıtlar), `report_json` (üretilen rapor), `preview_data`, `ip_address`, `lead_score`, `lead_tier`, `points_tier`, `agent_id`, `payment_status`, `is_unlocked`, `unlock_method`, `is_free_promo`, `created_at`. Ayrıca Drizzle `full_check_waitlist` içine ekleme denenir; tablo canlıda yoksa hata yakalanıp geçilir (`CLAUDE.md`) | Raporu üretmek, ödeme sonrası PDF'i teslim etmek, e-posta göndermek, yönetici bildirimi, dahili ilgi puanı | Otomatik silme **yok** (cron'lar yalnızca kazıyıcılar ve eyalet izleme, `vercel.json`). Elle silme: yalnızca yönetici sırrıyla e-postaya göre `user_reports` satırlarını silen `resetUserReportLimit` (`full-check/actions.ts`) | Yönetici (yönetici panelleri, bildirim e-postaları); atanmış onaylı ajan yalnızca açık rıza kaydı varsa ad/e-posta/telefon/raporu görür (`lib/crm/agent-access.ts`); aksi halde referans ve satın alma durumu |
| Rapor kilidini açma adımı | Telefon (isteğe bağlı), e-posta eşleşmesi | `user_reports.phone` | Rapor erişimi, bildirim | Yukarıdaki gibi | Yukarıdaki gibi |
| İç puanlama | `lead_score`, `lead_tier` (form tamlığı/niyet), `points_tier` (Sıcak/Ilık/Soğuk, tahmini puana göre) hesaplanır (`computeInternalLeadTier`) | `user_reports` | Dahili önceliklendirme | Otomatik silme yok | Yönetici. Kod yorumuna göre ajanlara seviye gösterilmez (`lib/crm/agent-access.ts`) |
| Ücretsiz rehber/PDF indirme, `/guide`, `PdfDownloadModal`, `LeadMagnetForm` (`app/api/pdf-download/route.ts`) | Ad, e-posta, telefon (sunucu doğrulamasında isteğe bağlı), IP, PDF kimliği, koşulları kabul zamanı | Drizzle `pdf_downloads`: `full_name`, `email`, `phone`, `ip_address`, `pdf_slug`, `is_paid`, `terms_accepted_at`. Ayrıca `user_reports` içine bir ilgi satırı (`email`, `phone`, `ip_address`, kaynak) yazılır (`after()` bloğu). Prisma `guide_downloads` (ad, soyad, e-posta, telefon, dil, IP) yalnızca yönetici panelinde okunuyor; yazan kod bulunamadı | PDF bağlantısını e-postayla teslim etmek, ücretsiz kopya sayacı, yönetici bildirimi | Otomatik silme yok. Teslimat başarısız olursa `pdf_downloads` satırı serbest bırakılır (silinir) | Yönetici. Ajanlar için rehber havuzu kapalı (`AGENT_GUIDE_POOL_ENABLED = false`) |
| İletişim formu, `/contact` (`app/api/contact/route.ts`) | Ad soyad, e-posta, telefon, mesaj (en çok 5000 karakter) | Drizzle `contact_messages` | Mesajı yanıtlamak | Otomatik silme yok | Yönetici; bildirim e-postası yönetici adreslerine gider |
| Ödeme, `/api/checkout`, `/api/stripe/checkout`, webhook (`app/api/stripe/webhook/route.ts`) | E-posta, fatura adresi (Stripe zorunlu tutuyor), kart verisi yalnızca Stripe'ta; Stripe metadata: ürün türü, dil, kullanıcı kimliği, e-posta, rapor kimliği, ajan kimliği | Prisma `transactions`: `buyer_email`, `stripe_session_id`, tutar, GST, para birimi, komisyon, `agent_id`, `lead_id`; `user_reports.payment_status`; sohbet kredileri için `chat_credit_purchases` (e-posta, ziyaretçi kimliği, kredi) | Ödeme, rapor teslimi, muhasebe kaydı, ajan komisyon defteri | Otomatik silme yok. Şema notuna göre bir lead silinse bile işlem geçmişi silinmez (`onDelete: SetNull`) | Yönetici; ajan yalnızca kendi referanslarına ait satın alma durumunu görür |
| AI Asistan sohbeti, `/api/chat`, `/api/knowledge-chat` (`lib/chat/handler.ts`) | Mesaj metni; ziyaretçi kaydı: IP ve User-Agent (kimlik bunlardan türetilir), mesaj sayacı, kredi bakiyesi; isteğe bağlı hızlı profil kartı: yaş, meslek, İngilizce düzeyi, eğitim, deneyim yılı, ülke, eyalet, mevcut vize | `chat_visitors` (`ip_address`, `user_agent`, `fingerprint` sütunu var ama doldurulduğu kodda görülmedi, `message_count`, `premium_credits`), `chat_visitor_profiles` (`input_json`, `report_json`), `chat_credit_links` (e-posta, ziyaretçi kimliği). Sohbet mesajlarını `chat_messages` tablosuna yazan kod **bulunamadı** | Sohbeti yanıtlamak, ücretsiz mesaj sınırını (5) uygulamak, kredi bakiyesi | Otomatik silme yok | Yönetici |
| Sohbet kredisi geri yükleme (`app/api/chat/restore/*`, `lib/chat/restore.ts`) | E-posta, IP | `chat_restore_tokens` (belirtecin SHA-256 özeti, e-posta, bitiş, kullanım zamanı), `chat_restore_requests` (e-posta, IP, zaman) | Krediyi e-posta sahibine bağlamak, kötüye kullanımı sınırlamak (saatte e-posta başına 3, IP başına 10) | Belirteç ömrü 30 dakika (`RESTORE_TOKEN_TTL_MS`); süresi dolan satırları silen kod yok | Yönetici |
| Puan uyarıları, `/tools/invitation-rounds` (`actions.ts`) | E-posta, hedef puan, vize alt sınıfı | `points_alerts` (`email`, `target_points`, `visa_subclass`, `is_active`, `last_triggered`) | Kesim puanı düşünce e-posta göndermek | Otomatik silme yok; `app/api/alerts/unsubscribe` aboneliği kapatır | Yönetici |
| Hesap: Google girişi, e-posta bağlantısı (sihirli bağlantı), parola (`auth.ts`) | Ad, e-posta, profil resmi, OAuth belirteçleri (`accounts.access_token`, `refresh_token`, `id_token`), parola özeti (bcrypt), rol | `users`, `accounts`, `sessions`, `verification_tokens` | Giriş, kişisel panel | Sihirli bağlantı 10 dakika; oturum JWT'si 5 dakika boşta kalma; hesap silme akışı bulunamadı | Yönetici |
| Kayıt sayfası `/register` | Ad, e-posta, parola | `users` | Tüketici hesabı | Hesap silme akışı bulunamadı | Yönetici |
| Kişisel panel, `/dashboard` (giriş gerekli) | Kayıtlı hesaplamalar, test sonuçları, raporlar, vize takibi, yolculuk aşamaları, belge yükleme | `saved_calculations`, `saved_quiz_results`, `saved_reports`, `visa_tracking`, `visa_journeys`, `visa_documents`; dosyalar Cloudflare R2 özel kovasında (`lib/aws/s3.ts`), okuma yalnızca kısa ömürlü imzalı bağlantıyla | Kişisel takip ve belge kasası | Kullanıcı kendi hesaplama, test, takip ve yolculuk kayıtlarını silebilir (`dashboard/actions.ts`); R2 nesneleri için silme kodu görülmedi | Kullanıcı; yönetici |
| Herkese açık "Vize Yolculuğum", `/journey` ve `/api/journey-upload` | Yüklenen PDF/JPG/PNG/WEBP dosyası (en çok 10 MB); ilerleme tarayıcı `localStorage`'ında | Dosya R2 kovasında `journey-uploads/` önekiyle; veritabanı satırı yok; GET çağrısı 15 dakikalık imzalı bağlantı üretir | Kullanıcının kendi belge listesi | Silme kodu yok; kimlik doğrulama yok (yalnızca boyut/tür sınırı) | Dosya adresini bilen kişi (anahtar tahmin edilemez UUID içerir); yönetici R2 erişimi |
| CV sınıflandırma ve eşleştirme, `/api/anzsco-classify`, `/api/anzsco-match` | Yapıştırılan CV metni (en çok 20.000 karakter) | Depolanmıyor (bu rotalarda veritabanı yazımı yok). Metin OpenAI'ye gönderilir | Meslek önerisi | Uygulamada saklama yok | OpenAI'ye iletilir |
| Yönetici belge çözümleme, `/api/document-analyze` | Yönetici panelinden yüklenen belge ve `leadData` (ad, e-posta, meslek, İngilizce, yaş, ülke, hedef vize) | Depolanmıyor; OpenAI görüntü/metin API'sine gönderilir | Yönetici belge kontrolü | Uygulamada saklama yok | Yalnızca yönetici kullanır (`admin/leads/[id]`) |
| Ajan kaydı `/agent/register` | Ad, e-posta, parola, telefon, şirket adı (şemada adres de var) | `users` (rol AGENT, `approval_status` PENDING) | Ortak ajan hesabı | Silme akışı bulunamadı | Yönetici |
| Ajan yönlendirme rızası, `/api/referral-consent/*` | Rapor kimliği, ajan kimliği, olay (verildi/geri çekildi), rıza metni ve sürümü, dil, IP özeti, User-Agent (en çok 300 karakter), zaman | `referral_consents` (ham SQL, `prisma/manual-migrations/2026-10-10-create-referral-consents.sql`) | Rızanın kanıtı | Veritabanı tetikleyicisi güncelleme ve silmeyi reddeder; bölüm 5'e bakın | Yönetici; ajan yalnızca rıza durumuna göre müşteri verisini görür |
| Ajan atfı çerezi (`?ref=` / `?agentId=`) | Ajan kimliği | Tarayıcıda `logivisa_ref` çerezi | Müşteriyi ajana atamak, komisyon | 30 gün (`components/ref-capture.tsx`) | Sunucu, form gönderiminde okur |

## 2. Üçüncü taraflar ve alıcılar

| Sağlayıcı | Ne için | Gönderilen veri | Kanıt |
|---|---|---|---|
| Stripe | Ödeme | E-posta, fatura adresi (Stripe toplar), kart verisi (yalnızca Stripe), metadata (ürün, dil, kullanıcı kimliği, e-posta, rapor kimliği, ajan kimliği) | `app/api/checkout/route.ts`, `app/api/stripe/checkout/route.ts` |
| Resend | İşlemsel e-posta (rapor, PDF bağlantısı, sihirli bağlantı, sohbet geri yükleme, puan uyarısı, yönetici bildirimleri) | Alıcı adresi ve e-posta içeriği | `lib/email/*`, `RESEND_API_KEY`, `FROM_EMAIL` |
| OpenAI | Sohbet (`gpt-4o-mini` ücretsiz, varsayılan `gpt-4.1` kredili; `PREMIUM_CHAT_MODEL` ile değişir), gömme (`text-embedding-3-small`), CV sınıflandırma/eşleştirme, yönetici belge çözümleme | Kullanıcının sohbet mesajları, sistem isteminde bilgi parçaları; hızlı profil kartı veya bağlı rapor varsa meslek, puan dökümü, mevcut vize alt sınıfı, ikamet, değerlendirme ücreti (`lib/chat/profile.ts`: ad ve e-posta yok); CV metni; yönetici belge çözümlemede ad ve e-posta | `lib/chat/config.ts`, `lib/chat/deps.ts`, `lib/chat/profile.ts`, `app/api/anzsco-*/route.ts`, `app/api/document-analyze/route.ts` |
| Google Analytics 4 | Kullanım analitiği | Yalnızca onaydan sonra; yeniden kurulmuş, izin listeli sayfa adresi, yönlendiren sayfa, olaylar. Ad, e-posta, yanıt ve rapor bağlantıları gönderilmez (`lib/analytics/policy.ts`) | `components/analytics/analytics-provider.tsx` |
| ~~Meta Pixel~~ | **Kaldırıldı** (bu dalda, bkz. bölüm 10). Kaldırılan Pixel kimliği: `1499026238624549` (`lib/analytics/policy.ts` içinde sabit varsayılan, `NEXT_PUBLIC_META_PIXEL_ID` ile değiştirilebiliyordu) | Yalnızca "pazarlama" onayından sonra yükleniyordu; satın alma olayı `public/analytics/purchase-frame.html` çerçevesinden gidiyordu | git geçmişi |
| Vercel | Barındırma | İstek meta verileri (IP, User-Agent) altyapı düzeyinde işlenir; `vercel.json` bölge belirtmiyor | `vercel.json`, `next.config.ts` |
| Neon | PostgreSQL veritabanı | Bölüm 1'deki tüm veritabanı kayıtları | `.env.example`; yerel `DATABASE_URL` ana makine adı `…ap-southeast-2.aws.neon.tech`; `CLAUDE.md`: yerel ve Vercel `DATABASE_URL` aynı üretim veritabanı |
| Cloudflare R2 | Belge kovası | Yüklenen belgeler (`journey-uploads/` ve panel belgeleri) | `lib/aws/s3.ts` (`CLOUDFLARE_ACCOUNT_ID` uç noktası, bölge `auto`) |
| Google (OAuth) | Google ile giriş | Ad, e-posta, profil resmi, belirteçler | `auth.ts` (`AUTH_GOOGLE_ID`) |

`package.json` içinde Sentry, PostHog, Vercel Analytics, Hotjar ve benzeri izleme/kayıt SDK'sı bulunmadı. `@anthropic-ai/sdk` bağımlılığı var; uygulama kodunda SDK olarak kullanıldığı görülmedi. Sunucu günlükleri (`console.error`/`console.log`) Vercel günlüklerine düşer; `full-check/actions.ts` içindeki iki `console.log` satırı (1049 ve 1073) e-posta adresini günlüğe yazar. Günlük saklama süresi DOĞRULANAMADI. `@anthropic-ai/sdk` eşleşmeleri yalnızca `app/robots.ts` ve `proxy.ts` içindeki "anthropic-ai" bot adı dizgisidir.

## 3. Çerezler ve yerel depolama

| Ad | Tür | Amaç | Ömür | Onay gerekir mi |
|---|---|---|---|---|
| `lv_consent` | Çerez | Analitik/pazarlama seçimi | 1 yıl (`max-age=31536000`, `SameSite=Lax`, https'te `Secure`) | Seçimin kendisini saklar |
| `lv_consent_v1` | `localStorage` | Aynı seçim | Elle silinene kadar | Aynı |
| `lv_report_session` | Çerez, httpOnly, imzalı | Raporu oluşturan tarayıcıyı tanımak | 7 gün (`REPORT_SESSION_MAX_AGE`) | Hayır (işlevsel); kodda onaya bağlı değil |
| `logivisa_ref` | Çerez | Ajan atfı | 30 gün | Kodda onaya bağlı değil |
| `logivisa_admin_session` | Çerez, yönetici | Yönetici oturumu | 30 dakika boşta kalma | Yalnızca yönetici |
| `lv_qa` | Çerez | Yönetici QA modu (analitik kapalı) | Süresi bu çalışmada okunmadı | Yalnızca yönetici |
| NextAuth oturum çerezleri | Çerez | Giriş | JWT 5 dakika boşta kalma | Giriş yapanlar |
| `_ga*`, `_gid`, `_gat*` | Çerez (Google) | Analitik | Google tanımlar | Evet: kodda "analytics" onayına bağlı, onay geri çekilince silinir |
| `logivisa-journey-v1`, `visa-checklist-*`, `visa-checklist-questionnaire`, `lv_site_guide_nudge_until`, tema (`next-themes`) | `localStorage` | Yolculuk ilerlemesi, kontrol listesi, kılavuz ipucunu kapatma, tema | Elle silinene kadar | Kodda onaya bağlı değil; yalnızca tarayıcıda kalır |

Analitik koşulları (`lib/analytics/policy.ts`): yalnızca üretim dağıtımı ve üretim ana makinesinde yüklenir; onay yoksa hiçbir etiket yüklenmez; özel yollar (`/full-check/result`, `/dashboard`, `/admin`, `/agent`, `/sign-in`, `/login`, `/register`, `/journey`, `/api`) hiç göndermez; hassas sorgu anahtarı içeren sayfalar göndermez. GA4 yapılandırması: `allow_google_signals: false`, `allow_ad_personalization_signals: false`, `ad_storage`/`ad_user_data`/`ad_personalization` reddedilmiş. GA4'ün IP anonimleştirmesi ya da veri saklama süresi kodda ayarlanmıyor; mülk ayarları DOĞRULANAMADI.

## 4. Yurt dışı aktarım (veri bölgesi)

| Hizmet | Bölge | Durum |
|---|---|---|
| Neon (PostgreSQL) | Sydney, `ap-southeast-2` | Yerel yapılandırma ana makine adından. `CLAUDE.md` yerel ve Vercel'in aynı veritabanını kullandığını söylüyor. Vercel ortam değerinin kendisi DOĞRULANAMADI |
| Vercel (işlevler) | `vercel.json`'da bölge yok | DOĞRULANAMADI (proje ayarı panelde) |
| Cloudflare R2 | `region: auto` | Kovanın konum ipucu DOĞRULANAMADI |
| Stripe, Resend, OpenAI, Google Analytics, Meta | Kodda bölge ayarı yok | DOĞRULANAMADI (hesap/sağlayıcı ayarları) |

## 5. Ajan onay günlüğü (`referral_consents`)

- Saklananlar: rapor kimliği, ajan kimliği, olay (`granted`/`withdrawn`), rıza metni ve sürümü (`2026-10-v1`), dil, IP özeti, User-Agent (en çok 300 karakter), zaman. Ad, e-posta ve telefon bu tabloda **yok**; rapor kimliği üzerinden `user_reports` ile eşleşir.
- IP özeti: `sha256(AUTH_SECRET ya da NEXTAUTH_SECRET + ":" + ip)` değerinin ilk 32 onaltılık karakteri (`hashIp`, `lib/consent/referral-consent.ts`). Anahtarlı özet olduğu için gizli değer sızmadıkça IP geri çıkarılamaz; ancak IPv4 uzayı küçük olduğundan, gizli değeri bilen biri adayları deneyerek eşleştirebilir. Bu "anonim" değildir.
- "Asla silinmez" ifadesi kodla uyumlu: bir veritabanı tetikleyicisi `UPDATE` ve `DELETE` işlemlerini reddeder (`referral_consents_no_update_delete`). Geri çekme yeni bir satırdır. Bu, silme talebiyle çelişir (bölüm 7, soru 3). `/legal` metni de "asla düzenlenmez veya silinmez" diyor.
- Tablo yoksa ajan hiçbir müşteri verisini göremez ve onay kutusu gösterilmez (kodun "fail closed" davranışı). Tablonun canlıda varlığı DOĞRULANAMADI.

## 6. Silme ve saklama: kodun söylediği

- Otomatik süre sonu temizliği yok: cron'lar `scrape-eoi`, `scrape-ca-eoi`, `state-monitor` (`vercel.json`); `scrape-ca-draws` rotası var ama `vercel.json`'da planlı değil.
- Silme kodu olanlar: `user_reports` (e-postaya göre, yönetici sırrıyla), kullanıcının kendi panel kayıtları, teslimat başarısız olan `pdf_downloads` satırı.
- Silme kodu **bulunmayanlar**: `pdf_downloads`, `guide_downloads`, `contact_messages`, `chat_*` tabloları, `points_alerts` (yalnızca pasife alma), `transactions`, `users`/`accounts`, R2 nesneleri, e-posta sağlayıcı kayıtları. Bunlar için talep gelirse elle veritabanı işlemi gerekir.

## 7. Kurucunun kararı gerekli

1. **Saklama süreleri.** Öneri (karar sizin): ilgi/rehber satırları ve `pdf_downloads` için 12–24 ay; iletişim mesajları için yanıttan sonra 12 ay; `chat_restore_requests` ve süresi dolmuş `chat_restore_tokens` için 30 gün; `chat_visitors` IP/User-Agent için 90 gün; ödeme kayıtları için vergi/muhasebe gereği olan süre (muhasebecinize sorun). Sayfa bu sayıları içermiyor; yerine nötr bir ifade kullanıyor.
2. **Silme talebini kim, nasıl işler.** Şimdilik e-posta (`info@logivisa.com`) ve elle işlem. Bir silme betiği ya da yönetici eylemi gerekir (bu çalışmada yazılmadı).
3. **Ajan günlüğü ve silme hakkı.** Tetikleyici silmeyi engelliyor. Seçenekler: günlüğü bu haliyle tutup sayfada açıkça belirtmek (şu anki metin), ya da günlüğe ait kişisel olmayan satırları anonimleştirmeye izin veren bir karar/tetikleyici değişikliği.
4. **Çerez onayı.** Onay yalnızca GA4 ve Meta Pixel'i yönetiyor. `lv_report_session`, `logivisa_ref` ve `localStorage` anahtarları onaya bağlı değil. `logivisa_ref` bir izleme çerezi sayılabilir mi, karar sizin.
5. **IP adresi saklama.** `user_reports`, `pdf_downloads`, `guide_downloads` ve `chat_visitors` ham IP saklıyor. Gerekli mi, kısaltılsın mı?
6. **Telefon.** `/guide` sayfasında telefon alanı zorunlu (`*`) görünüyor, sunucu doğrulaması isteğe bağlı diyor (`lib/lead-magnet-validation.ts`). Hangisi olmalı?
7. **`full_check_waitlist` / `leads` tabloları.** Kod yazmayı deniyor; canlıda var mı?

## 8. DOĞRULANAMADI listesi

- Neon, Vercel, R2, Stripe, Resend, OpenAI, Google, Meta: veri bölgesi ve saklama ayarları (bölüm 4).
- Vercel günlük saklama süresi; günlüklerde kişisel veri kalıp kalmadığı.
- OpenAI hesabında veri paylaşımı/eğitim dışı bırakma ve API günlüğü saklama ayarı.
- GA4 mülk ayarları (veri saklama süresi, Google sinyalleri).
- `full_check_waitlist`, `leads` tablolarının ve `referral_consents` tablosunun canlıda varlığı.
- `chat_messages` / `chat_sessions` tablolarında eski satır olup olmadığı (yazan kod yok).
- `chat_visitors.fingerprint` sütununun doldurulup doldurulmadığı.
- `guide_downloads` tablosuna kimin yazdığı (okuyan yönetici sayfası var, yazan kod yok).
- R2 kovasının herkese kapalı olduğu, nesne saklama kuralı (kod "özel kova" diyor).
- `ADMIN_NOTIFICATION_EMAIL` alıcılarının kimler olduğu.
- Resend alıcı günlüklerinin saklama süresi.

## 9. Not olarak yazılanlar (değişiklik yapılmadı)

- `/terms`: "AI Visa Pathway Matcher", "PDF migration guides", "Turkish Edition" ve "Global English Edition" gibi bugünkü teklifle örtüşmeyen ürün adları; "all sales are final" ve "waiving any statutory right" ifadeleri. Dokunulmadı, karar sizin.
- `/legal` ve `/terms` sayfalarının `og:title`/`og:url` değerleri ana sayfayı gösteriyor; `/legal` başlığı ana sayfa başlığıyla aynı. Dokunulmadı.
- `components/trust-banner.tsx` (giriş ve belge kasası): "256-bit AES Encryption | Private Cloud Storage | Designed for Australian Privacy Standards". Bu iddialar kodda doğrulanamıyor. Dokunulmadı; kaldırmanız önerilir.
- Çerez onay penceresi ve `LeadMagnetForm` "gizlilik bilgileri" bağlantıları `/legal`'a gidiyordu. Bu çalışmada yeni `/privacy` sayfasına çevrildi (bkz. değişen dosyalar).
- Yeni Gizlilik Politikası ile çelişen eski cümleler (dokunulmadı): `components/LeadMagnetForm.tsx` (e-posta dışı kip) ve `components/PdfDownloadModal.tsx` "Bilgileriniz yalnızca bu indirme için kullanılır ve üçüncü taraflarla paylaşılmaz" diyor; oysa indirme e-postayı Resend gönderir, `user_reports` içine ilgi satırı yazılır ve ekibe bildirim gider. `PdfDownloadModal` Türkçe metni diakritiksiz ("yalnizca", "icin", "ucuncu").
- `/guide` formu: telefon alanı arayüzde zorunlu (`translations.guidePage.form.phoneRequired`, `rehber/DownloadForm.tsx`), sunucu doğrulaması ise isteğe bağlı (`lib/lead-magnet-validation.ts`).
- Çerez onay metni "Meta Pixel ... reklamlarımızı ölçmek için" diyor; Meta Pixel kodda yüklü ve bir varsayılan Pixel kimliği var (`lib/analytics/policy.ts`). Ücretli reklam kullanmıyorsanız bu bileşeni kaldırmak veri yüzeyini küçültür.
- Korumalı belirteç dosyası `protected-tokens.json` Kanada çeviri korumasına ait bir başvuru listesi; kodda hiçbir yerde okunmuyor. Gizlilik sayfası için geçerli bir belirteç yok. Aynı niyeti korumak için EN/TR/ZH metinlerinde e-posta, sağlayıcı adları ve sayıların aynı kalmasını denetleyen bir test eklendi (`scripts/test-privacy-page.ts`).

## 10. Meta Pixel kaldırma (Adım 3)

- Kaldırılan Pixel kimliği: **1499026238624549**. Meta hesabında bu kimliğe bağlı veri kümesi ve olay geçmişi durur; kapatmak ya da silmek için Meta Events Manager'dan yapılır (bu çalışmada yapılmadı). Vercel'de `NEXT_PUBLIC_META_PIXEL_ID` tanımlıysa silinebilir.
- Kodda kaldırılanlar: `loadPixel`/`fbq` yükleyicisi (`components/analytics/analytics-provider.tsx`), `META_PIXEL_ID` ve Pixel alanları (`lib/analytics/policy.ts`), onay penceresindeki Meta metni ve "reklam" seçeneği (`components/analytics/consent-banner.tsx`), satın alma çerçevesi (`public/analytics/purchase-frame.html`, `next.config.ts` başlığı, `purchase-client.ts`, `purchase-tracker.tsx`), yönetici QA sayfası metni, gizlilik politikasındaki Meta bölümleri ve `_fbp`/`_fbc` çerezleri.
- Onay yapısı: `lv_consent_v1` artık `{v:1, analytics, ts}`. Daha önce saklanmış `marketing` alanlı seçimler okunmaya devam eder (alan yok sayılır). `lv_consent` çerezi `a` ya da `-` değeri taşır (eskiden `am`/`a-`/`-m`/`--`).
- GA4 akışı: onay yokken yüklenmez, "Yalnızca gerekli olanlar" kapalı tutar, onay geri çekilince `_ga*` çerezleri silinir. Değişmedi.

## 11. Üretim veritabanı salt-okunur kontrolü (6 Kasım 2026, düzeltmeler)

Yalnızca `SELECT`, `READ ONLY` işlem içinde. `PROD_DATABASE_URL` kimlik doğrulamayı geçemedi; aynı sorgular `DATABASE_URL` ile (yine `READ ONLY` işlemde) çalıştı. Son 48 saatteki satır sayıları: `users` 0, `leads` 0, `user_reports` 0, `pdf_downloads` 0, `guide_downloads` 0, `contact_messages` 0, `chat_visitors` 5, `transactions` 0, `full_check_waitlist` 0, `referral_consents` **tablo yok**.

Bu bölümün önceki bölümlere düzeltmeleri:
- `referral_consents` tablosu canlıda **yok** (manuel migrasyon uygulanmamış). Kod "fail closed" çalışır: hiçbir ajan müşteri bilgisi göremez, rıza kutusu gösterilmez, onay günlüğü şu an hiçbir şey kaydetmez. Bölüm 5'teki "tetikleyici" bu yüzden şu an canlıda da yok.
- `leads` ve `full_check_waitlist` tabloları canlıda **var** (`CLAUDE.md` yok diyordu).
- `guide_downloads` tablosuna `app/[locale]/(main)/rehber/actions.ts` yazıyor (`/guide` ve `/rehber` formları). Bölüm 1 ve 8'deki "yazan kod bulunamadı" ifadesi yanlıştı.

## 12. Ham IP, silme, saklama: bu dalda yapılanlar

- **Ham IP artık yazılmıyor:** `user_reports` (rapor formu, rehber formu, PDF indirme), `guide_downloads`, `pdf_downloads` (NOT NULL olduğu için boş dize) ve `chat_visitors`. Şema değişmedi.
- **Sohbet kimliği:** ziyaretçi eskiden IP+User-Agent ile tanınıyordu. IP yazılmadığı için tarayıcı artık `chat_visitors.fingerprint` (IP'nin `AUTH_SECRET` ile HMAC-SHA256 özeti, 32 karakter) + User-Agent ile tanınıyor (`lib/privacy/ip.ts`, `lib/visitor-tracking.ts`). Bu takma addır, anonim değildir. Eski satırlar (ham IP'li, fingerprint'siz) ilk istekte benimsenir: fingerprint yazılır, IP silinir; kredi bakiyesi korunur.
- **Hız sınırı:** "her IP için her rehberden bir kopya" kuralı artık bellekte, sunucu örneği başına ve 24 saatlik (`createSeenSet`). Çok örnekli üretimde en iyi çaba düzeyindedir. E-posta başına kural (`/guide`: aynı e-posta tekrar indiremez) veritabanında sürüyor.
- **Dokunulmayanlar:** `chat_restore_requests.ip_address` (kredi geri yükleme hız sınırı, saatte IP başına 10) ve `referral_consents.ip_hash`. Politika ilkini açıkça söylüyor.
- **`scripts/null-raw-ip.ts`** mevcut ham IP'leri temizler (varsayılan kuru çalıştırma; `chat_visitors` için önce fingerprint yazar). **Çalıştırılmadı.**
- **`scripts/delete-user-data.ts`** e-postayla silme (varsayılan kuru çalıştırma; her çalıştırma `logs/data-requests.jsonl` dosyasına e-posta yerine SHA-256 kısaltmasıyla yazılır, dosya git'te yok sayılır). Ödeme kayıtlarını, `chat_credit_purchases`'ı, `referral_consents`'ı, e-postasız `chat_visitors` satırlarını ve AGENT/ADMIN hesaplarını silmez; depolama kovasındaki dosya anahtarlarını silmek yerine listeler. **Çalıştırılmadı.**
- **Saklama temizliği:** `lib/retention/run.ts` + `app/api/cron/retention/route.ts`, `vercel.json` içinde haftalık (`0 18 * * 0`). Süreler: ödeme kayıtları 5 yıl; iletişim mesajları 12 ay; rehber indirmeleri (`guide_downloads`, `pdf_downloads`) ve rapor girdileri (`user_reports`, `leads`, `full_check_waitlist`) 24 ay; sohbet (kredisiz ve e-postaya bağlı olmayan ziyaretçiler, profilleri, geri yükleme belirteç ve istekleri) 90 gün. **`RETENTION_DRY_RUN` tam olarak `false` olmadıkça yalnızca sayar.** Kredi bakiyesi olan ziyaretçiler silinmez (fiyat sayfası "krediler asla sona ermez" diyor). Üretimde silme açılmadı; dağıtım yapılırsa cron haftada bir yalnızca sayım yapıp günlüğe yazar.
- **Çerezler:** `logivisa_ref` onaya bağlı değil ve politikada açıkça yazılı; `lv_report_session` zorunlu çerez olarak yazılı. Çerez onayı yalnızca Google Analytics'i yönetiyor.

## 13. Ajan onay günlüğü: kişiye hangi alanla bağlanıyor (yalnızca bulgu, uygulama yok)

`referral_consents` satırı şu alanları taşır: `report_id`, `agent_id`, `event`, rıza metni ve sürümü, `locale`, `ip_hash`, `user_agent` (en çok 300 karakter), `created_at`. Ad, e-posta ve telefon yoktur.

- **Kişiye bağ:** yalnızca `report_id` üzerinden, o da `user_reports.id` (rastgele UUID). Kişiyi tanıtan alanlar (`full_name`, `email`, `phone`, `input_json`) `user_reports` satırındadır. `report_id` için veritabanında yabancı anahtar yoktur (tablo ham SQL ile oluşturulmuş).
- **`user_reports` satırı silinirse** (`delete-user-data.ts` ya da 24 aylık temizlik): günlük satırları kalır, ama doğrudan bir kişiye bağlanamaz hâle gelir; elde yalnızca bir UUID, bir ajan kimliği, rıza metni, `ip_hash` ve user agent kalır. `ip_hash` anahtarlı bir özettir (`AUTH_SECRET`); gizli değeri bilen biri aday IP'leri deneyerek eşleştirebilir, bu yüzden "anonim" değil "kimliksiz" demek daha doğru.
- **Kalan dış bağlar** (kodun dışında): Stripe oturum `metadata`'sında `reportId` ve e-posta (Stripe tarafında silinmez), Resend'in gönderim günlükleri (rapor bağlantısında `reportId` var), `transactions.lead_id` (satır silinince NULL olur), Neon'un geçmiş/yedek kayıtları ve `user_reports` silinmeden önce alınmış her yedek.
- **Şu an:** tablo canlıda yok (bölüm 11), yani günlükte hiçbir satır bulunmuyor.

### 13a. Düzeltme (7 Kasım 2026): ajan onay günlüğü şu an çalışmıyor

Bölüm 13'teki alan ve bağ analizi **tablo oluşturulursa** geçerlidir. Bugün `referral_consents` üretimde yok (bölüm 11), dolayısıyla:
- Günlükte hiçbir satır yok ve yazılmıyor. Rıza kutusu form'da gösterilmiyor: `app/api/referral-consent/prompt/route.ts` yalnızca `consentTableReady()` doğruysa `show: true` döner ("saklayamayacağımız bir seçeneği sunmayız"). Rıza yazımı başarısız olursa kod "rıza yok" sayar ve satın alma akışını bozmaz (`lib/consent/referral-consent.ts`).
- Hiçbir ajan müşteri adı, e-postası, telefonu veya raporu görmez (`canAgentSeeClient` rıza satırı gerektirir). Ajan e-postaları ve portal yalnızca "bir lead atandı" ve referansla satın alma durumunu gösterir (`lib/email/agent-notifications.ts`, `lib/crm/leads.ts`). Komisyon ve `logivisa_ref` çerezi (30 gün) çalışmaya devam eder.
- `/legal` (EN/TR/ZH) ve `/privacy` buna göre yeniden yazıldı: paylaşım etkin değil, kutu gizli, ajan referansı ve satın alma durumunu görür, bilgileri görmez. "Onay kaydı / yalnızca ekleme günlüğü / geri çekme bağlantısı" ifadeleri kaldırıldı.
- **`/terms` bölüm 12 (dokunulmadı):** hâlâ "adınızı, e-postanızı, telefonunuzu ve raporunuzu o danışmanla yalnızca onay kutusunu işaretlerseniz paylaşırız... rıza kayıt günlüğü" diyor. Paylaşım kapalı olduğu için yanlış bir vaat değil ama bugünkü durumu anlatmıyor; karar sizin.
- Tabloyu oluşturmak ayrı bir üretim yazmasıdır (`prisma/manual-migrations/2026-10-10-create-referral-consents.sql`) ve burada yapılmadı.
