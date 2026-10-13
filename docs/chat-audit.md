# Chat audit: personalised conclusions, recommendations, rankings, verdicts, probabilities, instructions

Scope: every AI chat surface (paid and free chat, the assistant page, the report assistant). The chat is information-only, like the
report: it explains published rules, requirements, fees, processes and state program information with sources and dates; it may do
arithmetic on the visitor's own figures; it never says which visa, state or pathway is best, recommended, most realistic or likely, never
gives chances or probabilities, never tells the visitor what to do, and never says "you are eligible" / "you are not eligible".

Audited on 2026-10-13 against `main` (`2854f14`). "Quote" is the text as it was before this change; "Now" is what replaces it.

## 1. Where the chat could produce a conclusion (before) and what happens now

| # | Place | File | Quote (before) | Now |
|---|-------|------|----------------|-----|
| 1 | Guardrails: plan | `lib/chat/prompts.ts` `GUARDRAILS_TEXT` rule 3 | "…sadece kural okuma. Sağlanan referansları kullanarak adım adım bir eylem planı veya alternatif senaryolar (A Planı, B Planı) oluştur." | Replaced: no plan / A-B scenario / ranking / recommendation; published requirements with sources, entered figures next to published figures |
| 2 | Guardrails: tone | rule 1 | "Dilini her zaman olasılıklar üzerine kur ("… şartlarını sağlarsanız bu uygun bir yol olabilir")" | Replaced: no guarantee, no outcome statement |
| 3 | Guardrails: scenario analysis | rule 6 | "…Tecrübe eksikliği gibi engelleri filtrele, uygun olan ve olmayan rotaları analitik olarak açıkla." | Replaced: published criteria and their numeric limits side by side; no suitable / realistic / likely route |
| 4 | Guardrails: status labels | "Görünür dil" rule 2 | "Vize durumlarını LogiVisa'nın etiketleriyle yaz (Next step required / Not eligible now / Conditional / Eligible to pursue / Eligible, but below recent invitation levels …)" | Replaced: the labels are not written for the visitor |
| 5 | Guardrails: sufficiency | "Görünür dil" rule 7 | "…son davet seviyesiyle karşılaştır ve altındaysa bunu söyle." | Replaced: total, published minimum (65) and the dated recent invitation level side by side; no "enough" / "short" |
| 6 | Guardrails: state suggestion | "Görünür dil" rule 8 | "Batı Avustralya (WA) subclass 190 için "WA'ya taşın" deme … Bir eyalet block-2'de "Not available for 190" ise onu 190 için önerme." | Replaced: state status and conditions with the data-checked date; never "you can use WA"; the WA 6-month contract is stated only as the published condition |
| 7 | Premium profile rules | `buildPremiumSystemPrompt` | "Yanıtları bu profile göre kişiselleştir … Bir vizenin durumu "Not eligible now" ise bunu açıkça söyle ve o vizeyi önerme; "Next step required" ise … gereken adımı söyle." | Replaced: the profile is used for the visitor's own figures only |
| 8 | Opening-summary instruction | `leadBlock` | "Özetten sonra ilgili her vize için EN FAZLA bir kısa bölüm, sonra eylem planı." | "…plan, öneri veya talimat ekleme" |
| 9 | No-profile first answer | `buildPremiumSystemPrompt` | "…kişiselleştirme için sohbetteki hızlı profil kartını doldurmasını öner." | States that answers are published general information and that points arithmetic can be shown for entered figures |
| 10 | Engine facts | `lib/chat/engine-facts.ts` | "a state listed as "Not available for 190" … must never be recommended for 190" | States the published condition only |
| 11 | Opening summary (quick profile / report) | `lib/chat/plan-summary.ts` `buildPlanSummary` | "189 – Eligible to pursue: 60 + 0 = 60 — 5 short of the 65 minimum, 10 below the recent invitation level of 70" and "Closing the gap — …; the highest score your own actions can reach before any nomination is …" | Neutral recap: entered details, points from the entries, per subclass "your figure … published minimum 65; recent invitation level N (date)", links to the Home Affairs requirement pages. No status label, no gap plan, no best-pathway line |
| 12 | Profile block given to the model | `lib/chat/profile.ts` | "Status by visa (LogiVisa labels): 189: …", "States open for this occupation: 190 -> …", "Not available on the visitor's answers (state stream condition unmet): …" | Removed. Kept: current visa, occupation, points breakdown, residence, assessment fee, totals next to recent invitation levels |
| 13 | Quick result card | `components/ChatQuickResult.tsx`, `lib/chat/quick-profile-api.ts`, locale keys `chat.result.*` | "Not eligible now" / "Next step required" / "Eligible to pursue" per visa; "States open for your occupation"; "…states, costs and a plan — in one PDF?" | Points from the entries, total per subclass next to the published minimum, no status, no states; CTA names what the report contains |
| 14 | Correction blocks | `lib/chat/corrections.ts` | `status_wording`: "your status for subclass 190 is "Next step required", not "not eligible"; next steps: …"; `residence`: "…the report does not count WA as available to you" | `status_wording` is log-only; `residence` now states the published residence condition and what the visitor entered. A correction that would itself contain a banned pattern is withheld and logged (`chat_correction_withheld`) |
| 15 | Answer check | `lib/chat/answer-check.ts` | Checks facts only (fees, gates, benchmarks…); nothing against verdicts, picks, chances or instructions | New layer `lib/chat/information-only.ts` (below) |
| 16 | Assistant page | `lib/ai/generate-grounded-answer.ts` | "State it exactly as: 'You are ineligible for this pathway because [Reason]'"; "Limit all pathway analysis and recommendations…"; canned "…so employer-sponsored pathways such as 482/186 are ineligible under this income threshold."; "Get your full personalized assessment" | Prompt and canned notices state the published figure next to the declared figure; label "Visa Information Report"; every answer passes the same rewrite |
| 17 | Report assistant route | `app/api/chat/route.ts` | Context sent to the model: `rankedPathways` (`matchPercentage`, `recommendationTag`), `pathwayComparison` (`confidenceLevel`), `suggestedNextSteps`, `riskIndicators`; canned: "I can explain your ranked pathways, points-related gaps, and practical next steps"; "must be described as ineligible under this threshold" | Context is the user's figures only (`user`, `targetVisa`, `pointsEstimate`); canned text rewritten; the answer is held, rewritten and logged |
| 18 | Canned: personalised-intent reply | `generate-grounded-answer.ts` | "For a structured assessment based on your situation, you can generate a readiness report." | States that advice on the visitor's own situation must come from a registered migration agent (MARA) or an Australian legal practitioner |

Not changed (information, not conclusions): fee and gate tables, the points table, the state status lines with `lastVerified`, citations,
the 186 / age / 191 facts, the student-visa guidance block (points factors and 485 gates are published figures; it says what the answer
must cover, not what the visitor should do).

## 2. The rules (system prompt, all paths, en / tr / zh-Hans)

`INFORMATION_ONLY_RULES` in `lib/chat/information-only.ts` is appended to every system prompt (free, premium, assistant page, report
assistant) after all other instructions and before the language rule, and says it outranks them:

1. explain published rules, requirements, fees, processes and state program information with sources and dates; arithmetic on the
   visitor's own figures is allowed (totals, nomination points +5 / +15, "your figure / published figure");
2. never best / recommended / most realistic / easiest / fastest / likely; never chances, odds, probability; never "you should",
   "apply", "submit your EOI", "next step", "action plan"; never "you are (not) eligible", "you qualify", "you can use <state>";
3. a question about the visitor's own situation ("which visa should I choose?", "can I get 190 in WA?", "will I get invited?", "what should
   I do next?", "what are my chances?") gets the published criteria with sources, the arithmetic from the entered figures next to the
   published figures, and one statement that advice on their own situation must come from a registered migration agent (MARA) or an
   Australian legal practitioner;
4. state information: current status and conditions with the data-checked date; never "you can use WA";
5. neutral wording examples; 6. sources for every figure, otherwise point to the official page.

## 3. The answer-check layer (detect and rewrite)

`sanitizeAnswer` (`lib/chat/information-only.ts`) runs on every finished answer. The stream (`lib/chat/corrected-stream.ts`) holds each
text part until the model has finished it, so nothing the model wrote reaches the visitor before the rewrite; the engine-fact check then
reads the text the visitor sees.

Detected (en / tr / zh-Hans, all three checked on every answer): `best_pick`, `recommend`, `chance` (incl. likely / probably / odds),
`should` ("you should", "make sure you", "-malısınız", "您应该"), `next_step`, `eligibility_verdict` ("you are (not) eligible", "you
meet the requirements", "uygunsunuz", "您符合条件"), `permission` ("you can use / apply for…", "WA is open to you", "WA'yı
kullanabilirsiniz", "您可以使用…"), `imperative` (a sentence that starts with apply / submit / lodge / get / … or "you need to submit",
"başvurun", "请提交…").

Rewrite: a flagged sentence is replaced by its figures (subclass plus the clauses that carry a number, e.g. "You should apply for
subclass 190, which costs AUD 4,640." becomes "Subclass 190: costs AUD 4,640.") or dropped when it has none; factual sentences are left
untouched; a visitor question about their own situation gets the referral line once (`ADVICE_NOTE`, Canada mode names the RCIC). A
sentence that is itself the referral (names a registered migration agent / legal practitioner) is never rewritten. The rewrite is
idempotent. Every rewrite is logged: `[chat_information_only_rewrite]` with path (`premium` / `free` / `assistant` / `assistant-page`),
locale, pattern id, the original sentence and what replaced it.

Limits (stated plainly): the detector is pattern-based, so a verdict phrased in a way no pattern covers is not caught; the logs are how new
phrasings are found and added. Over-matching drops a sentence rather than showing a verdict, so a legitimate sentence that happens to
contain a banned word ("likely" in a quoted source) is also rewritten.

## 4. Tests

`scripts/test-chat-information-only.ts` (in `npm run test:reports` and CI): 36 realistic prompts (12 each en / tr / zh-Hans) through
`handleChat` and the real stream wiring with a stubbed model that returns deliberately non-compliant answers; asserts no banned pattern
in what the visitor sees (opening summary, answer, correction blocks), the factual sentences are still there, the referral is present for
personal-situation questions, and every rewrite is logged. Also: prompts carry the rules; the recap is neutral; the card and profile block
carry no status / states; the assistant page and report assistant route use the same rewrite.
