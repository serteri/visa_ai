import { FORM_TEXT, pick } from "@/lib/lead-magnets";

/** "* Required field" (en / tr / zh-Hans): one per form that marks required fields with an asterisk. Slate-700 on the pale page background is 6.9:1. */
export function RequiredLegend({ locale, className = "" }: { locale: string; className?: string }) {
  return (
    <p className={`text-xs text-slate-700 ${className}`} data-required-legend>
      {pick(FORM_TEXT.legend, locale)}
    </p>
  );
}
