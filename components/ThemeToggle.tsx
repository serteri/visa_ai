"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

/** Sun/moon toggle. next-themes already persists the choice to localStorage
 *  and resolves "system" to an actual light/dark value -- this only reads
 *  `resolvedTheme` (never `theme` directly, which can be "system") and
 *  flips between the two concrete values. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  // Avoids a hydration mismatch: resolvedTheme is undefined on the server
  // and on the very first client render (next-themes only knows the real
  // value after its own effect runs), so the icon is blank until mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div aria-hidden className={`h-8 w-8 ${className}`} />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={`flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-white/10 dark:text-slate-300 dark:hover:text-white ${className}`}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
