"use client";

import Link from "next/link";

type TermsGateProps = {
  isTermsAccepted: boolean;
  termsError: boolean;
  onToggle: (checked: boolean) => void;
  /** Pre-built label content, e.g. `t.termsLabel(<Link>...</Link>)`. */
  label: React.ReactNode;
  errorText: string;
  className?: string;
};

/**
 * Shared checkbox + error UI for the "accept Terms before proceeding" gate.
 * Used at every point that either processes user data or distributes/sells
 * a digital product: the free-tier CV upload and Stripe checkout in
 * AnzscoClassifier, and the lead-capture form and Stripe checkout in
 * PdfDownloadModal. Kept as one component specifically so these stay
 * visually and behaviorally identical rather than drifting apart across
 * independently-maintained copies.
 */
export function TermsGate({
  isTermsAccepted,
  termsError,
  onToggle,
  label,
  errorText,
  className,
}: TermsGateProps) {
  return (
    <div className={["space-y-2", className].filter(Boolean).join(" ")}>
      <label
        className={[
          "flex cursor-pointer items-start gap-2 text-sm transition-colors",
          termsError ? "text-rose-600" : "text-slate-700",
        ].join(" ")}
      >
        <input
          type="checkbox"
          checked={isTermsAccepted}
          onChange={(event) => onToggle(event.target.checked)}
          className={[
            "mt-0.5 h-4 w-4 shrink-0 rounded accent-indigo-600",
            termsError ? "outline outline-2 outline-offset-1 outline-rose-400" : "",
          ].join(" ")}
        />
        <span>{label}</span>
      </label>

      {termsError && <p className="text-xs font-medium text-rose-600">{errorText}</p>}
    </div>
  );
}

/** Reusable "Terms of Service" link, styled consistently wherever the gate appears. */
export function TermsGateLink({ children }: { children: React.ReactNode }) {
  return (
    <Link
      href="/terms"
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      className="font-semibold underline underline-offset-2 hover:text-indigo-600"
    >
      {children}
    </Link>
  );
}
