import path from "node:path";
import { config as loadDotenv } from "dotenv";

import type { NextConfig } from "next";

// Next only auto-loads `.env*` from `apps/web`. Cairnly keeps secrets in repo root `.env`.
loadDotenv({
  path: path.join(__dirname, "../../.env"),
  override: false,
});

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
};

export default nextConfig;
