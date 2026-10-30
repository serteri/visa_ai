"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TermsGate, TermsGateLink } from "@/components/terms-gate";
import {
  COUNTRY_CODES,
  defaultCountryCodeForLocale,
  dialForCountryCode,
} from "@/lib/country-codes";
import { cn } from "@/lib/utils";
import { publicPath } from "@/lib/seo/urls";
import { DOCUMENT_IDS, FORM_TEXT, LEAD_MAGNETS, pick } from "@/lib/lead-magnets";
import { validateLeadFields, type LeadFieldErrors } from "@/lib/lead-magnet-validation";
import { submitLead } from "@/lib/lead-magnet-client";
import { trackEvent } from "@/lib/analytics/events";
import { LeadMagnetResult } from "@/components/lead-magnet-result";

type FieldErrors = LeadFieldErrors;

// ── Component ──────────────────────────────────────────────────────────────────
export interface LeadMagnetFormProps {
  /** Locale string, e.g. "en" | "tr" | "zh-Hans". */
  locale: string;
  /**
   * Friendly document identifier — maps to the API slug and CRM category.
   * Currently supported: "csol-2026" | "guide-global-2026" | "guide-turkish-2026"
   */
  documentId: string;
  /** Human-readable document name shown in labels and success copy. */
  documentName: string;
  /**
   * Called when the user successfully submits the form.
   * Useful when the form is embedded inside a Dialog — the parent can close
   * the dialog (or delay the close to let the user read the success message).
   */
  onSuccess?: () => void;
  /** Extra CSS classes applied to the root <form> element. */
  className?: string;
  /** Whether the form is rendered inline in a reading flow, bypassing redirects. */
  isInline?: boolean;
  /**
   * Name and email only: no phone field, no country-code selector, no phone in the submission, and the privacy line, acknowledgement and button wording of the
   * occupation-list PDF page (privacy information and Terms of Service, both linked). Every other form keeps its fields and wording.
   */
  emailOnly?: boolean;
}

export function LeadMagnetForm({
  locale,
  documentId,
  documentName,
  onSuccess,
  className,
  isInline = false,
  emailOnly = false,
}: LeadMagnetFormProps) {
  // Resolve the API slug; fall back to documentId itself so unexpected values
  // still reach the server with a meaningful identifier rather than silently
  // failing.
  const magnet = LEAD_MAGNETS[DOCUMENT_IDS[documentId] ?? "turkish"];
  const slug = magnet.slug;
  const category = magnet.category;
  // The file's own name in the visitor's language (the `documentName` prop is only a fallback for an unknown id).
  const fileName = DOCUMENT_IDS[documentId] ? pick(magnet.name, locale) : documentName;

  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  function tx<T>(tr: T, en: T, zh: T): T {
    if (isTr) return tr;
    if (isZh) return zh;
    return en;
  }

  // ── State ────────────────────────────────────────────────────────────────────
  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });
  const [countryIso, setCountryIso] = useState(() =>
    defaultCountryCodeForLocale(locale)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<null | { kind: "sent" } | { kind: "not_delivered"; downloadUrl: string; suppressed: boolean }>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [termsAcceptedAt, setTermsAcceptedAt] = useState<string | null>(null);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
    setFieldErrors((prev) =>
      prev[name as keyof FieldErrors] ? { ...prev, [name]: undefined } : prev
    );
  }

  function validate(): FieldErrors {
    return validateLeadFields(form, locale);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const nextErrors = validate();
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (!isTermsAccepted) {
      setTermsError(true);
      return;
    }
    setTermsError(false);
    setLoading(true);
    setError("");

    const outcome = await submitLead({
      slug,
      category,
      locale,
      full_name: form.full_name,
      email: form.email,
      ...(emailOnly ? {} : { phone: form.phone.trim() ? `${dialForCountryCode(countryIso)} ${form.phone.trim()}` : "" }),
      termsAcceptedAt,
    });
    setLoading(false);

    if (outcome.kind === "sent" || outcome.kind === "not_delivered") {
      setResult(outcome);
      // The backend accepted the lead (the lead is stored whether or not the email went out): only now is a success counted. Fixed vocabulary, no form values.
      trackEvent("lead_magnet_success", { document: slug, locale });
      if (outcome.kind === "sent") onSuccess?.();
      return;
    }
    if (outcome.kind === "payment_required") {
      setError(pick(FORM_TEXT.generic, locale));
      return;
    }
    if (outcome.fieldErrors) setFieldErrors(outcome.fieldErrors);
    setError(outcome.message);
  }

  // ── Result state ──────────────────────────────────────────────────────────────
  if (result) {
    if (isInline && result.kind === "sent") {
      return (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-6 text-emerald-950" role="status" data-lead-result="sent">
          <p className="text-base font-semibold">
            {tx(
              `${fileName} gelen kutunuza gönderildi. Aşağıdan okumaya devam edebilirsiniz.`,
              `${fileName} has been sent to your inbox. You can continue reading below.`,
              `${fileName} 已发送至您的收件箱。您可以继续阅读下文。`
            )}
          </p>
        </div>
      );
    }
    return <LeadMagnetResult locale={locale} fileName={fileName} email={form.email} state={result} />;
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn("space-y-4", className)}
    >
      {/* Full name */}
      <div className="space-y-1">
        <Label htmlFor="lmf-full-name">
          {tx("Ad Soyad", "Full Name", "姓名")}
          <span className="ml-1 text-red-700">*</span>
        </Label>
        <Input
          id="lmf-full-name"
          name="full_name"
          autoComplete="name"
          placeholder={tx("Ahmet Yılmaz", "Jane Smith", "张伟")}
          value={form.full_name}
          onChange={handleChange}
          aria-invalid={Boolean(fieldErrors.full_name)}
          className={
            fieldErrors.full_name ? "border-red-500 focus-visible:ring-red-500" : ""
          }
          disabled={loading}
        />
        {fieldErrors.full_name && (
          <p className="text-xs text-red-700">{fieldErrors.full_name}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-1">
        <Label htmlFor="lmf-email">
          {tx("E-posta", "Email", "邮箱")}
          <span className="ml-1 text-red-700">*</span>
        </Label>
        <Input
          id="lmf-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={tx("ahmet@ornek.com", "jane@example.com", "name@example.com")}
          value={form.email}
          onChange={handleChange}
          aria-invalid={Boolean(fieldErrors.email)}
          className={
            fieldErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""
          }
          disabled={loading}
        />
        {fieldErrors.email && (
          <p className="text-xs text-red-700">{fieldErrors.email}</p>
        )}
      </div>

      {/* Phone (not asked by the email-only form) */}
      {!emailOnly && (
      <div className="space-y-1">
        <Label htmlFor="lmf-phone">
          {tx("Telefon Numarası (Opsiyonel)", "Phone Number (Optional)", "手机号（可选）")}
        </Label>
        <div className="flex gap-2">
          <Select
            value={countryIso}
            onValueChange={setCountryIso}
            disabled={loading}
          >
            <SelectTrigger
              className="w-28 shrink-0"
              aria-label={tx("Ülke kodu", "Country code", "国家区号")}
            >
              <SelectValue>{dialForCountryCode(countryIso)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {COUNTRY_CODES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            id="lmf-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder={tx("555 000 0000", "412 345 678", "138 0013 8000")}
            value={form.phone}
            onChange={handleChange}
            aria-invalid={Boolean(fieldErrors.phone)}
            className={
              fieldErrors.phone ? "border-red-500 focus-visible:ring-red-500" : ""
            }
            disabled={loading}
          />
        </div>
        {fieldErrors.phone && (
          <p className="text-xs text-red-700">{fieldErrors.phone}</p>
        )}
      </div>

      )}

      <p className="text-xs text-slate-700" data-required-legend>
        {pick(FORM_TEXT.legend, locale)}
      </p>

      {/* Global error */}
      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {/* Terms */}
      <TermsGate
        isTermsAccepted={isTermsAccepted}
        termsError={termsError}
        onToggle={(checked) => {
          setIsTermsAccepted(checked);
          setTermsAcceptedAt(checked ? new Date().toISOString() : null);
          if (checked) setTermsError(false);
        }}
        label={
          emailOnly
            ? tx(
                <>
                  <TermsGateLink href={publicPath(locale, "/legal")}>Gizlilik bilgilerini</TermsGateLink> ve{" "}
                  <TermsGateLink href={publicPath(locale, "/terms")}>Kullanım Koşulları’nı</TermsGateLink> okuduğumu kabul ediyorum.
                </>,
                <>
                  I acknowledge the <TermsGateLink href={publicPath(locale, "/legal")}>privacy information</TermsGateLink> and{" "}
                  <TermsGateLink href={publicPath(locale, "/terms")}>Terms of Service</TermsGateLink>.
                </>,
                <>
                  我已知悉<TermsGateLink href={publicPath(locale, "/legal")}>隐私信息</TermsGateLink>和
                  <TermsGateLink href={publicPath(locale, "/terms")}>服务条款</TermsGateLink>。
                </>
              )
            : tx(
                <>
                  <TermsGateLink>Kullanım Koşullarını</TermsGateLink> ve veri işleme
                  politikalarını okudum, onaylıyorum.
                </>,
                <>
                  I agree to the <TermsGateLink>Terms of Service</TermsGateLink> and
                  data processing policies.
                </>,
                <>
                  我已阅读并同意
                  <TermsGateLink>服务条款</TermsGateLink>和数据处理政策。
                </>
              )
        }
        errorText={tx(
          "Lütfen devam etmek için yasal koşulları onaylayın.",
          "Please accept the legal terms to proceed.",
          "请接受法律条款以继续。"
        )}
      />

      {/* Submit */}
      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 hover:opacity-90"
        disabled={loading}
      >
        {loading
          ? tx("Gönderiliyor…", "Sending…", "发送中…")
          : emailOnly
            ? tx("📥 PDF’i E-postama Gönder", "📥 Send PDF to My Email", "📥 将 PDF 发送到我的邮箱")
            : tx("📥 E-postama Gönder", "📥 Send to My Email", "📥 发送到我的邮箱")}
      </Button>

      <p className="text-center text-xs text-slate-700">
        {emailOnly
          ? tx(
              <>
                Bilgilerinizi istenen PDF’i size ulaştırmak için kullanırız.{" "}
                <TermsGateLink href={publicPath(locale, "/legal")}>Gizlilik bilgilerimize</TermsGateLink> bakın.
              </>,
              <>
                We use your details to deliver the requested PDF. See our{" "}
                <TermsGateLink href={publicPath(locale, "/legal")}>privacy information</TermsGateLink>.
              </>,
              <>
                我们使用您的信息来发送您所请求的 PDF。请参阅我们的
                <TermsGateLink href={publicPath(locale, "/legal")}>隐私信息</TermsGateLink>。
              </>
            )
          : tx(
              "Bilgileriniz yalnızca bu indirme için kullanılır ve üçüncü taraflarla paylaşılmaz.",
              "Your details are used only for this download and are not shared with third parties.",
              "您的信息仅用于本次下载，不会与第三方共享。"
            )}
      </p>
    </form>
  );
}
