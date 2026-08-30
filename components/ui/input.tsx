import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full rounded-xl border border-input bg-card px-4 py-2 text-base text-slate-900 shadow-sm transition-all outline-none file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:border-[#53917E] focus-visible:ring-4 focus-visible:ring-[#53917E]/20 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input };
