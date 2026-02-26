'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/fixed-expenses', label: 'Fixed Expenses' },
  { href: '/variable-spending', label: 'Variable Spending' },
  { href: '/savings-goal', label: 'Savings Goal' },
  { href: '/purchase-simulator', label: 'Purchase Simulator' },
  { href: '/projections', label: 'Projections' },
  { href: '/insights', label: 'Insights' },
  { href: '/help-center', label: 'Help Center' }
];

export default function AppNav() {
  const pathname = usePathname();
  const router = useRouter();

  const warmRoute = (href) => {
    router.prefetch(href);
  };

  return (
    <nav className="main-nav" aria-label="Primary">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            className={`nav-link${active ? ' active' : ''}`}
            onMouseEnter={() => warmRoute(item.href)}
            onFocus={() => warmRoute(item.href)}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
