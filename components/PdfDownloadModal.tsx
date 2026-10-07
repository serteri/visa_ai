"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StripeCheckoutButton } from "@/components/stripe-checkout-button";
import { getProductPriceDisplay } from "@/lib/pricing";
import { TermsGate, TermsGateLink } from "@/components/terms-gate";
import { COUNTRY_CODES, defaultCountryCodeForLocale, dialForCountryCode } from "@/lib/country-codes";
import { LEAD_MAGNETS, FORM_TEXT, pick, type PdfProduct } from "@/lib/lead-magnets";
import { validateLeadFields, type LeadFieldErrors } from "@/lib/lead-magnet-validation";
import { submitLead } from "@/lib/lead-magnet-client";
import { LeadMagnetResult } from "@/components/lead-magnet-result";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export type { PdfProduct };

type FieldErrors = LeadFieldErrors;

interface PdfStatus {
  isFree: boolean;
  freeRemaining: number;
  totalDownloads: number;
  alreadyDownloaded: boolean;
}

interface Props {
  locale: string;
  open: boolean;
  onClose: () => void;
  /** Which guide this modal instance is downloading. Defaults to the Turkish edition. */
  product?: PdfProduct;
}

export function PdfDownloadModal({
  locale,
  open,
  onClose,
  product = "turkish",
}: Props) {
  const magnet = LEAD_MAGNETS[product];
  const slug = magnet.slug;
  const [status, setStatus] = useState<PdfStatus | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });
  const [countryIso, setCountryIso] = useState(() => defaultCountryCodeForLocale(locale));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<null | { kind: "sent" } | { kind: "not_delivered"; downloadUrl: string; suppressed: boolean }>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [termsAcceptedAt, setTermsAcceptedAt] = useState<string | null>(null);

  function tx<T>(tr: T, en: T, zh: T): T {
    if (locale === "tr") return tr;
    if (locale === "zh-Hans") return zh;
    return en;
  }

  // GST-inclusive, the same amount Checkout charges (lib/pricing.ts).
  const ebookPrice = getProductPriceDisplay(product === "global" ? "pdf_book_global" : "pdf_book", locale);

  useEffect(() => {
    if (open) {
      fetch(`/api/pdf-download?slug=${slug}`)
        .then((r) => r.json())
        .then(setStatus)
        .catch(() => setStatus(null));
    }
  }, [open, slug]);

  // Fixes stale state: this modal instance stays mounted (only `open` toggles)
  // so without an explicit reset, form values/errors/success from a previous
  // visit would still be showing the next time it's opened — even for a
  // different guide (Australia vs Canada) sharing this same component.
  function resetFormState() {
    setForm({ full_name: "", email: "", phone: "" });
    setCountryIso(defaultCountryCodeForLocale(locale));
    setFieldErrors({});
    setError("");
    setResult(null);
    setIsTermsAccepted(false);
    setTermsError(false);
    setTermsAcceptedAt(null);
    setLoading(false);
    setStatus(null);
  }

  function handleClose() {
    resetFormState();
    onClose();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
    setFieldErrors((prev) => (prev[name as keyof FieldErrors] ? { ...prev, [name]: undefined } : prev));
  }

  // Level 1 frontend validation (the same function the API runs): name and email are required, the phone is optional.
  function validate(): FieldErrors {
    return validateLeadFields(form, locale);
  }

  // Gate passed to StripeCheckoutButton for the paid path -- see handleSubmit
  // for the free-download path's equivalent check.
  function handleBeforeCheckout(): boolean {
    if (!isTermsAccepted) {
      setTermsError(true);
      return false;
    }
    setTermsError(false);
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Level 1: custom inline validation runs before anything else. The <form>
    // has noValidate so the browser's native tooltips never fire; invalid
    // fields are highlighted inline instead.
    const nextFieldErrors = validate();
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
      return;
    }

    // Legal gate: blocks lead submission and PDF distribution entirely --
    // no fetch, no data sent -- until Terms/data-processing consent is
    // given. This is where the user's name/email/phone would otherwise be
    // collected, so the check must happen before anything else.
    if (!isTermsAccepted) {
      setTermsError(true);
      return;
    }
    setTermsError(false);

    setLoading(true);
    setError("");

    const outcome = await submitLead({
      slug,
      category: magnet.category,
      locale,
      full_name: form.full_name,
      email: form.email,
      phone: form.phone.trim() ? `${dialForCountryCode(countryIso)} ${form.phone.trim()}` : "",
      termsAcceptedAt,
    });
    setLoading(false);

    if (outcome.kind === "sent" || outcome.kind === "not_delivered") {
      // "sent" only when the provider accepted the email; otherwise the download link is shown on screen.
      setResult(outcome);
      return;
    }
    if (outcome.kind === "payment_required") {
      // Slots ran out between opening the modal and submitting: flip to the paid Stripe path in place.
      setStatus((prev) =>
        prev ? { ...prev, isFree: false, freeRemaining: 0 } : { isFree: false, freeRemaining: 0, totalDownloads: 0, alreadyDownloaded: false }
      );
      setError(
        tx(
          `Ücretsiz kota az önce doldu — aşağıdan ${ebookPrice} ile satın alabilirsiniz.`,
          `The free quota just filled up — you can purchase below for ${ebookPrice}.`,
          `免费名额刚刚用完 — 可在下方以 ${ebookPrice} 购买。`
        )
      );
      return;
    }
    if (outcome.fieldErrors) setFieldErrors(outcome.fieldErrors);
    setError(outcome.message);
  }

  const isFree = status?.isFree ?? true;
  const alreadyDownloaded = status?.alreadyDownloaded ?? false;

  const titleText = pick(magnet.title, locale);
  const descriptionText = pick(magnet.description, locale);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{titleText}</DialogTitle>
          <DialogDescription className="text-slate-700">
            {descriptionText}
          </DialogDescription>
        </DialogHeader>

        {/* Slot counter */}
        {!result && (
          <div
            className={`rounded-lg px-4 py-2 text-sm font-medium text-center ${
              isFree
                ? "bg-emerald-50 text-emerald-900 border border-emerald-300"
                : "bg-amber-50 text-amber-900 border border-amber-300"
            }`}
          >
            {isFree ? (
              <>{pick(magnet.banner, locale)}</>
            ) : (
              <>
                {tx("💳 Ucretsiz kota doldu. Fiyat: ", "💳 Free quota is full. Price: ", "💳 免费名额已满。价格：")}
                <strong>{ebookPrice}</strong>
              </>
            )}
          </div>
        )}

        {result ? (
          <LeadMagnetResult locale={locale} fileName={pick(magnet.name, locale)} email={form.email} state={result} onClose={handleClose} />
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-2">
            {/*
              Non-blocking notice only — the IP-based `alreadyDownloaded` flag
              from GET is known before any email is entered, so it can only
              ever be a heads-up here. The real, authoritative check (which
              also applies the admin/test bypass) happens server-side in POST
              once the email is known; that's what actually gates the
              download. Hard-blocking the form at this stage would make the
              admin/test bypass unreachable, since the form itself would
              never render for a previously-used IP.
            */}
            {alreadyDownloaded && (
              <p className="text-xs text-amber-900 bg-amber-50 border border-amber-300 rounded-md px-3 py-2">
                {tx(
                  "Bu IP adresinden daha once bir indirme yapilmis gibi gorunuyor. Normal kullanicilar icin yalnizca 1 indirme hakki vardir.",
                  "It looks like this IP already downloaded a guide. Regular visitors get one download per IP.",
                  "该 IP 似乎已下载过指南。普通访客每个 IP 仅可下载一次。"
                )}
              </p>
            )}
            <div className="space-y-1">
              <Label htmlFor="full_name">
                {tx("Ad Soyad", "Full Name", "姓名")}
                <span className="text-red-700 ml-1" aria-hidden="true">*</span>
              </Label>
              <Input
                id="full_name"
                name="full_name"
                placeholder={tx("Ahmet Yilmaz", "John Smith", "张伟")}
                value={form.full_name}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.full_name)}
                className={fieldErrors.full_name ? "border-red-500 focus-visible:ring-red-500" : ""}
                disabled={loading || !isFree}
              />
              {fieldErrors.full_name && (
                <p className="text-xs text-red-700">{fieldErrors.full_name}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">
                {tx("E-posta", "Email", "邮箱")}
                <span className="text-red-700 ml-1" aria-hidden="true">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={tx("ahmet@ornek.com", "john@example.com", "name@example.com")}
                value={form.email}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.email)}
                className={fieldErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
                disabled={loading || !isFree}
              />
              {fieldErrors.email && <p className="text-xs text-red-700">{fieldErrors.email}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">
                {tx("Telefon Numarası (Opsiyonel)", "Phone Number (Optional)", "手机号（可选）")}
              </Label>
              <div className="flex gap-2">
                <Select
                  value={countryIso}
                  onValueChange={setCountryIso}
                  disabled={loading || !isFree}
                >
                  <SelectTrigger className="w-28 shrink-0" aria-label={tx("Ülke kodu", "Country code", "国家区号")}>
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
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder={tx("555 000 0000", "412 345 678", "138 0013 8000")}
                  value={form.phone}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldErrors.phone)}
                  className={fieldErrors.phone ? "border-red-500 focus-visible:ring-red-500" : ""}
                  disabled={loading || !isFree}
                />
              </div>
              {fieldErrors.phone && <p className="text-xs text-red-700">{fieldErrors.phone}</p>}
            </div>

            <p className="text-xs text-slate-700" data-required-legend>
              {pick(FORM_TEXT.legend, locale)}
            </p>

            {error && (
              <p className="text-sm text-red-800 bg-red-50 border border-red-300 rounded-md px-3 py-2">
                {error}
              </p>
            )}

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
                  I agree to the <TermsGateLink>Terms of Service</TermsGateLink> and data
                  processing policies.
                </>,
                <>
                  我已阅读并同意<TermsGateLink>服务条款</TermsGateLink>
                  和数据处理政策。
                </>
              )}
              errorText={tx(
                "Lütfen devam etmek için yasal koşulları onaylayın.",
                "Please accept the legal terms to proceed.",
                "请接受法律条款以继续。"
              )}
            />

            {isFree ? (
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0"
                disabled={loading}
              >
                {loading
                  ? tx("Gönderiliyor...", "Sending...", "发送中...")
                  : tx("📥 E-postama Gönder", "📥 Send to My Email", "📥 发送到我的邮箱")}
              </Button>
            ) : (
              <StripeCheckoutButton
                productType={product === "global" ? "pdf_book_global" : "pdf_book"}
                locale={locale}
                email={form.email || undefined}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0"
                label={tx(
                  `💳 Şimdi Satın Al — ${ebookPrice}`,
                  `💳 Buy Now — ${ebookPrice}`,
                  `💳 立即购买 — ${ebookPrice}`
                )}
                onBeforeCheckout={handleBeforeCheckout}
              />
            )}

            <p className="text-xs text-slate-700 text-center">
              {tx(
                "Bilgileriniz yalnizca bu indirme icin kullanilir ve ucuncu taraflarla paylasilmaz.",
                "Your details are used only for this download and are not shared with third parties.",
                "您的信息仅用于本次下载，不会与第三方共享。"
              )}
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
