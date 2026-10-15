# Adding a language

How the site's languages are wired today, every place a language is still written into code, the steps to add one, and an assessment of Hindi (`hi`).
Audit date: 16 October 2026 (counts are lines containing `zh-Hans` in `.ts` / `.tsx` outside `node_modules`, `.claude/worktrees` and `scratch`).

## 1. One list of supported languages

`lib/i18n/config.ts` `activeLocales` is the supported-locales list. Everything below reads it, so a language added to it appears there with no further change:

| Reads `activeLocales` | What it does |
|---|---|
| `lib/admin-data/locales.ts` `ADMIN_TRANSLATION_LOCALES` (= `activeLocales` without `en`) | the admin translation fields (State editor: one block per language, with "Draft translation" and the "reviewed" tick), the `draftTranslationAction` check, the stamping of who reviewed a translation, `hasUnreviewed`, the dry-run counts |
| `lib/admin-data/validate.ts` | any language key in a localized field is accepted (`catchall`), so stored data of a new language validates |
| `lib/admin-data/types.ts` `LocalizedField` | the type has an index signature: no change for a new language (`tr` and `zh-Hans` are named only for readability) |
| `lib/admin-data/translate.ts` | the model prompt names the language from `lib/languages.ts` (`label`); the value check uses `lib/admin-data/value-normalise.ts` |
| `app/sitemap.ts`, `lib/seo/urls.ts` (canonical + hreflang) | one URL and one `alternates.languages` entry per locale |
| `components/language-selector.tsx` | the selector entries and the "does the path start with a locale" test |

`lib/languages.ts` holds the display names and the `enabled` flag (Hindi is already listed there, disabled). Keep `enabled: true` in step with `activeLocales`
(`scripts/test-translation-check.ts` fails if the admin list and the site list disagree).

## 2. Where a language is still written into code

These are the places a new language must be added by hand. Counts are lines containing `zh-Hans`; "T(...)" means a helper taking one string per language.

| Area | Files | What is hard-coded | Notes |
|---|---|---|---|
| Routing and access rules | `proxy.ts` (20 lines) | `LOCALES = ["en","tr","zh-Hans"]`, six regular expressions `^/(en\|tr\|zh-Hans)/...` (admin, dashboard, agent, CRM role), `localeFromPath` | build the alternation from `activeLocales` |
| Site messages | `lib/i18n/get-dictionary.ts` (one dynamic `import` per language), `lib/i18n/get-translations.ts`, `public/locales/{en,tr,zh-Hans}.json` (882 lines each) | one JSON per language, imported by name | add `hi.json`; the dictionary map is a literal object |
| Page components | `app/` (420 lines in ~60 files: visas, Canada pages, full-check, guide), `components/` (82 lines: landing Hero, Faq, FeaturesBento, Testimonials, StatsBar, PdfGuides) | inline objects `{ en, tr, "zh-Hans" }` | largest block of work |
| Report engine and PDF text | `lib/readiness/` (30 files incl. `engine.ts` 51, `document-inventory.ts` 165, `ranked-pathways.ts`, `financial-roadmap-totals.ts`, `pdf-content/` 12 files), `src/lib/readiness/localization.ts` (31), `src/lib/readiness-engine.ts` (19), `lib/readiness/types.ts` (`Locale = "en"\|"tr"\|"zh-Hans"`) | `t(locale, en, tr, zh)` with three positional strings (~370 call sites), plus the `Locale` type | convert to keyed maps before adding a fourth language |
| PDF fonts | `lib/readiness/generate-pdf.ts` (71), `pdf-font.ts`, `pdf-font-bold.ts`, `pdf-font-sc.ts`, `public/fonts/NotoSansSC-*.ttf`, `src/assets/fonts/` | NotoSans (Latin + Turkish) base64, NotoSansSC loaded from disk / origin for Chinese; the font is chosen by `locale === "zh-Hans"` | a script that Noto Sans does not cover needs its own font file and a branch here |
| Skills-assessment authorities | `lib/skills-assessment/authorities/*.ts` (15 files, 20-60 lines each), `lib/skills-assessment/i18n.ts` (its own `Locale` type), `src/data/assessing-bodies.json` (55) | per-authority text in three languages | |
| State nomination text | `lib/state-nomination/state-keyfact-translations.ts`, `state-note-translations.ts`, `lib/admin-data/statuses.ts` `LABELS` (status names) | translation tables of the seed and the status labels (`stateStatusLabel` falls back to English for a language with no entry) | the admin panel now stores translations per language; only the status labels and the seed's carried-over texts are code |
| Chat language detection | `lib/chat/locale.ts` `detectAnswerLocale` | Chinese characters, then Turkish letters and words, else English | needs a script test or word list for the new language |
| Chat prompts and scope lines | `lib/chat/prompts.ts` (`LANGUAGE_NAME`, the "not in my sources" sentence), `lib/chat/engine-facts.ts` (`gateRowCitation`), `lib/chat/corrections.ts` (55, `T(l,en,tr,zh)` and `locale === "tr" ? ... : "zh-Hans"` ternaries), `lib/chat/plan-summary.ts` (21), `lib/chat/points-guard.ts`, `lib/chat/residence.ts`, `lib/chat/state-claims.ts`, `lib/chat/information-only.ts` (20; 54 lines of Chinese) | every chat sentence the code writes itself | |
| Information-only detectors | `lib/chat/information-only.ts` | per language and per category regular expressions (pick, instruction, chance, verdict, eligibility, "you can apply", legality, imperative), the replacement sentences, the neutral recap, the referral line | needs a native speaker; each category has tests in `scripts/test-chat-information-only.ts` |
| Banned-phrase lists | `lib/seo/banned-phrases.ts` (tr list), `lib/readiness/report-invariants.ts` (blocked language), `scripts/test-report-banned-phrases.ts` | per-language lists of phrases a report may not use | a new language needs its own list |
| SEO content | `lib/seo/*-content.ts` (5 files, one `"zh-Hans": {}` block each), `lib/i18n/checklist-content.ts` | per-language page content | |
| Emails | `lib/email/chat-restore.ts`, `pdf-delivery.ts` (`COPY.tr / COPY.zh`), `quick-check-emails.ts` (`SupportedLocale`) | subject and body per language | |
| Forms and lead magnets | `lib/intake/fields.ts` (25), `lib/lead-magnets.ts` (`Locale3`), `lib/countries.ts` (36, country names) | labels and options | country names need a translated list |
| Tests | 62 files in `scripts/` mention `zh-Hans` (`test-chat-*`, `test-report-*`, `test-pdf-route`, `test-intake-situation`, `test-seo-occupation`, ...) | fixtures per language, `["en","tr","zh-Hans"]` loops | the loops should iterate `activeLocales` |

## 3. Steps to add a language (`xx`)

1. **Decide the code** (`hi`, `ar`, ...). Add it to `activeLocales` in `lib/i18n/config.ts`, remove it from `comingSoonLocales`, set `enabled: true` in `lib/languages.ts`, add its name to `localeLabels`.
2. **Routing**: update `proxy.ts` (`LOCALES` and the regular expressions; ideally build them from `activeLocales` once). Check `next.config.ts` redirects: `/en` is the only redirected prefix.
3. **Messages**: add `public/locales/xx.json` (copy `en.json`, translate), and the line in `lib/i18n/get-dictionary.ts`.
4. **Types**: add `xx` to the `Locale` unions in `lib/readiness/types.ts`, `lib/skills-assessment/i18n.ts`, `lib/lead-magnets.ts`, `lib/i18n/checklist-content.ts`, `lib/email/quick-check-emails.ts`; `tsc` then lists every `Record<Locale, ...>` that needs an entry.
5. **Page and report text**: add the `xx` string at every `t(locale, ...)` / `{ en, tr, "zh-Hans" }` site that `tsc` or the per-area greps in section 2 find. Prefer converting a three-positional-string helper to a keyed map when you touch it.
6. **PDF**: add the font (section 4 for scripts that need shaping), the branch in `generate-pdf.ts`, and the font files under `src/assets/fonts` and `public/fonts`. Run `scripts/render-persona-pdfs.ts` and `scripts/test-pdf-route.ts`, and look at the pages.
7. **Chat**: `detectAnswerLocale`, `LANGUAGE_NAME`, the scope and "not in my sources" lines in `prompts.ts`, the helpers in `corrections.ts` / `plan-summary.ts` / `points-guard.ts` / `engine-facts.ts`, and the detectors in `information-only.ts` (all categories). Add the language's cases to `test-chat-information-only.ts`, `test-chat-golden.ts` and `test-chat-benchmarks.ts`.
8. **Banned phrases**: add the language's list to `lib/seo/banned-phrases.ts` and the report invariants.
9. **SEO and emails**: the five `lib/seo/*-content.ts` blocks, `checklist-content.ts`, the email copy.
10. **Admin data (automatic)**: the State editor shows the new language's field next to Türkçe and 简体中文 and "Draft translation" works for it. Two things are not automatic: `lib/admin-data/value-normalise.ts` (add the language to `DATE_LANGUAGES` with its month names, and its digits / amount words if it uses them; until then dates and amounts are compared as plain numbers) and `LABELS` in `lib/admin-data/statuses.ts` (status names; English is shown until added). The seed has no translations for the new language, so every State field shows "none: customers see English" until you draft and review.
11. **Tests**: add the language to the loops in `scripts/` (62 files), then run `npm run test:reports`, `tsc --noEmit` and `next build` with no `DATABASE_URL`.
12. **Sitemap / hreflang**: nothing to do (they read `activeLocales`); check `/sitemap.xml` and one page's `<link rel="alternate">`.

## 4. Hindi (`hi`): assessment (nothing is added)

| Topic | Finding | Effort |
|---|---|---|
| Already in place | `lib/languages.ts` lists Hindi (disabled); `comingSoonLocales` has `hi`. | - |
| Config, routing, selector, sitemap, hreflang | Steps 1-3 and 12: small. | 0.5 day |
| Devanagari font for the PDF | Noto Sans Devanagari (OFL) covers the script, embedded like Noto Sans SC (the Chinese font is 17.8 MB regular / 8.5 MB bold; a Devanagari font is a few hundred KB per weight). **The risk is not the font but shaping**: Devanagari needs OpenType shaping (conjuncts, reordering of the *i*-matra, half forms). jsPDF, which `generate-pdf.ts` uses, does not shape text, so a plain font swap would draw broken clusters. A spike is needed before any estimate is firm: either pre-shape runs with a HarfBuzz build (harfbuzzjs) into glyph ids, or move the Hindi report to an engine that shapes (pdf-lib with fontkit, or the browser print path). Mixed English terms (subclass numbers, fees) must stay Latin. | spike 1-2 days; implementation 2-3 days |
| Numbers and dates | Western digits are normal in Indian business writing, Devanagari digits (०-९) also occur; amounts use the lakh / crore grouping (`1,25,000`) and words (लाख, करोड़); dates "27 जुलाई 2026". `value-normalise.ts` handles Western digits and the `万` unit; it needs Devanagari digits, the month names, लाख/करोड़ and Indian grouping (the thousands rule would read `1,25,000` as 125 000 only by luck). The report's own formatting (`toLocaleString`) must use `en-IN` for grouping if you want lakh style. | 0.5 day plus tests |
| Chat language detection | Easy for Devanagari (`/[ऀ-ॿ]/`); romanised Hindi ("Hinglish") cannot be told from English without a word list, so it would be answered in English. | 0.25 day |
| Information-only detectors | The eight detector categories, the replacement sentences, the neutral recap and the referral line must be written for Hindi (postpositions and verb endings make the patterns different from Turkish and Chinese). Needs a native speaker's review and the same regression cases as `test-chat-information-only.ts`. | 2 days |
| Other chat helpers (`corrections`, `plan-summary`, `points-guard`, `engine-facts`, prompts) | about 150 lines of three-language sentences. | 1.5 days |
| Report and page text | The bulk: `lib/readiness`, `src/lib/readiness`, authorities, components, SEO blocks, emails (about 1,300 lines across ~220 files). Converting the `t(locale, en, tr, zh)` helpers to keyed maps first makes this mechanical. Translation itself and a native review are extra. | 6-8 days engineering |
| `public/locales/hi.json` | 882 strings to translate (outside engineering). | wiring 0.25 day |
| Admin data | automatic (section 3, step 10), plus the status labels. | 0.25 day |
| Banned phrases, tests | a Hindi list; the `scripts/` loops. | 2-3 days |
| **Total** | engineering | **about 16-22 working days**, plus translation and native-speaker review (not counted) |

Recommendation: before Hindi, do the keyed-map refactor of the positional `t(locale, en, tr, zh)` helpers and make `proxy.ts` and the test loops read `activeLocales`. That makes every later language mostly data entry, and removes about a third of the effort above.
