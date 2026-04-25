"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/contexts/language-context";

export function AgentReferralCta() {
  const { t } = useTranslation();
  const params = useParams();
  const locale = String(params.locale ?? "en");

  return (
    <Card className="bg-gradient-to-br from-[#0b4a6f] via-[#0e5d8a] to-[#0f6ea3] text-white">
      <CardHeader>
        <CardTitle className="text-xl">{t("referral.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm text-sky-50/95">
          {t("referral.text")}
        </p>
        <Button asChild variant="secondary" className="w-full sm:w-auto">
          <Link href={`/${locale}/agent-referral`}>{t("referral.cta")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
