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

## Security note: the admin-email unlock

`unlockPremiumReport` (`app/[locale]/(main)/full-check/actions.ts`) unlocks a report **without Stripe** when the
*typed* email is in `ADMIN_EMAILS`.
- It checks neither a login nor that the email belongs to the report.
- So anyone who knows or guesses an admin address can unlock any report and download it from `/api/reports/<id>/pdf`.

The smoke test deliberately does not use that path. It should require an authenticated admin session. That is
tracked separately.
