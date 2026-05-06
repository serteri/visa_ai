"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { usePathname } from "next/navigation";

import { logoutAdminAction } from "@/app/[locale]/(main)/admin/actions";
import { Button } from "@/components/ui/button";

const ADMIN_LINKS = [
  { href: "dashboard", label: "Dashboard" },
  { href: "leads", label: "Leads" },
  { href: "visas", label: "Visas" },
  { href: "referrals", label: "Referrals" },
  { href: "agents", label: "Agents" },
  { href: "full-check-waitlist", label: "Full Check Waitlist" },
];

export function AdminNav({ locale }: { locale: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin navigation"
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/70 bg-card p-2"
    >
      <div className="flex flex-wrap gap-2">
        {ADMIN_LINKS.map((link) => {
          const href = `/${locale}/admin/${link.href}`;
          const isActive = pathname === href;

          return (
          <Link
            key={link.href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={[
              "rounded-md px-3 py-2 text-sm font-medium transition",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            ].join(" ")}
          >
            {link.label}
          </Link>
          );
        })}
      </div>

      <form action={logoutAdminAction}>
        <Button type="submit" variant="ghost" className="text-rose-700 hover:bg-rose-50 hover:text-rose-800">
          <LogOut className="mr-2 h-4 w-4" />
          Exit
        </Button>
      </form>
    </nav>
  );
}
