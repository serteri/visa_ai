"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { runAssistantMessage } from "@/app/[locale]/assistant/actions";
import type { VisaAssistantResult } from "@/lib/ai/visa-assistant";

type AssistantMessage =
  | {
      role: "user";
      text: string;
    }
  | {
      role: "assistant";
      text: string;
      result?: VisaAssistantResult;
    };

const QUICK_PROMPTS = [
  "I want to study in Australia",
  "I have an employer sponsor",
  "I want PR in Australia",
  "I am a civil engineer and want to migrate",
] as const;

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
          text: result.safeResponse,
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
                      <div className="rounded-md border border-border/70 bg-background/70 p-2 text-xs text-muted-foreground">
                        <p>
                          <span className="font-semibold">Intent:</span> {message.result.intent}
                        </p>
                        {message.result.occupation && (
                          <p>
                            <span className="font-semibold">occupation:</span> {message.result.occupation}
                          </p>
                        )}
                        {message.result.hasSponsor !== undefined && (
                          <p>
                            <span className="font-semibold">hasSponsor:</span>{" "}
                            {String(message.result.hasSponsor)}
                          </p>
                        )}
                      </div>

                      {message.result.suggestedVisas.length > 0 && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {message.result.suggestedVisas.map((visa) => (
                            <div key={visa.subclass} className="rounded-md border border-border/70 bg-card p-3">
                              <p className="text-sm font-semibold">
                                Subclass {visa.subclass} - {visa.title}
                              </p>
                              <p className="text-xs text-muted-foreground">{visa.reason}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {message.result.nextActions.map((action) => (
                          <Button key={action.href + action.label} asChild size="sm" variant="secondary">
                            <Link href={action.href}>{action.label}</Link>
                          </Button>
                        ))}
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
