"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StripeCheckoutButton } from "@/components/stripe-checkout-button";
import { TermsGate, TermsGateLink } from "@/components/terms-gate";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export type PdfProduct = "turkish" | "global";

const PDF_SLUGS: Record<PdfProduct, string> = {
  turkish: "avustralya-pr-rehberi-2026",
  global: "australia-guide-2026",
};

const PDF_FILENAMES: Record<PdfProduct, string> = {
  turkish: "Avustralya-PR-Rehberi-2026.pdf",
  global: "Australia-Migration-Blueprint-2026.pdf",
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);

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

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
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
        body: JSON.stringify({ ...form, slug }),
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
          setError(
            tx(
              "Ucretsiz indirme kotasi dolmustur. Satin almak icin lutfen bizimle iletisime gecin: info@logivisa.com",
              "The free download quota is full. To purchase, contact us: info@logivisa.com",
              "免费名额已满。如需购买，请联系我们：info@logivisa.com"
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

      // Trigger download
      const a = document.createElement("a");
      a.href = data.downloadUrl;
      a.download = PDF_FILENAMES[product];
      document.body.appendChild(a);
      a.click();
      a.remove();
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
  const freeRemaining = status?.freeRemaining ?? 18;
  const alreadyDownloaded = status?.alreadyDownloaded ?? false;

  const titleText =
    product === "global"
      ? tx(
          "🌏 The Ultimate Australia Migration Blueprint",
          "🌏 The Ultimate Australia Migration Blueprint",
          "🌏 终极澳大利亚移民蓝图"
        )
      : tx("📘 Avustralya PR Rehberi 2026", "📘 Australia PR Guide 2026", "📘 澳大利亚 PR 指南 2026");

  const descriptionText =
    product === "global"
      ? tx(
          "Skilled migration ve öğrenci vizesi (Subclass 500) yol haritasını, 2026 yaşam maliyeti verileriyle birlikte indirin.",
          "Download the global English guide covering skilled migration and the Student Visa (Subclass 500) bridge, with 2026 cost-of-living data.",
          "下载涵盖技术移民和学生签证（500 类别）路径的全球英文指南，附 2026 年生活成本数据。"
        )
      : tx(
          "Ucretsiz Turkce PDF rehberini indirin. Gercek verilerle hazirlanmis kapsamli kalici oturma izni kilavuzu.",
          "Download the free Turkish PDF guide. A comprehensive permanent residency guide built on real data.",
          "下载免费的土耳其语 PDF 指南。基于真实数据整理的永久居留申请全流程指南。"
        );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
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
                {tx(
                  "✅ Ilk 18 indirme ",
                  "✅ The first 18 downloads are ",
                  "✅ 前 18 次下载"
                )}
                <strong>{tx("ucretsiz", "free", "免费")}</strong>
                {tx(" — ", " - ", "，还剩 ")}
                <strong>{freeRemaining}</strong>
                {tx(" slot kaldi!", " spots left!", " 个名额！")}
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
          <div className="space-y-4 text-center py-6">
            <div className="text-5xl">🎉</div>
            <p className="font-semibold text-slate-900 dark:text-white">
              {tx("Indirme basladi!", "Download started!", "下载已开始！")}
            </p>
            <p className="text-sm text-slate-500">
              {tx(
                "PDF rehberiniz indirilmeye basladi. Iyi okumalar!",
                "Your PDF guide is downloading. Enjoy reading!",
                "您的 PDF 指南正在下载，祝您阅读愉快！"
              )}
            </p>
            <Button onClick={onClose} className="w-full">
              {tx("Kapat", "Close", "关闭")}
            </Button>
          </div>
        ) : alreadyDownloaded ? (
          <div className="space-y-3 py-4 text-center">
            <p className="text-amber-700 font-medium">
              {tx(
                "Bu IP adresinden zaten indirildi.",
                "Already downloaded from this IP address.",
                "该 IP 地址已下载过。"
              )}
            </p>
            <p className="text-sm text-slate-500">
              {tx(
                "Her IP adresinden yalnizca bir kez indirilebilir.",
                "Only one download is allowed per IP address.",
                "每个 IP 地址仅允许下载一次。"
              )}
            </p>
            <Button variant="outline" onClick={onClose} className="w-full">
              {tx("Kapat", "Close", "关闭")}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label htmlFor="full_name">{tx("Ad Soyad", "Full Name", "姓名")}</Label>
              <Input
                id="full_name"
                name="full_name"
                placeholder={tx("Ahmet Yilmaz", "John Smith", "张伟")}
                value={form.full_name}
                onChange={handleChange}
                required
                disabled={loading || !isFree}
              />
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
                required
                disabled={loading || !isFree}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">{tx("Telefon Numarasi", "Phone Number", "手机号")}</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder={tx("+90 555 000 0000", "+61 412 345 678", "+86 138 0013 8000")}
                value={form.phone}
                onChange={handleChange}
                required
                disabled={loading || !isFree}
              />
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
                if (checked) setTermsError(false);
              }}
              label={tx(
                <>
                  <TermsGateLink>Kullanım Koşullarını</TermsGateLink> ve veri işleme
                  politikalarını okudum, onaylıyorum. (Dijital ürünlerde iade yapılmaz.)
                </>,
                <>
                  I agree to the <TermsGateLink>Terms of Service</TermsGateLink> and data
                  processing policies. (No refunds on digital products.)
                </>,
                <>
                  我已阅读并同意<TermsGateLink>服务条款</TermsGateLink>
                  和数据处理政策。（数字产品不支持退款。）
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
                  ? tx("Indiriliyor...", "Downloading...", "下载中...")
                  : tx("📥 Ucretsiz Indir", "📥 Free Download", "📥 免费下载")}
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
