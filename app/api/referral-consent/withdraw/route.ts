import { NextRequest, NextResponse } from "next/server";

import { hashIp, recordConsentWithdrawn, toConsentLocale, verifyConsentToken } from "@/lib/consent/referral-consent";

export const dynamic = "force-dynamic";

const COPY = {
  en: { title: "Withdraw your agreement", body: "You agreed to share your details and report with the agent who referred you. Confirm below to withdraw that agreement. The agent will no longer see your name, contact details or report.", button: "Withdraw my agreement", done: "Your agreement has been withdrawn. The agent can no longer see your details.", nothing: "There is no active agreement to withdraw.", invalid: "This link is not valid." },
  tr: { title: "Onayınızı geri çekin", body: "Ayrıntılarınızı ve raporunuzu sizi yönlendiren göç danışmanıyla paylaşmayı kabul etmiştiniz. Bu onayı geri çekmek için aşağıdan onaylayın. Danışman artık adınızı, iletişim bilgilerinizi veya raporunuzu görmeyecek.", button: "Onayımı geri çekiyorum", done: "Onayınız geri çekildi. Danışman artık bilgilerinizi göremez.", nothing: "Geri çekilecek etkin bir onay yok.", invalid: "Bu bağlantı geçerli değil." },
  "zh-Hans": { title: "撤回您的同意", body: "您曾同意将您的信息和报告提供给推荐您的移民代理。请在下方确认以撤回该同意。代理将不再看到您的姓名、联系方式或报告。", button: "撤回我的同意", done: "您的同意已撤回。代理无法再查看您的信息。", nothing: "没有可撤回的有效同意。", invalid: "此链接无效。" },
} as const;

const page = (locale: keyof typeof COPY, inner: string, status = 200) =>
  new NextResponse(
    `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${COPY[locale].title}</title><style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:3rem auto;padding:0 1rem;color:#0f172a;line-height:1.5}button{background:#53917E;color:#fff;border:0;border-radius:.5rem;padding:.75rem 1.25rem;font-size:1rem;cursor:pointer}</style></head><body><h1>${COPY[locale].title}</h1>${inner}</body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" } },
  );

/** GET only shows a confirm button (a link scanner or prefetch must not withdraw anything); POST appends the withdrawal. */
export async function GET(req: NextRequest) {
  const r = req.nextUrl.searchParams.get("r") ?? "";
  const t = req.nextUrl.searchParams.get("t") ?? "";
  const locale = toConsentLocale(req.nextUrl.searchParams.get("l"));
  if (!verifyConsentToken(r, t)) return page(locale, `<p>${COPY[locale].invalid}</p>`, 400);
  return page(locale, `<p>${COPY[locale].body}</p><form method="post" action="/api/referral-consent/withdraw"><input type="hidden" name="r" value="${encodeURIComponent(r)}"><input type="hidden" name="t" value="${encodeURIComponent(t)}"><input type="hidden" name="l" value="${locale}"><button type="submit">${COPY[locale].button}</button></form>`);
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const r = decodeURIComponent(String(form?.get("r") ?? ""));
  const t = decodeURIComponent(String(form?.get("t") ?? ""));
  const locale = toConsentLocale(String(form?.get("l") ?? ""));
  if (!verifyConsentToken(r, t)) return page(locale, `<p>${COPY[locale].invalid}</p>`, 400);
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const withdrew = await recordConsentWithdrawn(r, { locale, ipHash: hashIp(ip), userAgent: req.headers.get("user-agent") });
    return page(locale, `<p>${withdrew ? COPY[locale].done : COPY[locale].nothing}</p>`);
  } catch {
    return page(locale, `<p>Something went wrong. Please try again, or contact info@logivisa.com.</p>`, 500);
  }
}
