/**
 * Read-only email delivery health check. Run it where the production environment variables are available:
 *
 *   vercel env pull .env.production.local   (or export RESEND_API_KEY / FROM_EMAIL yourself)
 *   npx tsx scripts/email-health.ts [--to hotmail.com] [--limit 100] [--address someone@example.com]
 *
 * It prints (never a secret): which sending switches are set; the From address and whether it is a verified Resend domain; the domain's
 * SPF / DKIM / return-path record status as Resend sees it; the live DNS records for SPF and DMARC; the recent messages Resend accepted, with
 * their last delivery event (delivered / bounced / suppressed / complained / ...), optionally filtered by recipient text; and whether an
 * address is on the admin / test allow-list (which suppresses report and lead emails by design). Nothing is sent or changed.
 */
import "dotenv/config";
import { promises as dns } from "node:dns";
import { Resend } from "resend";
import { isAdminAllowListedEmail } from "../lib/email/suppression";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const mask = (a: string) => a.replace(/^(.{2}).*(@.*)$/, "$1***$2");
const txt = async (host: string) => {
  try {
    return (await dns.resolveTxt(host)).map((r) => r.join(""));
  } catch (e) {
    return [`(no TXT record: ${(e as NodeJS.ErrnoException).code ?? e})`];
  }
};

async function main() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL || "LogiVisa <noreply@logivisa.com>";
  const fromDomain = (from.match(/@([^>\s]+)/)?.[1] ?? "").toLowerCase();
  console.log("== configuration");
  console.log(`RESEND_API_KEY set: ${Boolean(apiKey)}`);
  console.log(`FROM_EMAIL: ${process.env.FROM_EMAIL ? from : `(unset, default ${from})`}   domain: ${fromDomain}`);
  if (/resend\.dev/i.test(from)) console.log("!! FROM_EMAIL is Resend's sandbox sender: it only delivers to the Resend account owner.");
  console.log(`ENABLE_TRANSACTIONAL_EMAILS: ${process.env.ENABLE_TRANSACTIONAL_EMAILS ?? "(unset: on when RESEND_API_KEY is set)"}`);
  if (process.env.ENABLE_TRANSACTIONAL_EMAILS === "false") console.log("!! ENABLE_TRANSACTIONAL_EMAILS=false: report-ready and unlock emails are skipped (logged, never sent).");
  console.log(`ADMIN_EMAILS entries: ${(process.env.ADMIN_EMAILS ?? "").split(",").filter(Boolean).length}; KNOWN_TEST_EMAILS entries: ${(process.env.KNOWN_TEST_EMAILS ?? "").split(",").filter(Boolean).length}`);
  const address = arg("address");
  if (address) console.log(`${mask(address)} is on the admin/test allow-list (emails suppressed by design): ${isAdminAllowListedEmail(address)}`);

  console.log("\n== DNS (live)");
  console.log(`SPF   ${fromDomain}:`, (await txt(fromDomain)).filter((r) => /v=spf1/i.test(r)));
  console.log(`DMARC _dmarc.${fromDomain}:`, await txt(`_dmarc.${fromDomain}`));

  if (!apiKey) {
    console.log("\n(no RESEND_API_KEY: provider checks skipped)");
    return;
  }
  const resend = new Resend(apiKey);

  console.log("\n== Resend domains");
  const domains = await resend.domains.list();
  if (domains.error) console.log(`domains.list error: ${domains.error.name}: ${domains.error.message} (a send-only API key cannot list domains; use the Resend dashboard > Domains)`);
  for (const d of domains.data?.data ?? []) {
    const full = await resend.domains.get(d.id);
    console.log(`${d.name}: status=${d.status} region=${d.region}${d.name === fromDomain ? "   <- From domain" : ""}`);
    for (const r of full.data?.records ?? []) console.log(`   ${r.record} ${r.type} ${r.name} -> ${r.status}`);
  }
  if (!(domains.data?.data ?? []).some((d) => d.name === fromDomain && d.status === "verified") && !domains.error) console.log(`!! ${fromDomain} is not a verified Resend domain: every send from it is rejected.`);

  console.log("\n== recent messages (as Resend recorded them)");
  const list = await resend.emails.list({ limit: Number(arg("limit") ?? 100) });
  if (list.error) {
    console.log(`emails.list error: ${list.error.name}: ${list.error.message}`);
    return;
  }
  const filter = arg("to")?.toLowerCase();
  const rows = (list.data?.data ?? []).filter((e) => !filter || (e.to ?? []).some((t) => t.toLowerCase().includes(filter)));
  const byEvent = new Map<string, number>();
  for (const e of rows) byEvent.set(String(e.last_event), (byEvent.get(String(e.last_event)) ?? 0) + 1);
  console.log(`${rows.length} message(s)${filter ? ` to "*${filter}*"` : ""}; by last event:`, Object.fromEntries(byEvent));
  for (const e of rows.slice(0, 40)) console.log(`${e.created_at}  ${String(e.last_event).padEnd(11)} ${(e.to ?? []).map(mask).join(",")}  ${e.subject}`);
  console.log("\nA recipient that never appears here was rejected before it was accepted (see the server logs for '[email] ... REJECTED').");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
