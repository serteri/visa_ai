/**
 * Guide-download / lead-magnet leads are OFF for agents until consent exists (docs/agent-referral-audit.md): pool view, claim, claim email,
 * admin-assignment email, and any agent read of an already-claimed one (list, page, status update), all server-side. Admin is unchanged.
 *
 *   npx tsx scripts/test-guide-pool-off.ts
 */
import { readFileSync } from "node:fs";
import { setNextAuthSession, signOutAll } from "./lib/stub-request-context";

process.env.AUTH_SECRET = "test-auth-secret-for-guide-pool";
process.env.ADMIN_EMAILS = "owner-admin@example.com";
process.env.RESEND_API_KEY = "re_test_stub_not_a_real_key";
process.env.FROM_EMAIL = "LogiVisa Test <noreply@example.test>";
process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable";
delete process.env.ENABLE_TRANSACTIONAL_EMAILS;

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    failures++;
    console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`);
  }
};

type Row = { id: string; agentId: string | null; source: string; market: string; docStatus: string; isUnlocked: boolean; paymentStatus: string; unlockMethod: string | null; createdAt: Date; agentNotes: null };
const rows = new Map<string, Row>();
const mk = (id: string, agentId: string | null, source: string): Row => ({ id, agentId, source, market: "GLOBAL", docStatus: "New", isUnlocked: false, paymentStatus: "pending", unlockMethod: null, createdAt: new Date(), agentNotes: null });
const USERS: Record<string, { id: string; email: string; name: string; role: string; approvalStatus: string; commissionRate: null }> = {
  "agent-ok": { id: "agent-ok", email: "ok@agents.example", name: "Ada", role: "AGENT", approvalStatus: "APPROVED", commissionRate: null },
  "admin-1": { id: "admin-1", email: "admin@example.com", name: "Admin", role: "ADMIN", approvalStatus: "APPROVED", commissionRate: null },
};
// A where-clause matcher for exactly the shapes the agent data functions use.
const matches = (r: Row, w: Record<string, unknown>) =>
  Object.entries(w).every(([k, v]) => {
    const val = (r as unknown as Record<string, unknown>)[k];
    if (v && typeof v === "object" && "notIn" in (v as object)) return !(v as { notIn: unknown[] }).notIn.includes(val);
    if (v && typeof v === "object" && "in" in (v as object)) return (v as { in: unknown[] }).in.includes(val);
    if (v && typeof v === "object" && "not" in (v as object)) return val !== (v as { not: unknown }).not;
    return val === v;
  });
(globalThis as { prisma?: unknown }).prisma = {
  user: {
    findFirst: async ({ where }: { where: Record<string, unknown> }) => Object.values(USERS).find((u) => (where.id === undefined || u.id === where.id) && (where.role === undefined || u.role === where.role) && (where.approvalStatus === undefined || u.approvalStatus === where.approvalStatus)) ?? null,
  },
  userReport: {
    findMany: async ({ where }: { where: Record<string, unknown> }) => [...rows.values()].filter((r) => matches(r, where)),
    findFirst: async ({ where }: { where: Record<string, unknown> }) => [...rows.values()].find((r) => matches(r, where)) ?? null,
    updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      const hit = [...rows.values()].filter((r) => matches(r, where));
      hit.forEach((r) => Object.assign(r, data));
      return { count: hit.length };
    },
    update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => Object.assign(rows.get(where.id)!, data),
  },
  $disconnect: async () => undefined,
};

async function main() {
  globalThis.fetch = (async () => {
    throw new Error("network forbidden");
  }) as typeof fetch;
  const sent: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Resend } = require("resend") as typeof import("resend");
  (Object.getPrototypeOf(new Resend("re_stub").emails) as { send: unknown }).send = async (p: { to: string | string[] }) => {
    sent.push(String(p.to));
    return { data: { id: "stub" }, error: null };
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nextCachePath = require.resolve("next/cache");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const realCache = require("next/cache");
  require.cache[nextCachePath]!.exports = { ...realCache, revalidatePath: () => undefined, revalidateTag: () => undefined };
  const flush = () => new Promise((r) => setTimeout(r, 60));
  const agentSession = () => setNextAuthSession({ user: { id: "agent-ok", email: "ok@agents.example", role: "AGENT", approvalStatus: "APPROVED" } } as never);

  rows.set("pool1", mk("pool1", null, "pdf_global_guide"));
  rows.set("pool2", mk("pool2", null, "pdf_occupation_list"));
  rows.set("claimed-guide", mk("claimed-guide", "agent-ok", "pdf_turkish_guide"));
  rows.set("referred", mk("referred", "agent-ok", "full_check"));

  console.log("1. pool data: empty for an agent, claim refused");
  const { getLeadPool, claimLead, getAgentReferrals, getAgentLead, updateLeadStatus } = await import("../lib/crm/leads");
  check((await getLeadPool("TR")).length === 0 && (await getLeadPool("GLOBAL")).length === 0, "getLeadPool returns nothing (any market)");
  check((await claimLead("agent-ok", "pool1")) === false && rows.get("pool1")!.agentId === null, "claimLead refuses and the lead stays unassigned");

  console.log("\n2. claim action: no claim, no redirect, no email");
  const { claimLeadAction } = await import("../app/[locale]/(portal)/agent/pool/actions");
  agentSession();
  sent.length = 0;
  await claimLeadAction("en", "pool1");
  await flush();
  check(rows.get("pool1")!.agentId === null && sent.length === 0, "claimLeadAction by an approved agent claims nothing and sends nothing");

  console.log("\n3. an already-claimed guide lead is invisible to its agent, by direct id too");
  const refs = await getAgentReferrals("agent-ok");
  check(refs.length === 1 && refs[0].id === "referred", "the referral list holds only the full-check referral", JSON.stringify(refs.map((x) => x.id)));
  check((await getAgentLead("agent-ok", "claimed-guide")) === null, "the lead page lookup for a claimed guide lead -> null (page 404s)");
  check((await getAgentLead("agent-ok", "referred")) !== null, "a referred full-check client is still found");
  check((await updateLeadStatus("agent-ok", "claimed-guide", "Contacted")) === false && rows.get("claimed-guide")!.docStatus === "New", "its status cannot be changed by the agent");

  console.log("\n4. admin assignment: allowed, but no email to the agent for a guide lead");
  const { assignLeadToAgent } = await import("../app/[locale]/(portal)/admin/crm/actions");
  setNextAuthSession({ user: { id: "admin-1", email: "admin@example.com", role: "ADMIN", approvalStatus: "APPROVED" } } as never);
  sent.length = 0;
  await assignLeadToAgent("pool2", "agent-ok", "en");
  await flush();
  check(rows.get("pool2")!.agentId === "agent-ok", "admin can still assign it");
  check(!sent.some((t) => /agents\.example/.test(t)), "no email to the agent", JSON.stringify(sent));
  check((await getAgentLead("agent-ok", "pool2")) === null, "and the agent still cannot see it");
  signOutAll();

  console.log("\n5. source guards");
  const page = readFileSync("app/[locale]/(portal)/agent/pool/page.tsx", "utf8");
  check(page.indexOf("AGENT_GUIDE_POOL_ENABLED") < page.indexOf("getLeadPool(user.market)") && /pool-disabled-notice/.test(page), "the pool page shows the notice before it queries the pool");
  check(!/true as boolean/.test(readFileSync("lib/crm/agent-access.ts", "utf8").split("AGENT_GUIDE_POOL_ENABLED")[1] ?? ""), "the switch is off");

  if (failures) {
    console.error(`\n❌ ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\n✅ ALL CHECKS PASSED");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
