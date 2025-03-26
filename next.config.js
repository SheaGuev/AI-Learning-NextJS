/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure websocket support
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    return config;
  },
  // Increase serverless function timeout for websocket connections
  serverRuntimeConfig: {
    maxDuration: 300, // 5 minutes
  },
};

module.exports = nextConfig; 