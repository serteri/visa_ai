"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

function Checkbox({
  checked,
  onCheckedChange,
  className,
  disabled,
  ...props
}: {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
} & Omit<React.ComponentProps<"button">, "onChange" | "onClick">) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      data-slot="checkbox"
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "border-[var(--color-electric-iris)] bg-[var(--color-electric-iris)]"
          : "border-white/25 bg-transparent hover:border-white/50",
        className
      )}
      {...props}
    >
      {checked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
    </button>
  );
}

export { Checkbox };
