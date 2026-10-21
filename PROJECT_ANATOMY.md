# LogiVisa — Proje Anatomisi

Next.js App Router (TypeScript) tabanlı bir vize-hazırlık değerlendirme SaaS'ı (Avustralya/Kanada göçmenlik puan hesaplayıcıları, B2C rapor satışı, B2B acente CRM'i, AI asistan). Aynı Postgres (Neon) veritabanına karşı **hem Prisma hem Drizzle** birlikte kullanılıyor — bkz. [CLAUDE.md](CLAUDE.md) ve aşağıdaki "Mimari Notlar" bölümü.

Bu doküman 5 paralel araştırma turunun birleştirilmiş halidir: (1) genel/tüketici sayfaları, (2) acente+admin CRM portalı, (3) API route'ları/webhook'lar, (4) veri katmanı ve iş mantığı (`lib/`, Prisma/Drizzle şemaları), (5) UI bileşenleri ve app shell.

---

## Mimari Notlar (baştan okunmalı)

- **İki ORM, tek veritabanı:** `prisma/schema.prisma` ve `db/schema.ts` (Drizzle) aynı Postgres DB'ye yazıyor. Drizzle'ın sahip olduğu bazı tablolar Prisma'da `@@ignore` olarak tanımlı (introspect edilmiş, `prisma db push` bunları silmeye kalkışmasın diye): `campaigns`, `contact_messages`, `pdf_downloads`, `visa_types`, `visa_structured_data`, `source_snapshots`, artı `agent_referrals`/`agents` (CLAUDE.md'de anılan). Drizzle ayrıca canlı DB'de henüz var olmayabilecek tablolar da tanımlıyor (`full_check_usage`, `full_check_waitlist`, `leads`) — kod bunları `lib/db/missing-relation.ts` ile yakalayıp zarifçe boş sonuca düşürüyor, 500 vermiyor.
- **İki paralel admin sistemi:** `app/[locale]/(main)/admin/**` (eski, tek şifreli cookie-session, `lib/admin-auth.ts`) ve `app/[locale]/(portal)/admin/crm/**` (yeni, NextAuth rol-tabanlı, `lib/auth/rbac.ts`). İkisi de çoğunlukla **aynı Prisma satırlarına** (`UserReport.agentId`, `User.approvalStatus`) yazıyor ama ayrı auth kontrolleriyle — kasıtlı, çünkü bir operatörün NextAuth session'ı olmayabilir.
- **Özel i18n sistemi (next-intl DEĞİL):** `public/locales/{en,tr,zh-Hans}.json` düz anahtar-değer katalogları. Sunucu tarafında `lib/i18n/get-translations.ts` (`t()`) veya `lib/i18n/get-dictionary.ts`; istemci tarafında `contexts/language-context.tsx` (`useTranslation()`).
- **UserReport = "Lead":** Hem B2C değerlendirme raporu hem CRM lead kaydı aynı Prisma modeli (`UserReport`). `isUnlocked` alanı "ödendi mi" bayrağının kanonik hali (ayrı bir `isPremium`/`paymentStatus` icat edilmedi).
- **Stripe:** Tek gerçek webhook `app/api/stripe/webhook/route.ts`; `app/api/webhooks/stripe/route.ts` sadece Stripe Dashboard'daki eski URL'yi karşılamak için var olan ince bir re-export.

---

## 1. Genel/Tüketici Sayfaları — `app/[locale]/(main)/**`

Sitenin tüm herkese açık yüzü: ana sayfa, ücretsiz/ücretli değerlendirme hunisi (full-check), vize/puan referans içerikleri, self-servis araçlar, hafif tüketici dashboard'u, auth sayfaları, checkout, ve legacy admin. Hepsi `app/[locale]/(main)/layout.tsx` altında: `LanguageProvider`, `RefCapture` (`?ref=<agentId>` → `logivisa_ref` cookie, sonra acenteye otomatik lead ataması için), shared header/footer, locale-aware SEO metadata.

### Ana Sayfa
- **`page.tsx`** — Canlı sayaçlarla (`getCachedPdfLeadDownloadStats`, `getCachedFullCheckUsage`) `HomeContent` client bileşenini render eder.

### `full-check/` — Ürünün kalbi
- **`page.tsx`** — Giriş formu; `getFreePromoStatus()` ile kalan ücretsiz slot sayısını okur, `FullCheckInteractiveSection`'ı render eder.
- **`actions.ts`** (~1800 satır) — Rapor üretim pipeline'ının merkezi:
  - `submitFullCheckWaitlist()` — form doğrulama, email dedup, `full_check_usage` (Drizzle) atomik artırma, `runReadinessEngine()` çağrısı, `createUserReport`, referral agent çözümleme (`logivisa_ref` cookie), internal lead tier hesaplama, Resend email'leri.
  - `unlockPremiumReport()` — non-admin kullanıcılar için her zaman `/api/checkout`'a devrediyor (tek doğru Stripe/free-promo mantığı orada); admin-whitelist email'ler checkout'u bypass edip direkt PDF üretiyor.
  - `resetUserReportLimit()` — admin-secret korumalı, kullanıcının `UserReport` kayıtlarını siliyor (`admin-tools` tarafından kullanılıyor).
  - Hem Drizzle (`fullCheckUsage`, `fullCheckWaitlist`) hem Prisma (`userReport`) kullanıyor.
- **`free-promo-actions.ts`** — `getFreePromoStatusAction()`, unlock modalı açılırken taze durumu tekrar kontrol eder.
- **`result/page.tsx`** + **`result-view.tsx`** — Rapor görüntüleme; kilitliyse `PremiumFeatureGate` paywall'ı (bulanık önizleme + $49 unlock CTA'sı), açıksa tam rapor + PDF indirme linki.
- **`step-1-personal.tsx`, `step-2-career.tsx`, `step-3-language.tsx`, `full-check-interactive-section.tsx`, `full-check-waitlist-form.tsx`** — çok adımlı form bileşenleri.

### `checker/` — `redirect("/")` stub'ı (eski link uyumluluğu).

### `results/` — Hızlı, kayıtsız vize eşleştirme teaser'ı (`matchVisas()`, `lib/visa/match-visas.ts`), full-check'e yönlendiriyor.

### `reports/` — AU/CA ülke seçim sayfası, `full-check?country=<code>`'a link veriyor.

### `rounds/` — Genel "Invitation Rounds" akışı; `prisma.invitationFeedItem`/`invitationVolume` okuyor (missing-relation-safe).

### `visas/` — Statik/JSON tabanlı vize referans içeriği
- **`[subclass]/page.tsx`** (748 satır) — `src/data/visa-details.json` tabanlı dinamik vize detay sayfası.
- **`australia/page.tsx`**, **`canada/page.tsx`** (911 satır) — ülke bazlı indeksler, birçok JSON veri dosyasını (`express-entry.json`, PNP, Quebec, kırsal pilot vb.) topluyor.
- Ayrıca 9 adet bağımsız statik Kanada-patika sayfası (`canada-family-sponsorship`, `canada-pnp-non-express-entry`, `canada-quebec-*`, `canada-rural-pilot`, vb.), her biri kendi JSON dosyasından besleniyor.

### `tools/` — Bağımsız hesaplayıcı/bulucu kümesi (self-servis SEO/lead-gen)
- **`points-calculator/`** — AU/CA + meslek-bazlı `[slug]` dinamik sayfalar.
- **`invitation-rounds/`** — `actions.ts`: `savePointsAlert()` (cutoff-düşüş email uyarısı, `pointsAlert` upsert).
- **`anzsco-finder/`**, **`document-checklist-2026/`**, **`english-points/`**, **`skills-assessment/`**, **`state-nomination/`**, **`visa-comparison/`** — her biri kendi client bileşeni + SEO içerik yardımcılarıyla.

### `points-calculator/` — `tools/points-calculator`'dan **ayrı**, daha basit tek-sayfalık AU hesaplayıcı (`calculateAustraliaPoints()`, sunucuya gitmiyor).

### `pr-readiness-quiz/` — 8 soruluk lead-gen quiz'i.

### `occupation-checker/` — Serbest metin meslek arama (`checkOccupation()`).

### `occupations/[id]/` — SEO meslek-detay sayfası (`MiniCvTeaser`, `StateDemandRadar`).

### `resources/occupation-list/` — 2026 Resmi Meslek Listesi lead-magnet sayfası.

### `guides/`, `guide/`, `rehber/` — İçerik pazarlama hub'ı + iki neredeyse-aynı PDF lead-magnet indirme sayfası (EN/TR). `rehber/actions.ts`'teki `submitDownloadForm()` hem `guideDownload` hem `userReport` (source: "guide_download") yazıyor — aynı lead pipeline'ına besleniyor.

### `legal/`, `terms/` — Statik uyum/koşullar içeriği (locale bazlı ayrı bileşenler).

### `contact/` — `/api/contact`'a POST eden form (server action değil, route handler).

### `ai-visa-match/` — CV→ANZSCO eşleştirme sayfası (`AnzscoClassifier`).

### `assistant/` — Sohbet tarzı AI asistan
- **`actions.ts`** — `runAssistantMessage()` (RAG context + grounded answer), `runReadinessPreview()` — `runReadinessEngine()`'i kayıt yapmadan direkt çağıran, kayıtsız bir full-check teaser'ı.

### `register/`, `sign-in/` — NextAuth credentials + Google OAuth tüketici hesap sayfaları (bu, `(portal)`'daki rol sisteminden ayrı ama aynı `@/auth` NextAuth instance'ı).

### `dashboard/` — Giriş yapmış tüketici portalı (puan hesaplamaları, quiz sonuçları, kayıtlı raporlar, vize takibi/journey timeline). Tüm action'lar `requireUserId()` ile scope'lanıyor.

### `checkout/` — Kampanya paywall'ı (`[campaignSlug]`, Drizzle `campaigns` tablosu), success/cancel sayfaları. Success sayfası Meta Pixel `Purchase` event'i atıyor.

### `admin-tools/` — URL query token (`?ADMIN_TOKEN=`) korumalı tekil araç; `resetUserReportLimitFromForm`'u çağırıyor.

### `admin/` (LEGACY, şifre-cookie) — `lib/admin-auth.ts` ile korunan eski admin alanı
- **`leads/`** — Tüm `UserReport` listesi, lead detay + acente atama.
- **`agents/`** — Acente onay kuyruğu (`approveAgentLegacy`/`rejectAgentLegacy`).
- **`dashboard/`** — Dönüşüm/huni özet paneli.
- **`data-sync/`** — Manuel veri yükleme hub'ı (federal/state göç kaynakları, scraper bot yok, admin dosyayı elle indirip yüklüyor).
- **`eoi-rounds/`**, **`states/`**, **`visas/`**, **`full-check-waitlist/`** — ek CRUD/config ekranları.

---

## 2. Portal: Acente + Admin CRM — `app/[locale]/(portal)/**` + Legacy Admin Köprüsü

### Auth & RBAC
- **`lib/auth/rbac.ts`** — `Role = "ADMIN"|"AGENT"|"USER"`. `getCurrentUser()`, `isApprovedAgent()`, `homePathForRole()`, `requireRole()` (yetkili sunucu-bileşen/action guard'ı — `proxy.ts`'nin ilk-hat kontrolüne ek savunma katmanı).
- **`proxy.ts`** (repo kökü, middleware) — `/agent/**` → AGENT rolü, `/admin/crm/**` → ADMIN rolü ister; `/agent/register` hariç tutuluyor (public kalmalı). Legacy `/admin/**` ayrı, `logivisa_admin_session` cookie'siyle korunuyor.
- **`lib/admin-auth.ts`** — Legacy admin'in şifre-cookie auth'u (SHA-256 + timing-safe compare).
- **`app/api/admin/bridge-legacy-session/route.ts`** — NextAuth ADMIN oturumunu legacy admin cookie session'a köprülüyor.

### Acente Portalı (pool/dashboard/earnings/lead detay)
- **`agent/pool/page.tsx`** + **`actions.ts`** — Sahiplenilmemiş lead havuzu; `claimLeadAction()` — rol+onay kontrolü, `claimLead()` (race-safe), başarı sonrası email + `/agent/lead/[id]`'e yönlendirme.
- **`agent/dashboard/page.tsx`** — "Bana atanan lead'ler"; tier/sort filtreleri.
- **`agent/earnings/page.tsx`** — Komisyon özeti + geçmişi (`getAgentEarnings`, `getAgentTransactions` — acente-scope'lu).
- **`agent/lead/[id]/page.tsx`** + **`actions.ts`** — Tek lead detayı, sahiplik-scope'lu (`getAgentLead(user.id, id)`); `updateLeadStatusAction()` — DB sorgusunun kendisi `agentId` eşleşmesini garantiliyor.
- **`agent/register/actions.ts`** — Public self-registration, `approvalStatus: "PENDING"` ile başlıyor.
- **`agent-nav.tsx`** — pool/dashboard/earnings arası paylaşılan navigasyon.
- **`login/actions.ts`** — Portal-geneli credentials login, role'e göre callback URL doğrulaması.

### Admin CRM (NextAuth)
- **`admin/crm/dashboard/page.tsx`** — Ana panel: acente listesi+tier dağılımı, `LeadAssigner` (atanmamış lead'ler için).
- **`admin/crm/agent/[id]/page.tsx`** — Tek acente görünümü: profil, metrikler, atanan lead'ler (sort/filter), komisyon.
- **`admin/crm/lead/[id]/page.tsx`** — Herhangi bir lead'e tam, scope'suz erişim; doküman-statüsü düzenleme burada YOK (acentenin işi), ama notlar paylaşımlı (`LeadNotes`).
- **`admin/crm/agents/pending/page.tsx`**, **`agents/create/page.tsx`** — Onay kuyruğu, admin-tetikli acente oluşturma.
- **`admin/crm/actions.ts`** — `assignLeadToAgent()`, `approveAgentAction()`, `rejectAgentAction()`, `createAgentAction()` — her biri kendi `requireAdmin()` kontrolünü kendi içinde tekrarlıyor (Server Action'lar doğrudan çağrılabilir public endpoint'ler olduğu için, sadece sayfa gate'ine güvenmiyor).

### Legacy Admin (şifre-cookie)
`app/[locale]/(main)/admin/**` — yukarıda "Genel Sayfalar" bölümünde detaylandırıldı; burada tekrar not: `assignLeadToAgentLegacy`/`approveAgentLegacy`/`rejectAgentLegacy` CRM'in action'larıyla **aynı DB satırlarına** yazıyor, sadece auth kontrolü farklı.

---

## 3. API Route'ları & Top-Level Server Actions — `app/api/**`, `app/actions/**`

### Stripe & Ödemeler
- **`app/api/stripe/webhook/route.ts`** — Tek gerçek Stripe webhook'u. `checkout.session.completed`'ı 4 senaryoya ayırıyor: kampanya PDF satın alma, pdf_book satın alma, AI kredi paketi, ve varsayılan olarak premium rapor unlock'u (PDF üretimi + komisyon kaydı, hepsi best-effort/non-blocking).
- **`app/api/webhooks/stripe/route.ts`** — Yukarıdakinin ince re-export'u (sadece Stripe Dashboard'daki eski URL için).
- **`app/api/checkout/route.ts`** — Checkout session oluşturma; email-sahiplik doğrulaması, atomik free-promo grant, sadakat indirimi.
- **`app/api/stripe/checkout/route.ts`** — AI-asistan kredi paketleri için ayrı checkout (anonim `ChatVisitor` kimliğiyle).
- **`app/api/stripe/vip-unlock/route.ts`** — Tek hardcoded founder email için Stripe'ı bypass eden VIP unlock.

### Full-Check
- **`app/api/full-check/progress/route.ts`** — Uzun süren analiz job'unun ilerleme durumu (polling).
- **`app/api/full-check/remaining-spots/route.ts`** — Cache'li public "kalan ücretsiz slot" sayacı.

### Cron İşleri
Hepsi `Authorization: Bearer <CRON_SECRET>` ile korunuyor: **`scrape-ca-draws`**, **`scrape-ca-eoi`**, **`scrape-eoi`** (+ points-alert tetikleme), **`sync-states`** (henüz implemente edilmemiş, sadece iskelet).

### Admin API'ları
**`bridge-legacy-session`**, **`full-check-runtime-diagnostics`**, **`revalidate-full-check-usage`**, **`states`** (StateNominationConfig CRUD) — çeşitli secret/role kontrolleriyle.

### Auth
**`app/api/auth/[...nextauth]/route.ts`** — NextAuth v5 catch-all handler, gerçek config repo kökündeki `auth.ts`'de.

### AI/Chat
- **`app/api/chat/route.ts`** — Tek rapor bağlamına scope'lu streaming asistan (OpenAI, fallback stream ile).
- **`app/api/knowledge-chat/route.ts`** — Genel amaçlı RAG chatbot (pgvector, `document_chunks`), anonim `ChatVisitor` kotası (5 ücretsiz mesaj, sonra premium/kredi gerekiyor).
- **`app/api/anzsco-classify/route.ts`** — CV→ANZSCO sınıflandırma, anti-halüsinasyon: model sadece ön-filtrelenmiş aday listesinden seçebiliyor.
- **`app/api/anzsco-match/route.ts`** — CV↔meslek eşleşme yüzdesi.
- **`app/api/document-analyze/route.ts`** — Belge (pasaport/İngilizce testi/skills assessment) görsel analiz + doğrulama.

### Diğer
- **`app/api/agent/lead/[id]/pdf/route.ts`** — Lead PDF'i, AGENT (kendi lead'i) veya ADMIN (herhangi biri) erişimiyle.
- **`app/api/alerts/unsubscribe/route.ts`**, **`app/api/contact/route.ts`**, **`app/api/pdf-download/route.ts`** (ücretsiz PDF lead-magnet akışı, `after()` ile async lead oluşturma), **`app/api/reports/[reportId]/pdf/route.ts`**, **`app/api/viability/route.ts`** (puan vs. tarihi cutoff karşılaştırması), **`app/api/visitor/route.ts`**.

### Top-Level Server Actions (`app/actions/`)
- **`admin/import-data.ts`** — Admin Data Sync panelinin manuel Excel/CSV import mantığı (WA için özel state-machine parser dahil).
- **`leadMagnetActions.ts`** — Atomik kampanya slot düşürme.
- **`stripeActions.ts`** — Kampanya checkout session'ı, referral agent çözümleme.

---

## 4. Veri Katmanı & İş Mantığı — `prisma/schema.prisma`, `db/schema.ts`, `lib/**`

### Prisma Şeması (900 satır) — model grupları
- **CRM/Lead:** `UserReport` (= "Lead"), `Transaction` (komisyon defteri), `LeadNote`.
- **Auth (NextAuth):** `User`, `Account`, `Session`, `VerificationToken`.
- **Tüketici dashboard:** `SavedCalculation`, `SavedQuizResult`, `SavedReport`, `VisaTracking`, `VisaJourney`+`VisaDocument`.
- **Lead magnet:** `GuideDownload`, `GuideConfig`.
- **Puan/göç veri akışları:** `OccupationStat`, `PointsAlert`, `EoiRound`, `InvitationFeedItem`, `InvitationVolume`, `ExpressEntryDraw`, `CaEoiRound`.
- **DHA Invitation Rounds & Tahmine Dayalı Analitik:** `InvitationRound`, `Occupation`, `RoundCutoff`, `StateAllocation`.
- **Admin/veri kalitesi:** `ScraperSyncLog`, `StateIntelligence`, `StateNominationConfig` (en yüksek öncelikli kaynak), `StateOccupationListEntry`.
- **AI Chatbot:** `ChatVisitor`, `ChatSession`, `ChatMessage`, `DocumentChunk` (pgvector, `$queryRaw` ile erişiliyor).
- **Drizzle-sahipli, `@@ignore`:** `campaigns`, `contact_messages`, `pdf_downloads`, `visa_types`, `visa_structured_data`, `source_snapshots`.

### Drizzle Şeması (`db/schema.ts`, 195 satır)
`visaTypes`, `visaStructuredData`, `sourceSnapshots` (vize içeriği + RAG kaynak PDF'leri), `fullCheckWaitlist`, `leads` (Prisma'nın `UserReport`'una paralel, canlı değil), `fullCheckUsage` (tekil sayaç), `pdfDownloads`, `campaigns` (atomik slot sayacı), `contactMessages`.

### `lib/` alt dizinleri (özet)
- **`lib/ai/`** — RAG context retrieval + grounded answer üretimi (`retrieve-visa-context`, `retrieve-state-context`, `generate-grounded-answer`, `visa-assistant`).
- **`lib/alerts/`** — `check-points-alerts.ts` — cron-tetiklemeli email uyarı sistemi.
- **`lib/auth/rbac.ts`** — yukarıda.
- **`lib/cache/public-read-models.ts`** — `unstable_cache` ile sarılmış public sayaçlar/istatistikler.
- **`lib/constants/`** — statik referans veri (migration sources, visa documents/stages enum'ları).
- **`lib/crm/`** — `leads.ts` (agent/admin lead sorgu katmanı), `tiers.ts`, `notes.ts`/`notes-actions.ts` (paylaşımlı LeadNote sistemi), `transactions.ts` (komisyon sorguları), `pdf-lead-sources.ts`.
- **`lib/db/missing-relation.ts`** — `isMissingRelationError`/`isMissingColumnError`, proje genelinde "eksik tablo/kolon" zarif düşüş deseni.
- **`lib/email/`** — `pdf-delivery.ts` (PDF_SLUGS tek kaynak), `agent-notifications.ts` (lead atama email'i).
- **`lib/i18n/`** — `config.ts`, `get-translations.ts`, `get-dictionary.ts`, `checklist-content.ts`.
- **`lib/occupations/`** — AU/CA meslek arama (`check-occupation`, `check-noc-occupation`), SEO yardımcıları.
- **`lib/points/`** — `calculate-australia-points.ts`, `calculate-canada-crs.ts` — saf fonksiyon puan hesaplayıcıları.
- **`lib/readiness/`** — **En büyük alt sistem.** `engine.ts` (~6400 satır) — `runReadinessEngine()`, tüm ReadinessReport üretiminin merkezi. `ranked-pathways.ts`, `occupation-eligibility.ts`, `assessment-state.ts`, `risk-rules.ts`, çeşitli sinyal/eligibility modülleri (Quebec PSTQ, PNP, FSTP), `generate-pdf.ts` + `pdf-sections/`/`pdf-components/`/`pdf-content/` (~45 dosya, PDF rapor üretimi).
- **`lib/scrapers/`** — `eoi-scraper.ts`, `ca-eoi-scraper.ts`, `canada-draw-scraper.ts`.
- **`lib/seo/`** — statik SEO içerik dosyaları.
- **`lib/services/`** — `free-promo.ts`, `report-service.ts` (`generateAndSendReport`, `getReportPdfForDownload`).
- **`lib/skills-assessment/`** — 15 değerlendirme otoritesi (VETASSESS, ACS, Engineers Australia, vb.) için meslek listeleri/kurallar.
- **`lib/state-nomination/state-rules-config.ts`** — el ile doğrulanmış eyalet nomination gerçekleri.
- **`lib/stripe/`** — `commission.ts` (komisyon defteri yazımı), `stripe.ts` (client/price/webhook secret helper'ları).
- **`lib/visa/`** — `match-visas.ts` (Drizzle sorgusu), `localized-structured-data.ts`.
- **Diğer top-level `lib/` dosyaları:** `financial-engine.ts`, `full-check-progress.ts`, `generateChecklist.ts`, `document-processor.ts` (RAG ingestion pipeline), `visitor-tracking.ts`, `admin-auth.ts`, `state-intelligence.ts`, `prisma.ts` (singleton client), `utils.ts` (`cn()`).

---

## 5. UI Katmanı, App Shell & Altyapı

### Paylaşımlı UI Bileşenleri (`components/`)
- **`components/ui/`** — standart shadcn/ui primitifleri (button, card, input, select, dialog, vb.) — özel iş mantığı yok.
- **`header.tsx`** — Site-geneli tek navigasyon header'ı (session-aware, `ShellHeaderGate` ile her sayfada render ediliyor).
- **`landing/header.tsx`/`footer.tsx`** — Sadece ana sayfaya özel, session-farkında olmayan varyantlar.
- **`shell-gates.tsx`**, **`global-disclaimer-footer.tsx`**, **`pre-footer-cta.tsx`** — genel sayfa iskeleti parçaları.
- **`home-content.tsx`** — ana sayfayı `landing/` bölümlerinden kompoze ediyor.
- **`premium-feature-gate.tsx`** — paywall/unlock UI (full-check result page'de kullanılıyor).
- **`stripe-checkout-button.tsx`**, **`terms-gate.tsx`**, **`ref-capture.tsx`** — checkout/consent/referral yardımcı bileşenleri.
- **`components/crm/lead-notes.tsx`** — paylaşımlı (agent+admin) not zaman-çizelgesi bileşeni.
- **`components/landing/`** — Hero, InstitutionsMarquee, StatsBar, HowItWorks, CaseLog, PdfGuides, FeaturesBento, Faq, Testimonials.
- **`components/sections/`** — agent-referral-cta, canada-crs-disclaimer, compliance-notice.

### Context Provider'lar (`contexts/`)
- **`language-context.tsx`** — `LanguageProvider`, `useLanguage()`, `useTranslation()` — client-taraflı özel i18n runtime'ı.

### App Shell & Config
- **`app/layout.tsx`** — Kök layout; font'lar, `ThemeProviderWrapper`→`SessionProviderWrapper`, Meta Pixel (sadece prod).
- **`app/[locale]/(main)/layout.tsx`** — Public site layout'u; locale doğrulama, SEO metadata, `LanguageProvider` seed'leme.
- **`app/[locale]/(portal)/layout.tsx`** — Yetkili portal layout'u (agent/admin nav, sign-out, idle-logout).
- **`proxy.ts`** (repo kökü) — Tüm uygulamanın middleware/edge kapısı: bot engelleme, locale negotiation/rewrite, legacy admin cookie kontrolü, rol-tabanlı CRM portal kontrolü (`/agent/*`→AGENT, `/admin/crm/*`→ADMIN), `/dashboard` auth kontrolü.
- **`auth.ts`** (repo kökü) — NextAuth v5 config: `PrismaAdapter`, JWT session (5 dakika idle timeout), Google + Credentials provider'ları, `role`/`market`/`approvalStatus`'u token/session'a taşıyan callback'ler.
- **`next.config.ts`** — sadece `/en` → `/` SEO redirect'leri.
- **`config/resources.ts`** — dış kaynak URL'leri (tek kaynak).

### i18n Sistemi (`lib/i18n/`)
`config.ts` (locale listesi), `get-translations.ts` (client/universal loader + `t()`), `get-dictionary.ts` (server-only, tip-güvenli), `checklist-content.ts`. Hepsi `public/locales/{en,tr,zh-Hans}.json`'a yakınsıyor.

### Paylaşımlı Tipler (`types/`)
- **`next-auth.d.ts`** — `Session.user`/`JWT`'ye `id`, `role`, `market`, `approvalStatus` ekleyen module augmentation — `session.user.role` gibi kullanımları tip-güvenli kılıyor.

---

## Nereden Başlamalı? (Hızlı Rehber)

- **Yeni bir B2C özelliği eklemek** → `app/[locale]/(main)/full-check/actions.ts` (rapor pipeline'ı) ve `lib/readiness/engine.ts` (puan/patika mantığı).
- **CRM/acente değişikliği** → `lib/crm/*.ts` (veri katmanı) + `app/[locale]/(portal)/agent/**` veya `admin/crm/**` (UI/action'lar).
- **Ödeme akışı değişikliği** → `app/api/stripe/webhook/route.ts` (tek webhook), `app/api/checkout/route.ts`, `lib/stripe/*.ts`.
- **Yeni bir Prisma tablosu** → CLAUDE.md'deki `prisma db push` kurallarına dikkat: önce `--accept-data-loss` OLMADAN çalıştır, diff'i oku.
- **Çeviri eklemek/değiştirmek** → `public/locales/*.json` (3 dosya da güncellenmeli), next-intl değil bu özel sistem.
