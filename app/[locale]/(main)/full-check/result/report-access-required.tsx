"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { requestReportLink, type ReportLinkRequestState } from "./actions";

/**
 * Shown when a result link has no valid access token and the visitor has no admin / owner session: no report data
 * and no email address are sent to the browser. The owner can have the secure link emailed to the address on file.
 */
export function ReportAccessRequired({ locale, reportId }: { locale: string; reportId: string }) {
  const [state, formAction, pending] = useActionState<ReportLinkRequestState, FormData>(requestReportLink, { status: "idle" });
  const t = (en: string, tr: string, zh: string) => (locale === "tr" ? tr : locale === "zh-Hans" ? zh : en);

  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="size-5" />
            {t("Open your report from your email", "Raporunuzu e-postanızdaki bağlantıdan açın", "请通过邮件中的链接打开报告")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <p>
            {t(
              "For your privacy, reports open only from the secure link we emailed you, or from the checkout confirmation page.",
              "Gizliliğiniz için raporlar yalnızca size e-postayla gönderdiğimiz güvenli bağlantıdan veya ödeme onay sayfasından açılır.",
              "为保护您的隐私，报告只能通过我们发送给您的安全链接或付款确认页面打开。"
            )}
          </p>
          {state.status === "done" ? (
            <p className="font-medium text-emerald-700">
              {t(
                "If this report is unlocked, we have sent a secure link to the email address it was created with.",
                "Bu rapor açıldıysa, oluşturulduğu e-posta adresine güvenli bir bağlantı gönderdik.",
                "如果此报告已解锁，我们已将安全链接发送到创建报告时使用的邮箱。"
              )}
            </p>
          ) : (
            <form action={formAction}>
              <input type="hidden" name="reportId" value={reportId} />
              <Button type="submit" disabled={pending} className="w-full">
                {pending
                  ? t("Sending...", "Gönderiliyor...", "发送中...")
                  : t("Email me a secure link", "Bana güvenli bir bağlantı gönder", "给我发送安全链接")}
              </Button>
            </form>
          )}
          <Link href={`/${locale}/full-check`} className="inline-block text-xs text-slate-500 hover:underline">
            {t("Start a new check", "Yeni bir kontrol başlat", "开始新的评估")}
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
