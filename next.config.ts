import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/en",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "logivisa.com" }],
        destination: "https://www.logivisa.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
