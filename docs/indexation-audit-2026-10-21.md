# Search Console indexation audit — 21 October 2026

Audit only. No production change was made. Method: live fetches of production (`https://www.logivisa.com`, 21–22 October 2026, redirects not followed unless stated) plus a read of the SEO code at `main` (`0ee047d`). Search Console (GSC) data referred to is the export last updated 12 October 2026, as supplied; I do not have the GSC example lists beyond the ones quoted in the brief, so anything about the full category counts is **inference, labelled as such**.

## 1. Executive summary

* **The current production canonical / hreflang implementation is technically correct.** On every live TR and zh-Hans occupation page checked (15 occupations × 3 locales = 45 pages, plus the group pages the retired URLs now land on) the canonical is self-referencing, `<html lang>` matches the locale, the hreflang set is `en`, `tr`, `zh-Hans`, `x-default` (→ English), the sets are reciprocal, there is a single hop (no redirect) and robots is `index, follow`.
* **Most of the requested TR/zh-Hans example URLs no longer exist as pages.** 18 of the 19 distinct occupations in the brief (all except *jewellery designer*) are codes that no longer have an occupation page. Production now answers them with a **301 to the ANZSCO major-group page** in the same locale (for example `/tr/occupations/231312-tour-guide` → `/tr/occupations/group/2`). That redirect shipped on **14 October 2026**, after the 12 October GSC snapshot (commit `7efd71a`). The sitemap listed every dataset row until 7 October (`b3d6393`); these URLs were in it.
* **The 828 “Crawled – currently not indexed” URLs look like Next.js build assets** (JS, CSS, woff2 with `?dpl=<deployment id>`), which are not content pages and cannot be indexed. Production serves them correctly and nothing links to them as pages. A plausible multiplier: 26 asset URLs per page × many deployments (131 commits to `main` in the month before the snapshot, each a deployment with new `?dpl=` ids).
* **The sitemap is clean:** 1,912 URLs, every one returns 200 with no redirect, no `/_next/`, no `?dpl=`, no duplicates; indexable occupation pages only (585 × 3 locales).
* **Two real, current, low-severity defects found (RED):** (1) site-wide internal links for English use `/en/...` (header and other components build `/${locale}/...`), so English navigation points at URLs that 308 to the clean path (26 of 1,251 unique internal links in the crawl; 143 template sites in code); (2) the legacy `/guide` page is served at `/guide`, `/tr/guide`, `/zh-Hans/guide` with identical **English** content, self-canonicals and hreflang that claims TR and zh-Hans versions, and all three are in the sitemap.
* **Content quality, not canonical correctness, is the more likely lasting reason for localized-page duplication signals** on live pages: TR/zh pages have genuinely translated titles, H1, intro and table labels, but are data-table templates, and 18% (TR) / 26% (zh-Hans) of their sentences in the sample are identical to English (the state/territory condition text is not translated).
* **Nothing here justifies an immediate SEO architecture change.** Recommended order of action is in section 11.

## 2. What the 828 “Crawled – currently not indexed” URLs appear to be

Evidence (fetched from a live TR occupation page and its assets):

| Check | Result |
|---|---|
| Tags that reference `/_next/` on a page | `link rel=preload` (8), `link rel=stylesheet` (2), `script src` (16) — **0** `<a href>` |
| Assets carrying `?dpl=` | 26 of 26 |
| Content types served | `font/woff2`, `text/css`, `application/javascript` — all HTTP 200, `cache-control: public, max-age=31536000, immutable`, no `X-Robots-Tag` |
| In the XML sitemap | **0** `/_next/` URLs, **0** URLs with `?dpl=` |
| robots.txt | `Allow: /`, `Disallow: /api/` plus three AI-crawler blocks (GPTBot, CCBot, anthropic-ai). `/_next/` is **not** blocked (correct: Google needs these to render) |
| Intended landing pages? | No. They are build artefacts referenced only by `<link>`/`<script>` |

Classification: **`GSC asset noise / non-content URLs`**. Each deployment changes the `?dpl=` value, so every deployment mints a fresh URL for each asset; Google lists the ones it fetched but will not index a script, stylesheet or font. Scale check (inference): 26 assets/page × 131 deployments-worth of commits in the month before the snapshot is the right order of magnitude for 828 distinct URLs. Because I only have the example URLs quoted in the brief (all assets), I cannot prove all 828 are assets; if the GSC export contains any HTML URL in that bucket, list it separately. **No action; do not block `/_next/`.**

## 3. The 20 requested localized occupation URLs (current production)

Columns: HTTP chain for that URL → final URL → `<html lang>` of the final page → canonical (self = canonical equals the final URL) → hreflang → robots → in sitemap → status of the EN / TR / zh-Hans counterparts of the same slug (a→b = a 301 then b) → whether the code has an occupation page.

| URL | HTTP chain | Final URL | lang | canonical | hreflang | robots | In sitemap | EN / TR / ZH counterpart | Code status |
|---|---|---|---|---|---|---|---|---|---|
| `/tr/occupations/254315-enrolled-nurse-developmental-disability` | 301 → 200 | `/tr/occupations/group/2` | tr | self | en/tr/zh/x-default all present | index, follow | no | 301→200 / 301→200 / 301→200 | retired code (no page) |
| `/tr/occupations/232313-jewellery-designer` | 200 | `/tr/occupations/232313-jewellery-designer` | tr | self | en/tr/zh/x-default all present | index, follow | yes | 200 / 200 / 200 | live content page |
| `/tr/occupations/225413-real-estate-valuer` | 301 → 200 | `/tr/occupations/group/2` | tr | self | en/tr/zh/x-default all present | index, follow | no | 301→200 / 301→200 / 301→200 | retired code (no page) |
| `/tr/occupations/231312-tour-guide` | 301 → 200 | `/tr/occupations/group/2` | tr | self | en/tr/zh/x-default all present | index, follow | no | 301→200 / 301→200 / 301→200 | retired code (no page) |
| `/tr/occupations/351413-kitchen-hand` | 301 → 200 | `/tr/occupations/group/3` | tr | self | en/tr/zh/x-default all present | index, follow | no | 301→200 / 301→200 / 301→200 | retired code (no page) |
| `/tr/occupations/741111-storeperson` | 301 → 200 | `/tr/occupations/group/7` | tr | self | en/tr/zh/x-default all present | index, follow | no | 301→200 / 301→200 / 301→200 | retired code (no page) |
| `/tr/occupations/282115-flying-instructor` | 301 → 200 | `/tr/occupations/group/2` | tr | self | en/tr/zh/x-default all present | index, follow | no | 301→200 / 301→200 / 301→200 | retired code (no page) |
| `/tr/occupations/721112-logging-plant-operator` | 301 → 200 | `/tr/occupations/group/7` | tr | self | en/tr/zh/x-default all present | index, follow | no | 301→200 / 301→200 / 301→200 | retired code (no page) |
| `/tr/occupations/842222-vineyard-worker` | 301 → 200 | `/tr/occupations/group/8` | tr | self | en/tr/zh/x-default all present | index, follow | no | 301→200 / 301→200 / 301→200 | retired code (no page) |
| `/zh-Hans/occupations/253326-radiation-oncologist` | 301 → 200 | `/zh-Hans/occupations/group/2` | zh-Hans | self | en/tr/zh/x-default all present | index, follow | no | 301→200 / 301→200 / 301→200 | retired code (no page) |
| `/zh-Hans/occupations/392214-printing-machinist` | 301 → 200 | `/zh-Hans/occupations/group/3` | zh-Hans | self | en/tr/zh/x-default all present | index, follow | no | 301→200 / 301→200 / 301→200 | retired code (no page) |
| `/zh-Hans/occupations/254515-registered-nurse-paediatric` | 301 → 200 | `/zh-Hans/occupations/group/2` | zh-Hans | self | en/tr/zh/x-default all present | index, follow | no | 301→200 / 301→200 / 301→200 | retired code (no page) |
| `/zh-Hans/occupations/452213-hunting-guide` | 301 → 200 | `/zh-Hans/occupations/group/4` | zh-Hans | self | en/tr/zh/x-default all present | index, follow | no | 301→200 / 301→200 / 301→200 | retired code (no page) |
| `/zh-Hans/occupations/241715-special-education-teacher` | 301 → 200 | `/zh-Hans/occupations/group/2` | zh-Hans | self | en/tr/zh/x-default all present | index, follow | no | 301→200 / 301→200 / 301→200 | retired code (no page) |
| `/zh-Hans/occupations/599518-transport-operations-inspector` | 301 → 200 | `/zh-Hans/occupations/group/5` | zh-Hans | self | en/tr/zh/x-default all present | index, follow | no | 301→200 / 301→200 / 301→200 | retired code (no page) |
| `/zh-Hans/occupations/721311-forklift-driver` | 301 → 200 | `/zh-Hans/occupations/group/7` | zh-Hans | self | en/tr/zh/x-default all present | index, follow | no | 301→200 / 301→200 / 301→200 | retired code (no page) |
| `/zh-Hans/occupations/711914-sterilisation-technician` | 301 → 200 | `/zh-Hans/occupations/group/7` | zh-Hans | self | en/tr/zh/x-default all present | index, follow | no | 301→200 / 301→200 / 301→200 | retired code (no page) |
| `/zh-Hans/occupations/599516-taxation-inspector` | 301 → 200 | `/zh-Hans/occupations/group/5` | zh-Hans | self | en/tr/zh/x-default all present | index, follow | no | 301→200 / 301→200 / 301→200 | retired code (no page) |
| `/zh-Hans/occupations/282115-flying-instructor` | 301 → 200 | `/zh-Hans/occupations/group/2` | zh-Hans | self | en/tr/zh/x-default all present | index, follow | no | 301→200 / 301→200 / 301→200 | retired code (no page) |
| `/zh-Hans/occupations/561912-meter-reader` | 301 → 200 | `/zh-Hans/occupations/group/5` | zh-Hans | self | en/tr/zh/x-default all present | index, follow | no | 301→200 / 301→200 / 301→200 | retired code (no page) |

Reading the table: 19 of the 20 requested URLs (every one except `/tr/occupations/232313-jewellery-designer`) are **301 → the locale's ANZSCO major-group page** (`group/2`, `3`, `4`, `5`, `7`, `8`), whose own canonical is self-referencing and whose hreflang set is complete and reciprocal. None of the 19 is in the sitemap. All three locales of each retired slug behave the same way, so EN/TR/zh counterparts are consistent. The jewellery-designer page is a live content page in all three locales (200, self-canonical, reciprocal hreflang, `index, follow`, in the sitemap).

There are 772 retired codes in `src/data/occupation-slug-redirects.json` (`known`), versus 693 occupations with a page. That is up to 772 × 3 = 2,316 locale URLs that now 301.

## 4. Current canonical / hreflang findings

Expected behaviour (each page canonical to itself, reciprocal hreflang with English as `x-default`) **is what production does.** Evidence across the 15 live occupations (45 pages, section 5) and the group pages: 45/45 self-canonical, 45/45 reciprocal, 45/45 `html lang` correct, 45/45 single hop. Query-string variants (`?ref=`, `?utm_source=`, `?q=`, `?country=`) return 200 with the clean URL as canonical; uppercase paths (`/OCCUPATIONS/...`) return 200 with the lowercase canonical; trailing slash and `/en/...` 308 to the clean URL; a wrong-words slug with a valid code 301s to the canonical slug. These are all correct, and are the likely content of the GSC bucket “Alternate page with proper canonical tag” (434), which is benign by definition.

Code matches production: `lib/seo/urls.ts` `pageAlternates()` emits a self-referencing canonical plus `languageAlternates()` (every active locale + `x-default` = English); the occupation page (`app/[locale]/(main)/occupations/[id]/page.tsx`) uses it and sets `robots: noindex` for the `thin` richness tier; `app/sitemap.ts` skips `thin` and uses `lastmod` from data; `proxy.ts` answers retired URLs with a real 301 before rendering. **No difference between code and production was found.**

Timeline relevant to the old GSC data: `3e2b002` (7 Oct) unique localized titles, public-URL canonical, hreflang + x-default, noindex for thin pages; `b3d6393` (7 Oct) indexable-only sitemap; `7efd71a` (14 Oct) 301s for retired occupation URLs; `5fc4e8c`…`c88bedd` (20 Oct) occupation index, breadcrumbs, structured facts. The GSC snapshot (12 Oct) sits between the first two and the redirects.

Thin pages (108 occupations = 324 locale URLs) are `noindex, follow`, self-canonical in all three locales and are not in the sitemap (spot-checked 4 occupations × 3 locales).

## 5. Fifteen live occupation pages (EN / TR / zh-Hans)

The requested URLs are mostly retired, so to audit real indexable pages I added 14 random live occupations from the sitemap plus jewellery designer. “TR id / ZH id” = sentences on the TR / zh-Hans page that are character-for-character identical to a sentence on the English page.

| Occupation | Status EN/TR/ZH | html lang | Self-canonical | Reciprocal hreflang | Robots (EN) | Title TR / ZH (start) | TR id | ZH id | In sitemap |
|---|---|---|---|---|---|---|---|---|---|
| `149911-boarding-kennel-or-cattery-operator` | 200/200/200 | en/tr/zh-Hans | yes | yes | index, follow | Hayvan Pansiyonu İşletmecisi ( / 宠物寄养经营者 | 0/16 | 0/10 | yes |
| `221211-company-secretary` | 200/200/200 | en/tr/zh-Hans | yes | yes | index, follow | Şirket Sekreteri (221211) / 公司秘书 | 6/28 | 6/20 | yes |
| `225114-content-creator-marketing` | 200/200/200 | en/tr/zh-Hans | yes | yes | index, follow | İçerik Üreticisi (Pazarlama) ( / 内容创作者 | 0/16 | 0/10 | yes |
| `225211-ict-account-manager` | 200/200/200 | en/tr/zh-Hans | yes | yes | index, follow | BİT Müşteri Yöneticisi (225211 / 信息通信技术客户经理 | 0/16 | 0/10 | yes |
| `232313-jewellery-designer` | 200/200/200 | en/tr/zh-Hans | yes | yes | index, follow | Mücevher Tasarımcısı (232313) / 珠宝设计师 | 0/16 | 0/10 | yes |
| `234116-aquaculture-or-fisheries-scientist` | 200/200/200 | en/tr/zh-Hans | yes | yes | index, follow | Su Ürünleri veya Balıkçılık Bi / 水产养殖或渔业科学家 | 2/23 | 2/15 | yes |
| `234711-veterinarian` | 200/200/200 | en/tr/zh-Hans | yes | yes | index, follow | Veteriner Hekim (234711) / 兽医 | 10/33 | 10/26 | yes |
| `241111-early-childhood-pre-primary-school-te` | 200/200/200 | en/tr/zh-Hans | yes | yes | index, follow | Okul Öncesi Öğretmeni (241111) / 学前教育教师 | 12/36 | 12/29 | yes |
| `272413-translator` | 200/200/200 | en/tr/zh-Hans | yes | yes | index, follow | Yazılı Tercüman (272413) / 笔译员 | 3/24 | 3/16 | yes |
| `272611-community-arts-worker` | 200/200/200 | en/tr/zh-Hans | yes | yes | index, follow | Toplum Sanat Çalışanı (272611) / 社区艺术工作者 | 6/28 | 6/20 | yes |
| `312212-civil-engineering-technician` | 200/200/200 | en/tr/zh-Hans | yes | yes | index, follow | İnşaat Mühendisliği Teknisyeni / 土木工程技术员 | 10/34 | 10/26 | yes |
| `323113-aircraft-maintenance-engineer-structu` | 200/200/200 | en/tr/zh-Hans | yes | yes | index, follow | Uçak Bakım Mühendisi (Yapısal) / 飞机维修工程师 | 10/42 | 10/30 | yes |
| `331112-stonemason` | 200/200/200 | en/tr/zh-Hans | yes | yes | index, follow | Taş Ustası (331112) / 石匠 | 10/42 | 10/30 | yes |
| `362411-nurseryperson` | 200/200/200 | en/tr/zh-Hans | yes | yes | index, follow | Fidanlıkçı (362411) / 苗圃工 | 3/23 | 3/15 | yes |
| `541111-call-or-contact-centre-team-leader` | 200/200/200 | en/tr/zh-Hans | yes | yes | index, follow | Çağrı Merkezi Takım Lideri (54 / 呼叫中心团队负责人 | 0/14 | 0/9 | yes |

## 6. Content differentiation

Compared EN vs TR vs zh-Hans on the same 15 occupations.

* **Genuinely localized:** `<title>`, meta description (except the assessing-authority proper name), H1, intro sentence, breadcrumbs, section headings and table labels. Example (Veterinarian, 234711): EN “Veterinarian (234711): Australian visa occupation information” / TR “Veteriner Hekim (234711): Avustralya vize meslek bilgileri” / ZH “兽医（234711）：澳大利亚签证职业信息”. The occupation name is translated and the standard disclaimer sentences are translated in both languages.
* **Template-driven:** every occupation page uses the same sections (Identity, National list placement, State and territory information, Skills assessment references, Registration, JSON-LD). Most per-occupation values are language-neutral (code, dates, authority names, subclass numbers). The text in TR/zh differs from EN mainly by translated labels, so uniqueness relies on the occupation name and the data values.
* **Not translated:** the state/territory condition text (free-text from the state data) is shown in English on the TR and zh-Hans pages. Across the 15 pages 72 of 391 TR sentences (18%) and 72 of 276 zh-Hans sentences (26%) are identical to the English page. Pages with no state placement (for example jewellery designer, content creator, ICT account manager, call centre team leader, boarding kennel operator) have **0** identical sentences; pages with several state lists (veterinarian, stonemason, aircraft maintenance engineer, civil engineering technician, early childhood teacher: 10–12 each) have the most. Example English sentence repeated verbatim on the Turkish veterinarian page: “2026-27 allocation: not yet confirmed by the Australian Government.”
* Verdict: **between A and B, closer to A.** The pages are localized in every user-visible heading and in the intro, but they are low-text data-table pages with a shared template, and the state-data text is not localized. Word count alone would mislead (EN, TR text lengths differ by 1–2%; zh-Hans is shorter because Chinese is compact), so this is a judgement on structure and the repeated sentences above.

## 7. Sitemap findings

Single `urlset` at `/sitemap.xml` (1,164,944 bytes, HTTP 200), **1,912 URLs**. Every URL was requested without following redirects: **1,912 × 200**, zero redirects, zero 404s, no `X-Robots-Tag`.

| Group | EN | TR | zh-Hans | Total |
|---|---|---|---|---|
| Occupation pages | 585 | 585 | 585 | 1755 |
| Occupation index (overview, major groups, letters) | 31 | 31 | 31 | 93 |
| Research guides (/guides/<slug>) | 6 | 0 | 0 | 6 |
| Legacy /guide | 1 | 1 | 1 | 3 |
| Visa pages | 3 | 3 | 3 | 9 |
| Visa comparison pairs | 5 | 5 | 5 | 15 |
| Tools | 8 | 8 | 8 | 24 |
| Home | 1 | 1 | 1 | 3 |
| Other | 2 | 1 | 1 | 4 |

* `/_next/` URLs: 0. URLs with `?dpl=` or any query: 0. Duplicates: 0. Trailing-slash or non-`www` URLs: 0.
* hreflang alternates inside the sitemap: every URL with alternates lists `en`, `tr`, `zh-Hans`, `x-default`, and its own locale entry equals its `<loc>` (0 anomalies). English-only URLs (6 research guides, 1 other) carry none, which is correct.
* `lastmod`: 891 on 2026-09-28, 339 on 2026-08-04, 294 on 2026-10-11, 120 on 2026-10-03, 99 on 2026-09-22, 12 on 2026-09-26; 157 URLs have none. All dates are in the past and plausible, derived from data verification dates (occupations) rather than the build date.
* Occupation URLs: 585 per locale. 693 occupations have a page; 108 are `thin` (noindex, not listed). The 772 retired codes are not listed.
* **Not listed but live and indexable:** the `/guides` hub (all three locales) and the ten older guides under `/guides/<slug>` (for example `/guides/189-vs-190-visa-differences`, `/tr/guides/australian-pr-from-turkey-guide`): self-canonical, `index, follow`, linked from the hub. Not harmful; the sitemap is incomplete for them.
* Lists `/guide`, `/tr/guide`, `/zh-Hans/guide` (see section 8).

## 8. Legacy `/guide` routes

| URL | Status | Canonical | Title | Content |
|---|---|---|---|---|
| `/guide` | 200 | itself | “Free Australia PR Guide 2026 \| LogiVisa” | English lead-magnet page (“80-page comprehensive English guide — free”) |
| `/tr/guide` | 200 | itself | same English title | same English content |
| `/zh-Hans/guide` | 200 | itself | same English title | same English content |
| `/guide/` | 308 → `/guide` | — | — | — |
| `/guides` , `/tr/guides`, `/zh-Hans/guides` | 200 | itself | localized titles | the real guides hub |

The three singular routes are 200 pages in the sitemap with `hreflang` declaring TR and zh-Hans alternates, but the TR and zh-Hans URLs show the English page. They are not linked from the pages crawled. If `/guides` is the hub, the preferred behaviour (not implemented) is `/guide → /guides`, `/tr/guide → /tr/guides`, `/zh-Hans/guide → /zh-Hans/guides`, plus removal from the sitemap. Check whether the “Free PR Guide” lead-magnet is still wanted before redirecting: the page is a product page (free copies counter), not a stub.

## 9. 404 / soft-404 findings

* Unknown occupation slug: `/occupations/999999-fake-job` (and `/tr`, `/zh-Hans`), `/occupations/not-a-slug`, `/occupations/group/9`, `/occupations/letter/zz`, `/visas/999`, `/tools/nonexistent`, `/tr/nonexistent-page` all return a **real HTTP 404 with `robots: noindex`**. None returns a fake 200. (Minor: the 404 pages of the localized routes carry a `<link rel="canonical">` to an `/en/...` URL that itself redirects; harmless because they are 404 + noindex.)
* A retired code returns 301 (to the major-group page), a wrong-words slug with a valid code returns 301 to the canonical slug, a code that never existed returns 404.
* Sitemap: 0 dead URLs.
* Internal links: in a crawl of 58 pages (home, hubs, tools, visas, 8 major-group pages, 12 EN + 10 TR + 10 zh-Hans occupation pages) there were 1,251 unique internal links: 1,223 → 200, **26 → 308 (`/en/...` prefixed English links)**, 2 → 307 (`/tr/dashboard`, `/zh-Hans/dashboard` → sign-in, an authenticated area), **0 → 404**.
* I cannot identify the 38 “Not found (404)” or the 7 “Soft 404” URLs without the GSC example lists. I am **not** assigning a cause. Candidates to check once the lists are available: retired occupation URLs that were 404 before the 14 October redirects, and redirect targets that Google may judge irrelevant (soft 404).

## 10. Decision matrix

| Issue | Class | Why |
|---|---|---|
| 828 Crawled – currently not indexed | **GREEN** | Next.js build assets with `?dpl=`; not content; not in sitemap; correctly served; `/_next/` must stay crawlable |
| 201 Google chose different canonical (mostly TR/zh-Hans occupations) | **YELLOW** | 18/19 sampled slugs are now 301s (shipped after the snapshot); live pages are self-canonical with correct hreflang. Re-check after Google recrawls (4–8 weeks). Residual risk is content duplication (section 6), not the tags |
| 510 Page with redirect | **YELLOW** (intentional) + **RED** (low) | Retired-occupation 301s are intended; but internal English links through `/en/...` 308s are a defect we control |
| 434 Alternate page with proper canonical | **GREEN** | Query-string, case and slash variants canonicalize correctly (verified). Confirm with the GSC example list |
| 38 Not found (404) | **YELLOW** | Unknown slugs return real 404s; sitemap and crawl found 0 dead links; need the GSC examples to attribute |
| 7 Soft 404 | **YELLOW** | No example URLs; candidates are redirect targets or thin pages; need examples |
| TR occupation indexing | **YELLOW** | Technically correct today; templated content, English state text |
| zh-Hans occupation indexing | **YELLOW** | Same, with a larger English share (26%) |
| Sitemap | **GREEN** | Clean (section 7); the `/guides` hub and older guides are missing (cosmetic) |
| `/guide` legacy routes | **RED** (low–medium) | English content under TR/zh-Hans URLs with hreflang that claims translations; in the sitemap |
| Internal `/en/` links | **RED** (low) | 143 `/${locale}/...` href template sites in `components/` and `app/`; each English link is a 308 hop |

## 11. Recommended next actions, in priority order

1. **Wait; do not change canonicals, hreflang, robots or sitemap structure.** Request validation only after Google recrawls the redirects (they are only 8 days old).
2. **Get the GSC example lists** for the 38 × 404, 7 × soft 404, 510 redirects and a full export of the 828 bucket, and diff them against this audit (a script is trivial once the lists exist).
3. **Small, low-risk fix (separate task):** build internal links with `publicPath(locale, path)` (already in `lib/seo/urls.ts`) so English links are unprefixed; add a test that no rendered English page links to `/en/`.
4. **Decide the `/guide` product question**, then 301 `/guide`, `/tr/guide`, `/zh-Hans/guide` to `/guides` equivalents and drop them from the sitemap (or keep English-only at `/guide` with no TR/zh-Hans alternates).
5. **Localize the state-condition text** on TR and zh-Hans occupation pages (the biggest identifiable gap), then reassess indexing of localized occupation pages.
6. Optionally add the `/guides` hub and the ten older guides to the sitemap.

## 12. Direct answers

**A. Is the current production canonical implementation broken?** No. On every live page tested it is self-referencing with reciprocal hreflang and a correct `x-default`; code and production agree.

**B. Are the 201 GSC duplicate URLs an old-data issue, a current technical issue or a content-quality issue?** Mainly **old data** (the sampled retired occupations now 301; the snapshot predates that), with a possible **content-quality** component for the live TR/zh-Hans pages (template pages with untranslated state text). I found **no current technical canonical fault** behind them. Combination, weighted to old data; I cannot confirm the exact 201 without the list.

**C. Should TR/ZH occupation pages remain indexable for now?** Yes. They are technically correct, genuinely localized in headings and intro, and thin pages are already `noindex`. Revisit after recrawl and the localization of the state text.

**D. Do we need any immediate production fix?** No. The two RED items (English `/en/` links, legacy `/guide`) are low-severity hygiene fixes that can be handled as normal tasks, not emergencies.

**E. What should we wait for Google to recrawl before changing anything?** The 301s on retired occupation URLs (14 Oct), the 20 Oct occupation pages and sitemap changes, and the 7 Oct canonical/hreflang fix. Re-pull the Page indexing report 4–8 weeks later and compare the 201, 510 and 434 buckets.

## Appendix — method and limits

* Fetched with a normal browser-like user agent from one location; no JavaScript rendering, so JS-only content is not seen (the checked tags and text are server-rendered).
* 19 requested slugs × 3 locales (57 URLs), 15 live slugs × 3 locales (45), 1,912 sitemap URLs, 58 crawled pages (1,251 unique links), plus targeted probes. Raw outputs were kept out of the repo.
* Not verified: the full lists behind the 828/201/510/434/38/7 counts; how Google rendered or chose canonicals; any pre-7-October HTML.
