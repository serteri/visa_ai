"use client";

import { useState } from "react";
import { useTranslation } from "@/contexts/language-context";

export function ShareLogivisaCard() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText("https://www.logivisa.com");
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback for older browsers
      const el = document.createElement("textarea");
      el.value = "https://www.logivisa.com";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <div className="mt-10 rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-6 shadow-[0_0_40px_rgba(6,182,212,0.08)] backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
        Share
      </p>
      <h3 className="mt-2 text-xl font-bold text-slate-100">
        {t("share.heading")}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        {t("share.subtext")}
      </p>
      <button
        onClick={handleCopy}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-all hover:bg-cyan-400 active:scale-95"
      >
        {copied ? t("share.buttonCopied") : t("share.button")}
      </button>
    </div>
  );
}
