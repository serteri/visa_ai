import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser, homePathForRole } from "@/lib/auth/rbac";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in · LogiVisa Portal",
  robots: { index: false, follow: false },
};

type LoginPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function LoginPage({ params, searchParams }: LoginPageProps) {
  const { locale } = await params;
  const { callbackUrl } = await searchParams;

  // Already signed in? Skip the form and go to the role home.
  const user = await getCurrentUser();
  if (user) redirect(homePathForRole(user.role, locale));

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md items-center px-4">
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Portal sign in</CardTitle>
          <p className="text-sm text-muted-foreground">
            Agent &amp; admin access to the LogiVisa lead management system.
          </p>
        </CardHeader>
        <CardContent>
          <LoginForm locale={locale} callbackUrl={callbackUrl} />
        </CardContent>
      </Card>
    </div>
  );
}
