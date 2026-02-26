import ServiceWorkerRegister from './sw-register';
import './globals.css';

export const metadata = {
  title: 'Budget Tracker',
  description: 'Budget tracker app',
  manifest: '/manifest.json'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0a0a0a" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
