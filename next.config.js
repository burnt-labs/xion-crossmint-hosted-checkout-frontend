/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        './node_modules/@swc/core-linux-x64-gnu',
        './node_modules/@swc/core-linux-x64-musl',
        './node_modules/@esbuild/linux-x64',
        './node_modules/@walletconnect/**',
        './node_modules/@dynamic-labs/**',
        './node_modules/pino/**',
        './node_modules/pino-pretty/**',
      ],
    },
    outputFileTracingIncludes: {
      '/': ['./node_modules/@crossmint/**'],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Handle pino-pretty as an optional dependency
    config.resolve.alias = {
      ...config.resolve.alias,
      'pino-pretty': false,
    };
    
    return config;
  },
  // Optimize build for Vercel
  swcMinify: true,
  productionBrowserSourceMaps: false,
}

module.exports = nextConfig
