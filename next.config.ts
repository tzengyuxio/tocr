import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 啟用 standalone 輸出，用於 Docker 部署
  output: "standalone",
  devIndicators: false,
  // sharp's native addon dlopens libvips from a sibling package, which file
  // tracing cannot see: the upload route then dies with ERR_DLOPEN_FAILED on
  // libvips-cpp.so. Ship the whole @img tree with the routes that use sharp.
  outputFileTracingIncludes: {
    "/api/upload": ["./node_modules/.pnpm/@img+*/node_modules/@img/**/*"],
  },
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
