import Link from "next/link";

const ADMIN_LINKS = [
  { href: "visas", label: "Visas" },
  { href: "referrals", label: "Referrals" },
  { href: "agents", label: "Agents" },
  { href: "full-check-waitlist", label: "Full Check Waitlist" },
];

export function AdminNav({ locale }: { locale: string }) {
  return (
    <nav
      aria-label="Admin navigation"
      className="flex flex-wrap gap-2 rounded-md border border-border/70 bg-card p-2"
    >
      {ADMIN_LINKS.map((link) => (
        <Link
          key={link.href}
          href={`/${locale}/admin/${link.href}`}
          className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
