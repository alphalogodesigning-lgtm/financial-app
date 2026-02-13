/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/auth.html', destination: '/auth', permanent: false },
      { source: '/onboarding', destination: '/onboarding.html', permanent: false }
    ];
  }
};

module.exports = nextConfig;
