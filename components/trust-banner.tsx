import { cn } from "@/lib/utils";

/** Shared trust/security badge line -- shown on the sign-in screen and the
 *  Document Vault (Journey Timeline), the two surfaces that handle
 *  passwordless auth and sensitive document uploads respectively. */
export function TrustBanner({ className }: { className?: string }) {
  return (
    <p className={cn("text-center text-xs text-slate-500", className)}>
      🔒 256-bit AES Encryption &nbsp;|&nbsp; Private Cloud Storage &nbsp;|&nbsp; Designed for Australian Privacy
      Standards
    </p>
  );
}
