import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // English is served prefixless (see proxy.ts) -- /en/* previously
      // 307-redirected via middleware; this makes it a permanent 301/308 for
      // SEO authority transfer. /tr and /zh-Hans are deliberately excluded:
      // they keep their locale prefix as real, separate content, not a
      // redirect target -- collapsing them here would 301 the entire
      // Turkish/Chinese site onto the English pages (tested and reverted;
      // see conversation history).
      // Split into two rules instead of one "/en/:path*" -> "/:path*" --
      // with a zero-length catch-all match (bare "/en", no trailing
      // segments), Next.js interpolates destination "/:path*" to an empty
      // string instead of "/", producing a 308 with an empty Location
      // header (confirmed via curl -I; browsers just hang/loop on it).
      // Splitting the exact "/en" match out avoids the zero-segment case
      // entirely; ":path+" (one-or-more) below never hits it.
      {
        source: "/en",
        destination: "/",
        permanent: true,
      },
      {
        source: "/en/:path+",
        destination: "/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
