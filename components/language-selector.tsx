"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronDown, Globe } from "lucide-react";

import { cn } from "@/lib/utils";
import { languages } from "@/lib/languages";

interface LanguageSelectorProps {
  currentLocale: string;
}

export function LanguageSelector({ currentLocale }: LanguageSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = languages.find((lang) => lang.code === currentLocale);

  function handleLanguageChange(languageCode: string) {
    if (!languages.find((l) => l.code === languageCode)?.enabled) {
      return;
    }

    // Replace the current locale in the pathname with the new locale
    const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(\/|$)/, "/$1") || "/";
    const newPath = `/${languageCode}${pathWithoutLocale === "/" ? "" : pathWithoutLocale}`;
    
    router.push(newPath);
    setIsOpen(false);
  }

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
        <div className="absolute right-0 top-full z-[9999] mt-2 w-56 rounded-lg border border-border bg-white shadow-xl">
          <div className="p-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  if (lang.enabled) {
                    handleLanguageChange(lang.code);
                  }
                }}
                disabled={!lang.enabled}
                className={cn(
                  "w-full rounded-md px-3 py-2.5 text-left text-sm transition-colors",
                  lang.enabled
                    ? currentLocale === lang.code
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
          className="fixed inset-0 z-[9998]"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
