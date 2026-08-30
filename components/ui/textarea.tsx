import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-20 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus-visible:border-[#53917E] focus-visible:ring-2 focus-visible:ring-[#53917E]/20 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
