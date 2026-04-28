"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  runAssistantMessage,
  runReadinessPreview,
  type ReadinessPreviewResult,
} from "@/app/[locale]/assistant/actions";
import type { GroundedAssistantResult } from "@/lib/ai/generate-grounded-answer";

type AssistantMessage =
  | {
      role: "user";
      text: string;
    }
  | {
      role: "assistant";
      text: string;
      result?: GroundedAssistantResult;
    };

const QUICK_PROMPTS_EN = [
  "I want to study in Australia",
  "I have an employer sponsor",
  "I want PR in Australia",
  "I am a civil engineer and want to migrate",
] as const;

const QUICK_PROMPTS_TR = [
  "Avustralya'da eğitim almak istiyorum",
  "İşveren sponsorum var",
  "Avustralya'da kalıcı oturum yollarını öğrenmek istiyorum",
  "İnşaat mühendisiyim ve göç yollarını araştırmak istiyorum",
] as const;


type ReadinessPreviewForm = {
  mainGoal: string;
  currentCountry: string;
  passportCountry: string;
  age: string;
  occupation: string;
  englishLevel: string;
  sponsorFamily: string;
  preferredPathway: string;
  biggestConcern: string;
};

const EMPTY_PREVIEW_FORM: ReadinessPreviewForm = {
  mainGoal: "",
  currentCountry: "",
  passportCountry: "",
  age: "",
  occupation: "",
  englishLevel: "",
  sponsorFamily: "",
  preferredPathway: "",
  biggestConcern: "",
};

function getVisaInterestForReferral(sources: GroundedAssistantResult["sources"]): string {
  const subclasses = new Set(sources.map((source) => source.subclass));

  if (subclasses.has("820_801")) {
    return "820_801";
  }

  if (subclasses.has("491")) {
    const skilled = ["189", "190", "491"].filter((item) => subclasses.has(item));
    return skilled.length > 0 ? skilled.join(",") : "491";
  }

  if (subclasses.has("189") || subclasses.has("190")) {
    return "189,190";
  }

  if (subclasses.has("500") && subclasses.size === 1) {
    return "500";
  }

  if (subclasses.has("482") && subclasses.size === 1) {
    return "482";
  }

  return "not sure";
}

function buildAssistantReferralHref(input: {
  locale: "en" | "tr";
  actionHref: string;
  latestUserQuestion: string;
  sources: GroundedAssistantResult["sources"];
}): string {
  if (!input.actionHref.endsWith("/agent-referral")) {
    return input.actionHref;
  }

  const visaInterest = getVisaInterestForReferral(input.sources);
  const params = new URLSearchParams({
    source: "assistant",
    visaInterest,
    message: input.latestUserQuestion,
  });

  return `/${input.locale}/agent-referral?${params.toString()}`;
}

function buildFullCheckHref(locale: "en" | "tr", form: ReadinessPreviewForm): string {
  const params = new URLSearchParams({
    source: "readiness-preview",
  });

  if (form.mainGoal.trim()) params.set("goal", form.mainGoal.trim());
  if (form.occupation.trim()) params.set("occupation", form.occupation.trim());
  if (form.preferredPathway.trim()) params.set("preferredPathway", form.preferredPathway.trim());
  if (form.biggestConcern.trim()) params.set("biggestConcern", form.biggestConcern.trim());
  if (form.currentCountry.trim()) params.set("currentCountry", form.currentCountry.trim());

  return `/${locale}/full-check?${params.toString()}`;
}

export function AssistantClient({
  locale,
  initialMode = "simple",
}: {
  locale: "en" | "tr";
  initialMode?: "simple" | "premium";
}) {
  const isTr = locale === "tr";
  const mode = initialMode;
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [previewForm, setPreviewForm] = useState<ReadinessPreviewForm>(EMPTY_PREVIEW_FORM);
  const [previewResult, setPreviewResult] = useState<ReadinessPreviewResult | null>(null);
  const [previewSending, setPreviewSending] = useState(false);
  const fullCheckHref = buildFullCheckHref(locale, previewForm);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: "assistant",
      text: isTr
        ? "Genel bilgiye dayalı vize yollarını keşfetmenize yardımcı olabilirim."
        : "I can help you explore visa pathways based on general information.",
    },
  ]);

  async function submitMessage(rawMessage: string) {
    const message = rawMessage.trim();
    if (!message || sending) return;

    setSending(true);
    setMessages((prev) => [...prev, { role: "user", text: message }]);
    setInput("");

    try {
      const result = await runAssistantMessage({ locale, message });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: result.answer,
          result,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: isTr
            ? "Şu anda yanıt oluşturulamadı. Genel bilgiye dayalı yolları keşfetmenize yardımcı olabilirim ve kayıtlı bir göç danışmanı ile görüşmeyi değerlendirebilirsiniz."
            : "A response could not be generated right now. I can still help you explore pathways based on general information, and you may consider speaking with a registered migration agent.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitMessage(input);
  }

  function updatePreviewField(field: keyof ReadinessPreviewForm, value: string) {
    setPreviewForm((prev) => ({ ...prev, [field]: value }));
  }

  async function onPreviewSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (previewSending) return;

    setPreviewSending(true);
    try {
      const result = await runReadinessPreview({
        locale,
        ...previewForm,
      });
      setPreviewResult(result);
    } finally {
      setPreviewSending(false);
    }
  }

  function PreviewList({ title, items }: { title: string; items: string[] }) {
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

  const quickPrompts = isTr ? QUICK_PROMPTS_TR : QUICK_PROMPTS_EN;

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
        <div className="space-y-3">
          <Badge variant="secondary">{isTr ? "Kontrollü Asistan" : "Controlled Assistant"}</Badge>
          <h1 className="text-3xl font-bold sm:text-4xl">
            {isTr ? "AI Vize Asistanı" : "AI Visa Assistant"}
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
            {isTr
              ? "Bu asistan yalnızca genel bilgi sunar; göç veya hukuki tavsiye vermez."
              : "This assistant provides general information and does not provide migration or legal advice."}
          </p>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border bg-card p-2 sm:flex-row">
          <Button
            asChild
            variant={mode === "simple" ? "default" : "ghost"}
            className="justify-center"
          >
            <Link href={`/${locale}/assistant`}>
              {isTr ? "Logivisa'ya Sor" : "Ask Logivisa"}
            </Link>
          </Button>
          <Button
            asChild
            variant={mode === "premium" ? "default" : "ghost"}
            className="justify-center"
          >
            <Link href={`/${locale}/assistant?mode=premium`}>
              {isTr ? "AI Hazırlık İncelemesi" : "AI Readiness Review (Preview)"}
            </Link>
          </Button>
        </div>

        {mode === "simple" ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{isTr ? "Hızlı istemler" : "Quick prompts"}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <Button
                    key={prompt}
                    type="button"
                    variant="outline"
                    disabled={sending}
                    onClick={() => void submitMessage(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{isTr ? "Mesajlar" : "Messages"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-[460px] space-y-3 overflow-auto pr-1">
                  {messages.map((message, idx) => (
                    <div
                      key={`${message.role}-${idx}`}
                      className={`rounded-lg border p-3 text-sm ${
                        message.role === "assistant"
                          ? "border-primary/20 bg-primary/5"
                          : "border-border bg-card"
                      }`}
                    >
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {message.role === "assistant"
                          ? isTr
                            ? "Asistan"
                            : "Assistant"
                          : isTr
                            ? "Kullanıcı"
                            : "User"}
                      </p>
                      <p>{message.text}</p>

                      {message.role === "assistant" && message.result && (
                        <div className="mt-3 space-y-3">
                          <div className="rounded-md border border-border/70 bg-background/70 p-3 text-sm">
                            <p className="mb-2 font-semibold">
                              {isTr ? "Kullanılan kaynaklar" : "Sources used"}
                            </p>

                            {message.result.sources.map((source) => (
                              <div key={`${source.subclass}-${source.detailUrl}`} className="mb-3 rounded border border-border/60 p-2">
                                <p className="text-xs font-semibold text-muted-foreground">
                                  Subclass {source.subclass} - {source.visaName}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <Button asChild size="sm" variant="outline">
                                    <Link href={source.detailUrl}>{isTr ? "Vize detayı" : "Visa details"}</Link>
                                  </Button>
                                  {source.sourceUrl && (
                                    <Button asChild size="sm" variant="outline">
                                      <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer">
                                        {isTr ? "Resmi kaynak" : "Official source"}
                                      </a>
                                    </Button>
                                  )}
                                  {source.pdfUrls.map((pdfUrl, index) => (
                                    <Button key={`${pdfUrl}-${index}`} asChild size="sm" variant="outline">
                                      <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                                        PDF {index + 1}
                                      </a>
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {message.result.nextActions.map((action) => {
                              const latestUserQuestion =
                                messages
                                  .slice(0, idx)
                                  .reverse()
                                  .find((item): item is Extract<AssistantMessage, { role: "user" }> => item.role === "user")
                                  ?.text ?? "";

                              const href = buildAssistantReferralHref({
                                locale,
                                actionHref: action.href,
                                latestUserQuestion,
                                sources: message.result?.sources ?? [],
                              });

                              return (
                                <Button key={action.href + action.label} asChild size="sm" variant="secondary">
                                  <Link href={href}>{action.label}</Link>
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onInput={(event) => setInput(event.currentTarget.value)}
                    placeholder={
                      isTr
                        ? "Örnek: Sponsorlu çalışma vizesi hakkında bilgi almak istiyorum"
                        : "Example: I want a sponsored work pathway"
                    }
                  />
                  <Button type="submit" disabled={sending || !input.trim()}>
                    {sending ? (isTr ? "Gönderiliyor..." : "Sending...") : isTr ? "Gönder" : "Send"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="space-y-6">
            <Card className="border-primary/40 bg-primary/5">
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="secondary">{isTr ? "Ön İnceleme" : "Preview"}</Badge>
                  <CardTitle>{isTr ? "AI Hazırlık İncelemesi" : "AI Readiness Review"}</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">
                  {isTr
                    ? "Sınırlı girdilere dayalı olası yollar için hızlı bir ön izleme."
                    : "Quick preview of possible pathways based on limited input."}
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={onPreviewSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="preview-main-goal">{isTr ? "Ana hedef" : "Main goal"}</Label>
                      <Textarea
                        id="preview-main-goal"
                        value={previewForm.mainGoal}
                        onChange={(event) => updatePreviewField("mainGoal", event.target.value)}
                        placeholder={
                          isTr
                            ? "Örnek: Partner ve yetenekli yolları karşılaştır"
                            : "Example: compare partner and skilled possible pathways"
                        }
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preview-current-country">{isTr ? "Bulunduğunuz ülke" : "Current country"}</Label>
                      <Input
                        id="preview-current-country"
                        value={previewForm.currentCountry}
                        onChange={(event) => updatePreviewField("currentCountry", event.target.value)}
                        placeholder="Australia, Turkiye, India..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preview-passport-country">{isTr ? "Pasaport ülkesi" : "Passport country"}</Label>
                      <Input
                        id="preview-passport-country"
                        value={previewForm.passportCountry}
                        onChange={(event) => updatePreviewField("passportCountry", event.target.value)}
                        placeholder={isTr ? "Pasaport ülkesi" : "Passport country"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preview-age">{isTr ? "Yaş" : "Age"}</Label>
                      <Input
                        id="preview-age"
                        value={previewForm.age}
                        onChange={(event) => updatePreviewField("age", event.target.value)}
                        placeholder={isTr ? "Yaş" : "Age"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preview-occupation">{isTr ? "Meslek veya eğitim geçmişi" : "Occupation"}</Label>
                      <Input
                        id="preview-occupation"
                        value={previewForm.occupation}
                        onChange={(event) => updatePreviewField("occupation", event.target.value)}
                        placeholder={isTr ? "Meslek veya eğitim geçmişiniz" : "Occupation or study background"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preview-english">{isTr ? "İngilizce seviyesi" : "English level"}</Label>
                      <Input
                        id="preview-english"
                        value={previewForm.englishLevel}
                        onChange={(event) => updatePreviewField("englishLevel", event.target.value)}
                        placeholder={isTr ? "Emin değilim, yetkin, IELTS/PTE skoru..." : "Not sure, competent, IELTS/PTE score..."}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preview-sponsor-family">{isTr ? "Avustralya'da sponsor, partner veya aile" : "Sponsor / partner / family in Australia"}</Label>
                      <Input
                        id="preview-sponsor-family"
                        value={previewForm.sponsorFamily}
                        onChange={(event) => updatePreviewField("sponsorFamily", event.target.value)}
                        placeholder={isTr ? "İşveren sponsoru, partner, aile, yok..." : "Employer sponsor, partner, family, none..."}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preview-pathway">{isTr ? "Biliniyorsa tercih edilen vize yolu" : "Preferred pathway if known"}</Label>
                      <Input
                        id="preview-pathway"
                        value={previewForm.preferredPathway}
                        onChange={(event) => updatePreviewField("preferredPathway", event.target.value)}
                        placeholder="500, 482, 189, 190, 491, 820/801, not sure"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="preview-concern">{isTr ? "En büyük endişe" : "Biggest concern"}</Label>
                      <Textarea
                        id="preview-concern"
                        value={previewForm.biggestConcern}
                        onChange={(event) => updatePreviewField("biggestConcern", event.target.value)}
                        placeholder={
                          isTr
                            ? "Örnek: belgeler, zamanlama, İngilizce skoru, sponsor, ilişki kanıtı"
                            : "Example: documents, timing, English score, sponsor, relationship evidence"
                        }
                        rows={3}
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={previewSending}>
                    {previewSending
                      ? isTr ? "Oluşturuluyor..." : "Generating..."
                      : isTr ? "Ön inceleme oluştur" : "Generate preview review"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {previewResult && (
              <section className="space-y-4">
                <div className="space-y-2">
                  <Badge variant="outline">{isTr ? "Sınırlı ön inceleme" : "Limited preview"}</Badge>
                  <h2 className="text-2xl font-bold">{isTr ? "Ön inceleme sonuçları" : "Preview review"}</h2>
                  <p className="text-sm text-muted-foreground">
                    {isTr
                      ? "Sınırlı girdilere dayalı olası yollar için hızlı bir ön izleme."
                      : "Quick preview of possible pathways based on limited input."}
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <PreviewList
                    title={isTr ? "Olası vize yolları" : "Possible pathway areas"}
                    items={previewResult.possiblePathwayAreas}
                  />
                  <PreviewList
                    title={isTr ? "Eksik bilgiler" : "Missing information"}
                    items={previewResult.missingInformation}
                  />
                  <PreviewList
                    title={isTr ? "Temel risk sinyalleri" : "Basic risk signals"}
                    items={previewResult.basicRiskSignals}
                  />
                </div>

                <Card className="border-primary/40 bg-primary/5">
                  <CardHeader>
                    <CardTitle>
                      {isTr
                        ? "Tam vize hazırlık raporuna geçmek ister misiniz?"
                        : "Move to the full readiness report?"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="max-w-2xl text-sm text-muted-foreground">
                      {isTr
                        ? "Yapılandırılmış analiz için tam hazırlık raporu oluşturun."
                        : "Generate a full readiness report for a structured analysis."}
                    </p>
                    <Button asChild className="shrink-0">
                      <Link href={fullCheckHref}>
                        {isTr ? "Tam rapora devam et" : "Continue to full report"}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </section>
            )}

            <p className="text-sm text-muted-foreground">
              {isTr
                ? "Bu yalnızca genel bilgidir ve göç tavsiyesi değildir."
                : "This is general information only and not migration advice."}
            </p>
          </div>
        )}

        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-5 text-sm text-muted-foreground">
            {isTr
              ? "Bu asistan yalnızca genel bilgi sunar. Göç tavsiyesi, hukuki tavsiye veya vize sonucu tahmini sağlamaz."
              : "This assistant provides general information only. It does not provide migration advice, legal advice, or predict visa outcomes."}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
