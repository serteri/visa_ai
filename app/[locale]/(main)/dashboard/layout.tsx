import { auth } from "@/auth";
import { redirect } from "next/navigation";

import { DashboardSidebar } from "./DashboardSidebar";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function DashboardLayout({ children, params }: Props) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/sign-in`);
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex gap-8 py-8">
          <DashboardSidebar locale={locale} />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
