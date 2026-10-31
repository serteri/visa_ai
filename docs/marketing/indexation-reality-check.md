# Indexation reality check

Audit only. No code, redirect, sitemap, metadata or content was changed. Date: 2026-10-31. Production (`www.logivisa.com`) at `6c5d24a`.

**Method.** The production `sitemap.xml` was fetched and compared with the application's own data (`getUniqueOccupations`, `occupationRichness`, `src/data/occupation-slug-redirects.json`). 30 occupation URLs and 25 historical `/en/` URLs were requested with redirects followed one hop at a time. All 693 live English occupation pages were fetched once to measure content depth. Reproducible with plain `fetch`; the working scripts are not committed.

**What this audit cannot see.** Google-selected canonical, index status, "Crawled - currently not indexed" and "Discovered - currently not indexed" reasons, and impressions per URL all need Search Console (URL Inspection or its API). There is no access to either here, so every such field is marked **UNVERIFIED** and nothing is inferred from public HTML.

---

## 1. Canonical inventory (actual counts)

| Item | Count | Source |
|---|---|---|
| Live occupation pages per locale | **693** (same set in en, tr, zh-Hans: 2,079 URLs) | `getUniqueOccupations()` |
| Indexable tier (medium + rich) | **585** per locale: 204 rich, 381 medium | `occupationRichness` |
| Intentionally noindexed thin tier | **108** per locale (324 URLs); `noindex, follow`, not in sitemap | page `robots` meta; sitemap |
| English occupation URLs in the sitemap | **585** (prefixless) | production sitemap |
| Turkish occupation URLs in the sitemap | **585** (`/tr/…`) | production sitemap |
| Simplified Chinese occupation URLs in the sitemap | **585** (`/zh-Hans/…`) | production sitemap |
| Occupation page URLs in the sitemap | **1,755** (of 1,913 sitemap URLs) | production sitemap |
| Occupation hub, group and letter URLs in the sitemap | **93** (3 hubs, 90 group/letter) | production sitemap |
| Retired codes (no page, redirected) | **772** codes; none overlaps a live code | `occupation-slug-redirects.json` `known` |
| Unknown codes | not enumerable; any other code returns 404 | tested, section 3 |

Cross-checks (all pass): every indexable page is in the sitemap, no thin page is in the sitemap, every sitemap occupation slug exists as a live page, no sitemap URL is duplicated, none carries a query string or an `/en/` prefix, none is a PDF or other asset, and the three locales have identical counts. All 1,755 occupation URLs carry a `lastmod`; the six distinct dates (26 Sep to 11 Oct 2026) are data-source verification dates, not crawl-triggered edits.

Routing behaviour in the application (read from `proxy.ts`, `next.config.ts`, `lib/occupations/redirects.ts`, the occupation page):
- `/en/*` → permanent redirect to the prefixless URL (308).
- A live code with other words in the slug → 301 to the canonical slug.
- A retired code → 301 to `/occupations/group/<first digit 1-8>` (else the ANZSCO finder).
- A code that never existed → 404.
- Thin pages respond 200 with `noindex, follow` and a self-canonical.

## 2. Sample of 30 occupation URLs

10 English, 10 Turkish, 10 Simplified Chinese. Included in every locale: 225113 Marketing Specialist, 149311 Conference and Event Organiser, 331212 Carpenter and 421111 Child Care Worker (the two occupation pages that appear in the earlier marketing evidence), plus two rich, two medium and two thin pages chosen deterministically per locale. *Words are whitespace-separated tokens of the visible text, so Chinese pages are under-counted.*

| Locale | Code | Tier (score) | HTTP | Self-canonical | Robots meta | In sitemap | Hreflang | Words* | Internal links | Structured data |
|---|---|---|---|---|---|---|---|---|---|---|
| en | 225113 | medium (2) | 200 | yes | index, follow | yes | 4 (en, tr, x-default, zh-Hans) | 2221 | 22 | Occupation+WebPage+FAQPage |
| en | 149311 | medium (3) | 200 | yes | index, follow | yes | 4 (en, tr, x-default, zh-Hans) | 1336 | 18 | Occupation+WebPage+FAQPage |
| en | 331212 | rich (5) | 200 | yes | index, follow | yes | 4 (en, tr, x-default, zh-Hans) | 1652 | 20 | Occupation+WebPage |
| en | 421111 | thin (1) | 200 | yes | noindex, follow | no | 4 (en, tr, x-default, zh-Hans) | 375 | 19 | Occupation+WebPage |
| en | 134211 | rich (4) | 200 | yes | index, follow | yes | 4 (en, tr, x-default, zh-Hans) | 1318 | 22 | Occupation+WebPage |
| en | 234611 | rich (5) | 200 | yes | index, follow | yes | 4 (en, tr, x-default, zh-Hans) | 1603 | 19 | Occupation+WebPage |
| en | 121221 | medium (2) | 200 | yes | index, follow | yes | 4 (en, tr, x-default, zh-Hans) | 811 | 22 | Occupation+WebPage |
| en | 149911 | medium (2) | 200 | yes | index, follow | yes | 4 (en, tr, x-default, zh-Hans) | 536 | 22 | Occupation+WebPage |
| en | 211214 | thin (0) | 200 | yes | noindex, follow | no | 4 (en, tr, x-default, zh-Hans) | 341 | 22 | Occupation+WebPage |
| en | 512299 | thin (0) | 200 | yes | noindex, follow | no | 4 (en, tr, x-default, zh-Hans) | 347 | 19 | Occupation+WebPage |
| tr | 225113 | medium (2) | 200 | yes | index, follow | yes | 4 (en, tr, x-default, zh-Hans) | 2044 | 22 | Occupation+WebPage+FAQPage |
| tr | 149311 | medium (3) | 200 | yes | index, follow | yes | 4 (en, tr, x-default, zh-Hans) | 1242 | 18 | Occupation+WebPage+FAQPage |
| tr | 331212 | rich (5) | 200 | yes | index, follow | yes | 4 (en, tr, x-default, zh-Hans) | 1583 | 20 | Occupation+WebPage |
| tr | 421111 | thin (1) | 200 | yes | noindex, follow | no | 4 (en, tr, x-default, zh-Hans) | 346 | 19 | Occupation+WebPage |
| tr | 233111 | rich (4) | 200 | yes | index, follow | yes | 4 (en, tr, x-default, zh-Hans) | 1507 | 19 | Occupation+WebPage |
| tr | 311216 | rich (4) | 200 | yes | index, follow | yes | 4 (en, tr, x-default, zh-Hans) | 1436 | 22 | Occupation+WebPage |
| tr | 121322 | medium (2) | 200 | yes | index, follow | yes | 4 (en, tr, x-default, zh-Hans) | 583 | 22 | Occupation+WebPage |
| tr | 232213 | medium (3) | 200 | yes | index, follow | yes | 4 (en, tr, x-default, zh-Hans) | 777 | 20 | Occupation+WebPage |
| tr | 212415 | thin (1) | 200 | yes | noindex, follow | no | 4 (en, tr, x-default, zh-Hans) | 396 | 22 | Occupation+WebPage |
| tr | 393113 | thin (1) | 200 | yes | noindex, follow | no | 4 (en, tr, x-default, zh-Hans) | 358 | 21 | Occupation+WebPage |
| zh-Hans | 225113 | medium (2) | 200 | yes | index, follow | yes | 4 (en, tr, x-default, zh-Hans) | 871 | 22 | Occupation+WebPage+FAQPage |
| zh-Hans | 149311 | medium (3) | 200 | yes | index, follow | yes | 4 (en, tr, x-default, zh-Hans) | 565 | 18 | Occupation+WebPage+FAQPage |
| zh-Hans | 331212 | rich (5) | 200 | yes | index, follow | yes | 4 (en, tr, x-default, zh-Hans) | 944 | 20 | Occupation+WebPage |
| zh-Hans | 421111 | thin (1) | 200 | yes | noindex, follow | no | 4 (en, tr, x-default, zh-Hans) | 140 | 19 | Occupation+WebPage |
| zh-Hans | 233611 | rich (4) | 200 | yes | index, follow | yes | 4 (en, tr, x-default, zh-Hans) | 1038 | 19 | Occupation+WebPage |
| zh-Hans | 362211 | rich (4) | 200 | yes | index, follow | yes | 4 (en, tr, x-default, zh-Hans) | 563 | 20 | Occupation+WebPage |
| zh-Hans | 133311 | medium (2) | 200 | yes | index, follow | yes | 4 (en, tr, x-default, zh-Hans) | 213 | 19 | Occupation+WebPage |
| zh-Hans | 252111 | medium (3) | 200 | yes | index, follow | yes | 4 (en, tr, x-default, zh-Hans) | 623 | 19 | Occupation+WebPage |
| zh-Hans | 224913 | thin (1) | 200 | yes | noindex, follow | no | 4 (en, tr, x-default, zh-Hans) | 219 | 22 | Occupation+WebPage |
| zh-Hans | 224914 | thin (1) | 200 | yes | noindex, follow | no | 4 (en, tr, x-default, zh-Hans) | 166 | 22 | Occupation+WebPage |

Findings from the sample:
- All 30 return **200 with no redirect**, are **self-canonical** (locale-prefixed for tr and zh-Hans), carry the **same four hreflang entries** (en, tr, zh-Hans, x-default), have one H1, the correct `<html lang>`, and render their full text in the server HTML (no JavaScript needed).
- All 24 indexable pages are `index, follow` and in the sitemap. All 6 thin pages are `noindex, follow` and absent from the sitemap, exactly as designed.
- Structured data is WebSite, BreadcrumbList and Occupation/WebPage on every page; only 225113 and 149311 add FAQPage.
- A query-string variant (`?utm_source=x&fbclid=abc`) returns 200 with the clean canonical. A trailing slash returns 308, mixed-case slug 301, bare code `/occupations/225113` 301, all to the canonical slug.
- `421111` Child Care Worker, which appears in the earlier marketing evidence, is a **thin** page and is intentionally `noindex`. Its absence from Google's index is by design, not a fault. `331212` Carpenter is a rich page, in the sitemap and indexable.
- `225113` is classed **medium** (score 2), not rich, by the richness rule. It is nonetheless indexable and the most content-rich page on the site (about 2,200 English words, 13 FAQ questions).

## 3. Historical `/en/` URLs (25 tested)

Classes: **A** live canonical (should reach the prefixless URL), **B** retired code (intentional redirect to the group page), **C** unknown (should 404). Slug words after the code were made up for the B and C rows because the original slugs are not recorded.

| Class | Historical URL (code part) | Chain | Final | Routing correct? |
|---|---|---|---|---|
| A live canonical slug | `/en/…/132211-finance-manager` | 308 → /occupations/132211-finance-manager | 200 (index, follow) | yes |
| A live canonical slug | `/en/…/133111-construction-project-manager` | 308 → /occupations/133111-construction-project-manager | 200 (index, follow) | yes |
| A live canonical slug | `/en/…/133211-engineering-manager` | 308 → /occupations/133211-engineering-manager | 200 (index, follow) | yes |
| A live canonical slug | `/en/…/121111-aquaculture-farmer` | 308 → /occupations/121111-aquaculture-farmer | 200 (index, follow) | yes |
| A live canonical slug | `/en/…/121211-cotton-grower` | 308 → /occupations/121211-cotton-grower | 200 (index, follow) | yes |
| A live canonical slug | `/en/…/111111-chief-executive-or-managing-director` | 308 → /occupations/111111-chief-executive-or-managing-director | 200 (noindex, follow) | yes |
| A live canonical slug | `/en/…/111211-corporate-general-manager` | 308 → /occupations/111211-corporate-general-manager | 200 (noindex, follow) | yes |
| A live code, old/other words | `/en/…/225113-old-title-words` | 308 → /occupations/225113-old-title-words ; 301 → /occupations/225113-marketing-specialist | 200 (index, follow) | yes |
| A live code, old/other words | `/en/…/149311-old-title-words` | 308 → /occupations/149311-old-title-words ; 301 → /occupations/149311-conference-and-event-organiser | 200 (index, follow) | yes |
| B retired code | `/en/…/111212-some-old-title` | 308 → /occupations/111212-some-old-title ; 301 → /occupations/group/1 | 200 (index, follow) | yes |
| B retired code | `/en/…/111213-some-old-title` | 308 → /occupations/111213-some-old-title ; 301 → /occupations/group/1 | 200 (index, follow) | yes |
| B retired code | `/en/…/111311-some-old-title` | 308 → /occupations/111311-some-old-title ; 301 → /occupations/group/1 | 200 (index, follow) | yes |
| B retired code | `/en/…/111312-some-old-title` | 308 → /occupations/111312-some-old-title ; 301 → /occupations/group/1 | 200 (index, follow) | yes |
| B retired code | `/en/…/111399-some-old-title` | 308 → /occupations/111399-some-old-title ; 301 → /occupations/group/1 | 200 (index, follow) | yes |
| B retired code | `/en/…/254513-some-old-title` | 308 → /occupations/254513-some-old-title ; 301 → /occupations/group/2 | 200 (index, follow) | yes |
| B retired code | `/en/…/254514-some-old-title` | 308 → /occupations/254514-some-old-title ; 301 → /occupations/group/2 | 200 (index, follow) | yes |
| B retired code | `/en/…/254515-some-old-title` | 308 → /occupations/254515-some-old-title ; 301 → /occupations/group/2 | 200 (index, follow) | yes |
| B retired code | `/en/…/712916-some-old-title` | 308 → /occupations/712916-some-old-title ; 301 → /occupations/group/7 | 200 (index, follow) | yes |
| B retired code | `/en/…/712917-some-old-title` | 308 → /occupations/712917-some-old-title ; 301 → /occupations/group/7 | 200 (index, follow) | yes |
| C never-existed code | `/en/…/111000-made-up` | 308 → /occupations/111000-made-up | 404 | yes |
| C never-existed code | `/en/…/115097-made-up` | 308 → /occupations/115097-made-up | 404 | yes |
| C never-existed code | `/en/…/119194-made-up` | 308 → /occupations/119194-made-up | 404 | yes |
| C never-existed code | `/en/…/123291-made-up` | 308 → /occupations/123291-made-up | 404 | yes |
| C malformed id | `/en/…/not-a-code` | 308 → /occupations/not-a-code | 404 | yes |
| tr live via /en/ prefix | `/en/tr/occupations/225113-marketing-specialist` | 308 → /tr/occupations/225113-marketing-specialist | 200 (index, follow) | yes |

**Incorrect routing found: none.** Every class behaves as designed.
- All A rows (live) reach the prefixless URL with 200 in one hop; indexable pages stay `index, follow`, thin pages `noindex, follow`.
- All B rows (retired) reach a relevant `/occupations/group/N` page, which exists, returns 200 and is indexable.
- All C rows (never-existed or malformed) return a real **404** status, not a soft 404.
- `/en/tr/occupations/…` resolves to the `/tr/` page.

Observation, not a defect: for a live code with other slug words, and for every retired code, the chain is **two hops** (`/en/…` 308, then the occupation redirect 301). Google follows multi-hop chains; this only matters if crawl efficiency on old URLs becomes an issue. It is also the only reason a redirect pair of different status codes (308 then 301) appears.

## 4. Search Console interpretation (what each bucket means)

| Bucket | What it is on this site | Expected Search Console status | Failure? |
|---|---|---|---|
| Canonical content URLs | 585 × 3 locale URLs, 200, self-canonical, indexable | indexed, or "Crawled/Discovered - currently not indexed" | Only if the content is worth indexing and stays unindexed (see section 6). **UNVERIFIED** |
| Historical `/en/` URLs | permanent redirects (308, sometimes then 301) | "Page with redirect" | **No**. Expected and correct |
| Retired-code URLs | 301 to a group page | "Page with redirect" | **No** |
| Unknown-code URLs | 404 | "Not found (404)" | **No** |
| Query-parameter variants (`utm_*`, `fbclid`, `ref`) | 200 with the clean canonical | "Duplicate, Google chose different canonical", or "Alternate page with proper canonical" | **No**. Expected |
| Intentionally noindexed thin pages | 108 × 3, `noindex, follow` | "Excluded by 'noindex' tag" | **No**. By design |
| Static assets | the PDF returns 200 `application/pdf`, not in the sitemap, not noindexed | indexed or not, independently | **No**. Preserved on purpose |
| Redirected pages | the `/tr`, `/zh-Hans` and prefixless pairs are separate canonical URLs, not redirects | indexed per locale | n/a |

"Crawled - currently not indexed" is Google's own judgement about a fetched, valid page. It is not a technical error and must not be counted as one. **UNVERIFIED** for every URL here: neither the Google-selected canonical nor the confirmed index status of any URL was checked.

## 5. Confirmed technical problems

**None confirmed.** Status codes, redirects, canonicals, robots meta, hreflang (4 entries, reciprocal and consistent with the sitemap), sitemap membership, 404 handling and server-rendered HTML are all correct on the 30-URL sample, the 25 historical URLs and the full 693-page fetch (all 693 return 200; the 585 indexable are `index, follow` and the 108 thin are `noindex, follow`).

## 6. Is content quality an issue?

**Plausibly yes, for the long tail; not for the two researched pages.** Measured on the English pages, comparing every 8-word window of visible text (header and footer removed) with the other pages:

| Tier | Pages | Visible words (median; min to max) | Median share of text not shared by more than 3 pages |
|---|---|---|---|
| rich | 204 | 1,234; 713 to 1,725 | 6% |
| medium | 381 | 608; 333 to 2,131 | 9% |
| thin (noindex) | 108 | 265; 220 to 444 | 20% |

- For a sampled set of indexable pages, the closest other indexable page shares a median of about **91%** of its text windows (p90 about 93%). The word counts overstate the unique content: roughly 90% of a typical indexable page is shared template wording, with the occupation name, ANZSCO code, authority, list placement and dated figures varying.
- Only the two researched pages are materially unique: 225113 (about 98% unique windows) and 149311 (about 68%).
- This is a **risk indicator**, not proof. Page text includes shared interface wording and the measure is crude. It is consistent with Google crawling many near-identical occupation pages and choosing not to index some, but that is **UNVERIFIED** without Search Console data.
- The richness rule already keeps the thinnest pages (108) out of the index; the medium tier (381, median about 600 words, mostly template) is where the question lies.

## 7. Unverified Google-side questions

All need Search Console URL Inspection (or its API); none can be answered from public HTML:
1. How many of the 1,755 sitemap occupation URLs are indexed, per locale.
2. Google-selected canonical for each sampled URL, including whether any tr or zh-Hans page is treated as a duplicate of the English one.
3. Which URLs sit under "Crawled - currently not indexed" and "Discovered - currently not indexed", and whether they are concentrated in the medium tier or the retired-code groups.
4. Whether impressions on historical `/en/` URLs are still being reported (a lag, not an error) and when Google last crawled them.
5. Which "recently surfaced occupation pages" Search Console shows. The repo's evidence files name 331212 and 421111 (marketing evidence) and 351311 and 233211 (acquisition evidence), with no Search Console impression data.

## 8. Recommendation

**A new SEO coding sprint is not justified by the evidence collected.** There is no confirmed technical defect to fix: routing, canonicals, robots, hreflang, sitemap and 404 behaviour are correct, and the historical-URL "problems" are expected redirect statuses.

Prioritised actions, only where supported:
1. **(Needed before any decision) Export the Search Console Page indexing report** (Indexed, "Crawled/Discovered - currently not indexed", "Page with redirect", "Excluded by noindex") and URL Inspect about 10 representative URLs, including 225113, 149311, one rich, one medium and one thin. This decides whether anything is wrong at all. No code is involved.
2. **If, and only if, the report shows the medium-tier occupation pages mostly not indexed:** the cause is likely template similarity (section 6), and the remedy is content, not routing. That would be a content sprint on the highest-demand occupations (the 225113 and 149311 pattern), not a technical SEO sprint. The alternative is tightening the richness threshold so fewer near-identical pages are indexable. Both are product decisions; neither is recommended now.
3. **Optional, low priority:** remove the second hop for retired codes (`/en/…` then 301) by redirecting directly. It is cosmetic, carries no ranking risk, and is not worth a sprint.

Do not restore retired occupation pages to recover old impressions. Do not add redirects or noindex rules for the buckets in section 4: they are behaving correctly.
