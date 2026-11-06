import { cn } from "@/lib/utils";

/** Shared trust/security badge line -- shown on the sign-in screen and the
 *  Document Vault (Journey Timeline), the two surfaces that handle
 *  passwordless auth and sensitive document uploads respectively. */
export function TrustBanner({ className }: { className?: string }) {
  return (
    <p className={cn("text-center text-xs text-slate-500", className)}>
      🔒 Connections are encrypted with HTTPS &nbsp;|&nbsp; Uploaded files open only through short-lived links
    </p>
  );
}
