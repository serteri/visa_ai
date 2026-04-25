"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ComplianceNotice } from "@/components/sections/compliance-notice";

type AssistantIntent = "study" | "work" | "pr" | "unknown";
type AssistantPathway = "500" | "482" | "189" | "190";

type AssistantAnalysis = {
  intent: AssistantIntent;
  hasSponsor?: boolean;
  occupation?: string;
  country?: string;
  language?: string;
};

type AssistantApiResponse = {
  analysis: AssistantAnalysis;
  pathways: AssistantPathway[];
  reply: string;
};

type AssistantMessage = {
  role: "user" | "assistant";
  text: string;
  analysis?: AssistantAnalysis;
  pathways?: AssistantPathway[];
};

const QUICK_PROMPTS = [
  "I want to study in Australia",
  "I want PR in Australia",
  "I want to work in Australia",
] as const;

export default function AssistantPage() {
  const params = useParams();
  const locale = String(params.locale ?? "en");
  const isTr = locale === "tr";

  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: "assistant",
      text: isTr
        ? "Merhaba. Bu yardimci genel bilgiye dayali yollari kesfetmenize yardimci olur. Lutfen sorununuzu yazin."
        : "Hello. This assistant helps you explore pathways based on general information. Share your question to begin.",
    },
  ]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, locale }),
      });

      const data = (await response.json()) as AssistantApiResponse;

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.reply,
          analysis: data.analysis,
          pathways: data.pathways,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: isTr
            ? "Bir sorun olustu. Yollari genel bilgi temelinde aciklamaya devam edebilirim. Lutfen tekrar deneyin ve kayitli bir goc danismani ile gorusmeyi degerlendirin."
            : "Something went wrong. I can still help you explore pathways based on general information. Please try again and consider speaking with a registered migration agent.",
        },
      ]);
    } finally {
      setSubmitting(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function visaLink(subclass: AssistantPathway): string {
    return `/${locale}/visas/${subclass}`;
  }

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
        <div className="space-y-3">
          <Badge variant="secondary">{isTr ? "Kontrollu Yardimci" : "Controlled Assistant"}</Badge>
          <h1 className="text-3xl font-bold sm:text-4xl">
            {isTr ? "AI Visa Assistant" : "AI Visa Assistant"}
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
            {isTr
              ? "Bu arac yalnizca genel bilgi sunar ve uygunluk/garanti vermez."
              : "This tool provides general pathway information only and does not determine eligibility or guarantees."}
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
                onClick={() => void sendMessage(prompt)}
                disabled={submitting}
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
            <div className="max-h-[420px] space-y-3 overflow-auto pr-1">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
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
                  <p className="text-foreground">{message.text}</p>

                  {message.analysis && (
                    <div className="mt-3 rounded-md border border-border/70 bg-background/70 p-2 text-xs text-muted-foreground">
                      <p>
                        <span className="font-semibold">Intent:</span> {message.analysis.intent}
                      </p>
                      {message.analysis.hasSponsor !== undefined && (
                        <p>
                          <span className="font-semibold">hasSponsor:</span>{" "}
                          {String(message.analysis.hasSponsor)}
                        </p>
                      )}
                      {message.analysis.occupation && (
                        <p>
                          <span className="font-semibold">occupation:</span> {message.analysis.occupation}
                        </p>
                      )}
                      {message.analysis.country && (
                        <p>
                          <span className="font-semibold">country:</span> {message.analysis.country}
                        </p>
                      )}
                      {message.analysis.language && (
                        <p>
                          <span className="font-semibold">language:</span> {message.analysis.language}
                        </p>
                      )}
                    </div>
                  )}

                  {message.role === "assistant" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(message.pathways ?? []).map((subclass) => (
                        <Button key={subclass} asChild size="sm" variant="outline">
                          <Link href={visaLink(subclass)}>
                            {isTr ? "Subclass" : "View subclass"} {subclass}
                          </Link>
                        </Button>
                      ))}
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/${locale}/points-calculator`}>
                          {isTr ? "Puan hesaplayici" : "Open points calculator"}
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/${locale}/occupation-checker`}>
                          {isTr ? "Meslek kontrol" : "Check occupation"}
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/${locale}/agent-referral`}>
                          {isTr
                            ? "Kayitli bir goc danismani ile gorusun"
                            : "Speak with agent"}
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isTr
                    ? "Ornek: PR istiyorum, meslegim civil engineer"
                    : "Example: I want PR, my occupation is civil engineer"
                }
              />
              <Button type="submit" disabled={submitting || !input.trim()}>
                {submitting ? (isTr ? "Gonderiliyor..." : "Sending...") : isTr ? "Gonder" : "Send"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <ComplianceNotice />
      </section>
    </main>
  );
}
