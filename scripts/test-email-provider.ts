/**
 * Every transactional email goes through lib/email/provider.ts, which treats a provider rejection as a failure.
 *
 *   1. sendChecked: accepted -> the message id; rejected ({ error }) -> EmailRejectedError; no id -> EmailRejectedError;
 *   2. no sender calls resend.emails.send directly unless it checks `error` itself (the allow-list below);
 *   3. every caller of a sender that can now throw keeps its own non-blocking catch (the unlock and webhook flows must not fail because a
 *      mail was rejected);
 *   4. scripts/email-health.ts exists and is read-only (no send).
 *
 *   npx tsx scripts/test-email-provider.ts
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { Resend } from "resend";

import { EmailRejectedError, sendChecked } from "../lib/email/provider";

let failures = 0;
const t = (label: string, cond: boolean, detail = "") => {
  if (cond) console.log(`  ✅ ${label}`);
  else {
    failures++;
    console.error(`  ❌ ${label}${detail ? ` -- ${detail}` : ""}`);
  }
};
const root = process.cwd();
const json = (status: number, payload: unknown) => new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });
const realFetch = globalThis.fetch;
const stub = (h: () => Response) => {
  globalThis.fetch = (async () => h()) as typeof fetch;
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (["node_modules", ".next", ".git", "scripts", "temp_tests"].includes(name)) continue;
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

async function main() {
  console.log("1. sendChecked");
  const resend = new Resend("re_test_key_not_real");
  const payload = { from: "LogiVisa <noreply@logivisa.com>", to: ["a@example.com"], subject: "s", text: "t" };
  stub(() => json(200, { id: "msg_1" }));
  t("accepted -> the message id", (await sendChecked("test", resend, payload)) === "msg_1");
  stub(() => json(403, { name: "validation_error", message: "The logivisa.com domain is not verified.", statusCode: 403 }));
  const rej = await sendChecked("test", resend, payload).then(() => null, (e) => e);
  t("rejected by the provider -> EmailRejectedError (the SDK itself does not throw)", rej instanceof EmailRejectedError && /not verified/.test(rej.message));
  stub(() => json(200, {}));
  t("no message id -> EmailRejectedError", (await sendChecked("test", resend, payload).then(() => null, (e) => e)) instanceof EmailRejectedError);
  stub(() => json(429, { name: "rate_limit_exceeded", message: "Too many requests", statusCode: 429 }));
  t("rate limited -> EmailRejectedError", (await sendChecked("test", resend, payload).then(() => null, (e) => e)) instanceof EmailRejectedError);
  globalThis.fetch = realFetch;

  console.log("\n2. no unchecked sends");
  const allowed = new Set(["lib/email/provider.ts", "lib/email/pdf-delivery.ts", "lib/email/chat-restore.ts", "lib/email/magic-link.ts"]);
  const offenders: string[] = [];
  for (const f of [...walk(path.join(root, "app")), ...walk(path.join(root, "lib")), ...walk(path.join(root, "src"))]) {
    const rel = path.relative(root, f);
    if (!/\.emails\.send\(/.test(readFileSync(f, "utf8"))) continue;
    if (!allowed.has(rel)) offenders.push(rel);
  }
  t("every direct resend.emails.send call is in a file that reads { error } itself", offenders.length === 0, offenders.join(", "));
  for (const f of ["lib/email/pdf-delivery.ts", "lib/email/chat-restore.ts", "lib/email/magic-link.ts"]) {
    t(`${f} reads the provider's error`, /\berror\b/.test(readFileSync(path.join(root, f), "utf8").split("emails.send(")[0].split("\n").slice(-2).join(" ")) || /if \(error/.test(readFileSync(path.join(root, f), "utf8")));
  }
  const migrated: Array<[string, string]> = [
    ["lib/email/quick-check-emails.ts", "report_ready_free_check"],
    ["lib/email/quick-check-emails.ts", "full_check_internal_lead_notice"],
    ["lib/services/report-service.ts", "premium_report_ready_unlock_link"],
    ["lib/email/full-check-admin.ts", "full_check_admin_notification"],
    ["lib/email/contact.ts", "contact_form_notification"],
    ["lib/email/guide-download.ts", "guide_download_user"],
    ["lib/email/pdf-delivery.ts", "pdf_lead_admin_notification"],
    ["lib/email/agent-notifications.ts", "agent_assignment"],
    ["lib/alerts/check-points-alerts.ts", "points_alert"],
  ];
  for (const [file, kind] of migrated) t(`${file}: ${kind} goes through sendChecked`, new RegExp(`sendChecked\\("${kind}"`).test(readFileSync(path.join(root, file), "utf8")));

  console.log("\n3. callers keep their non-blocking catch");
  const rs = readFileSync(path.join(root, "lib/services/report-service.ts"), "utf8");
  t("report-service: the unlock email failure is caught (the unlock stands)", /Müşteri e-postası GÖNDERİLEMEDİ/.test(rs) && /sendReportAccessLink failed/.test(rs));
  const wh = readFileSync(path.join(root, "app/api/stripe/webhook/route.ts"), "utf8");
  t("stripe webhook: the paid admin notification failure is caught", /PAID admin notification email failed \(non-blocking\)/.test(wh));
  const fc = readFileSync(path.join(root, "app/[locale]/(main)/full-check/actions.ts"), "utf8");
  t("report-service marks the PDF/email as sent only after the email call returned (the provider accepted it)", (() => { const from = rs.indexOf("export async function generateAndSendReport"); const send = rs.indexOf("await sendPremiumReportReadyEmail({", from); return from > 0 && send > from && rs.indexOf("await markReportPdfSent(reportId)", send) > send; })());
  t("full-check: the customer report email failure is caught", /Customer report email failed \(non-blocking\)/.test(fc));

  console.log("\n4. the health script");
  const hs = readFileSync(path.join(root, "scripts/email-health.ts"), "utf8");
  t("scripts/email-health.ts is read-only (lists, never sends)", /domains\.list/.test(hs) && /emails\.list/.test(hs) && !/emails\.send\(/.test(hs));

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
