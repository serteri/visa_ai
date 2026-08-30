import Link from "next/link";

const LINKS = [
  { href: "pool", label: "Lead pool" },
  { href: "dashboard", label: "My leads" },
  { href: "earnings", label: "Earnings" },
] as const;

/** Shared across the three top-level agent pages (pool/dashboard/earnings)
 *  so each links to the other two consistently, with the current page
 *  highlighted -- distinct from the ADMIN nav in the portal layout above it. */
export function AgentNav({ locale, active }: { locale: string; active: (typeof LINKS)[number]["href"] }) {
  const prefix = locale === "en" ? "" : `/${locale}`;

  return (
    <nav aria-label="Agent areas" className="flex flex-wrap items-center gap-1">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={`${prefix}/agent/${link.href}`}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            active === link.href
              ? "bg-indigo-500/10 text-indigo-300"
              : "text-indigo-100 hover:bg-indigo-800 hover:text-white"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
