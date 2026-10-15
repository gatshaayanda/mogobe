import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com", pathname: "/**" },
    ],
  },
  async redirects() {
    return [
      { source: "/account", destination: "/", permanent: false },
      { source: "/request", destination: "/", permanent: false },
      { source: "/requests/:path*", destination: "/", permanent: false },
      { source: "/orders/:path*", destination: "/", permanent: false },
      { source: "/order", destination: "/basket", permanent: false },
      { source: "/saved", destination: "/", permanent: false },
      { source: "/book", destination: "/basket", permanent: false },
      { source: "/invite/:path*", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
