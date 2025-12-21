/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    domains: ['avatars.githubusercontent.com', 'github.com'],
  },
  webpack: (config, { isServer }) => {
    // Exclude binary files and native modules from webpack bundling
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    }

    // Ignore native modules in client-side bundle
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@xenova/transformers': false,
        'onnxruntime-node': false,
      }
    }

    // Ignore binary .node files
    config.module.rules.push({
      test: /\.node$/,
      use: 'null-loader',
    })

    // Exclude onnxruntime-node from being processed
    config.externals = config.externals || []
    if (!isServer) {
      config.externals.push('@xenova/transformers', 'onnxruntime-node')
    }

    return config
  },
    // Exclude problematic packages from server-side rendering
  serverExternalPackages: [
    '@xenova/transformers',
    'onnxruntime-node',
    'madge',
    'dependency-tree',
    'filing-cabinet',
  ],
}

module.exports = nextConfig


