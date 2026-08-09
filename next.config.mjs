/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  agentRules: false,
  agentRules: false,
  transpilePackages: ['zustand'],
  experimental: {
    optimizePackageImports: ['lucide-react']
  },
  images: {
    minimumCacheTTL: 31536000,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: 'picsum.photos' }]
  }
};

export default nextConfig;
