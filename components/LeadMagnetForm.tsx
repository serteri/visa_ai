"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

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

// ── Document registry ──────────────────────────────────────────────────────────
// Maps the friendly documentId (used in JSX props) to the slug the
// /api/pdf-download route and the email delivery system expect. Add new
// documents here — no other file needs to change.
const DOCUMENT_SLUG: Record<string, string> = {
  "csol-2026": "australia-skilled-occupation-list-2026",
  "guide-global-2026": "australia-guide-2026",
  "guide-turkish-2026": "avustralya-pr-rehberi-2026",
};

// Human-readable CRM category sent alongside the lead so the admin dashboard
// can tag it without re-deriving it from the slug.
const DOCUMENT_CATEGORY: Record<string, string> = {
  "csol-2026": "2026 Official Occupation List",
  "guide-global-2026": "Global Guide",
  "guide-turkish-2026": "Turkish Guide",
};

// ── Validation ─────────────────────────────────────────────────────────────────
// Slightly stricter than the browser's native type="email" — rejects bare
// addresses without a TLD (e.g. "a@b").
const STRICT_EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

type FieldErrors = {
  full_name?: string;
  email?: string;
  phone?: string;
};

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
}

export function LeadMagnetForm({
  locale,
  documentId,
  documentName,
  onSuccess,
  className,
}: LeadMagnetFormProps) {
  // Resolve the API slug; fall back to documentId itself so unexpected values
  // still reach the server with a meaningful identifier rather than silently
  // failing.
  const slug = DOCUMENT_SLUG[documentId] ?? documentId;
  const category = DOCUMENT_CATEGORY[documentId] ?? documentName;

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
  const [success, setSuccess] = useState(false);
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
    const errs: FieldErrors = {};

    if (!form.full_name.trim()) {
      errs.full_name = tx(
        "Ad Soyad zorunludur.",
        "Full Name is required.",
        "姓名为必填项。"
      );
    }
    if (!form.email.trim()) {
      errs.email = tx("E-posta zorunludur.", "Email is required.", "邮箱为必填项。");
    } else if (!STRICT_EMAIL_RE.test(form.email.trim())) {
      errs.email = tx(
        "Geçerli bir e-posta adresi girin.",
        "Enter a valid email address.",
        "请输入有效的邮箱地址。"
      );
    }
    const digits = form.phone.replace(/\D/g, "");
    if (form.phone.trim() && digits.length < 6) {
      errs.phone = tx(
        "Geçerli bir telefon numarası girin.",
        "Enter a valid phone number.",
        "请输入有效的手机号。"
      );
    }

    return errs;
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

    try {
      const res = await fetch("/api/pdf-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phone: `${dialForCountryCode(countryIso)} ${form.phone.trim()}`,
          slug,
          category,
          termsAcceptedAt,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.alreadyDownloaded) {
          setError(
            tx(
              "Bu IP adresinden daha önce indirildi. Her IP'den yalnızca 1 indirme yapılabilir.",
              "This document was already requested from this IP. Only 1 request is allowed per IP.",
              "该 IP 地址已下载过该文件。每个 IP 仅允许下载 1 次。"
            )
          );
        } else {
          setError(
            data.error ??
              tx("Bir hata oluştu.", "Something went wrong.", "发生错误。")
          );
        }
        return;
      }

      setSuccess(true);
      onSuccess?.();
    } catch {
      setError(
        tx(
          "Bağlantı hatası. Lütfen tekrar deneyin.",
          "Connection error. Please try again.",
          "连接错误。请重试。"
        )
      );
    } finally {
      setLoading(false);
    }
  }

  // ── Success state ─────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </span>
        <p className="text-lg font-semibold text-slate-900 dark:text-white">
          {tx(
            <>
              Başarılı! <strong>{documentName}</strong>,{" "}
              <strong>{form.email}</strong> adresine gönderildi.
            </>,
            <>
              Done! <strong>{documentName}</strong> has been sent to{" "}
              <strong>{form.email}</strong>.
            </>,
            <>
              成功！<strong>{documentName}</strong> 已发送至{" "}
              <strong>{form.email}</strong>。
            </>
          )}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {tx(
            "Gelen kutunuzu ve spam/gereksiz klasörünü kontrol edin.",
            "Check your inbox and spam folder.",
            "请检查您的收件箱和垃圾邮件文件夹。"
          )}
        </p>
      </div>
    );
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
          <span className="ml-1 text-red-500">*</span>
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
          <p className="text-xs text-red-600">{fieldErrors.full_name}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-1">
        <Label htmlFor="lmf-email">
          {tx("E-posta", "Email", "邮箱")}
          <span className="ml-1 text-red-500">*</span>
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
          <p className="text-xs text-red-600">{fieldErrors.email}</p>
        )}
      </div>

      {/* Phone */}
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
          <p className="text-xs text-red-600">{fieldErrors.phone}</p>
        )}
      </div>

      {/* Global error */}
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
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
        label={tx(
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
        )}
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
          : tx("📥 E-postama Gönder", "📥 Send to My Email", "📥 发送到我的邮箱")}
      </Button>

      <p className="text-center text-xs text-slate-400">
        {tx(
          "Bilgileriniz yalnızca bu indirme için kullanılır ve üçüncü taraflarla paylaşılmaz.",
          "Your details are used only for this download and are not shared with third parties.",
          "您的信息仅用于本次下载，不会与第三方共享。"
        )}
      </p>
    </form>
  );
}
