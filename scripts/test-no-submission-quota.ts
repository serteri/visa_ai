/**
 * No free-report quota gates a submission: with paid checkout ON (the default), non-admin visitors #1 .. #1000 all get their report created.
 * Nothing reads or writes full_check_usage, MAX_FREE_REPORTS or NEXT_PUBLIC_IS_FREE_BETA. The REAL submit action, edges stubbed.
 *
 *   npx tsx scripts/test-no-submission-quota.ts
 */
import { signOutAll } from "./lib/stub-request-context";

delete process.env.READINESS_REPORT_PAID_CHECKOUT_ENABLED; // the production default: paid checkout ON
process.env.AUTH_SECRET = "test-auth-secret-for-admin-unlock";
process.env.ADMIN_EMAILS = "owner-admin@example.com";
process.env.KNOWN_TEST_EMAILS = "";
process.env.ADMIN_DASHBOARD_PASSWORD = "test-admin-password";
process.env.RESEND_API_KEY = "re_test_stub_not_a_real_key";
process.env.FROM_EMAIL = "LogiVisa Test <noreply@example.test>";
process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects
process.env.STRIPE_SECRET_KEY = ""; // An empty string, not `delete`: Prisma's .env load would put a deleted key back (scripts/lib/no-live-stripe.ts).
process.env.MAX_FREE_REPORTS = "14"; // even when still set in the environment, it must not limit anything
process.env.NEXT_PUBLIC_IS_FREE_BETA = "true";
delete process.env.ENABLE_TRANSACTIONAL_EMAILS;
delete process.env.SIMULATE_EMAIL_DELIVERY;

import "./lib/no-live-stripe"; // FIRST: no Stripe variables, no route to stripe.com
import { readFileSync } from "node:fs";
type Row = Record<string, unknown> & { id: string; email: string; is_unlocked: boolean };
const rows = new Map<string, Row>();
let newId = "";
(globalThis as { prisma?: unknown }).prisma = {
  $queryRawUnsafe: async (sql: string, ...args: unknown[]) => {
    if (/INSERT INTO user_reports/i.test(sql)) {
      newId = `00000000-0000-4000-8000-${String(rows.size + 1).padStart(12, "0")}`;
      return [{ id: newId }];
    }
    if (/COUNT\(\*\)/.test(sql)) return [{ n: 0 }];
    const id = String(args[0]);
    return rows.has(id) ? [rows.get(id)] : [];
  },
  $executeRawUnsafe: async (sql: string, ...args: unknown[]) => {
    if (/SET\s+email = \$1/.test(sql)) {
      const row = rows.get(String(args[5]));
      if (row) Object.assign(row, { email: args[0], is_unlocked: true, unlock_method: args[2], payment_status: args[3] });
    }
    if (/SET pdf_sent = TRUE/.test(sql)) {
      const row = rows.get(String(args[0]));
      if (row) row.pdf_sent = true;
    }
    return 1;
  },
  $disconnect: async () => undefined,
  userReport: { create: async () => ({ id: "x" }), findFirst: async () => null, findMany: async () => [], count: async () => 0 },
  agent: { findFirst: async () => null, findUnique: async () => null },
  stateAllocation: { findUnique: async () => null, findFirst: async () => null },
  occupation: { findUnique: async () => null, findFirst: async () => null },
  roundCutoff: { findUnique: async () => null, findFirst: async () => null },
  stateIntelligence: { findMany: async () => [] },
  stateNominationConfig: { findMany: async () => [] },
};

let checkoutCalls = 0;
let stripeCalls = 0;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (/\/api\/checkout$/.test(url)) {
    checkoutCalls++;
    void init;
    return new Response(JSON.stringify({ url: "https://checkout.stripe.test/c/pay_cs_test_123" }), { status: 200, headers: { "content-type": "application/json" } });
  }
  if (/stripe\.com/.test(url)) stripeCalls++;
  throw new Error(`network access is forbidden in test-admin-unlock: ${url}`);
}) as typeof fetch;

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    failures++;
    console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`);
  }
};

type Sent = { to: string[]; subject: string };


async function main() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Resend } = require("resend") as typeof import("resend");
  (Object.getPrototypeOf(new Resend("re_stub").emails) as { send: unknown }).send = async () => ({ data: { id: "stub" }, error: null });
  const { submitFullCheckWaitlist } = await import("../app/[locale]/(main)/full-check/actions");
  const { REVIEW_PERSONAS } = await import("./render-persona-pdfs");
  const base = REVIEW_PERSONAS["reference-se-au"];
  const quiet = console.log;
  const form = (n: number) => {
    const f = new FormData();
    f.set("email", `visitor-${n}@example.org`);
    f.set("fullName", `Visitor ${n}`);
    f.set("targetCountry", "AU");
    f.set("routeLocale", "en");
    f.set("currentCountry", "Australia");
    f.set("passportCountry", "Turkey");
    f.set("age", "30");
    f.set("occupation", String(base.occupation));
    f.set("visaInterest", "491");
    f.set("qualificationLevel", "Bachelor");
    f.set("englishLevel", "superior");
    f.set("sponsorOrFamily", "Single");
    f.set("annualSalaryAud", "90000");
    f.set("targetVisa", "491");
    f.set("employerSponsorship", "none");
    f.set("residenceState", "NSW");
    return f;
  };
  signOutAll(); // a non-admin visitor
  console.log("paid checkout ON, non-admin visitors, MAX_FREE_REPORTS=14 still set in the environment");
  const failed: number[] = [];
  const messages = new Set<string>();
  console.log = () => undefined;
  console.warn = () => undefined;
  console.error = () => undefined;
  for (let n = 1; n <= 1000; n++) {
    const r = await submitFullCheckWaitlist({ status: "idle" }, form(n));
    if (r.status !== "success" || !r.reportId) {
      failed.push(n);
      messages.add(JSON.stringify({ s: r.status, m: r.message, e: r.error }));
    }
  }
  console.log = quiet;
  for (const n of [1, 14, 15, 16, 100, 1000]) check(!failed.includes(n), `submission #${n} succeeds`, [...messages].join(" | "));
  check(failed.length === 0, "all 1000 submissions succeed (no quota, no 'Free report limit reached')", `${failed.length} failed, e.g. ${failed.slice(0, 5)}`);

  const src = readFileSync("app/[locale]/(main)/full-check/actions.ts", "utf8");
  check(!/full_check_usage|fullCheckUsage|MAX_FREE_REPORTS|NEXT_PUBLIC_IS_FREE_BETA|Free report limit reached|requirePayment/.test(src), "the submit action no longer references full_check_usage / MAX_FREE_REPORTS / NEXT_PUBLIC_IS_FREE_BETA / a limit message");
  const readModels = readFileSync("lib/cache/public-read-models.ts", "utf8");
  check(!/fullCheckUsage|full_check_usage|MAX_FREE_REPORTS/.test(readModels), "no cached read model depends on full_check_usage");
  check(/waitlist_table_missing/.test(src) && !/console\.warn\("full_check_waitlist table missing/.test(src), "a failed waitlist write alerts (no console.warn skip)");

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
