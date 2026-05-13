import type { Metadata } from "next";
import { Manrope, Noto_Sans } from "next/font/google";
import Script from "next/script";
import { SessionProviderWrapper } from "@/components/SessionProviderWrapper";
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
  alternates: {
    canonical: "https://www.logivisa.com/en",
  },
  verification: {
    google: "foOddNGs8xqNCNQ74vzcc0AheCIMssYqDONHUOkWgCk",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${manrope.variable} ${notoSans.variable} h-full antialiased`}>
      <head>
        <link rel="canonical" href="https://www.logivisa.com/en" />
      </head>
      <body className="min-h-full flex flex-col">
        <SessionProviderWrapper>
          {children}
        </SessionProviderWrapper>

        {/* Meta Pixel */}
        <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){
            if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)
          }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','1499026238624549');
          fbq('track','PageView');
        `}</Script>
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1499026238624549&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
      </body>
    </html>
  );
}
