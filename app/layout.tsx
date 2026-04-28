import type { Metadata } from "next";
import { Manrope, Noto_Sans } from "next/font/google";
import { GlobalDisclaimerFooter } from "@/components/global-disclaimer-footer";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Logivisa",
  description:
    "Structured visa pathway analysis and readiness reports for Australia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${manrope.variable} ${notoSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <GlobalDisclaimerFooter />
      </body>
    </html>
  );
}
