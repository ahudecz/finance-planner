import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Basic Turbopack configuration - keep minimal for compatibility
  experimental: {
    // Enable Turbopack for dev (but remove conflicting webpack config)
    turbo: {
      // Remove SVG loader configuration as it's webpack-specific
      // SVG imports will work with default Next.js handling
    }
  },
  
  // Server external packages for better performance
  serverExternalPackages: ['@nivo/core', '@nivo/pie', '@nivo/bar', '@nivo/line', '@nivo/heatmap'],
  
  // Only apply webpack config when NOT using Turbopack (i.e., in production builds)
  webpack: (config, { dev, isServer, webpack }) => {
    // Only apply webpack optimizations in production or when not using Turbopack
    if (!dev || process.env.TURBOPACK !== '1') {
      // Enable filesystem caching for faster rebuilds
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename]
        }
      };
      
      // Optimize chunk splitting for better performance
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            charts: {
              test: /[\\/]node_modules[\\/](@nivo|chart\.js|recharts)[\\/]/,
              name: 'charts',
              chunks: 'all',
              priority: 20
            },
            ai: {
              test: /[\\/]node_modules[\\/](@anthropic-ai|openai)[\\/]/,
              name: 'ai-libs',
              chunks: 'all', 
              priority: 15
            },
            animations: {
              test: /[\\/]node_modules[\\/](framer-motion)[\\/]/,
              name: 'animations',
              chunks: 'all',
              priority: 10
            }
          }
        }
      };
    }
    
    return config;
  },
  
  // Turbopack-compatible development optimizations
  ...(process.env.NODE_ENV === 'development' && {
    // Remove onDemandEntries as it's webpack-specific
    // Turbopack handles this automatically
  })
};

export default nextConfig;
