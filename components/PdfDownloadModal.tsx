"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StripeCheckoutButton } from "@/components/stripe-checkout-button";
import { TermsGate, TermsGateLink } from "@/components/terms-gate";
import { COUNTRY_CODES, defaultCountryCodeForLocale, dialForCountryCode } from "@/lib/country-codes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export type PdfProduct = "turkish" | "global" | "occupation";

const PDF_SLUGS: Record<PdfProduct, string> = {
  turkish: "avustralya-pr-rehberi-2026",
  global: "australia-guide-2026",
  occupation: "australia-skilled-occupation-list-2026",
};

// Lead-source bucket the CRM classifies this submission into, keyed off which
// guide the modal instance is serving. Sent to the API alongside the form so
// the admin notification/lead record can tag it without re-deriving it from
// the slug downstream.
const LEAD_CATEGORY: Record<PdfProduct, string> = {
  turkish: "Turkish Guide",
  global: "Global Guide",
  occupation: "2026 Official Occupation List",
};

// Strict RFC-5322-ish format check (Level 1 frontend validation) — deliberately
// tighter than the browser's native type="email" check, which accepts things
// like "a@b" with no TLD.
const STRICT_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

type FieldErrors = {
  full_name?: string;
  email?: string;
  phone?: string;
};

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
  const slug = PDF_SLUGS[product];
  const [status, setStatus] = useState<PdfStatus | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });
  const [countryIso, setCountryIso] = useState(() => defaultCountryCodeForLocale(locale));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [termsAcceptedAt, setTermsAcceptedAt] = useState<string | null>(null);

  function tx<T>(tr: T, en: T, zh: T): T {
    if (locale === "tr") return tr;
    if (locale === "zh-Hans") return zh;
    return en;
  }

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
    setSuccess(false);
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

  // Level 1 frontend validation: Full Name, Email and Phone are all required;
  // Email must also pass a strict format check. Runs before the request is sent
  // so bad input never reaches the API.
  function validate(): FieldErrors {
    const nextErrors: FieldErrors = {};

    if (!form.full_name.trim()) {
      nextErrors.full_name = tx("Ad Soyad zorunludur.", "Full Name is required.", "姓名为必填项。");
    }

    if (!form.email.trim()) {
      nextErrors.email = tx("E-posta zorunludur.", "Email is required.", "邮箱为必填项。");
    } else if (!STRICT_EMAIL_REGEX.test(form.email.trim())) {
      nextErrors.email = tx(
        "Geçerli bir e-posta adresi girin.",
        "Enter a valid email address.",
        "请输入有效的邮箱地址。"
      );
    }

    const phoneDigits = form.phone.replace(/[^0-9]/g, "");
    if (!phoneDigits) {
      nextErrors.phone = tx("Telefon numarası zorunludur.", "Phone number is required.", "手机号为必填项。");
    } else if (phoneDigits.length < 6) {
      nextErrors.phone = tx(
        "Geçerli bir telefon numarası girin.",
        "Enter a valid phone number.",
        "请输入有效的手机号。"
      );
    }

    return nextErrors;
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

    try {
      const res = await fetch("/api/pdf-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phone: `${dialForCountryCode(countryIso)} ${form.phone.trim()}`,
          slug,
          category: LEAD_CATEGORY[product],
          termsAcceptedAt,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.alreadyDownloaded) {
          setError(
            tx(
              "Bu IP adresinden daha once indirildi. Her IP'den yalnizca 1 indirme yapilabilir.",
              "This PDF was already downloaded from this IP. Only 1 download is allowed per IP.",
              "该 IP 地址已下载过该 PDF。每个 IP 仅允许下载 1 次。"
            )
          );
        } else if (data.paymentRequired) {
          // Slots ran out between opening the modal and submitting — flip to the
          // paid Stripe path in place (isFree:false swaps the form for the
          // checkout button below) instead of dead-ending on a contact message.
          setStatus((prev) =>
            prev
              ? { ...prev, isFree: false, freeRemaining: 0 }
              : { isFree: false, freeRemaining: 0, totalDownloads: 0, alreadyDownloaded: false }
          );
          setError(
            tx(
              "Ücretsiz kota az önce doldu — aşağıdan $9.99 ile satın alabilirsiniz.",
              "The free quota just filled up — you can purchase below for $9.99.",
              "免费名额刚刚用完 — 可在下方以 $9.99 购买。"
            )
          );
        } else {
          setError(
            data.error ??
              tx("Bir hata olustu.", "Something went wrong.", "发生错误。")
          );
        }
        return;
      }

      // Delivery Trap: no client-side download trigger. The guide is emailed
      // to the address the user provided (see the API route) — the UI just
      // transitions to a success state confirming delivery.
      setSuccess(true);
    } catch {
      setError(
        tx(
          "Baglanti hatasi. Lutfen tekrar deneyin.",
          "Connection error. Please try again.",
          "连接错误。请重试。"
        )
      );
    } finally {
      setLoading(false);
    }
  }

  const isFree = status?.isFree ?? true;
  const alreadyDownloaded = status?.alreadyDownloaded ?? false;

  const titleText =
    product === "global"
      ? tx(
          "🌏 The Ultimate Australia Migration Blueprint",
          "🌏 The Ultimate Australia Migration Blueprint",
          "🌏 终极澳大利亚移民蓝图"
        )
      : product === "occupation"
        ? tx(
            "📋 2026 Resmi Meslek Listesi",
            "📋 2026 Official Occupation List",
            "📋 2026 官方职业清单"
          )
        : tx("📘 Avustralya PR Rehberi 2026", "📘 Australia PR Guide 2026", "📘 澳大利亚 PR 指南 2026");

  const descriptionText =
    product === "global"
      ? tx(
          "Skilled migration ve öğrenci vizesi (Subclass 500) yol haritasını, 2026 yaşam maliyeti verileriyle birlikte indirin.",
          "Download the global English guide covering skilled migration and the Student Visa (Subclass 500) bridge, with 2026 cost-of-living data.",
          "下载涵盖技术移民和学生签证（500 类别）路径的全球英文指南，附 2026 年生活成本数据。"
        )
      : product === "occupation"
        ? tx(
            "Avustralya'nin tam resmi kalifiye meslek listesini PDF olarak indirin.",
            "Download the full official Australian Skilled Occupation List as a PDF.",
            "下载完整的澳大利亚官方技术职业清单 PDF。"
          )
        : tx(
            "Ucretsiz Turkce PDF rehberini indirin. Gercek verilerle hazirlanmis kapsamli kalici oturma izni kilavuzu.",
            "Download the free Turkish PDF guide. A comprehensive permanent residency guide built on real data.",
            "下载免费的土耳其语 PDF 指南。基于真实数据整理的永久居留申请全流程指南。"
          );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{titleText}</DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400">
            {descriptionText}
          </DialogDescription>
        </DialogHeader>

        {/* Slot counter */}
        {!success && (
          <div
            className={`rounded-lg px-4 py-2 text-sm font-medium text-center ${
              isFree
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            {isFree ? (
              <>
                {product === "occupation"
                  ? tx(
                      "✅ Kapsamlı ve güncel Avustralya Kalifiye Meslek Listesi'ni beceri seviyeleri ve vize türleriyle birlikte edinin.",
                      "✅ Get the comprehensive, up-to-date Australian Skilled Occupation List with skill levels and visa types.",
                      "✅ 获取最全面、最新的澳大利亚技术职业清单，包含技能等级和签证类型。"
                    )
                  : tx(
                      "✅ Kapsamlı ve güncel 2026 rehberini hemen edinin.",
                      "✅ Get the comprehensive, up-to-date 2026 guide right away.",
                      "✅ 立即获取全面、最新的 2026 指南。"
                    )}
              </>
            ) : (
              <>
                {tx("💳 Ucretsiz kota doldu. Fiyat: ", "💳 Free quota is full. Price: ", "💳 免费名额已满。价格：")}
                <strong>$9.99</strong>
              </>
            )}
          </div>
        )}

        {success ? (
          // Delivery Trap success state: no file has been downloaded to the
          // browser -- the guide was emailed to the address the user gave us.
          <div className="space-y-4 text-center py-6">
            <div className="text-5xl">📬</div>
            <p className="font-semibold text-slate-900 dark:text-white">
              {tx(
                <>Başarılı! PR Rehberi <strong>{form.email}</strong> adresine gönderildi.</>,
                <>Success! The PR Guide has been sent to <strong>{form.email}</strong>.</>,
                <>成功！PR 指南已发送到 <strong>{form.email}</strong>。</>
              )}
            </p>
            <p className="text-sm text-slate-500">
              {tx(
                "Lütfen gelen kutunuzu ve spam/gereksiz klasörünü kontrol edin.",
                "Please check your inbox and spam folder.",
                "请检查您的收件箱和垃圾邮件文件夹。"
              )}
            </p>
            <Button onClick={handleClose} className="w-full">
              {tx("Kapat", "Close", "关闭")}
            </Button>
          </div>
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
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                {tx(
                  "Bu IP adresinden daha once bir indirme yapilmis gibi gorunuyor. Normal kullanicilar icin yalnizca 1 indirme hakki vardir.",
                  "It looks like this IP already downloaded a guide. Regular visitors get one download per IP.",
                  "该 IP 似乎已下载过指南。普通访客每个 IP 仅可下载一次。"
                )}
              </p>
            )}
            <div className="space-y-1">
              <Label htmlFor="full_name">{tx("Ad Soyad", "Full Name", "姓名")}</Label>
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
                <p className="text-xs text-red-600">{fieldErrors.full_name}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">{tx("E-posta", "Email", "邮箱")}</Label>
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
              {fieldErrors.email && <p className="text-xs text-red-600">{fieldErrors.email}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">
                {tx("Telefon Numarası", "Phone Number", "手机号")}
                <span className="text-red-500 ml-1">*</span>
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
                  required
                  placeholder={tx("555 000 0000", "412 345 678", "138 0013 8000")}
                  value={form.phone}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldErrors.phone)}
                  className={fieldErrors.phone ? "border-red-500 focus-visible:ring-red-500" : ""}
                  disabled={loading || !isFree}
                />
              </div>
              {fieldErrors.phone && <p className="text-xs text-red-600">{fieldErrors.phone}</p>}
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
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
                  : tx("📥 Listeyi E-postama Gönder", "📥 Send My PDF Guide", "📥 发送我的PDF指南")}
              </Button>
            ) : (
              <StripeCheckoutButton
                productType={product === "global" ? "pdf_book_global" : "pdf_book"}
                locale={locale}
                email={form.email || undefined}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0"
                label={tx(
                  "💳 Şimdi Satın Al — $9.99",
                  "💳 Buy Now — $9.99",
                  "💳 立即购买 — $9.99"
                )}
                onBeforeCheckout={handleBeforeCheckout}
              />
            )}

            <p className="text-xs text-slate-400 text-center">
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
