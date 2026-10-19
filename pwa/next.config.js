/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  // Static export for production build / GitHub Pages
  ...(isProd ? { output: 'export' } : {}),
  basePath: basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  // Handle /index.html in dev server without 404
  ...(!isProd ? {
    async rewrites() {
      return [
        {
          source: '/index.html',
          destination: '/',
        },
      ];
    },
  } : {}),
};

module.exports = nextConfig;
