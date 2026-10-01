"use client";

import Link from "next/link";

import { ChatRestoreCredits } from "@/components/ChatRestoreCredits";
import { useTranslation } from "@/contexts/language-context";
import type { BalanceView } from "@/lib/chat/balance";

/** The chat header: remaining messages, always visible, and the "running low" notice with buy / restore links. */
export function ChatBalanceBar({ balance }: { balance: BalanceView | null }) {
  const { t } = useTranslation();
  if (!balance) return null;

  const label =
    balance.mode === "premium"
      ? balance.count === 1
        ? t("chat.balance.premiumOne", "1 premium message left")
        : t("chat.balance.premium", "{count} premium messages left").replace("{count}", String(balance.count))
      : balance.mode === "free"
        ? t("chat.balance.free", "{count} of {limit} free messages left").replace("{count}", String(balance.count)).replace("{limit}", String(balance.freeLimit))
        : t("chat.balance.none", "No messages left");

  return (
    <div className="border-b border-border bg-muted/40 px-3 py-2 text-center text-sm">
      <p className="font-medium text-foreground" data-testid="chat-balance" aria-live="polite">
        {label}
      </p>
      {balance.notice && (
        <div className="mt-1 space-y-1 text-xs text-muted-foreground" data-testid="chat-balance-notice">
          <p>{t("chat.balance.low", "You are running low on messages.")}</p>
          <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link href="/pricing" className="font-medium text-primary underline-offset-2 hover:underline">
              {t("chat.balance.buy", "Buy more messages")}
            </Link>
            <ChatRestoreCredits />
          </p>
        </div>
      )}
    </div>
  );
}
