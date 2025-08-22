import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack configuration (moved from experimental.turbo)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js'
      }
    }
  },
  
  // Server external packages (moved from experimental.serverComponentsExternalPackages)
  serverExternalPackages: ['@nivo/core', '@nivo/pie', '@nivo/bar', '@nivo/line', '@nivo/heatmap'],
  
  // Webpack optimizations for development
  webpack: (config, { dev, isServer }) => {
    if (dev) {
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
  
  // Development server optimizations
  ...(process.env.NODE_ENV === 'development' && {
    onDemandEntries: {
      // Keep pages in memory longer during development
      maxInactiveAge: 60 * 1000 * 60, // 1 hour
      pagesBufferLength: 5
    }
  })
};

export default nextConfig;
