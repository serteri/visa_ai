"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/contexts/language-context";
import { cn } from "@/lib/utils";

const FREE_LIMIT_ERROR_CODE = "limit_reached";
const PREMIUM_UPGRADE_PATH = "/pricing";

interface KnowledgeChatUIProps {
  className?: string;
}

function isLimitReachedError(error: Error): boolean {
  try {
    const parsed = JSON.parse(error.message) as { error?: string };
    return parsed.error === FREE_LIMIT_ERROR_CODE;
  } catch {
    return error.message.includes(FREE_LIMIT_ERROR_CODE);
  }
}

export function KnowledgeChatUI({ className }: KnowledgeChatUIProps) {
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

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/knowledge-chat" }),
    [],
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
    onError: (err) => {
      if (isLimitReachedError(err)) setIsLimitReached(true);
    },
  });

  const isBusy = status === "submitted" || status === "streaming";
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
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message) => {
          const text = message.parts
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join("\n");
          const isUser = message.role === "user";

          return (
            <div key={message.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
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
          </div>
        </div>
      )}
    </div>
  );
}
