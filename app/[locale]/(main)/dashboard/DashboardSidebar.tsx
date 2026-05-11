"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Calculator,
  ClipboardList,
  FileText,
  MapPin,
  Menu,
  X,
  LogOut,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

function buildNav(locale: string): NavItem[] {
  return [
    {
      label: "Overview",
      href: `/${locale}/dashboard`,
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      label: "Points Calculator",
      href: `/${locale}/dashboard/points`,
      icon: <Calculator className="h-4 w-4" />,
    },
    {
      label: "Readiness Quiz",
      href: `/${locale}/dashboard/quiz`,
      icon: <ClipboardList className="h-4 w-4" />,
    },
    {
      label: "Reports",
      href: `/${locale}/dashboard/reports`,
      icon: <FileText className="h-4 w-4" />,
    },
    {
      label: "Visa Tracker",
      href: `/${locale}/dashboard/visa-tracker`,
      icon: <MapPin className="h-4 w-4" />,
    },
  ];
}

export function DashboardSidebar({ locale }: { locale: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const nav = buildNav(locale);

  const NavLinks = () => (
    <nav className="flex flex-col gap-1">
      {nav.map((item) => {
        const active =
          item.href === `/${locale}/dashboard`
            ? pathname === item.href
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 md:block">
        <div className="sticky top-28 flex flex-col gap-6 pr-4">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            My Dashboard
          </p>
          <NavLinks />
          <div className="mt-auto px-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: `/${locale}` })}
              className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-rose-500 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3 md:hidden">
        <span className="text-sm font-semibold text-slate-700">Dashboard</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: `/${locale}` })}
            className="text-slate-400 hover:text-rose-500 transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-slate-600"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="absolute inset-x-0 top-full z-40 bg-white border-b border-slate-100 p-4 md:hidden">
          <NavLinks />
        </div>
      )}
    </>
  );
}
