import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Preskačemo proveru grešaka tokom build-a da ne bi nestalo memorije
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Onemogućavamo statičko generisanje stranica koje koriste bazu
  output: 'standalone',
};

export default nextConfig;
