import './globals.css';
import { Sora, Inter } from 'next/font/google';

const head = Sora({ subsets: ['latin'], variable: '--font-head', display: 'swap' });
const body = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata = {
  title: { default: 'SPIP Monitor', template: '%s · SPIP Monitor' },
  description: 'Monitoring dan inspeksi SPIP: Sarana, Prasarana, Instalasi, dan Peralatan.',
  robots: { index: false, follow: false },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b1f3a',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${head.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
