import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable strict mode to reduce hydration warnings during development
  reactStrictMode: false,
  
  // Optimize for real-time features
  experimental: {
    optimizePackageImports: ['mapbox-gl', 'socket.io-client']
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  }
};

export default nextConfig;
