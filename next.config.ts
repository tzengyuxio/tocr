import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 啟用 standalone 輸出，用於 Docker 部署
  // Standalone output is for the Docker image. On Vercel it copies pnpm's
  // symlinked node_modules into the function, which drops sharp's libvips
  // shared object -- /api/upload then dies with ERR_DLOPEN_FAILED before its
  // own error handling runs. Vercel traces the files itself, so leave it off.
  output: process.env.VERCEL ? undefined : "standalone",
  devIndicators: false,
  // File tracing follows JS requires, so it never sees the libvips shared
  // object that sharp's native addon dlopens at runtime. Name it explicitly,
  // via pnpm's real directories rather than the symlinked node_modules root.
  outputFileTracingIncludes: {
    "/api/upload": [
      "./node_modules/.pnpm/@img+sharp-libvips-linux-x64@*/node_modules/@img/sharp-libvips-linux-x64/lib/*",
    ],
  },
  // The key itself is a server secret the admin form cannot read, so derive a
  // public flag from it rather than adding a second variable someone has to
  // remember to keep in sync. Inlined at build time, which matches how Vercel
  // freezes environment variables at deploy: adding the key needs a redeploy.
  env: {
    NEXT_PUBLIC_RAWG_ENABLED: process.env.RAWG_API_KEY ? "true" : "",
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
