"use client";

import { useMemo, useRef, useState } from "react";
import { Bot, Send, Sparkles, MessageSquare, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
  reportData: Record<string, unknown>;
};

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function LogiAIAssistant({ locale, reportData }: LogiAIAssistantProps) {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const t = (tr: string, en: string, zh: string) => (isTr ? tr : isZh ? zh : en);

  const [isOpen, setIsOpen] = useState(true);
  const [isSending, setIsSending] = useState(false);
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

  const suggestedPrompts = useMemo(() => {
    const ranked = Array.isArray(reportData.rankedPathways)
      ? (reportData.rankedPathways as RankedPathwayLike[])
      : [];
    const lowest = [...ranked].sort(
      (a, b) => (a.matchPercentage ?? 0) - (b.matchPercentage ?? 0)
    )[0];
    const lowestVisa = lowest?.subclass ?? "189";

    const userObj = (reportData.user as Record<string, unknown>) ?? {};
    const occupation =
      (typeof userObj.occupation === "string" && userObj.occupation.trim()) ||
      (typeof reportData.occupation === "string" && reportData.occupation.trim()) ||
      "my occupation";

    return [
      `Why is my ${lowestVisa} chance so low?`,
      "What are my exact first steps to boost my points?",
      `Explain the State Nomination context for ${occupation}.`,
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
    scrollToBottom();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          reportData,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Chat request failed.");
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
    } catch {
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

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(96vw,420px)]">
      {!isOpen ? (
        <Button
          onClick={() => setIsOpen(true)}
          className="h-11 w-full justify-center gap-2 rounded-full bg-black text-white hover:bg-zinc-800"
        >
          <MessageSquare className="size-4" />
          Logi AI Assistant
        </Button>
      ) : (
        <Card className="border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl">
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
              className="max-h-[360px] min-h-[220px] space-y-2 overflow-y-auto rounded-lg border border-zinc-800 bg-black/30 p-3"
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
                  {message.content || (isSending && message.role === "assistant" ? "..." : "")}
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
