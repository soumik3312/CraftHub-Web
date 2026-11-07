import '../src/style.css';

export const metadata = {
  title: 'CraftHub — Build together',
  description: 'Meet the right people and build together on CraftHub.',
  icons: { icon: '/brand/app-logo.png' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
