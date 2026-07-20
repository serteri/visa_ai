import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser, homePathForRole } from "@/lib/auth/rbac";
import { AgentRegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Become an agent · LogiVisa Portal",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AgentRegisterPage({ params }: PageProps) {
  const { locale } = await params;

  // Already signed in? Skip the form and go to the role home -- a signed-in
  // AGENT lands on /agent/pool anyway, which shows the pending notice itself
  // if not yet approved.
  const user = await getCurrentUser();
  if (user) redirect(homePathForRole(user.role, locale));

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md items-center px-4">
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Become a LogiVisa agent</CardTitle>
          <p className="text-sm text-muted-foreground">
            Apply for a partner account. An admin reviews and approves every new agent before your
            referral link and lead pool go live.
          </p>
        </CardHeader>
        <CardContent>
          <AgentRegisterForm locale={locale} />
        </CardContent>
      </Card>
    </div>
  );
}
