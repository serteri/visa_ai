import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Inter, Manrope, Noto_Sans } from "next/font/google";
import Script from "next/script";
import { SessionProviderWrapper } from "@/components/SessionProviderWrapper";
import { ThemeProviderWrapper } from "@/components/ThemeProviderWrapper";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
});

// Landing-page-only fonts ("case file" redesign, see components/landing/*).
// Site-wide default typography stays Manrope/Noto Sans -- these three are
// opt-in via the .case-file/.cf-serif/.cf-mono/.cf-sans utility classes in
// globals.css, not applied to <body> directly.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const SITE_NAME = "LogiVisa";
const BASE_URL = "https://www.logivisa.com";
const SITE_DESCRIPTION =
  "Australia Skilled Migration (Subclass 189/190/491) points calculator, ANZSCO finder, and readiness reports — plus complete PDF migration guides from $9.99.";

// This root layout wraps every locale. It sets the site-wide English default;
// per-locale title/description/OpenGraph is generated in
// app/[locale]/(main)/layout.tsx, which is what Google actually indexes.
//
// IMPORTANT: proxy.ts serves English prefixless — "/en" redirects to "/",
// while "/tr" and "/zh-Hans" keep their prefix. So the canonical English
// URL is the bare domain root, NOT "/en". Every URL below reflects that.
export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  // Plain string, no template — the locale layout (app/[locale]/(main)/layout.tsx)
  // owns the actual title.template for every real page. Defining a template at
  // both levels causes Next.js to compound them (e.g. "X | LogiVisa | LogiVisa").
  title: `${SITE_NAME} — Australia Skilled Migration & PR Guide`,
  description: SITE_DESCRIPTION,
  keywords: [
    "Australia skilled migration",
    "Australia PR points calculator",
    "Subclass 189",
    "Subclass 190",
    "Subclass 491",
    "Australia student visa",
    "Subclass 500",
    "ANZSCO code finder",
  ],
  alternates: {
    canonical: BASE_URL,
    languages: {
      en: BASE_URL,
      tr: `${BASE_URL}/tr`,
      "zh-Hans": `${BASE_URL}/zh-Hans`,
      "x-default": BASE_URL,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: BASE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Australia Skilled Migration & PR Guide`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og/default-og.png",
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "foOddNGs8xqNCNQ74vzcc0AheCIMssYqDONHUOkWgCk",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#132844",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // next-themes sets/removes the "dark"/"light" class on this element
      // client-side after hydration; suppressHydrationWarning stops React
      // from flagging that as a server/client mismatch (the documented
      // next-themes pattern -- see https://github.com/pacocoursey/next-themes).
      suppressHydrationWarning
      className={`${manrope.variable} ${notoSans.variable} ${fraunces.variable} ${ibmPlexMono.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-white">
        <ThemeProviderWrapper>
          <SessionProviderWrapper>
            {children}
          </SessionProviderWrapper>
        </ThemeProviderWrapper>

        {/* Meta Pixel — production only */}
        {process.env.NODE_ENV === "production" && (
          <>
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
          </>
        )}
      </body>
    </html>
  );
}
