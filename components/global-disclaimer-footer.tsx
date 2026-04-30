"use client";

import { useTranslation } from "@/contexts/language-context";

export function GlobalDisclaimerFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border/70 bg-background/95 px-4 py-4 text-center text-xs text-muted-foreground">
      {t("footer.generalInfo")}
    </footer>
  );
}
