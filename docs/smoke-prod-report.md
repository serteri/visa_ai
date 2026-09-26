# Production smoke test for paid reports

`scripts/smoke-prod-report.ts` checks that a **real, paid** production report shows the fees the latest deploy is
supposed to show. It goes through the same path a customer does, with no bypass:

1. It fills the report form on `https://www.logivisa.com/en/full-check` in a visible Chromium window. The submission
   creates the report row.
2. It opens the unlock dialog and presses **Unlock report**. `/api/checkout` then creates a live Stripe Checkout session.
3. **You** finish Stripe Checkout in that window: apply a 100%-off promotion code, fill the billing address and press
   **Pay** (AUD 0). The script never types payment details or promotion codes.
4. The Stripe webhook (`app/api/stripe/webhook/route.ts`) unlocks the report, exactly as it does for a paying customer.
5. The script downloads `/api/reports/<id>/pdf`, extracts the text and asserts the fee lines. The text goes to
   `temp_tests/smoke/`, which is gitignored.

## One-time setup

- **Pick a smoke email you control**, for example `you+smoke@yourdomain`. Add it to **`KNOWN_TEST_EMAILS`** in Vercel
  (Production). **Do not** add it to `ADMIN_EMAILS`.
  - An address in `ADMIN_EMAILS` skips Stripe entirely (see the security note below), so it would not test the paid path.
  - Addresses in `KNOWN_TEST_EMAILS` go through Stripe, but every report email is suppressed
    (`lib/email/suppression.ts`), and they are excluded from the usage and analytics counts.
- **Promotion code:** the existing `ADMINFREE` (100% off) works, but it is valid for anyone who types it.
  - Stripe promotion codes cannot be limited to an email address with this checkout (it sets `customer_email`, not a
    Stripe customer).
  - The safest option is a **single-use** 100%-off code for each run: Stripe Dashboard → Product catalogue →
    Coupons → 100% off → add a promotion code with *Limit to 1 redemption* and an expiry date.
  - Because the smoke email is in `KNOWN_TEST_EMAILS`, no email is sent whichever code you use.
- **Browser:** `npx playwright install chromium`, once per machine.

## After every fee-related deploy

Wait until Vercel shows the deployment as **Ready**, then:

```bash
SMOKE_EMAIL=you+smoke@yourdomain npm run smoke:prod
```

For each of the three personas, a browser window fills the form and stops on Stripe Checkout. Apply the promotion
code, fill the billing address and press Pay. The script then waits up to 15 minutes, checks the PDF and prints
lines such as:

```
[civil-offshore] report 7c1e…
  PDF: Skills assessment (Engineers Australia (The Institution of Engineers Australia) (EA)): AUD 940 (CDR; applying from outside Australia, excl. GST). …
  ✅ pass
```

It ends with `✅ SMOKE PASSED`, or `❌ SMOKE FAILED` and the exit code 1.

| Persona | Form | Assertion |
|---|---|---|
| `civil-offshore` | Civil Engineer 233211, living in India | EA, `AUD 940 (CDR; applying from outside Australia, excl. GST)` |
| `civil-onshore` | Civil Engineer 233211, living in Australia | EA, `AUD 1,034 (CDR; applying from within Australia, incl. GST)` |
| `mlt-offshore` | Medical Laboratory Technician 311213, living in India | AIMS, `AUD 900 (applying from outside Australia; excl. GST; AIMS p.18)` |

### Other modes

```bash
# Fill the form only and stop before submitting. Nothing is created; this checks the form still works.
SMOKE_EMAIL=anything@example.invalid npm run smoke:prod -- --dry-run

# Re-check reports that are already unlocked (e.g. from an earlier run), without paying again
npm run smoke:prod -- --verify civil-offshore=<reportId> civil-onshore=<reportId> mlt-offshore=<reportId>

# Only some personas, or another deployment
SMOKE_PERSONAS=civil-onshore SMOKE_BASE_URL=https://<preview>.vercel.app SMOKE_EMAIL=... npm run smoke:prod
```

The report IDs are printed at the end of a run and appear in the PDF file names under `temp_tests/smoke/`.

## What each run leaves behind

- **Database:** three `user_reports` rows under the smoke email, unlocked with `payment` status.
- **Stripe:** three AUD 0 Checkout sessions.

Neither sends email, and neither counts towards usage because the email is in `KNOWN_TEST_EMAILS`.

## Fully automated run: `--admin`

This mode is for the fee checks after a deploy. It does not test the Stripe path.

```bash
SMOKE_EMAIL=you+smoke@yourdomain SMOKE_ADMIN_PASSWORD='<admin dashboard password>' npm run smoke:prod -- --admin
```

- **Sign-in:** it signs in on `/en/admin/leads/access` with `SMOKE_ADMIN_PASSWORD` (the `ADMIN_DASHBOARD_PASSWORD` value). That
  sets the signed, httpOnly admin session cookie.
- **Unlock:** it fills the form and presses **Unlock report**. With a verified admin session the report is unlocked in place,
  with no Stripe.
- **PDF:** it downloads the PDF with that session and runs the same assertions.
- **Browser:** runs headless, no interaction needed.
- **Smoke email:** keep `SMOKE_EMAIL` in `KNOWN_TEST_EMAILS` so no report email is sent.
- **Credentials:** come only from environment variables. Never put the password in a file in the repo.

To re-check existing reports, pass `persona=reportId:token`, where the token is the `t=` value of the report's
link. Or set `SMOKE_ADMIN_PASSWORD` to fetch them with an admin session:

```bash
npm run smoke:prod -- --verify civil-offshore=<reportId>:<t> mlt-offshore=<reportId>:<t>
SMOKE_ADMIN_PASSWORD='...' npm run smoke:prod -- --verify civil-offshore=<reportId> civil-onshore=<reportId>
```

## Access control (how a report is protected)

- **Admin unlock:** a free unlock without Stripe happens only for a **verified admin session**. That means the signed admin
  cookie from `lib/admin-auth.ts`, or a NextAuth session with role `ADMIN`. A typed email address is never a credential.
  Until 2026-09-26, typing an `ADMIN_EMAILS` address in the unlock form unlocked any report; that path is removed.
- **PDF and result page:** `/api/reports/<id>/pdf` and the full result page require one of:
  - an admin session;
  - the report's **access token** (`?t=`, an HMAC of the report ID keyed by `REPORT_ACCESS_SECRET`, or `AUTH_SECRET` if that
    is unset);
  - a signed-in user whose email is the report's own.
- **Where owners get the token:** only on the checkout success page, after the server confirms with Stripe that the session
  paid for that report, and in the emails sent to the report's own address.
- **Unauthorized requests:** get the same 404 whether the report doesn't exist, is locked, or they lack access. The result
  page sends them no report data; it offers to email the secure link to the address stored on the report.
