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
      {
        source: "/en/:path*",
        destination: "/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
