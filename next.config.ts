import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/30a",
        destination: "/towns",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
