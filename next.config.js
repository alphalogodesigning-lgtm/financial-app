/** @type {import('next').NextConfig} */
const htmlRedirect = (source, destination) => ({
  source,
  destination,
  permanent: false,
  missing: [{ type: 'query', key: 'legacy' }]
});

const nextConfig = {
  async redirects() {
    return [
      htmlRedirect('/index.html', '/dashboard'),
      htmlRedirect('/fixed-expenses.html', '/fixed-expenses'),
      htmlRedirect('/variable-spending.html', '/variable-spending'),
      htmlRedirect('/savings-goal.html', '/savings-goal'),
      htmlRedirect('/purchase-simulator.html', '/purchase-simulator'),
      htmlRedirect('/projections.html', '/projections'),
      htmlRedirect('/insights.html', '/insights'),
      htmlRedirect('/help-center.html', '/help-center'),
      htmlRedirect('/auth.html', '/auth'),
      htmlRedirect('/onboarding.html', '/onboarding')
    ];
  }
};

module.exports = nextConfig;
