"use client";

import { ThemeProvider } from "next-themes";

/** attribute="class" puts "dark"/"light" on <html> (see .dark/.light rules
 *  in app/globals.css); enableSystem + defaultTheme="system" means a
 *  first-time visitor gets their OS preference, but ThemeToggle can override
 *  it and next-themes persists the choice to localStorage itself. */
export function ThemeProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}
