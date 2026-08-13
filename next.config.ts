import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 啟用 standalone 輸出，用於 Docker 部署
  // Standalone output is for the Docker image. On Vercel it copies pnpm's
  // symlinked node_modules into the function, which drops sharp's libvips
  // shared object -- /api/upload then dies with ERR_DLOPEN_FAILED before its
  // own error handling runs. Vercel traces the files itself, so leave it off.
  output: process.env.VERCEL ? undefined : "standalone",
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
