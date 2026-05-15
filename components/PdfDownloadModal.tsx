"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
}

export function PdfDownloadModal({ locale, open, onClose }: Props) {
  const [status, setStatus] = useState<PdfStatus | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const tx = (tr: string, en: string, zh: string) => {
    if (locale === "tr") return tr;
    if (locale === "zh-Hans") return zh;
    return en;
  };

  useEffect(() => {
    if (open) {
      fetch("/api/pdf-download")
        .then((r) => r.json())
        .then(setStatus)
        .catch(() => setStatus(null));
    }
  }, [open]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/pdf-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
      a.download = "Avustralya-PR-Rehberi-2026.pdf";
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
  const freeRemaining = status?.freeRemaining ?? 20;
  const alreadyDownloaded = status?.alreadyDownloaded ?? false;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {tx("📘 Avustralya PR Rehberi 2026", "📘 Australia PR Guide 2026", "📘 澳大利亚 PR 指南 2026")}
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400">
            {tx(
              "Ucretsiz Turkce PDF rehberini indirin. Gercek verilerle hazirlanmis kapsamli kalici oturma izni kilavuzu.",
              "Download the free Turkish PDF guide. A comprehensive permanent residency guide built on real data.",
              "下载免费的土耳其语 PDF 指南。基于真实数据整理的永久居留申请全流程指南。"
            )}
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
                  "✅ Ilk 20 indirme ",
                  "✅ First 20 downloads are ",
                  "✅ 前 20 次下载"
                )}
                <strong>{tx("ucretsiz", "free", "免费")}</strong>
                {tx(" — ", " - ", "，还剩 ")}
                <strong>{freeRemaining}</strong>
                {tx(" slot kaldi!", " spots left!", " 个名额！")}
              </>
            ) : (
              <>
                {tx("💳 Ucretsiz kota doldu. Fiyat: ", "💳 Free quota is full. Price: ", "💳 免费名额已满。价格：")}
                <strong>$20</strong>
                {tx(" — ", " - ", " - ")}
                info@logivisa.com
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
              <Button
                type="button"
                className="w-full"
                variant="outline"
                onClick={onClose}
              >
                {tx("Kapat", "Close", "关闭")}
              </Button>
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
