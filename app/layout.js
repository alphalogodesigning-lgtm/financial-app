export const metadata = {
  title: 'Budget Tracker',
  description: 'Budget tracker app'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
