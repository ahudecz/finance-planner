import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Minimal configuration for maximum compatibility
  serverExternalPackages: [
    '@supabase/supabase-js'
  ],
  
  // Clean experimental section
  experimental: {
    // All experimental features removed to avoid conflicts
  },
  
  // Environment variables validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

export default nextConfig;
