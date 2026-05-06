import Link from "next/link";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { logoutAdmin } from "@/lib/admin-auth";

const ADMIN_LINKS = [
  { href: "dashboard", label: "Dashboard" },
  { href: "leads", label: "Leads" },
  { href: "visas", label: "Visas" },
  { href: "referrals", label: "Referrals" },
  { href: "agents", label: "Agents" },
  { href: "full-check-waitlist", label: "Full Check Waitlist" },
];

export function AdminNav({ locale }: { locale: string }) {
  return (
    <nav
      aria-label="Admin navigation"
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/70 bg-card p-2"
    >
      <div className="flex flex-wrap gap-2">
        {ADMIN_LINKS.map((link) => (
          <Link
            key={link.href}
            href={`/${locale}/admin/${link.href}`}
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <form action={logoutAdmin}>
        <Button type="submit" variant="ghost" className="text-rose-700 hover:bg-rose-50 hover:text-rose-800">
          <LogOut className="mr-2 h-4 w-4" />
          Exit
        </Button>
      </form>
    </nav>
  );
}
