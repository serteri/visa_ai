"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { runAssistantMessage } from "@/app/[locale]/assistant/actions";
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

const QUICK_PROMPTS = [
  "I want to study in Australia",
  "I have an employer sponsor",
  "I want PR in Australia",
  "I am a civil engineer and want to migrate",
] as const;

function getVisaInterestForReferral(sources: GroundedAssistantResult["sources"]): string {
  const subclasses = new Set(sources.map((source) => source.subclass));

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
  actionLabel: string;
  latestUserQuestion: string;
  sources: GroundedAssistantResult["sources"];
}): string {
  if (!input.actionHref.endsWith("/agent-referral")) {
    return input.actionHref;
  }

  if (!/speak with registered migration agent/i.test(input.actionLabel)) {
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

export function AssistantClient({ locale }: { locale: "en" | "tr" }) {
  const isTr = locale === "tr";
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: "assistant",
      text: isTr
        ? "Genel bilgiye dayali vize yollarini kesfetmeye yardimci olabilirim."
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
            ? "Su anda yanit olusturulamadi. Genel bilgiye dayali yollari kesfetmenize yardimci olabilirim ve kayitli bir goc danismani ile gorusmeyi degerlendirebilirsiniz."
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

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
        <div className="space-y-3">
          <Badge variant="secondary">{isTr ? "Kontrollu Asistan" : "Controlled Assistant"}</Badge>
          <h1 className="text-3xl font-bold sm:text-4xl">AI Visa Assistant</h1>
          <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
            {isTr
              ? "Bu asistan genel bilgi sunar, goc veya hukuki tavsiye vermez."
              : "This assistant provides general information and does not provide migration or legal advice."}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isTr ? "Hizli istemler" : "Quick prompts"}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt) => (
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
                        ? "Kullanici"
                        : "User"}
                  </p>
                  <p>{message.text}</p>

                  {message.role === "assistant" && message.result && (
                    <div className="mt-3 space-y-3">
                      <div className="rounded-md border border-border/70 bg-background/70 p-3 text-sm">
                        <p className="mb-2 font-semibold">
                          {isTr ? "Kullanilan kaynaklar" : "Sources used"}
                        </p>

                        {message.result.sources.map((source) => (
                          <div key={`${source.subclass}-${source.detailUrl}`} className="mb-3 rounded border border-border/60 p-2">
                            <p className="text-xs font-semibold text-muted-foreground">
                              Subclass {source.subclass} - {source.visaName}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button asChild size="sm" variant="outline">
                                <Link href={source.detailUrl}>{isTr ? "Vize detayi" : "Visa details"}</Link>
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
                            actionLabel: action.label,
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
                placeholder={
                  isTr
                    ? "Ornek: Sponsorlu calisma istiyorum"
                    : "Example: I want a sponsored work pathway"
                }
              />
              <Button type="submit" disabled={sending || !input.trim()}>
                {sending ? (isTr ? "Gonderiliyor..." : "Sending...") : isTr ? "Gonder" : "Send"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-5 text-sm text-muted-foreground">
            This assistant provides general information only. It does not provide migration advice, legal advice, or guarantee visa outcomes.
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
