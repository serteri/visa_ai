"use client";

import { useEffect, useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const FREE_LIMIT_ERROR_CODE = "limit_reached";
const PREMIUM_UPGRADE_PATH = "/pricing";
// Founder account -- matches VIP_BYPASS_EMAIL in
// app/api/stripe/vip-unlock/route.ts. Only decides which path this
// component takes (self-unlock vs. redirect to pricing); the actual grant
// is enforced server-side, this check is not a security boundary.
const VIP_BYPASS_EMAIL = "serteri@gmail.com";

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
  const [input, setInput] = useState("");
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [unlockEmail, setUnlockEmail] = useState("");
  const [unlockEmailError, setUnlockEmailError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

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

  const handleUpgradeClick = async () => {
    const trimmedEmail = unlockEmail.trim();
    setUnlockEmailError(null);

    if (!trimmedEmail) {
      setUnlockEmailError("Lütfen e-posta adresinizi girin.");
      return;
    }

    if (trimmedEmail !== VIP_BYPASS_EMAIL) {
      window.location.assign(`${PREMIUM_UPGRADE_PATH}?email=${encodeURIComponent(trimmedEmail)}`);
      return;
    }

    if (!visitorId) {
      setUnlockEmailError("Bir sorun oluştu, lütfen sayfayı yenileyip tekrar deneyin.");
      return;
    }

    setIsUnlocking(true);
    try {
      const res = await fetch("/api/stripe/vip-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, visitorId }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unlock failed.");
      }

      setIsLimitReached(false);
    } catch (err) {
      console.error("[knowledge-chat] VIP unlock failed", err);
      setUnlockEmailError("Doğrulama başarısız oldu, lütfen tekrar deneyin.");
    } finally {
      setIsUnlocking(false);
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
              Yazıyor...
            </div>
          </div>
        )}

        {error && !isLimitReached && (
          <p className="text-center text-xs text-red-600">
            Bir hata oluştu, lütfen tekrar deneyin.
          </p>
        )}
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
          placeholder="Vize sürecinizle ilgili bir soru sorun..."
          disabled={inputDisabled}
          className="min-h-11 flex-1 resize-none"
        />
        <Button type="submit" disabled={inputDisabled || !input.trim()}>
          Gönder
        </Button>
      </form>

      {isLimitReached && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/80 p-6 text-center backdrop-blur-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="h-6 w-6" />
          </div>
          <p className="max-w-sm text-sm font-medium text-foreground">
            Ücretsiz 5 mesaj limitinize ulaştınız. Sınırsız RAG vize danışmanlığı ve detaylı raporlar için Premium
            kilidini açın.
          </p>
          <div className="w-full max-w-xs space-y-2">
            <Input
              type="email"
              value={unlockEmail}
              onChange={(e) => {
                setUnlockEmail(e.target.value);
                setUnlockEmailError(null);
              }}
              placeholder="E-posta adresinizi girin"
              disabled={isUnlocking}
              className="text-center"
            />
            {unlockEmailError && <p className="text-xs text-red-600">{unlockEmailError}</p>}
            <Button onClick={handleUpgradeClick} disabled={isUnlocking} className="w-full px-6">
              {isUnlocking ? "Doğrulanıyor..." : "Unlock Premium"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
