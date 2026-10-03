"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChatRestoreCredits } from "@/components/ChatRestoreCredits";
import { renderCitations } from "@/lib/chat/citations";
import { stripInternalLabels } from "@/lib/chat/internal-labels";
import type { SourceRef } from "@/lib/chat/types";
import { ChatQuickProfileCard } from "@/components/ChatQuickProfileCard";
import { ChatQuickResult } from "@/components/ChatQuickResult";
import { ChatBalanceBar } from "@/components/ChatBalanceBar";
import type { BalanceView } from "@/lib/chat/balance";
import type { EngineResultSummary } from "@/lib/chat/quick-profile-api";
import type { QuickProfileFields } from "@/lib/chat/quick-profile";
import { useLanguage, useTranslation } from "@/contexts/language-context";
import { cn } from "@/lib/utils";

const FREE_LIMIT_ERROR_CODE = "limit_reached";

const QP_TEXT = {
  edit: { en: "Edit my profile", tr: "Profilimi düzenle", zh: "编辑我的资料" },
  cta: {
    en: "Want every section — points, visa requirements, states, costs and a plan — in one PDF?",
    tr: "Tüm bölümleri — puan, vize şartları, eyaletler, maliyetler ve plan — tek bir PDF'te mi istiyorsunuz?",
    zh: "想要把所有内容——分数、签证要求、州、费用和计划——整合到一份 PDF 中吗？",
  },
  ctaLink: { en: "Get the full report", tr: "Tam raporu alın", zh: "获取完整报告" },
};
const PREMIUM_UPGRADE_PATH = "/pricing";

interface KnowledgeChatUIProps {
  className?: string;
  /** From ?restore=<token> on the page URL (the emailed "Restore my credits" link). */
  restoreToken?: string;
}

function isLimitReachedError(error: Error): boolean {
  try {
    const parsed = JSON.parse(error.message) as { error?: string };
    return parsed.error === FREE_LIMIT_ERROR_CODE;
  } catch {
    return error.message.includes(FREE_LIMIT_ERROR_CODE);
  }
}

export function KnowledgeChatUI({ className, restoreToken }: KnowledgeChatUIProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [unlockEmail, setUnlockEmail] = useState("");
  const [unlockEmailError, setUnlockEmailError] = useState<string | null>(null);
  const [showVipCodeInput, setShowVipCodeInput] = useState(false);
  const [vipCode, setVipCode] = useState("");
  const [vipCodeError, setVipCodeError] = useState<string | null>(null);
  const [isUnlockingVip, setIsUnlockingVip] = useState(false);
  // "Restore my credits" link target (?restore=<token>): confirmed only by an explicit click, so a mail scanner
  // that merely opens the link cannot use up the one-time token.
  const [restoreState, setRestoreState] = useState<"idle" | "working" | "done" | "failed">("idle");
  const [restoredCredits, setRestoredCredits] = useState(0);
  // Quick profile card (premium visitor without a linked report): /api/chat/profile says whether to show it.
  const { language } = useLanguage();
  const [quick, setQuick] = useState<{ premium: boolean; hasReport: boolean; available: boolean; profile: Partial<QuickProfileFields> | null; result: EngineResultSummary | null } | null>(null);
  const [balance, setBalance] = useState<BalanceView | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const loadQuickProfile = () =>
    fetch("/api/chat/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setQuick(data))
      .catch(() => setQuick(null));
  useEffect(() => {
    void loadQuickProfile();
  }, [restoreState]);

  useEffect(() => {
    fetch("/api/visitor")
      .then((res) => res.json())
      .then((data: { visitorId?: string }) => {
        if (data.visitorId) setVisitorId(data.visitorId);
      })
      .catch(() => {
        // Non-fatal -- the VIP self-unlock path just won't work without a
        // visitorId; the /pricing redirect path doesn't need one.
      });
  }, []);

  const handleRestoreConfirm = async () => {
    if (!restoreToken) return;
    setRestoreState("working");
    try {
      const res = await fetch("/api/chat/restore/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: restoreToken }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; credits?: number };
      if (!res.ok || !data.ok) {
        setRestoreState("failed");
        return;
      }
      setRestoredCredits(data.credits ?? 0);
      setRestoreState("done");
      setIsLimitReached(false);
      const url = new URL(window.location.href);
      url.searchParams.delete("restore");
      window.history.replaceState(null, "", url.toString());
    } catch {
      setRestoreState("failed");
    }
  };

  // The language rides along so a correction block is written in the visitor's language.
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/knowledge-chat", body: { locale: language } }),
    [language],
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
    onError: (err) => {
      if (isLimitReachedError(err)) setIsLimitReached(true);
    },
  });

  const isBusy = status === "submitted" || status === "streaming";

  // The header balance is read from the server on load and again after every message settles ("ready" or "error"),
  // so a credit spent, a refund after a failed message, a restore and a VIP unlock all show up.
  useEffect(() => {
    if (status !== "ready" && status !== "error") return;
    fetch("/api/chat/balance", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: BalanceView | null) => setBalance(data))
      .catch(() => {});
  }, [status, restoreState, isLimitReached]);
  const inputDisabled = isLimitReached || isBusy;

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Re-run on every message list change and on every status transition
  // (submitted/streaming/ready) so the view follows both new messages and
  // the assistant's reply as it streams in, not just once it's finished.
  useEffect(() => {
    scrollToBottom();
  }, [messages, status]);

  // Always sends the visitor to /pricing -- there is no client-side "is this
  // the founder" check anymore (that used to be a hardcoded email compared
  // in the browser bundle, which is itself a leak: anyone reading the JS
  // could see the bypass email). The actual VIP self-unlock path is the
  // separate "Have a VIP access code?" flow below, gated by a server-only
  // secret (VIP_UNLOCK_SECRET) that never ships to the client.
  const handleUpgradeClick = () => {
    const trimmedEmail = unlockEmail.trim();
    setUnlockEmailError(null);

    if (!trimmedEmail) {
      setUnlockEmailError(t("chat.emailRequired", "Please enter your email address."));
      return;
    }

    window.location.assign(`${PREMIUM_UPGRADE_PATH}?email=${encodeURIComponent(trimmedEmail)}`);
  };

  const handleVipUnlock = async () => {
    const trimmedCode = vipCode.trim();
    setVipCodeError(null);

    if (!trimmedCode) {
      setVipCodeError(t("chat.vipCodeRequired", "Please enter your VIP access code."));
      return;
    }
    if (!visitorId) {
      setVipCodeError(t("chat.unlockError", "Something went wrong, please refresh the page and try again."));
      return;
    }

    setIsUnlockingVip(true);
    try {
      const res = await fetch("/api/stripe/vip-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-vip-token": trimmedCode },
        body: JSON.stringify({ visitorId }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unlock failed.");
      }

      setIsLimitReached(false);
    } catch (err) {
      console.error("[knowledge-chat] VIP unlock failed", err);
      setVipCodeError(t("chat.unlockFailed", "Verification failed, please try again."));
    } finally {
      setIsUnlockingVip(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || inputDisabled) return;
    sendMessage({ text });
    setInput("");
  };

  return (
    <div
      className={cn(
        "relative flex h-[600px] w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      <ChatBalanceBar balance={balance} />
      {restoreToken && restoreState !== "done" && (
        <div className="space-y-2 border-b border-border bg-muted/50 p-3 text-center text-sm">
          <p>
            {restoreState === "failed"
              ? t("chat.restore.invalidLink", "This restore link is invalid, expired or already used. Request a new one.")
              : t("chat.restore.confirmPrompt", "Restore your credits on this device?")}
          </p>
          {restoreState !== "failed" && (
            <Button size="sm" onClick={handleRestoreConfirm} disabled={restoreState === "working"}>
              {restoreState === "working"
                ? t("chat.verifying", "Verifying...")
                : t("chat.restore.confirmButton", "Restore credits to this device")}
            </Button>
          )}
        </div>
      )}
      {restoreState === "done" && (
        <p role="status" className="border-b border-border bg-muted/50 p-3 text-center text-sm">
          {t("chat.restore.done", "Credits restored. Credits available now: {count}").replace("{count}", String(restoredCredits))}
        </p>
      )}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {!quick?.hasReport && quick?.available && (!quick.profile || editingProfile) && (
          <ChatQuickProfileCard
            locale={language}
            initial={quick.profile}
            onSaved={() => {
              setEditingProfile(false);
              void loadQuickProfile();
            }}
            onCancel={quick.profile ? () => setEditingProfile(false) : undefined}
          />
        )}
        {quick && !quick.premium && !quick.hasReport && quick.profile && quick.result && !editingProfile && (
          <ChatQuickResult result={quick.result} locale={language} onEdit={() => setEditingProfile(true)} />
        )}
        {quick?.premium && !quick.hasReport && quick.profile && !editingProfile && (
          <button type="button" onClick={() => setEditingProfile(true)} className="text-xs text-muted-foreground underline-offset-2 hover:underline">
            {QP_TEXT.edit[language === "tr" ? "tr" : language === "zh-Hans" ? "zh" : "en"]}
          </button>
        )}
        {messages.map((message, index) => {
          const rawText = message.parts
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join("\n");
          // Premium answers carry [S1]-style markers; the document / page shown comes from the retrieval metadata
          // the server sent with the message, and a marker not in that list is dropped.
          const meta = message.metadata as { sources?: SourceRef[]; profileSource?: "report" | "quick" | null; locale?: string } | undefined;
          const sources = meta?.sources;
          // Bracketed internal prompt labels that slipped into the answer are never shown (the correction block says so).
          const text = message.role === "assistant" ? stripInternalLabels(sources ? renderCitations(rawText, sources) : rawText) : rawText;
          const isUser = message.role === "user";
          // Correction blocks appended to this answer after it streamed (the engine's fact and its source).
          const corrections = message.parts
            .filter((part) => part.type === "data-correction")
            .map((part) => (part as unknown as { data: { text?: string } }).data.text)
            .filter((x): x is string => Boolean(x));
          // One-line CTA to the full report, once: after the first answer personalised from the quick profile card.
          const firstQuickAnswer =
            message.role === "assistant" &&
            meta?.profileSource === "quick" &&
            messages.findIndex((m) => m.role === "assistant" && (m.metadata as { profileSource?: string } | undefined)?.profileSource === "quick") === index;
          // The call to action follows the language of the conversation (sent with the answer), not the page language.
          const msgLocale = meta?.locale === "tr" || meta?.locale === "zh-Hans" || meta?.locale === "en" ? meta.locale : language;
          const lang = msgLocale === "tr" ? "tr" : msgLocale === "zh-Hans" ? "zh" : "en";

          return (
            <div key={message.id} className="space-y-1">
              <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                    isUser
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {text}
                </div>
              </div>
              {corrections.map((c) => (
                <div key={c} role="note" data-testid="chat-correction" className="max-w-[80%] rounded-lg border border-amber-500/50 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
                  {c}
                </div>
              ))}
              {firstQuickAnswer && !isBusy && (
                <p className="text-xs text-muted-foreground" data-testid="chat-full-report-cta">
                  {QP_TEXT.cta[lang]}{" "}
                  <a href={`/${msgLocale}/full-check`} className="font-medium text-primary underline-offset-2 hover:underline">
                    {QP_TEXT.ctaLink[lang]}
                  </a>
                </p>
              )}
            </div>
          );
        })}

        {isBusy && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground">
              {t("chat.typing", "Typing...")}
            </div>
          </div>
        )}

        {error && !isLimitReached && (
          <p className="text-center text-xs text-red-600">
            {t("chat.errorGeneric", "An error occurred, please try again.")}
          </p>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className={cn(
          "flex items-end gap-2 border-t border-border p-3",
          isLimitReached && "opacity-50",
        )}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder={t("chat.inputPlaceholder", "Ask a question about your visa process...")}
          disabled={inputDisabled}
          className="min-h-11 flex-1 resize-none"
        />
        <Button type="submit" disabled={inputDisabled || !input.trim()}>
          {t("chat.send", "Send")}
        </Button>
      </form>

      {!isLimitReached && (
        <div className="border-t border-border px-3 py-2 text-center">
          <ChatRestoreCredits />
        </div>
      )}

      {isLimitReached && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/80 p-6 text-center backdrop-blur-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="h-6 w-6" />
          </div>
          <p className="max-w-sm text-sm font-medium text-foreground">
            {t(
              "chat.limitReachedMessage",
              "You've reached your free 5-message limit. Unlock Premium for unlimited RAG visa consulting and detailed reports.",
            )}
          </p>
          <div className="w-full max-w-xs space-y-2">
            <Input
              type="email"
              value={unlockEmail}
              onChange={(e) => {
                setUnlockEmail(e.target.value);
                setUnlockEmailError(null);
              }}
              placeholder={t("chat.emailPlaceholder", "Enter your email address")}
              className="text-center"
            />
            {unlockEmailError && <p className="text-xs text-red-600">{unlockEmailError}</p>}
            <Button onClick={handleUpgradeClick} className="w-full px-6">
              {t("chat.unlockPremium", "Unlock Premium")}
            </Button>

            <button
              type="button"
              onClick={() => setShowVipCodeInput((prev) => !prev)}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              {t("chat.haveVipCode", "Have a VIP access code?")}
            </button>

            {showVipCodeInput && (
              <div className="space-y-2 pt-1">
                <Input
                  type="password"
                  value={vipCode}
                  onChange={(e) => {
                    setVipCode(e.target.value);
                    setVipCodeError(null);
                  }}
                  placeholder={t("chat.vipCodePlaceholder", "Enter VIP access code")}
                  disabled={isUnlockingVip}
                  className="text-center"
                />
                {vipCodeError && <p className="text-xs text-red-600">{vipCodeError}</p>}
                <Button
                  variant="outline"
                  onClick={handleVipUnlock}
                  disabled={isUnlockingVip}
                  className="w-full px-6"
                >
                  {isUnlockingVip ? t("chat.verifying", "Verifying...") : t("chat.vipUnlock", "Unlock with code")}
                </Button>
              </div>
            )}

            <ChatRestoreCredits />
          </div>
        </div>
      )}
    </div>
  );
}
