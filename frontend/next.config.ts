import type { NextConfig } from "next";
import './env.mjs';

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // Garantir que variáveis de ambiente sejam expostas no browser
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_STORAGE_BUCKET: process.env.NEXT_PUBLIC_STORAGE_BUCKET,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
  },
  

  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
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
    // Em desenvolvimento usa localhost, em produção usa Railway
    const isDev = process.env.NODE_ENV === 'development';
    const backendUrl = isDev 
      ? 'http://localhost:5000' 
      : (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://medbraveapp-production.up.railway.app');
    
    console.log('[next.config.ts] Environment:', process.env.NODE_ENV);
    console.log('[next.config.ts] Backend URL:', backendUrl);
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
