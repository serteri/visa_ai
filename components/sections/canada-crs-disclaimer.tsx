import { AlertTriangle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import expressEntryConfig from "@/src/data/countries/ca/express-entry.json";

const TEXT = {
  en: "This CRS score estimate is for informational purposes only and must be verified against IRCC's official Express Entry calculator before making any application decisions.",
  tr: "Bu CRS skor tahmini sadece bilgilendirme amaçlıdır, başvuru kararı vermeden önce IRCC'nin resmi Express Entry hesaplayıcısıyla doğrulanmalıdır.",
};

export function CanadaCrsDisclaimer({ locale }: { locale: "en" | "tr" }) {
  const pending = expressEntryConfig.knownPendingChanges;

  return (
    <Card className="border-l-4 border-l-amber-500">
      <CardContent className="flex gap-4 p-5">
        <AlertTriangle className="mt-1 size-5 text-amber-500" />
        <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <p>{TEXT[locale]}</p>
          {pending && (
            <p className="text-xs text-muted-foreground/80">
              {locale === "tr"
                ? `Bilinen yakın değişiklik: ${pending.note}`
                : `Known pending change: ${pending.note}`}{" "}
              <a href={pending.watchUrl} target="_blank" rel="noreferrer" className="underline">
                {locale === "tr" ? "Kaynağı görüntüle" : "View source"}
              </a>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
