import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/rbac";
import { QaModeControls } from "./qa-mode-controls";

export const metadata: Metadata = {
  title: "Admin · QA mode · LogiVisa Portal",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ locale: string }> };

export default async function QaModePage({ params }: PageProps) {
  const { locale } = await params;
  await requireRole("ADMIN", locale, `/${locale}/admin/qa-mode`);
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Analytics QA mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700">
          <p>
            While QA mode is on in this browser, Google Analytics and the Meta Pixel are not loaded on the public site, so testing is not counted. It only
            affects this browser, expires after 8 hours, and changes no checkout, payment, sign-in or report behaviour.
          </p>
          <QaModeControls />
          <p className="text-xs text-slate-500">
            To verify: with QA mode on, open a public page with the browser network tab and filter for <code>google-analytics</code>, <code>googletagmanager</code>
            and <code>facebook</code>; no request should appear. Turn it off and reload to confirm analytics resume (after consent).
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
