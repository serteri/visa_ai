"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { researchText } from "@/lib/marketing/research-journey";
import { publicPath } from "@/lib/seo/urls";

function Note({ locale }: { locale: string }) {
  const code = useSearchParams().get("occupation");
  if (!code || !/^\d{6}$/.test(code)) return null;
  return (
    <p className="mx-auto mb-4 max-w-4xl rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600" data-calculator-occupation={code}>
      {researchText(locale, `You arrived from the information page for ANZSCO ${code}. The calculator adds up published points tables for the answers you enter; it does not use the occupation.`, `ANZSCO ${code} bilgi sayfasından geldiniz. Hesaplayıcı, girdiğiniz yanıtlar için yayımlanmış puan tablolarını toplar; mesleği kullanmaz.`, `您来自 ANZSCO ${code} 的信息页面。计算器仅根据您输入的答案汇总已公布的积分表，不使用职业信息。`)}{" "}
      <Link className="font-medium text-cyan-900 underline" href={publicPath(locale, `/occupations/${code}`)}>
        {researchText(locale, "Back to the occupation information", "Meslek bilgilerine dön", "返回职业信息")}
      </Link>
    </p>
  );
}

/** Context line for /tools/points-calculator/australia?occupation=<code>. Client-side, so the calculator page stays statically rendered. */
export function CalculatorOccupationNote({ locale }: { locale: string }) {
  return (
    <Suspense fallback={null}>
      <Note locale={locale} />
    </Suspense>
  );
}
