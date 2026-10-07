# Lead-magnet downloads: delivery, files, public access (Oct 2026)

## 1. Why "success" showed and no email arrived (submission cimend79@hotmail.com, 7 Oct 2026 ~23:20 AEST)

What the code did before this change (`app/api/pdf-download/route.ts`, `lib/email/pdf-delivery.ts`):

1. The form POST stored the row in `pdf_downloads`, **returned `{ success: true }` immediately** and sent the email afterwards inside `after()`. The browser could not know the outcome.
2. `sendPdfDeliveryEmail` called `resend.emails.send(...)` and reported `sent: true` whenever the call did not throw. **The Resend SDK (v6.12) never throws for a rejected send: it resolves with `{ data, error }`.** A rejected message (sending domain not verified, invalid recipient, rate limit, provider-side suppression) was therefore logged as sent. The caller's `.catch` could never fire.
3. Addresses in `ADMIN_EMAILS` / `KNOWN_TEST_EMAILS` get no delivery email at all (`shouldSuppressReportEmails`), while the form still says "sent".
4. The email was a link to the public PDF (no attachment), sent from `noreply@logivisa.com` (`FROM_EMAIL`).

What cannot be established from the repository or this sandbox (no production database, no Resend key, DNS and the live site are blocked by the network policy):

- whether this send was rejected by Resend, suppressed by an allow-list, or accepted and then filtered by Outlook/Hotmail as junk;
- the SPF / DKIM / DMARC records of the sending domain.

How to establish it (read-only):

- Resend dashboard > Emails: search the recipient; the status (Delivered / Bounced / Suppressed / Complained / absent) is the answer. "Absent" means the send was rejected before it was accepted.
- Vercel logs for `/api/pdf-download` around 13:20 UTC on 7 Oct: look for `[pdf-download] Delivery email failed` or the absence of any send line.
- Env: confirm `ADMIN_EMAILS`, `KNOWN_TEST_EMAILS`, `FROM_EMAIL`, `RESEND_API_KEY` in Vercel; `FROM_EMAIL` must be on a domain verified in Resend.
- DNS (no change made): `dig +short TXT logivisa.com` (one SPF record, includes the provider), `dig +short TXT _dmarc.logivisa.com` (a DMARC record, ideally `p=quarantine` or stricter with `rua=`), `dig +short CNAME resend._domainkey.logivisa.com` or `TXT` (the DKIM key from the Resend domain page). The sending domain's three records must show "Verified" in Resend > Domains. Alignment: the From domain (`logivisa.com`) must match the DKIM `d=` domain.

After this change every send is logged with the provider's answer (`delivery email accepted by the provider` with the message id, or `provider rejected the delivery email` with the error name and message), so the next failure is visible in the logs and in the response.

## 2. What changed

- The API sends the email **before** answering and returns `delivered: true` only when the provider accepted it (message id, no error). Otherwise it returns `delivered: false` and the download link; the browser shows a localised notice and the link. A failed send releases the ledger row (the visitor can try again; no free slot is used). The CRM lead is kept either way.
- Suppressed (admin/test) addresses are told so, with the link.
- One registry (`lib/lead-magnets.ts`) names each file, its modal copy and its CRM label; the modals, the API, the email and the tests all read it.
- Phone is optional everywhere; name and email are validated on the server (`lib/lead-magnet-validation.ts`), with localised field errors. "* Required field" legend (en / tr / zh-Hans) in every form with asterisks.
- The occupation list is "2026 Australian Skilled Occupation List (compiled from official sources)"; the PDF cover has the source, the compile date and "not an official or government document". The resources page no longer says "Official Government Document" / "Published directly by the Australian Department of Home Affairs".
- Colours: every modal text/background pair is at least 4.5:1 (the app's light and dark themes share one pale background, so white text was unreadable in both).

### Lead-magnet modals and the file each sends

| Where | Component | File |
|---|---|---|
| Footer "occupation list" button | PdfDownloadModal product=occupation | `/australia-skilled-occupation-list-2026.pdf` |
| ANZSCO finder | PdfDownloadModal product=occupation | occupation list |
| Home page guides row | PdfDownloadModal product = card chosen | `/avustralya-pr-rehberi-2026.pdf`, `/australia-guide-2026.pdf` or the occupation list |
| ANZSCO classifier | PdfDownloadModal product=modalProduct | occupation list or a guide |
| Full-check occupation dialog | LeadMagnetForm csol-2026 | occupation list |
| /resources/occupation-list | LeadMagnetForm csol-2026 | occupation list |
| "The end of hope and wait" article | LeadMagnetForm inline | Turkish guide (tr) / global guide |
| /rehber and /guide | DownloadForm (own server action, no email) | Turkish guide link on screen |

## 3. Public access (no gating changed)

Everything in `public/` is a static file served directly; the proxy matcher does not exclude `.pdf`, but nothing in the repository blocks or gates it, and `robots.txt` allows `/` (only `/api/` is disallowed). There is no `X-Robots-Tag` header. So these are openly downloadable and crawlable, which is why the list shows in Search Console:

`/australia-skilled-occupation-list-2026.pdf`, `/australia-guide-2026.pdf`, `/avustralya-pr-rehberi-2026.pdf`, `/core-sol.pdf`, `/ANZCO List.pdf`, plus `public/pdf-test/*.pdf` (test report PDFs) and data files (`skilled-occupation-list.json`, `anzsco-list.json`, spreadsheets). The delivery email itself links to the public URL, so gating has to change together with the email.

Proposal (not implemented): an indexable HTML "Australian Skilled Occupation List" page (A-Z and by ANZSCO major group, linking each row to its occupation page: SEO Phase 2, step 2), with the PDF as an optional download; move the PDFs out of `public/` into a gated route (`/api/files/<slug>?t=<signed token>`, token in the email), add `noindex` / `X-Robots-Tag: noindex` for any remaining PDF, and remove `public/pdf-test/`. Open question for you: whether the two guides should stay free public downloads.

## 4. Assumptions and flags

- The reported address is assumed to be a genuine recipient (not on the allow-lists); this cannot be verified here.
- The occupation-list PDF legend still lists MLTSSL / STSOL (replaced by the Core Skills Occupation List in Dec 2024 for new applications) - the underlying dataset needs a currency check before the PDF is called current. Not changed here.
- Turkish and Chinese wording added by this change is machine-assisted and unreviewed (listed in `docs/compliance-review-pack.md`, section O).
- A second submission after a failed send creates a second CRM lead (the first lead is kept).

## 5. Every transactional email: the shared root cause (added after report and unlock emails also failed)

The same defect was in almost every sender: `await resend.emails.send(...)` with the result ignored. The SDK resolves with `{ data, error }` and does not throw, so a provider rejection (unverified From domain, invalid recipient, rate limit, sandbox sender) produced no log and no failure. Senders and what they did before:

| Email | Code | Checked `{ error }` before |
|---|---|---|
| Report ready / unlock link (paid and free-beta) | `lib/services/report-service.ts` | no |
| Free-check "report ready" and internal lead notice | `app/[locale]/(main)/full-check/actions.ts` | no |
| Admin new-report / PAID / free-beta notification | `lib/email/full-check-admin.ts` | no |
| Lead magnet delivery | `lib/email/pdf-delivery.ts` | no (fixed in the previous commit) |
| Lead magnet admin notice | `app/api/pdf-download/route.ts` | no (fixed) |
| Guide download (/rehber) user + admin | `app/[locale]/(main)/rehber/actions.ts` | no |
| Contact form | `app/api/contact/route.ts` | no |
| Agent assignment | `lib/email/agent-notifications.ts` | no |
| Points alerts | `lib/alerts/check-points-alerts.ts` | no |
| Magic link, chat restore | `lib/email/magic-link.ts`, `chat-restore.ts` | yes |

All now go through `lib/email/provider.ts` (`sendChecked`): a rejection throws `EmailRejectedError`, is logged as `[email] <kind> REJECTED by the provider` with the provider's error name and message, and an accepted message logs its id. Callers keep their existing non-blocking handling (an unlock or webhook never fails because a mail was rejected).

Other reasons a report / unlock email is silently skipped (all by design, all logged but easy to miss):

- `ENABLE_TRANSACTIONAL_EMAILS=false` in the environment skips the report-ready / unlock email (`report-service.ts` logs "e-postası atlandı").
- The recipient is in `ADMIN_EMAILS` or `KNOWN_TEST_EMAILS` (suppression: report, unlock, lead and admin emails are not sent).
- `FROM_EMAIL` unset falls back to `noreply@logivisa.com`; set to a non-verified or `resend.dev` address every send is rejected (now logged).

To see which applies in production, run `npm run email:health -- --to hotmail.com` with the production env (read-only): it prints the switches, the From domain's Resend verification and SPF / DKIM / return-path record status, live SPF and DMARC DNS records, and Resend's recorded last event (delivered / bounced / suppressed / complained) for recent messages.
