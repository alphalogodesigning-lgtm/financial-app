/** @type {import('next').NextConfig} */
const routeRedirect = (source, destination) => ({
  source,
  destination,
  permanent: false
});

const nextConfig = {
  async redirects() {
    return [
      routeRedirect('/dashboard', '/index.html'),
      routeRedirect('/fixed-expenses', '/fixed-expenses.html'),
      routeRedirect('/variable-spending', '/variable-spending.html'),
      routeRedirect('/savings-goal', '/savings-goal.html'),
      routeRedirect('/purchase-simulator', '/purchase-simulator.html'),
      routeRedirect('/projections', '/projections.html'),
      routeRedirect('/insights', '/insights.html'),
      routeRedirect('/help-center', '/help-center.html'),
      routeRedirect('/auth', '/auth.html'),
      routeRedirect('/onboarding', '/onboarding.html')
    ];
  }
};

module.exports = nextConfig;
