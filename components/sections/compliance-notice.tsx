"use client";

import { ShieldCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/contexts/language-context";

export function ComplianceNotice() {
  const { t } = useTranslation();

  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="flex gap-4 p-5">
        <ShieldCheck className="mt-1 size-5 text-primary" />
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("compliance.text")}
        </p>
      </CardContent>
    </Card>
  );
}
