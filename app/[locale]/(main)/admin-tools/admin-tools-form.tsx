"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type AdminResetState,
  resetUserReportLimitFromForm,
} from "@/app/[locale]/(main)/full-check/actions";

type AdminToolsFormProps = {
  locale: string;
};

const initialState: AdminResetState = {
  status: "idle",
  message: "",
};

export function AdminToolsForm({ locale }: AdminToolsFormProps) {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  const [state, formAction, isPending] = useActionState(
    resetUserReportLimitFromForm,
    initialState
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isTr
            ? "Rapor limitini sifirla"
            : isZh
              ? "重置报告次数限制"
              : "Reset report limit"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" name="email" type="email" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminSecret">Admin Secret Password</Label>
            <Input id="adminSecret" name="adminSecret" type="password" required />
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending
              ? isTr
                ? "Sifirlaniyor..."
                : isZh
                  ? "重置中..."
                  : "Resetting..."
              : isTr
                ? "Kullanici Rapor Limitini Sifirla"
                : isZh
                  ? "重置该用户报告限制"
                  : "Reset Report Limit for User"}
          </Button>

          {state.message ? (
            <p className={state.status === "error" ? "text-sm text-red-600" : "text-sm text-green-600"}>
              {state.message}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
