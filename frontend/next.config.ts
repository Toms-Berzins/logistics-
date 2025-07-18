import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable strict mode for better development experience
  reactStrictMode: true,
  
  // Optimize for real-time features and PWA
  experimental: {
    optimizePackageImports: ['mapbox-gl', 'socket.io-client'],
    webpackBuildWorker: true,
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  },
  
  // Configure headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://api.mapbox.com; connect-src 'self' https://api.mapbox.com https://*.tiles.mapbox.com https://events.mapbox.com ws://localhost:* wss://localhost:* http://localhost:* https://localhost:*; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://api.mapbox.com; worker-src 'self' blob:; child-src blob:;",
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  
  // Configure webpack for better performance
  webpack: (config, { isServer }) => {
    // Optimize bundle size
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true,
        },
        mapbox: {
          test: /[\\/]node_modules[\\/]mapbox-gl[\\/]/,
          name: 'mapbox',
          priority: 20,
          reuseExistingChunk: true,
        },
        socketio: {
          test: /[\\/]node_modules[\\/]socket\.io-client[\\/]/,
          name: 'socketio',
          priority: 20,
          reuseExistingChunk: true,
        },
      },
    };
    
    return config;
  },
  
  // Configure image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
