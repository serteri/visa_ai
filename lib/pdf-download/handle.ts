/**
 * The decision logic of POST /api/pdf-download, with its side effects injected so the success and failure paths can be tested without a
 * database or a network. The route (app/api/pdf-download/route.ts) wires the real database, the real provider and next/server's after().
 *
 *   400 { error, fieldErrors? }                          validation (name and email required, phone optional) or terms missing
 *   409 { alreadyDownloaded }  402 { paymentRequired }   one request per IP and file; the shared free quota
 *   200 { success, delivered: true }                     the provider ACCEPTED the email
 *   200 { success, delivered: false, downloadUrl }       stored, but no email went out (provider failure, or a suppressed test/admin address):
 *                                                        the ledger row is released on a failure, and the visitor gets the link
 */
import { FORM_TEXT, pdfPath, pick, PDF_SLUGS } from "@/lib/lead-magnets";
import { validateLeadFields } from "@/lib/lead-magnet-validation";
import type { PdfDeliveryResult } from "@/lib/email/pdf-delivery";

export const FREE_LIMIT = 18;

export type PdfDownloadDeps = {
  isExcludedEmail(email: string): boolean;
  countByIpAndSlug(ip: string, slug: string): Promise<number>;
  countRealTotal(): Promise<number>;
  insertLedgerRow(row: { full_name: string; email: string; phone: string; ip: string; slug: string; termsAt: Date }): Promise<string | undefined>;
  deleteLedgerRow(id: string): Promise<void>;
  isSuppressed(email: string, sender: string): boolean;
  sendDelivery(p: { fullName: string; email: string; slug: string; locale: string }): Promise<PdfDeliveryResult>;
  /** The CRM lead and the internal notification: run after the response. */
  afterResponse(task: { fullName: string; email: string; phone: string; slug: string; ip: string; delivered: boolean }): void;
};

export type HandleResult = { status: number; json: Record<string, unknown> };

const resolveSlug = (value: unknown): string =>
  value === PDF_SLUGS.global ? PDF_SLUGS.global : value === PDF_SLUGS.occupation ? PDF_SLUGS.occupation : PDF_SLUGS.turkish;

export async function handlePdfDownload(input: { body: Record<string, unknown>; ip: string }, deps: PdfDownloadDeps): Promise<HandleResult> {
  const { body, ip } = input;
  const locale = body.locale === "tr" || body.locale === "zh-Hans" ? body.locale : "en";

  const full_name = String(body.full_name ?? "").trim();
  const email = String(body.email ?? "").trim();
  // A phone that is only a dial code ("+90") is empty.
  const phone = String(body.phone ?? "").trim().replace(/^\+\d{1,4}\s*$/, "");
  const fieldErrors = validateLeadFields({ full_name, email, phone }, locale);
  if (Object.keys(fieldErrors).length > 0) return { status: 400, json: { error: pick(FORM_TEXT.generic, locale), fieldErrors } };

  const slug = resolveSlug(body.slug);
  const termsAt = new Date(typeof body.termsAcceptedAt === "string" ? body.termsAcceptedAt : "");
  if (Number.isNaN(termsAt.getTime())) return { status: 400, json: { error: pick(FORM_TEXT.termsRequired, locale) } };

  const normalizedEmail = email.toLowerCase();
  const excluded = deps.isExcludedEmail(normalizedEmail);
  if (!excluded) {
    if ((await deps.countByIpAndSlug(ip, slug)) > 0) return { status: 409, json: { error: pick(FORM_TEXT.alreadyDownloaded, locale), alreadyDownloaded: true } };
    if ((await deps.countRealTotal()) >= FREE_LIMIT) return { status: 402, json: { error: pick(FORM_TEXT.generic, locale), paymentRequired: true } };
  }

  const ledgerId = await deps.insertLedgerRow({ full_name, email: normalizedEmail, phone, ip, slug, termsAt });

  // The email goes out BEFORE the answer, so the browser can say "sent" only when the provider accepted it.
  const suppressed = deps.isSuppressed(normalizedEmail, "pdf_download_delivery_email");
  const delivery = suppressed ? null : await deps.sendDelivery({ fullName: full_name, email: normalizedEmail, slug, locale });
  const delivered = delivery?.sent === true;

  // A failed send must not use up the visitor's one request or a free slot: the ledger row is released so they can try again.
  if (!suppressed && !delivered && ledgerId) await deps.deleteLedgerRow(ledgerId);

  deps.afterResponse({ fullName: full_name, email: normalizedEmail, phone, slug, ip, delivered });
  return { status: 200, json: { success: true, delivered, suppressed, downloadUrl: pdfPath(slug), reason: delivery?.skippedReason } };
}
