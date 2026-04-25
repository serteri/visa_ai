"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ReferralFormState,
  submitAgentReferral,
} from "@/app/[locale]/agent-referral/actions";

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600">{message}</p>;
}

export default function AgentReferralPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = String(params.locale ?? "en");
  const isTr = locale === "tr";

  const prefillSource = searchParams.get("source") ?? "";
  const prefillVisaInterest = searchParams.get("visaInterest") ?? "";
  const prefillMessage = searchParams.get("message") ?? "";
  const startedFromAssistant = prefillSource === "assistant";

  const initialReferralFormState: ReferralFormState = {
    status: "idle",
  };

  const [state, formAction, isPending] = useActionState(
    submitAgentReferral,
    initialReferralFormState
  );

  const text = {
    badge: isTr ? "Yonlendirme Talebi" : "Referral Request",
    title: isTr
      ? "Kayitli goc danismani yonlendirme talebi"
      : "Request connection to a registered migration agent",
    subtitle: isTr
      ? "Bu form genel bilgi platformu kapsaminda bir yonlendirme talebi gondermek icindir."
      : "Use this form to submit a referral request within this general information platform.",
    submit: isTr ? "Talebi gonder" : "Submit request",
    success:
      "Thank you. Your request has been received. If appropriate, you may be connected with a registered migration professional.",
    consent:
      "I understand this platform provides general information only and may connect me with a registered migration agent or Australian legal practitioner.",
  };

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
        <div className="space-y-3">
          <Badge variant="secondary">{text.badge}</Badge>
          <h1 className="text-3xl font-bold sm:text-4xl">{text.title}</h1>
          <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">{text.subtitle}</p>
          {startedFromAssistant && (
            <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
              This request was started from the AI Visa Assistant.
            </p>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isTr ? "Basvuru formu" : "Referral form"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="fullName" className="text-sm font-medium">
                    {isTr ? "Ad soyad" : "Full name"}
                  </label>
                  <input id="fullName" name="fullName" className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm" />
                  <ErrorText message={state.errors?.fullName} />
                </div>

                <div className="space-y-1">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <input id="email" name="email" type="email" className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm" />
                  <ErrorText message={state.errors?.email} />
                </div>

                <div className="space-y-1">
                  <label htmlFor="phone" className="text-sm font-medium">
                    {isTr ? "Telefon (opsiyonel)" : "Phone (optional)"}
                  </label>
                  <input id="phone" name="phone" className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm" />
                </div>

                <div className="space-y-1">
                  <label htmlFor="countryOfPassport" className="text-sm font-medium">
                    {isTr ? "Pasaport ulkesi" : "Country of passport"}
                  </label>
                  <input id="countryOfPassport" name="countryOfPassport" className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm" />
                  <ErrorText message={state.errors?.countryOfPassport} />
                </div>

                <div className="space-y-1">
                  <label htmlFor="currentCountry" className="text-sm font-medium">
                    {isTr ? "Mevcut ulke" : "Current country"}
                  </label>
                  <input id="currentCountry" name="currentCountry" className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm" />
                  <ErrorText message={state.errors?.currentCountry} />
                </div>

                <div className="space-y-1">
                  <label htmlFor="preferredLanguage" className="text-sm font-medium">
                    {isTr ? "Tercih edilen dil" : "Preferred language"}
                  </label>
                  <select id="preferredLanguage" name="preferredLanguage" className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm">
                    <option value="">{isTr ? "Seciniz" : "Select"}</option>
                    <option value="English">English</option>
                    <option value="Turkce">Turkce</option>
                  </select>
                  <ErrorText message={state.errors?.preferredLanguage} />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="visaInterest" className="text-sm font-medium">
                    {isTr ? "Ilgilendiginiz vize" : "Visa interest"}
                  </label>
                  <select
                    id="visaInterest"
                    name="visaInterest"
                    defaultValue={prefillVisaInterest}
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                  >
                    <option value="">{isTr ? "Seciniz" : "Select"}</option>
                    <option value="500">500</option>
                    <option value="482">482</option>
                    <option value="189">189</option>
                    <option value="190">190</option>
                    <option value="189,190">189/190</option>
                    <option value="not sure">not sure</option>
                  </select>
                  <ErrorText message={state.errors?.visaInterest} />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="shortMessage" className="text-sm font-medium">
                    {isTr ? "Kisa mesaj" : "Short message"}
                  </label>
                  <textarea
                    id="shortMessage"
                    name="shortMessage"
                    rows={4}
                    defaultValue={prefillMessage}
                    className="w-full rounded-md border border-border bg-card p-3 text-sm"
                  />
                  <ErrorText message={state.errors?.shortMessage} />
                </div>
              </div>

              <div className="space-y-1 rounded-md border border-border/70 p-3">
                <label className="flex items-start gap-3 text-sm text-muted-foreground">
                  <input type="checkbox" name="consent" className="mt-1 h-4 w-4" />
                  <span>{text.consent}</span>
                </label>
                <ErrorText message={state.errors?.consent} />
              </div>

              {state.status === "success" && (
                <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {text.success}
                </p>
              )}

              {state.status === "error" && state.message && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {state.message}
                </p>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" disabled={isPending}>
                  {isPending ? (isTr ? "Gonderiliyor..." : "Submitting...") : text.submit}
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/${locale}`}>{isTr ? "Ana sayfa" : "Back to home"}</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
