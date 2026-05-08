/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  // Keep server-only Node.js packages out of the browser bundle (Next.js 14 API)
  experimental: { serverComponentsExternalPackages: ['razorpay'] },
}

module.exports = nextConfig
