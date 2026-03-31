import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 啟用 standalone 輸出，用於 Docker 部署
  output: "standalone",
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
