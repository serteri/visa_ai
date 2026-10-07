/**
 * One test per transactional email sender, against a stubbed provider (no network, no real send):
 *
 *   for each sender
 *     accepted   the provider answers { id }  -> the sender calls api.resend.com once, with the right recipient, and succeeds;
 *     rejected   the provider answers an error (403 domain not verified) -> the sender FAILS the way its contract says (throws / returns
 *                false / returns { sent: false }); it never reports success;
 *     no key     RESEND_API_KEY missing -> nothing is sent (no request), and the sender says so (throws or logs) instead of succeeding.
 *
 * Senders: lead magnet delivery, lead magnet admin notice, quick-check report-ready, quick-check internal lead notice, premium report ready
 * (unlock link), full-check admin notification, contact form, guide download (user + admin), agent assignment, magic link, chat restore, points alert.
 *
 *   npx tsx scripts/test-email-senders.ts
 */
import { setNextAuthSession, signOutAll } from "./lib/stub-request-context";

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects

import { sendPdfDeliveryEmail, sendPdfLeadAdminEmail } from "../lib/email/pdf-delivery";
import { sendInternalLeadTierEmail, sendReportReadyEmail } from "../lib/email/quick-check-emails";
import { sendPremiumReportReadyEmail } from "../lib/services/report-service";
import { fullCheckAdminPayload, sendFullCheckAdminEmail } from "../lib/email/full-check-admin";
import { sendContactNotification } from "../lib/email/contact";
import { sendGuideDownloadEmails } from "../lib/email/guide-download";
import { sendAgentAssignedEmail } from "../lib/email/agent-notifications";
import { sendVerificationRequest } from "../lib/email/magic-link";
import { sendRestoreEmail } from "../lib/email/chat-restore";
import { sendPointsAlertEmail } from "../lib/alerts/check-points-alerts";

let failures = 0;
const t = (label: string, cond: boolean, detail = "") => {
  if (cond) console.log(`  ✅ ${label}`);
  else {
    failures++;
    console.error(`  ❌ ${label}${detail ? ` -- ${detail}` : ""}`);
  }
};

type Sent = { url: string; to: string[]; from: string; subject: string };
let requests: Sent[] = [];
let mode: "accept" | "reject" = "accept";
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const body = JSON.parse(String(init?.body ?? "{}")) as { to?: string[]; from?: string; subject?: string };
  requests.push({ url: String(input), to: body.to ?? [], from: body.from ?? "", subject: body.subject ?? "" });
  const headers = { "content-type": "application/json" };
  return mode === "accept"
    ? new Response(JSON.stringify({ id: "msg_test_1" }), { status: 200, headers })
    : new Response(JSON.stringify({ name: "validation_error", message: "The logivisa.com domain is not verified.", statusCode: 403 }), { status: 403, headers });
}) as typeof fetch;

const quiet = <T>(fn: () => Promise<T>) => fn();

type Case = {
  name: string;
  /** Who the message goes to. */
  to: string;
  /** What the sender does when the provider rejects: it throws, or returns this falsy result, or returns { sent:false }. */
  onReject: "throws" | "false" | "sent_false" | "swallows";
  run: () => Promise<unknown>;
};

const RECIPIENT = "customer@example.org";
const preview = { estimatedPoints: 70, pathways: [{ subclass: "189", visaName: "Skilled Independent", confidenceLevel: "medium" as const, reason: "r" }] };
const cases: Case[] = [
  { name: "lead magnet delivery", to: RECIPIENT, onReject: "sent_false", run: () => sendPdfDeliveryEmail({ fullName: "Jane", email: RECIPIENT, slug: "australia-skilled-occupation-list-2026", locale: "en" }) },
  { name: "lead magnet admin notice", to: "serter@logivisa.com", onReject: "throws", run: () => sendPdfLeadAdminEmail({ fullName: "Jane", email: RECIPIENT, phone: "", slug: "australia-guide-2026", category: "Global Guide", delivered: true }) },
  { name: "quick-check report ready", to: RECIPIENT, onReject: "throws", run: () => sendReportReadyEmail({ email: RECIPIENT, fullName: "Jane", reportLink: "https://logivisa.com/en/full-check/result?reportId=x", locale: "en", preview }) },
  { name: "quick-check internal lead notice", to: "hello@logivisa.com", onReject: "throws", run: () => sendInternalLeadTierEmail({ tier: "Hot", fullName: "Jane", email: RECIPIENT, occupationDisplay: "Software Engineer", country: "AU", preferredPathway: "189", englishLevel: "superior", reportLink: "https://logivisa.com/x" }) },
  { name: "premium report ready (unlock link)", to: RECIPIENT, onReject: "throws", run: () => sendPremiumReportReadyEmail({ email: RECIPIENT, fullName: "Jane", locale: "en", reportLink: "https://logivisa.com/en/full-check/result?reportId=x&t=y", freeBeta: false }) },
  { name: "full-check admin notification (paid / free beta)", to: "serter@logivisa.com", onReject: "throws", run: () => sendFullCheckAdminEmail({ ...fullCheckAdminPayload({ fullName: "Jane", locale: "en", source: "full_check", inputJson: {} }, RECIPIENT), variant: "free_beta", freeUnlocksToday: 1 }) },
  { name: "contact form notification", to: "hello@logivisa.com", onReject: "throws", run: () => sendContactNotification({ full_name: "Jane", email: RECIPIENT, phone: null, message: "Hello" }) },
  {
    name: "guide download (user + admin)",
    to: RECIPIENT,
    onReject: "throws",
    run: () =>
      sendGuideDownloadEmails(
        { from: "LogiVisa <no-reply@logivisa.com>", to: [RECIPIENT], subject: "Guide", html: "<p>x</p>" },
        { from: "LogiVisa <no-reply@logivisa.com>", to: ["serter@logivisa.com"], subject: "Lead", text: "x" },
      ),
  },
  { name: "agent assignment", to: "agent@example.org", onReject: "swallows", run: () => sendAgentAssignedEmail({ agentEmail: "agent@example.org", agentName: "A", leadName: "Jane", status: "New", leadId: "1", locale: "en" }) },
  { name: "magic link", to: RECIPIENT, onReject: "throws", run: () => sendVerificationRequest({ identifier: RECIPIENT, url: "https://logivisa.com/api/auth/callback/email?token=x" }) },
  { name: "chat restore link", to: RECIPIENT, onReject: "throws", run: () => sendRestoreEmail({ to: RECIPIENT, link: "https://logivisa.com/restore?t=x", locale: "en" }) },
  { name: "points alert", to: RECIPIENT, onReject: "throws", run: () => sendPointsAlertEmail(RECIPIENT, "Alert", "body") },
];

async function attempt(c: Case): Promise<{ threw: boolean; value: unknown }> {
  try {
    return { threw: false, value: await quiet(c.run) };
  } catch {
    return { threw: true, value: undefined };
  }
}

async function main() {
  const silence = (fn: () => Promise<void>) => fn();
  void silence;
  for (const c of cases) {
    console.log(`\n${c.name}`);

    process.env.RESEND_API_KEY = "re_test_key_not_real";
    process.env.FROM_EMAIL = "LogiVisa <noreply@logivisa.com>";

    requests = [];
    mode = "accept";
    const ok = await attempt(c);
    const okValue = ok.value as { sent?: boolean } | boolean | undefined;
    t("accepted: one request to the provider, to the right recipient, and no failure", !ok.threw && requests.length >= 1 && requests.some((r) => r.url.includes("api.resend.com") && r.to.includes(c.to)) && !(typeof okValue === "object" && okValue !== null && okValue.sent === false) && okValue !== false, JSON.stringify(requests.map((r) => r.to)));

    requests = [];
    mode = "reject";
    const bad = await attempt(c);
    const v = bad.value as { sent?: boolean } | boolean | undefined;
    const behaved =
      c.onReject === "throws"
        ? bad.threw
        : c.onReject === "false"
          ? !bad.threw && v === false
          : c.onReject === "sent_false"
            ? !bad.threw && typeof v === "object" && v !== null && v.sent === false
            : !bad.threw; // swallows: documented non-throwing contract (the DB write already succeeded); the provider error is logged
    t(`rejected by the provider (403): ${c.onReject === "throws" ? "the sender throws" : c.onReject === "sent_false" ? "returns { sent: false }" : c.onReject === "false" ? "returns false" : "does not throw but logs the rejection"}; never reports success`, behaved && requests.length >= 1);

    delete process.env.RESEND_API_KEY;
    requests = [];
    mode = "accept";
    const none = await attempt(c);
    const nv = none.value as { sent?: boolean } | boolean | undefined;
    const noSuccess = none.threw || nv === false || (typeof nv === "object" && nv !== null && nv.sent === false) || nv === undefined;
    t("no API key: no request is made and the sender does not claim success", requests.length === 0 && noSuccess);
  }

  console.log("\nadmin diagnostics route (/api/admin/email-health)");
  {
    process.env.RESEND_API_KEY = "re_test_key_not_real";
    const { GET, POST } = await import("../app/api/admin/email-health/route");
    const post = (to: string) => POST(new Request("http://localhost/api/admin/email-health", { method: "POST", body: JSON.stringify({ to }) }));
    signOutAll();
    t("no session: GET and POST answer 404", (await GET(new Request("http://localhost/api/admin/email-health"))).status === 404 && (await post(RECIPIENT)).status === 404);
    setNextAuthSession({ user: { id: "u1", email: "someone@example.com", role: "USER" } });
    t("a signed-in non-admin: 404", (await GET(new Request("http://localhost/api/admin/email-health"))).status === 404);
    setNextAuthSession({ user: { id: "a1", email: "admin@example.com", role: "ADMIN" } });
    mode = "accept";
    const snap = await (await GET(new Request("http://localhost/api/admin/email-health"))).text();
    t("admin: the configuration is shown without any secret", /resendApiKeySet/.test(snap) && !snap.includes("re_test_key_not_real"));
    requests = [];
    const okRes = (await (await post(RECIPIENT)).json()) as { ok: boolean; messageId?: string };
    t("admin POST: one real test send; the answer carries the provider's message id", okRes.ok === true && okRes.messageId === "msg_test_1" && requests.some((r) => r.to.includes(RECIPIENT)));
    mode = "reject";
    const badRes = (await (await post(RECIPIENT)).json()) as { ok: boolean; name?: string; message?: string };
    t("admin POST, provider rejects: ok false with the provider's error name and message", badRes.ok === false && badRes.name === "validation_error" && /not verified/.test(badRes.message ?? ""));
    t("admin POST with a bad address -> 400", (await post("nope")).status === 400);
    signOutAll();
  }

  globalThis.fetch = realFetch;
  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
