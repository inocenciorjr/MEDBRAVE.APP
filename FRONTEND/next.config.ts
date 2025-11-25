import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // Otimizar preload de recursos
  experimental: {
    optimizeCss: true,
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/aida-public/**',
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
      {
        protocol: 'https',
        hostname: 'medbrave.com.br',
      },
    ],
  },
  
  async rewrites() {
    return [
      {
        source: '/api/temp-images/:path*',
        destination: 'http://localhost:5000/api/temp-images/:path*',
      },
    ];
  },
};

export default nextConfig;
