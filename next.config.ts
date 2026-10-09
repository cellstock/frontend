import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  const basePath =
    phase === PHASE_DEVELOPMENT_SERVER
      ? ""
      : (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

  if (!/^(\/[a-zA-Z0-9_-]+)*$/.test(basePath)) {
    throw new Error(
      "NEXT_PUBLIC_BASE_PATH must be empty or a path such as /frontend/out.",
    );
  }

  return {
    output: "export",
    basePath,
    env: { NEXT_PUBLIC_BASE_PATH: basePath },
    trailingSlash: true,
    images: { unoptimized: true },
  };
}
