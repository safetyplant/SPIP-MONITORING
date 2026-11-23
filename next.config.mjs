/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Halaman admin selalu ambil data terbaru, tidak memakai cache navigasi di browser.
    staleTimes: { dynamic: 0, static: 0 },
  },
};

export default nextConfig;
