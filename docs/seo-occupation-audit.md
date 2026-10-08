# SEO audit: occupation pages (Phase 0) and Phase 1 changes

Scope: the public occupation pages as the core SEO asset. Information only: no eligibility verdicts, recommendations or
"you should" wording on these pages. Points arithmetic, fee data, gate data and state data are not changed by this work.
Audit date: 2026-10-07, repository state at `53324bd` (before Phase 1) unless a line says "after Phase 1".

Reproduce: `npx tsx scripts/seo-occupation-richness.ts` (section 2), `npx tsx scripts/seo-compliance-scan.ts [--git-ref 53324bd]`
(section 5), `npm run test:seo-occupation` (Phase 1).

Confidence tags: **{Certain}** read from the code or measured by the scripts above; **{Likely}** strong inference;
**{Guessing}** filling a gap. Things I could not observe (live Search Console, live analytics data, Vercel) are marked as such.

---

## 1. Inventory: public occupation page routes and templates

### 1.1 The occupation page family

| Route (internal) | Public URL | Pages | Source |
|---|---|---|---|
| `app/[locale]/(main)/occupations/[id]/page.tsx` | `/occupations/<code>-<slug>` (en, prefixless), `/tr/occupations/...`, `/zh-Hans/occupations/...` | **693 per locale, 2,079 total** | `getUniqueOccupations()` (`lib/occupations/seo.ts`) = `occupations.json` rows with `isEligibleForMigration !== false`, de-duplicated by ANZSCO code (1,464 rows in the file) |
| `app/[locale]/(main)/tools/points-calculator/[slug]/page.tsx` | `/tools/points-calculator/<slug>` | **3 per locale** (software-engineer, registered-nurse, civil-engineer), hand-written in `lib/occupations.ts` | English-only copy; not in `generateStaticParams` (rendered on demand); not in the sitemap {Certain} |
| `app/[locale]/(main)/tools/anzsco-finder/page.tsx` | `/tools/anzsco-finder` | 1 per locale | client-side search over the ANZSCO list |
| `app/[locale]/(main)/resources/occupation-list/page.tsx` | `/resources/occupation-list` | 1 per locale | lead-capture page for the occupation list |
| `app/[locale]/(main)/occupation-checker/page.tsx` | `/occupation-checker` | 1 per locale | `"use client"` page (client-rendered) |

The `/occupations/[id]` template is the only per-occupation template at scale. The rest of this audit is about it.

### 1.2 What the occupation page rendered before Phase 1, and from which file

| Block | Data source |
|---|---|
| H1, ANZSCO badge, "Visa Options for X in Australia" | `anzsco-list.json` (trilingual title, 594 of 693 have tr/zh titles) else `occupations.json` `occupation_name` |
| Duties | `anzsco-list.json` `duties_en/tr/zh` (594 have tr/zh; the text is a three-sentence template per occupation, not an official ANZSCO duty list) |
| Assessing authority | `occupations.json` `authority` (vocabulary differs from the skills-assessment registry, which `lib/skills-assessment/resolve-authority.ts` says is the single place an authority is resolved) |
| "Relevant subclasses" | `deriveSubclasses()`: `visa_lists` token -> subclass map in `lib/occupations/seo.ts` (MLTSSL 189/190/491, STSOL 190/491/482, ROL/RSOL 491). **CSOL, which is on 390 pages, is not in the map**, so 87 pages show "No clear subclass mapping found" |
| State radar | `StateDemandRadar` reading `state-sponsorship.json`, which holds **3 occupations**; every other page shows "Live data is currently being updated"; hidden states are blurred in the DOM behind an "Unlock" overlay |
| AI teaser | `MiniCvTeaser` (client component, calls the AI endpoint) |
| Sources of unique data **not used** | assessing-body fees (`fee-provenance.json`, `skills-assessment/*-fees.json`), state occupation lists (`state-occupation-lists/*.json`, `occupation-match.ts`), invitation/benchmark rows (`visa-trends.json`, `occupation-points-cutoff.json`), `eoi-rounds.json`, any "last verified" date |

### 1.3 Rendering

{Certain} The page is a server component with `generateStaticParams` over all 2,079 locale x occupation pairs (SSG). It imports two client
components (`MiniCvTeaser`, and the layout's providers). `occupation-checker` is `"use client"` at page level.
After Phase 1 the occupation page has no client component other than a 10-line analytics tracker that renders nothing.

---

## 2. Data richness per occupation

Definition (one source, `lib/occupations/richness.ts`, shared by the audit script, the sitemap and the page's robots meta). A signal counts only when the repository holds the fact for that occupation:

| Signal | Meaning |
|---|---|
| authority | the skills-assessment registry lists an authority for the ANZSCO code (not the "general profession" fallback) |
| fee | that authority has at least one non-estimated fee with a figure |
| national list | `visa_lists` is non-empty |
| state list | the occupation is on a published state/territory list for 190 or 491 (ACT, NT, QLD, WA by occupation; NSW by 4-digit unit group) |
| invitation | a row in `visa-trends.json` (by code) or `occupation-points-cutoff.json` (by title) |

Score = number of signals (0-5). **rich** >= 4, **medium** 2-3, **thin** <= 1.

Measured over the 693 pages per locale:

| Signal | Occupations with it |
|---|---|
| Assessing authority (registry) | 479 (69.1%) |
| Sourced, non-estimated fee | 228 (32.9%) |
| On a national list | 633 (91.3%) |
| On at least one state/territory list (190/491) | 457 (65.9%) |
| Invitation / benchmark row | 41 (5.9%) |
| A verifiable source date (authority `lastVerified` or state-list provenance) | 595 (85.9%) |

States with list data for 190/491: 0 states 236 | 1 state 131 | 2 states 74 | 3 states 74 | 4 states 108 | 5 states 70.
Score distribution: 0 = 49, 1 = 59, 2 = 208, 3 = 173, 4 = 176, 5 = 28.

| Tier | Occupations (per locale) | Share | Pages in all 3 locales |
|---|---|---|---|
| rich | 204 | 29.4% | 612 |
| medium | 381 | 55.0% | 1,143 |
| thin | 108 | 15.6% | 324 |

Notes:
- Per-occupation "last verified" does not exist. What exists: a global dataset date (`occupations.json` `generated_on` = 2026-07-09), the authority's `lastVerified`, and state-list provenance dates (`occupation-list-provenance.json`, 2026-09-22 / 2026-09-28). Phase 1 uses the most recent of the source dates behind each page, else the dataset date.
- SA has no occupation-level data; TAS and VIC defer to the national list (`matchOccupationToState` returns NO_DATA / NOT_APPLICABLE), so they never count as "state list" entries.
- The invitation signal is the thinnest (41 occupations). `visa-trends.json` is labelled "estimated ... derived from trend patterns" in its own methodology note, so it is shown nowhere on the page in Phase 1; it only counts as a signal. {Certain}

---

## 3. Technical SEO state (before Phase 1)

| Area | Finding | Evidence |
|---|---|---|
| Titles / descriptions | Per-occupation and localised, built from code + name, but the title read "... Visa Options & Points Check" / "... Vize Yollari ve Puan Kontrolu" (ASCII-folded Turkish: "Yollari", "Kontrolu"); descriptions contained "readiness actions". Unique per occupation by construction (name + code). No data in them beyond the subclass guess. | `occupations/[id]/page.tsx` |
| Canonical | `/${locale}/occupations/${id}`, so the **English canonical was `/en/occupations/...`, which `next.config.ts` 308-redirects to `/occupations/...`**. Every English occupation page declared a redirecting URL as canonical. The `id` in the URL (not the canonical slug) was used, so `/occupations/261313-anything` self-canonicalised as a duplicate. | page + `next.config.ts` redirects |
| hreflang | en/tr/zh-Hans present but the same `/en/...` problem for English; **no `x-default`** on pages (the home layout has one) | page |
| `metadataBase` | `process.env.NEXT_PUBLIC_BASE_URL \|\| "http://localhost:3000"`; the other layouts hard-code `https://www.logivisa.com`. {Likely} production sets the variable; if it is unset, every relative canonical resolves to localhost. | page; `app/layout.tsx` |
| Unknown slug | rendered a 200 "Occupation Not Found" page (soft 404) | page |
| noindex | none on public pages; only portal/CRM pages use `robots: {index:false}` | grep |
| Sitemap | `app/sitemap.ts`: 5 static routes + visa pages + all 693 occupations x 3 locales; URLs correctly prefixless for English; **`lastModified` = request time for every URL**; no hreflang alternates; thin pages included; `changeFrequency`/`priority` set (ignored by Google) | file |
| robots.txt | allow `/`, disallow `/api/`, `crawlDelay: 10` (ignored by Google), blocks GPTBot/CCBot/anthropic-ai, references `/sitemap.xml` | `app/robots.ts` |
| Structured data | one `WebApplication` JSON-LD in the locale layout (offers price 0 AUD). **None on occupation pages.** | layout |
| `<html lang>` | `app/layout.tsx` hard-codes `lang="en"`; tr and zh-Hans pages are served with `lang="en"` {Certain}. Not fixed in Phase 1 (needs the locale at the root layout; see Phase 2). | layout |
| Internal links | the old page linked only to `/en/full-check?...` (an upsell, `/en/` redirect) and `/en/tools/points-calculator`; no link to visa pages, the ANZSCO finder, other occupations or a parent hub. No breadcrumbs. | page |
| Hub pages | `points-calculator`, `anzsco-finder`, `visa-comparison` and others use the same `/${locale}/...` canonical pattern (English canonical on a redirecting URL) | grep of `canonical` |
| Rendering / speed | SSG; the page pulled in `MiniCvTeaser` (client) and a blurred locked block. Fonts: five `next/font` families loaded globally (`app/layout.tsx`) {Certain}; effect on LCP not measured. | files |

Not observable from the repository: Search Console coverage, indexation state, Core Web Vitals field data, Vercel build status.

---

## 4. Translation state

- Titles: 594 of 693 occupations have non-empty tr and zh-Hans titles in `anzsco-list.json`; 8 have no entry in that file at all; the remaining fall back to the English name inside the localised sentence. 2 tr titles equal the English title.
- Duties: 685 English, 594 tr, 594 zh-Hans; the localiser falls back to English when empty (`localizedDuties`). The duty text is a generated three-sentence template ("Perform X duties requiring ... skill"), the same shape for every occupation; it adds almost no unique content. {Certain}
- Template strings on the old page: the Turkish strings were ASCII-folded ("Vize Secenekleri", "Degerlendirme Kurumu", "Hazirliginizi Kontrol Edin"), the signature of text written without diacritics rather than reviewed. English-only: the "AI-Powered Strategy Landing" badge, "AI Duty Match Teaser", "State Demand Intelligence", every CTA ("Check Your PR Eligibility Now (Free)"), the radar's body copy and the not-found page.
- Data labels: authority names (proper nouns) and list names (CSOL/MLTSSL/...) are English everywhere, which is acceptable; subclass labels are "Subclass 189" in all locales.
- After Phase 1: every string on the page is localised in tr and zh-Hans with diacritics; authority and list names stay in English as proper nouns. The Turkish and Chinese wording is mine and has not been reviewed by a native speaker. {Guessing} on naturalness.

---

## 5. Compliance scan: occupation pages and the points calculator

Phrase list: `lib/seo/banned-phrases.ts` (eligib*, "you qualify", best, recommend*, chances, readiness, strategy/strategies, "you should / must / need", "check your / find out", unlock, "apply now", AI-powered, and the tr / zh-Hans equivalents).

**Before Phase 1** (`scripts/seo-compliance-scan.ts --git-ref 53324bd`):

`occupations/[id]/page.tsx`, 24 hits, all three locales, including:
- "Check Your PR Eligibility Now (Free)" (button, 3 places, English only)
- "Find out your eligibility for 189, 190, and 491 visas as a X" / "快速了解你是否适合 189、190 和 491 签证" / "189, 190 ve 491 icin uygunluk gorunumunuzu hizlica inceleyin"
- "AI-Powered Strategy Landing" (badge)
- "Try a fast preview and unlock your full duty analysis with occupation-specific PR readiness context"
- "Check your specific readiness and calculate points for this occupation" / tr / zh
- meta description: "... and readiness actions for X" / "准备度行动建议" / "hazirlik aksiyonlari"
- `StateDemandRadar`: "Unlock Full State Matrix & Check Eligibility", "Check Your Full State Matching Report", status badges "High Demand" / "Open" / "Closed" with states **sorted by a priority rank** (a ranking), "Live demand signals" claim
- `MiniCvTeaser`: "Unlock Full AI Analysis & PR Points (Free)"

**Outside the occupation page, still present after Phase 1** (listed, not changed in Phase 1; they belong to Phase 2's hub pages):

| File | Hits | Examples |
|---|---|---|
| `lib/seo/points-calculator-content.ts` (the guide under the calculator, 3 locales) | 10 | "To be eligible for an invitation to apply, you need a minimum of 65 points"; "You should aim for the highest score achievable"; "proven strategies to increase your score"; "You must update your EOI ..."; "increase your chances"; zh equivalents ("经过验证的策略", "您的机会") |
| `public/locales/{en,tr,zh-Hans}.json` `pc.*` (calculator UI) | 3 / 1 / 3 | `pc.insights.hookCta`: "Unlock Your Full Visa Strategy Report" / "Detaylı Vize Strateji Raporunu Aç" / "解锁完整签证策略报告"; an "eligible relative" question label |
| calculator "Insights & Risks" panel (`points-calculator-client.tsx`) | n/a | a red panel of risk statements about age/state, computed from the answers {Certain on the panel; wording not enumerated} |
| `tools/points-calculator/[slug]/page.tsx` | 4 | "Check your eligibility and hidden risks instantly"; "Check your PR readiness as a X" |
| `tools/visa-comparison/*` | 20 | "Visa Strategy Tool", "Answer 3 quick questions to get a recommended pathway", "Recommended pathway" result, "this visa currently fits your strategy best" / tr / zh equivalents, "Higher chance of faster invitation", "Want a full strategy report?" |
| `resources/occupation-list/page.tsx` | 5 | "Find out if your occupation is eligible for a subclass 189, 190 or 491 visa" |
| `tools/anzsco-finder/page.tsx` | 1 | "... before checking PR eligibility" |

**After Phase 1:** the occupation page and all 2,079 generated page texts carry none of these phrases (`npm run test:seo-occupation`, section 4). The page's own disclaimer is worded without the banned terms ("not migration advice; not reviewed by a migration agent").

Also note (not a phrase, but a content-integrity point): the old radar blurred real state data in the HTML behind an unlock overlay. Hidden-then-gated content in the DOM is a pattern search engines treat as cloaking-adjacent; it is removed from the page.

---

## 6. Analytics today

{Certain} from the code:
- Google Analytics 4 is loaded only when `NEXT_PUBLIC_GA_ID` is set (`<GoogleAnalytics>` in the locale layout). Page views are the library's default automatic ones.
- Custom events exist only in the full-check form and the premium gate (`sendGAEvent`). **None** for occupation pages, the points calculator, the comparison page or outbound links.
- A Meta Pixel (`PageView`) loads in production from the root layout.
- Search Console: a `google-site-verification` meta tag is present, **hard-coded** in `app/layout.tsx` metadata (root layout, all pages).
- Not observable: whether `NEXT_PUBLIC_GA_ID` is set in production, or any collected data.

---

## 7. Phase 1: what changed (this commit series)

| Change | Where |
|---|---|
| Unique, localised, data-built `<title>` and meta description per occupation and locale, e.g. "Software Engineer (261313): Australian visa occupation information", "Yazılım Mühendisi (261313): Avustralya vize meslek bilgileri", "软件工程师（261313）：澳大利亚签证职业信息" (description built from the facts present: authority, list placement, state/territory entries, source date; <= 300 characters) | `lib/occupations/page-content.ts`, `occupations/[id]/page.tsx` |
| Self-referencing canonical on the real public URL (English prefixless, never `/en/...`); hreflang en / tr / zh-Hans + x-default; canonical slug enforced (wrong words in the slug -> 308 to the canonical slug); unknown slug -> real 404 | `lib/seo/urls.ts`, page |
| Sitemap: only indexable pages, public URLs, hreflang alternates on every entry, `lastmod` from data (most recent source date, else dataset date 2026-07-09); no `lastmod` for static/visa pages (no date exists; was "now"); referenced from robots.txt (already was) | `app/sitemap.ts` |
| noindex (follow) for the thin tier (108 per locale, 324 pages), and not in the sitemap | `occupations/[id]/page.tsx`, `app/sitemap.ts`, `lib/occupations/richness.ts` |
| SSG kept; the AI teaser (client component) and the blurred locked radar removed from the page | page |
| Page content is information only: details (authority, list placement, mapped subclasses), published state/territory list entries with source dates, duties, sources and dates, related links (points calculator, ANZSCO finder, 189/190/491 information) | page |
| Analytics events, no personal data: `occupation_page_view` (ANZSCO code, locale), `calculator_start` / `calculator_complete` (calculator, locale, subclass), `comparison_page_view`, `outbound_official_link_click` (host only). A fixed parameter allow-list drops anything else. | `lib/analytics/events.ts`, `components/analytics/*`, calculator client, comparison page, locale layout |
| Search Console tag from `SEARCH_CONSOLE_VERIFICATION` | `app/layout.tsx`, `.env.example` |
| Tests | `scripts/test-seo-occupation.ts` (in `test:reports` and CI) |

Verified against a real `next dev` server: `/occupations/261313-software-engineer` 200 with the expected title, canonical, hreflang and `index, follow`; `/tr/...` localised; `/occupations/421111-child-care-worker` (thin) `noindex, follow`; `/occupations/261313-wrong` 308 to the canonical slug; `/occupations/999999-x` 404; `/sitemap.xml` 1,779 URLs (1,755 occupation entries, each with hreflang and a `lastmod`); `/robots.txt` references the sitemap.

### Assumptions

1. **thin = 0 or 1 signals out of 5.** Chosen from the measured distribution (15.6% of pages). The threshold is one constant (`tierOf`).
2. **No Search Console fallback token (Phase 1.5).** The tag is rendered only when `SEARCH_CONSOLE_VERIFICATION` is set and non-empty after trimming (`lib/seo/search-console.ts`); unset -> no tag. Phase 1 had kept the old token as a fallback; it was removed, so the variable must be set in every environment that should stay verified. `scripts/test-seo-occupation.ts` section 6 fails if a fallback or any tracked copy of the retired token returns.
3. **One sitemap file** (`/sitemap.xml`, 1,779 URLs) rather than one per locale: it stays under the 50,000-URL limit, keeps the URL already submitted to Search Console, and hreflang annotations carry the locale grouping. Splitting by locale would change the submitted URL.
4. **Removing the AI teaser and the state radar from the occupation page** is part of "information only"; the `state-sponsorship.json` file and the components are unchanged and still in the repository.
5. `lastmod` uses the most recent source date behind a page, not the date the page was built. Static and visa pages have no date in the repository and therefore no `lastmod`.
6. English canonical and hreflang use the production origin `https://www.logivisa.com` (the origin the layouts and sitemap already hard-code), not `NEXT_PUBLIC_BASE_URL`.
7. Analytics events go to Google Analytics only when `NEXT_PUBLIC_GA_ID` is set; without it they are no-ops. The Canada points calculator and the 3 hand-written calculator occupation pages are not instrumented in Phase 1.
8. The hub pages' canonical defect (English canonical on a `/en/...` URL) is listed here and fixed in Phase 2 with the hub pages, not in Phase 1, which is limited to the occupation pages.
9. "Subclasses mapped to those lists" on the page is the repository's existing list-to-subclass mapping, shown with that label because it is a mapping in our data rather than a statement from Home Affairs; CSOL is not in the map (87 pages show no subclass row). I did not change the data or the mapping.

### Data questions for a human (not changed)

- `occupations.json` lists `CSOL`, `MLTSSL`, `STSOL`, `ROL` and a token `TRA` side by side. Whether the lists reflect the current Home Affairs instruments is outside what the repository can show; the file's own `currency_note` says list placement "should be re-validated before lodgement".
- 173 occupations have `authority: "Unknown"` in `occupations.json`, and `authority` disagrees with the registry for some codes (`findAuthorityConflicts()` exists for that). The page uses only the registry.
- `occupation-points-cutoff.json` and the hand-written `lib/occupations.ts` `recentCutoff` values (85/65/80) are not cross-checked with each other.

---

## 8. Phase 2 proposal (not implemented; needs approval)

### 8.1 Page content structure: sourced facts per occupation

Every fact is a row: **value | source name + link | "data verified" date**. Order:
1. Identity: ANZSCO code, title (tr/zh-Hans localised), one-sentence description.
2. Skills assessment: the assessing authority (registry), the published assessment fee with its source document and `lastVerified`, processing time as the authority states it, "also assessed by" where Home Affairs lists more than one. Independent registration steps shown as their own rows (see 8.4).
3. National list placement: each list named with its legislative instrument and date; mapped subclasses.
4. State and territory program information: published status, occupation-list presence for 190/491, published residence / employment / study conditions, source and data-checked date (this is the existing state data, shown as published, no user filtering). If a later version filters on entered details, it is labelled "filtered on the details you entered" and flagged in `docs/compliance-review-pack.md`.
5. Invitation and benchmark information: published SkillSelect round data only, with the round date; the trend-estimate file stays off the page until it has a source.
6. Points table for the occupation's subclasses (arithmetic only, the existing calculator logic).
7. Sources and dates; the disclaimer.

Thin-tier pages stay noindex until rows 2-5 have unique sourced values; the tier is recomputed from data on each build, so a page leaves noindex by gaining data, not by editing a flag.

### 8.2 Internal linking

- Occupation -> its subclass pages (189 / 190 / 491), the points calculator (with `?occupation=<code>` prefill), the cost calculator, the relevant comparison page, and its assessing-authority page where one exists.
- Visa and tool hub pages -> the top occupations by data richness (rich tier), grouped by assessing authority and by ANZSCO major group (breadcrumb: Home > Occupations > group > occupation).
- A crawlable occupation index per locale (A-Z and by group), because today occupation pages are reachable only from the sitemap and the ANZSCO finder's client-side search.
- Fix the `/en/...` hrefs in the other components (`StateDemandRadar`, form links) while touching them.

### 8.3 The 10 core hub/tool pages

| # | Page | Note |
|---|---|---|
| 1 | Points calculator | exists; fix canonical/hreflang; replace the guide copy in `points-calculator-content.ts` and `pc.insights.hookCta` (section 5) |
| 2 | Cost calculator | new; built from `visa-fees.json` + `fee-provenance.json`, each figure with source and verified date |
| 3 | 189 vs 190 | neutral side-by-side table, same columns, no result/quiz |
| 4 | 189 vs 491 | same |
| 5 | 190 vs 491 | same |
| 6 | 482 vs 186 | same (data in `visa-details.json`, `visas/subclass-186.json`) |
| 7 | 500 vs 485 | same |
| 8 | Subclass 189 information | `visas/[subclass]` content restructured to sourced facts |
| 9 | Subclass 190 information | same |
| 10 | Subclass 491 information | same |

The existing `visa-comparison` quiz ("recommended pathway", section 5) is retired in favour of the three neutral tables.

### 8.4 Hidden-cost rule (to verify with the data owner before shipping)

Completing a skills assessment must not hide registration steps that are separate from it (for example AHPRA registration for health occupations). The Phase 2 fee rows are generated per occupation from the registry, and any "separate registration" row (AHPRA, nursing board, etc., where `src/data/health-registration/*` holds it) is shown as its own row with a note that it is independent of the assessment. Needs a read of how `health-registration/provenance.json` maps to occupations; not done in this phase.

### 8.5 JSON-LD choice

- Per occupation page: `Occupation` (schema.org, `name`, `occupationalCategory` = ANZSCO code, `description`) plus `BreadcrumbList`. Not `FAQPage` (the advice-style Q&A shape conflicts with information-only), not `Article`, not `HowTo` (would imply a procedure).
- Hub pages: `WebPage` + `BreadcrumbList`; the calculator keeps `WebApplication` (already present).
- Dates: `dateModified` = the page's data-verified date. No `aggregateRating`, no `Offer`.
- Fix the current layout-level `WebApplication` offer (price 0 AUD) to avoid asserting pricing on every page.

### 8.6 Localising tr / zh-Hans by search intent (not literal translation)

Method: for each template string, write the heading and intro around how people search, then keep the facts identical.

| Intent (examples to validate with Search Console / a keyword tool; not yet measured) | tr | zh-Hans |
|---|---|---|
| visa + points | "Avustralya 190 vizesi puan" | "澳洲190签证分数" |
| occupation list | "Avustralya meslek listesi 2026" | "澳洲技术移民职业清单" |
| assessing body | "ACS beceri değerlendirmesi" | "澳洲技术评估 ACS" |

Rules: use the search term in H1/title where it is accurate (e.g. "190 vizesi puan tablosu" for a points table, never for an eligibility claim); keep proper nouns and subclass numbers; one native-speaker review per template, not per page; machine translation is allowed only as a first draft and is listed in the compliance pack. Cluster-level: the 190 and 491 information pages carry the state-program content that those queries target.
Also fix `<html lang>` by passing the locale from the root layout (`lang` per route), since tr/zh-Hans pages currently declare `en`.

### 8.7 Other Phase 2 items found in this audit

- Canonical/hreflang defect on all hub pages (`/${locale}/...` with an English `/en/` canonical).
- Add a localised, crawlable occupation index.
- Replace `crawlDelay` (ignored) with nothing; consider disallowing `/api/`-adjacent and portal paths already `noindex`.
- Decide whether the three hand-written `/tools/points-calculator/<slug>` pages are kept (they hold hard-coded cutoffs) or redirected to the occupation pages.
- Instrument the Canada calculator and the remaining tool pages.
