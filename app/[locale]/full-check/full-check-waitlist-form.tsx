"use client";

import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type FullCheckWaitlistState,
  submitFullCheckWaitlist,
} from "@/app/[locale]/full-check/actions";

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600">{message}</p>;
}

function ReportSection({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-primary">-</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function LockedSection({ title, isTr }: { title: string; isTr: boolean }) {
  return (
    <Card className="relative overflow-hidden border-dashed">
      <CardHeader className="opacity-45 blur-[1px]">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="opacity-45 blur-[1px]">
        <p className="text-sm text-muted-foreground">
          {isTr
            ? "Daha ayrıntılı bir bölüm geliştirilmektedir."
            : "A deeper section is being developed."}
        </p>
      </CardContent>
      <div className="absolute inset-0 flex items-center justify-center bg-background/65 p-4 backdrop-blur-[1px]">
        <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-2 text-sm font-medium shadow-sm">
          <LockKeyhole className="size-4 text-primary" />
          <span>{isTr ? "Kilitli" : "Locked"}</span>
        </div>
      </div>
    </Card>
  );
}

export function FullCheckWaitlistForm({
  locale,
  initialValues = {},
}: {
  locale: string;
  initialValues?: {
    visaInterest?: string;
    currentCountry?: string;
    mainGoal?: string;
    source?: string;
  };
}) {
  const isTr = locale === "tr";
  const initialState: FullCheckWaitlistState = {
    status: "idle",
  };

  const [state, formAction, isPending] = useActionState(
    submitFullCheckWaitlist,
    initialState
  );

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="preferredLanguage" value={locale} />
        <input type="hidden" name="source" value={initialValues.source ?? "full_check"} />

        <div className="space-y-2">
          <Label htmlFor="waitlist-full-name">{isTr ? "Ad soyad" : "Full name"}</Label>
          <Input
            id="waitlist-full-name"
            name="fullName"
            autoComplete="name"
            placeholder={isTr ? "Adınız" : "Your name"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-email">{isTr ? "E-posta adresi" : "Email address"}</Label>
          <Input
            id="waitlist-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
          />
          <ErrorText message={state.errors?.email} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-visa-interest">{isTr ? "Vize ilgi alanı" : "Visa interest"}</Label>
          <Input
            id="waitlist-visa-interest"
            name="visaInterest"
            defaultValue={initialValues.visaInterest ?? ""}
            placeholder={isTr ? "Öğrenci, yetenekli, partner veya emin değilim" : "Student, skilled, partner, or not sure"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-current-country">{isTr ? "Bulunduğunuz ülke" : "Current country"}</Label>
          <Input
            id="waitlist-current-country"
            name="currentCountry"
            defaultValue={initialValues.currentCountry ?? ""}
            autoComplete="country-name"
            placeholder={isTr ? "Avustralya, Türkiye, Hindistan veya başka bir ülke" : "Australia, Turkiye, India, or elsewhere"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-main-goal">{isTr ? "Ana hedef" : "Main goal"}</Label>
          <Textarea
            id="waitlist-main-goal"
            name="mainGoal"
            defaultValue={initialValues.mainGoal ?? ""}
            placeholder={isTr ? "Raporun hangi konuda yardımcı olmasını istediğinizi belirtin" : "Tell us what you want the report to help with"}
            rows={3}
          />
        </div>

        {state.status === "success" && state.message && (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {state.message}
          </p>
        )}

        {state.status === "error" && state.message && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.message}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending
            ? isTr ? "Oluşturuluyor..." : "Generating..."
            : isTr ? "Ücretsiz temel raporu al" : "Get free basic report"}
        </Button>
      </form>

      {state.status === "success" && state.report && (
        <section className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-xl font-bold">
              {isTr ? "Temel hazırlık raporunuz" : "Your basic readiness report"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isTr
                ? "Bu sınırlı rapor yalnızca genel bilgi içerir ve gönderdiğiniz bilgileri kullanır."
                : "This limited report provides general information only and uses the details you submitted."}
            </p>
          </div>

          <ReportSection
            title={isTr ? "Olası vize yolları" : "Possible pathways"}
            items={state.report.possiblePathways}
          />
          <ReportSection
            title={isTr ? "Temel risk göstergeleri" : "Basic risk indicators"}
            items={state.report.riskIndicators}
          />
          <ReportSection
            title={isTr ? "Temel belge kontrol listesi" : "Basic document checklist"}
            items={state.report.documentChecklist}
          />
          <ReportSection
            title={isTr ? "Önerilen sonraki adımlar" : "Suggested next steps"}
            items={state.report.nextSteps}
          />

          <div className="grid gap-3">
            <LockedSection
              title={isTr ? "Detaylı risk analizi" : "Detailed risk breakdown"}
              isTr={isTr}
            />
            <LockedSection
              title={isTr ? "Kişisel hazırlık planı" : "Personal preparation plan"}
              isTr={isTr}
            />
            <LockedSection
              title={isTr ? "İndirilebilir rapor" : "Downloadable report"}
              isTr={isTr}
            />
          </div>
        </section>
      )}
    </div>
  );
}
