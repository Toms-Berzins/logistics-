import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable strict mode for better development experience
  reactStrictMode: true,
  
  // Fast refresh for better development experience
  // swcMinify removed in Next.js 15 (enabled by default)
  
  // Temporarily disable ESLint and TypeScript for build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Development optimizations
  ...(process.env.NODE_ENV === 'development' && {
    // Enable fast refresh
    webpack: (config: any, { dev }: any) => {
      if (dev) {
        // Improve hot reload performance
        config.watchOptions = {
          poll: 1000,
          aggregateTimeout: 300,
        };
        
        // Add cache busting for CSS
        config.module.rules.push({
          test: /\.css$/,
          use: [
            {
              loader: 'style-loader',
              options: {
                // Add timestamp to CSS for cache busting
                attributes: {
                  'data-timestamp': Date.now(),
                },
              },
            },
          ],
        });
      }
      return config;
    },
  }),
  
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['mapbox-gl', 'socket.io-client', '@tanstack/react-table', 'recharts'],
  },
  
  // Bundle optimization
  webpack: (config, { dev, isServer }) => {
    // Optimize bundle splitting
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            enforce: true,
          },
          mapbox: {
            test: /[\\/]node_modules[\\/]mapbox-gl[\\/]/,
            name: 'mapbox',
            chunks: 'all',
            enforce: true,
          },
          charts: {
            test: /[\\/]node_modules[\\/](recharts|d3)[\\/]/,
            name: 'charts',
            chunks: 'all',
            enforce: true,
          },
          table: {
            test: /[\\/]node_modules[\\/]@tanstack[\\/]react-table[\\/]/,
            name: 'table',
            chunks: 'all',
            enforce: true,
          },
        },
      }
    }
    
    // Tree shaking optimization (compatible with Next.js cache)
    config.optimization.sideEffects = false
    
    return config
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  },
  
  // Configure image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Compression and performance
  compress: true,
  poweredByHeader: false,
  
  // Headers for performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ]
  }
};

export default nextConfig;
