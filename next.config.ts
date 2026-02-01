import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 啟用 standalone 輸出，用於 Docker 部署
  output: "standalone",
};

export default nextConfig;
