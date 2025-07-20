// Webpack configuration for bundle optimization (if using custom webpack)
// This is typically handled by Next.js, but provided for reference

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = {
  optimization: {
    // Enable tree shaking
    usedExports: true,
    sideEffects: false,
    
    // Split chunks optimization
    splitChunks: {
      chunks: 'all',
      minSize: 20000,
      minRemainingSize: 0,
      minChunks: 1,
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      enforceSizeThreshold: 50000,
      cacheGroups: {
        defaultVendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
          reuseExistingChunk: true,
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
        // Mapbox vendor chunk
        mapbox: {
          test: /[\\/]node_modules[\\/]mapbox-gl[\\/]/,
          name: 'mapbox',
          chunks: 'all',
          enforce: true,
          priority: 20,
        },
        // React vendor chunk
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react',
          chunks: 'all',
          enforce: true,
          priority: 20,
        },
        // Table library chunk
        table: {
          test: /[\\/]node_modules[\\/]@tanstack[\\/]react-table[\\/]/,
          name: 'table',
          chunks: 'all',
          enforce: true,
          priority: 15,
        },
        // Charts library chunk
        charts: {
          test: /[\\/]node_modules[\\/](recharts|d3)[\\/]/,
          name: 'charts',
          chunks: 'all',
          enforce: true,
          priority: 15,
        },
        // Icons chunk
        icons: {
          test: /[\\/]node_modules[\\/]@heroicons[\\/]/,
          name: 'icons',
          chunks: 'all',
          enforce: true,
          priority: 10,
        },
      },
    },
  },
  
  plugins: [
    // Bundle analyzer for development
    process.env.ANALYZE === 'true' && new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html',
    }),
    
    // Compression for production
    process.env.NODE_ENV === 'production' && new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8,
    }),
  ].filter(Boolean),
  
  resolve: {
    // Tree shaking for ES modules
    mainFields: ['module', 'main'],
  },
  
  module: {
    rules: [
      // Tree shaking for lodash
      {
        test: /[\\/]node_modules[\\/]lodash[\\/]/,
        sideEffects: false,
      },
      // Optimize imports for large libraries
      {
        test: /[\\/]node_modules[\\/](moment|date-fns)[\\/]/,
        sideEffects: false,
      },
    ],
  },
};