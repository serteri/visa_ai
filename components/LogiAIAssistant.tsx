"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Send, Sparkles, MessageSquare, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { defaultLocale, isValidLocale } from "@/lib/i18n/config";
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

type SupportedAssistantLocale = "en" | "tr" | "zh-Hans";
type ReportCountry = "AU" | "CA";

function normalizeAssistantLocale(locale: string): SupportedAssistantLocale {
  if (isValidLocale(locale)) return locale;
  return defaultLocale;
}

function resolveReportCountry(country?: AssistantReportData["country"]): ReportCountry {
  if (country === "CA") return "CA";
  if (typeof country === "string") {
    const normalized = country.trim().toUpperCase();
    if (normalized === "CANADA") return "CA";
    if (normalized === "AUSTRALIA") return "AU";
  }
  return "AU";
}

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
  const resolvedLocale = normalizeAssistantLocale(locale);
  const reportCountry = resolveReportCountry(reportData.country);
  const isCanada = reportCountry === "CA";
  const isTr = resolvedLocale === "tr";
  const isZh = resolvedLocale === "zh-Hans";
  const t = (tr: string, en: string, zh: string) => (isTr ? tr : isZh ? zh : en);

  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number } | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: uid(),
      role: "assistant",
      content: t(
        isCanada
          ? "Merhaba, ben Logi AI. Kanada rapor verilerinizi net bir stratejiye dönüştürebilirim. Resmi başvuru ve hukuki değerlendirme için RCIC danışmanına başvurun."
          : "Merhaba, ben Logi AI. Avustralya rapor verilerinize göre stratejik bir özet sunabilirim. Resmi başvuru ve hukuki değerlendirme için MARA danışmanına başvurun.",
        isCanada
          ? "Hi, I am Logi AI. I can explain your Canada report context as a clear strategy. For official lodgements and legal positioning, consult an RCIC."
          : "Hi, I am Logi AI. I can explain your Australia strategy based on your report context. For official lodgements and legal positioning, consult a MARA agent.",
        isCanada
          ? "你好，我是 Logi AI。我可以基于你的加拿大报告数据做策略解释。正式递交和法律判断请咨询 RCIC 顾问。"
          : "你好，我是 Logi AI。我可以基于你的澳洲报告数据做策略解释。正式递交和法律判断请咨询注册 MARA 顾问。"
      ),
    },
  ]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  function clampPosition(x: number, y: number) {
    const panel = panelRef.current;
    const panelWidth = panel?.offsetWidth ?? 420;
    const panelHeight = panel?.offsetHeight ?? 560;
    const maxX = Math.max(8, window.innerWidth - panelWidth - 8);
    const maxY = Math.max(8, window.innerHeight - panelHeight - 8);
    return {
      x: Math.min(Math.max(8, x), maxX),
      y: Math.min(Math.max(8, y), maxY),
    };
  }

  function resetDesktopPosition() {
    const panel = panelRef.current;
    const panelWidth = panel?.offsetWidth ?? 420;
    const panelHeight = panel?.offsetHeight ?? 560;
    const targetX = window.innerWidth - panelWidth - 16;
    const targetY = window.innerHeight - panelHeight - 16;
    setPanelPosition(clampPosition(targetX, targetY));
  }

  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)");
    const syncMobileState = () => {
      setIsMobile(media.matches);
      if (media.matches) {
        setPanelPosition(null);
      }
    };

    syncMobileState();
    media.addEventListener("change", syncMobileState);
    return () => media.removeEventListener("change", syncMobileState);
  }, []);

  useEffect(() => {
    if (isMobile || !isOpen || panelPosition) return;
    resetDesktopPosition();
  }, [isMobile, isOpen, panelPosition]);

  useEffect(() => {
    if (isMobile || !isOpen || !panelPosition) return;
    const handleResize = () => {
      setPanelPosition((current) => {
        if (!current) return current;
        return clampPosition(current.x, current.y);
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobile, isOpen, panelPosition]);

  const suggestedPrompts = useMemo(() => {
    const ranked = Array.isArray(reportData.rankedPathways)
      ? (reportData.rankedPathways as RankedPathwayLike[])
      : [];
    const lowest = [...ranked].sort(
      (a, b) => (a.matchPercentage ?? 0) - (b.matchPercentage ?? 0)
    )[0];
    const lowestVisa = lowest?.subclass ?? "189";

    const occupation = reportData.user.occupation?.trim() || "my occupation";
    const occupationLabel = occupation === "my occupation"
      ? t("mesleğim", "my occupation", "我的职业")
      : occupation;

    if (isCanada) {
      return [
        t(
          "CRS puanımı artırmak için en etkili adımlar neler?",
          "How can I improve my CRS score?",
          "我该如何提高 CRS 分数？"
        ),
        t(
          `${occupationLabel} için PNP sürecini açıkla.`,
          `Explain the PNP process for ${occupationLabel}.`,
          `请解释 ${occupationLabel} 的省提名流程。`
        ),
        t(
          "CEC mi FSW mi bana daha uygun?",
          "Is CEC or FSW better for me?",
          "CEC 和 FSW 哪个更适合我？"
        ),
      ];
    }

    return [
      t(
        `${lowestVisa} vizem için şansım neden düşük?`,
        `Why is my ${lowestVisa} chance low?`,
        `为什么我的 ${lowestVisa} 签证机会很低？`
      ),
      t(
        "Puanımı artırmak için ilk adımlarım neler olmalı?",
        "What are my exact first steps?",
        "提高分数的具体第一步是什么？"
      ),
      t(
        `${occupationLabel} için Eyalet Sponsorluğu durumunu açıkla.`,
        `Explain State Nomination for ${occupationLabel}.`,
        `请解释 ${occupationLabel} 的州担保情况。`
      ),
    ];
  }, [isCanada, reportData, t]);

  function handleDragStart(event: React.PointerEvent<HTMLDivElement>) {
    if (isMobile || !panelPosition) return;
    event.preventDefault();
    setIsDragging(true);
    dragOffsetRef.current = {
      x: event.clientX - panelPosition.x,
      y: event.clientY - panelPosition.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleDragMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging || isMobile) return;
    const nextX = event.clientX - dragOffsetRef.current.x;
    const nextY = event.clientY - dragOffsetRef.current.y;
    setPanelPosition(clampPosition(nextX, nextY));
  }

  function handleDragEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

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
          locale: resolvedLocale,
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
                    isCanada
                      ? "Şu anda yanıt üretilemedi. Lütfen tekrar deneyin. Resmi süreç için RCIC danışmanına başvurun."
                      : "Şu anda yanıt üretilemedi. Lütfen tekrar deneyin. Resmi süreç için MARA danışmanı ile ilerleyin.",
                    isCanada
                      ? "I could not generate a response right now. Please try again. For official steps, work with an RCIC."
                      : "I could not generate a response right now. Please try again. For official steps, work with a MARA agent.",
                    isCanada
                      ? "目前无法生成回复，请稍后重试。正式流程请与 RCIC 顾问确认。"
                      : "目前无法生成回复，请稍后重试。正式流程请与 MARA 顾问确认。"
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
                    isCanada
                      ? "Bağlantı hatası oluştu. Lütfen tekrar deneyin. Resmi başvurular için RCIC danışmanıyla doğrulayın."
                      : "Bağlantı hatası oluştu. Lütfen tekrar deneyin. Resmi başvurular için MARA danışmanı ile doğrulayın.",
                    isCanada
                      ? "A connection error occurred. Please try again. For official lodgements, verify with an RCIC."
                      : "A connection error occurred. Please try again. For official lodgements, verify with a MARA agent.",
                    isCanada
                      ? "连接出现问题，请重试。正式递交请与 RCIC 顾问核实。"
                      : "连接出现问题，请重试。正式递交请与 MARA 顾问核实。"
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

  const panelStyle =
    !isMobile && panelPosition
      ? {
          left: `${panelPosition.x}px`,
          top: `${panelPosition.y}px`,
        }
      : undefined;

  const containerClassName = isMobile
    ? "fixed inset-x-3 bottom-3 z-50 w-auto max-w-none"
    : "fixed bottom-4 right-4 z-50";

  const panelClassName = isMobile
    ? "border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl max-h-[70vh] overflow-hidden"
    : "fixed w-[min(92vw,420px)] border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl max-h-[78vh] overflow-hidden";

  return (
    <div className={containerClassName}>
      {!isOpen ? (
        <Button
          onClick={() => setIsOpen(true)}
          className={isMobile
            ? "h-12 w-12 rounded-full bg-black p-0 text-white shadow-xl hover:bg-zinc-800"
            : "h-12 w-12 rounded-full bg-black p-0 text-white shadow-xl hover:bg-zinc-800"}
          aria-label="Open Logi AI Assistant"
        >
          <MessageSquare className="size-4" />
        </Button>
      ) : (
        <Card
          ref={panelRef}
          className={panelClassName}
          style={panelStyle}
        >
          <CardHeader
            className={`pb-3 ${!isMobile ? "cursor-move select-none" : ""}`}
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
          >
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
                isCanada
                  ? "Rapor bağlamı ile yanıtlar. Resmi süreç için RCIC danışmanına başvurun."
                  : "Rapor bağlamı ile yanıtlar. Resmi süreç için MARA danışmanı ile ilerleyin.",
                isCanada
                  ? "Answers with your report context. For official lodgements, consult an RCIC."
                  : "Answers with your report context. For official lodgements, consult a MARA agent.",
                isCanada
                  ? "基于报告上下文回答。正式递交请咨询 RCIC 顾问。"
                  : "基于报告上下文回答。正式递交请咨询 MARA 顾问。"
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
