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
  open: boolean;
  onClose: () => void;
}

export function PdfDownloadModal({ open, onClose }: Props) {
  const [status, setStatus] = useState<PdfStatus | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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
            "Bu IP adresinden daha önce indirildi. Her IP'den yalnızca 1 indirme yapılabilir."
          );
        } else if (data.paymentRequired) {
          setError(
            "Ücretsiz indirme kotası dolmuştur. Satın almak için lütfen bizimle iletişime geçin: info@logivisa.com"
          );
        } else {
          setError(data.error ?? "Bir hata oluştu.");
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
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
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
            📘 Avustralya PR Rehberi 2026
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400">
            Ücretsiz Türkçe PDF rehberi indirin. Gerçek verilerle hazırlanmış
            kapsamlı kalıcı oturma izni kılavuzu.
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
                ✅ İlk 20 indirme <strong>ücretsiz</strong> —{" "}
                <strong>{freeRemaining}</strong> slot kaldı!
              </>
            ) : (
              <>
                💳 Ücretsiz kota doldu. Fiyat: <strong>$20</strong> —{" "}
                info@logivisa.com
              </>
            )}
          </div>
        )}

        {success ? (
          <div className="space-y-4 text-center py-6">
            <div className="text-5xl">🎉</div>
            <p className="font-semibold text-slate-900 dark:text-white">
              İndirilmesi başladı!
            </p>
            <p className="text-sm text-slate-500">
              PDF rehberiniz indirilmeye başlandı. İyi okumalar!
            </p>
            <Button onClick={onClose} className="w-full">
              Kapat
            </Button>
          </div>
        ) : alreadyDownloaded ? (
          <div className="space-y-3 py-4 text-center">
            <p className="text-amber-700 font-medium">
              Bu IP adresinden zaten indirildi.
            </p>
            <p className="text-sm text-slate-500">
              Her IP adresinden yalnızca bir kez indirilebilir.
            </p>
            <Button variant="outline" onClick={onClose} className="w-full">
              Kapat
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label htmlFor="full_name">Ad Soyad</Label>
              <Input
                id="full_name"
                name="full_name"
                placeholder="Ahmet Yılmaz"
                value={form.full_name}
                onChange={handleChange}
                required
                disabled={loading || !isFree}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="ahmet@ornek.com"
                value={form.email}
                onChange={handleChange}
                required
                disabled={loading || !isFree}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Telefon Numarası</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+90 555 000 0000"
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
                {loading ? "İndiriliyor..." : "📥 Ücretsiz İndir"}
              </Button>
            ) : (
              <Button
                type="button"
                className="w-full"
                variant="outline"
                onClick={onClose}
              >
                Kapat
              </Button>
            )}

            <p className="text-xs text-slate-400 text-center">
              Bilgileriniz yalnızca bu indirme için kullanılır ve üçüncü
              taraflarla paylaşılmaz.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
