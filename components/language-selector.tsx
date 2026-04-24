"use client";

import { useState } from "react";
import { ChevronDown, Globe } from "lucide-react";

import { cn } from "@/lib/utils";
import { languages } from "@/lib/languages";
import { useLanguage } from "@/contexts/language-context";

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = languages.find((lang) => lang.code === language);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm transition-all hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring/60"
      >
        <Globe className="size-4" />
        <span>{currentLanguage?.localLabel}</span>
        <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-border bg-white shadow-lg">
          <div className="p-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  if (lang.enabled) {
                    setLanguage(lang.code);
                    setIsOpen(false);
                  }
                }}
                disabled={!lang.enabled}
                className={cn(
                  "w-full rounded-md px-3 py-2.5 text-left text-sm transition-colors",
                  lang.enabled
                    ? language === lang.code
                      ? "bg-primary/15 text-foreground"
                      : "hover:bg-muted text-foreground cursor-pointer"
                    : "cursor-not-allowed text-muted-foreground opacity-50"
                )}
                title={!lang.enabled ? "This language will be available soon" : undefined}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{lang.localLabel}</span>
                  {!lang.enabled && (
                    <span className="text-xs text-muted-foreground">(Coming Soon)</span>
                  )}
                </div>
                {lang.code !== lang.label && (
                  <span className="text-xs text-muted-foreground">{lang.label}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
