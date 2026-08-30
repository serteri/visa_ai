"use client";

import { createContext, useContext, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

// Lightweight local accordion (no @radix-ui/react-accordion dependency
// installed in this project) -- same API shape as shadcn/ui's Accordion
// so it can be swapped for the real thing later without touching call sites.

type AccordionContextValue = {
  openItem: string | null;
  setOpenItem: (id: string | null) => void;
};

const AccordionContext = createContext<AccordionContextValue | null>(null);
const AccordionItemContext = createContext<string>("");

export function Accordion({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [openItem, setOpenItem] = useState<string | null>(null);
  return (
    <AccordionContext.Provider value={{ openItem, setOpenItem }}>
      <div className={className}>{children}</div>
    </AccordionContext.Provider>
  );
}

export function AccordionItem({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <AccordionItemContext.Provider value={value}>
      <div className={className}>{children}</div>
    </AccordionItemContext.Provider>
  );
}

export function AccordionTrigger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = useContext(AccordionContext);
  const value = useContext(AccordionItemContext);
  if (!ctx) throw new Error("AccordionTrigger must be used within an Accordion");
  const isOpen = ctx.openItem === value;

  return (
    <h3 className="m-0">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={`accordion-content-${value}`}
        id={`accordion-trigger-${value}`}
        onClick={() => ctx.setOpenItem(isOpen ? null : value)}
        className={cn(
          "flex w-full items-center justify-between gap-4 py-4 text-left text-base font-semibold text-white transition-colors hover:text-indigo-400",
          className
        )}
      >
        <span>{children}</span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-indigo-200 transition-transform duration-200",
            isOpen && "rotate-180 text-indigo-600 dark:text-indigo-400"
          )}
        />
      </button>
    </h3>
  );
}

export function AccordionContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = useContext(AccordionContext);
  const value = useContext(AccordionItemContext);
  if (!ctx) throw new Error("AccordionContent must be used within an Accordion");
  const isOpen = ctx.openItem === value;

  return (
    <div
      id={`accordion-content-${value}`}
      role="region"
      aria-labelledby={`accordion-trigger-${value}`}
      className={cn(
        "grid transition-all duration-200 ease-in-out",
        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}
    >
      <div className="overflow-hidden">
        <div className={cn("pb-4 pt-0", className)}>{children}</div>
      </div>
    </div>
  );
}
