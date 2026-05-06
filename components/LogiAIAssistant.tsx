"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Send, Sparkles, MessageSquare, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AssistantReportData } from "@/lib/readiness/types";

type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type RankedPathwayLike = {
  subclass?: string;
  matchPercentage?: number;
};

type LogiAIAssistantProps = {
  locale: string;
  reportData: AssistantReportData;
};

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.2s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.1s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" />
    </div>
  );
}

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function LogiAIAssistant({ locale, reportData }: LogiAIAssistantProps) {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const t = (tr: string, en: string, zh: string) => (isTr ? tr : isZh ? zh : en);

  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: uid(),
      role: "assistant",
      content: t(
        "Merhaba, ben Logi AI. Rapor verilerinize göre stratejik bir özet sunabilirim. Resmi başvuru ve hukuki değerlendirme için MARA danışmanına başvurun.",
        "Hi, I am Logi AI. I can explain your strategy based on your report context. For official lodgements and legal positioning, consult a MARA agent.",
        "你好，我是 Logi AI。我可以基于你的报告数据做策略解释。正式递交和法律判断请咨询注册 MARA 顾问。"
      ),
    },
  ]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)");
    const syncMobileState = () => {
      setIsMobile(media.matches);
      setIsOpen((current) => (media.matches ? false : current));
    };

    syncMobileState();
    media.addEventListener("change", syncMobileState);
    return () => media.removeEventListener("change", syncMobileState);
  }, []);

  const suggestedPrompts = useMemo(() => {
    const ranked = Array.isArray(reportData.rankedPathways)
      ? (reportData.rankedPathways as RankedPathwayLike[])
      : [];
    const lowest = [...ranked].sort(
      (a, b) => (a.matchPercentage ?? 0) - (b.matchPercentage ?? 0)
    )[0];
    const lowestVisa = lowest?.subclass ?? "189";

    const occupation = reportData.user.occupation?.trim() || "my occupation";
    const tracker = reportData.stateNominationTracker?.topRecommendedStates;
    const topState = tracker?.[0]?.code ?? "SA";

    return [
      `Why is my ${lowestVisa} chance so low?`,
      "What are my exact first steps to boost my points?",
      `Why does ${topState} look stronger for ${occupation}?`,
    ];
  }, [reportData]);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (!scrollRef.current) return;
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  }

  async function sendMessage(rawText: string) {
    const text = rawText.trim();
    if (!text || isSending) return;

    const userMessage: AssistantMessage = { id: uid(), role: "user", content: text };
    const assistantId = uid();

    const nextMessages = [...messages, userMessage];
    setMessages([...nextMessages, { id: assistantId, role: "assistant", content: "" }]);
    setInput("");
    setIsSending(true);
    setChatError(null);
    scrollToBottom();

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 25000);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          locale,
          reportData,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      window.clearTimeout(timeoutId);

      if (!response.ok || !response.body) {
        throw new Error("API response failed.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assembled = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        assembled += decoder.decode(value, { stream: true });

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: assembled } : m))
        );
        scrollToBottom();
      }

      if (!assembled.trim()) {
        setChatError(t("API yaniti bos dondu.", "API response failed.", "API 响应失败。"));
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: t(
                    "Şu anda yanıt üretilemedi. Lütfen tekrar deneyin. Resmi süreç için MARA danışmanı ile ilerleyin.",
                    "I could not generate a response right now. Please try again. For official steps, work with a MARA agent.",
                    "目前无法生成回复，请稍后重试。正式流程请与 MARA 顾问确认。"
                  ),
                }
              : m
          )
        );
      }
    } catch (error) {
      setChatError(
        t(
          "API response failed. Lütfen daha sonra tekrar deneyin.",
          "API response failed. Please try again shortly.",
          "API response failed. 请稍后重试。"
        )
      );
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: t(
                  "Bağlantı hatası oluştu. Lütfen tekrar deneyin. Resmi başvurular için MARA danışmanı ile doğrulayın.",
                  "A connection error occurred. Please try again. For official lodgements, verify with a MARA agent.",
                  "连接出现问题，请重试。正式递交请与 MARA 顾问核实。"
                ),
              }
            : m
        )
      );
    } finally {
      setIsSending(false);
      scrollToBottom();
    }
  }

  const containerClassName = isMobile
    ? "fixed inset-x-3 bottom-3 z-50 w-auto max-w-none"
    : "fixed bottom-4 right-4 z-50 w-[min(96vw,420px)]";

  const panelClassName = isMobile
    ? "border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl max-h-[70vh] overflow-hidden"
    : "border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl";

  return (
    <div className={containerClassName}>
      {!isOpen ? (
        <Button
          onClick={() => setIsOpen(true)}
          className={isMobile
            ? "h-12 w-12 rounded-full bg-black p-0 text-white shadow-xl hover:bg-zinc-800"
            : "h-11 w-full justify-center gap-2 rounded-full bg-black text-white hover:bg-zinc-800"}
          aria-label="Open Logi AI Assistant"
        >
          <MessageSquare className="size-4" />
          {!isMobile && "Logi AI Assistant"}
        </Button>
      ) : (
        <Card className={panelClassName}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-black">
                  <Bot className="size-4" />
                </span>
                Logi AI
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 px-0 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                <X className="size-4" />
              </Button>
            </div>
            <p className="text-xs text-zinc-400">
              {t(
                "Rapor bağlamı ile yanıtlar. Resmi süreç için MARA danışmanı ile ilerleyin.",
                "Answers with your report context. For official lodgements, consult a MARA agent.",
                "基于报告上下文回答。正式递交请咨询 MARA 顾问。"
              )}
            </p>
          </CardHeader>

          <CardContent className="space-y-3">
            {chatError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {chatError}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  disabled={isSending}
                  className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 disabled:opacity-50"
                >
                  <Sparkles className="mr-1 inline size-3" />
                  {prompt}
                </button>
              ))}
            </div>

            <div
              ref={scrollRef}
              className={`${isMobile ? "max-h-[38vh] min-h-[180px]" : "max-h-[360px] min-h-[220px]"} space-y-2 overflow-y-auto rounded-lg border border-zinc-800 bg-black/30 p-3`}
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[90%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "ml-auto bg-white text-black"
                      : "mr-auto bg-zinc-800 text-zinc-100"
                  }`}
                >
                  {message.content || (isSending && message.role === "assistant" ? <TypingIndicator /> : "")}
                </div>
              ))}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage(input);
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={t(
                  "Raporun hakkında bir soru sor...",
                  "Ask a question about your report...",
                  "输入关于报告的问题..."
                )}
                className="h-10 border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
                disabled={isSending}
              />
              <Button
                type="submit"
                disabled={isSending || !input.trim()}
                className="h-10 shrink-0 bg-white text-black hover:bg-zinc-200"
              >
                <Send className="size-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
