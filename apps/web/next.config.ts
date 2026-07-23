import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // The default dev-mode route indicator (bottom-left "N" badge) sits on
  // top of real UI at that corner on nearly every screen (nav label,
  // inputs, action buttons) — see _refine/web/round1/CRITIQUE.md #1.
  // It's dev-only tooling, not part of the product, so turn it off
  // entirely rather than just relocating it.
  devIndicators: false,
};

export default nextConfig;
