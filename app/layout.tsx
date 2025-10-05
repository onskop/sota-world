import './globals.css';
import type { Metadata } from 'next';
import { Poppins, Inter } from 'next/font/google';

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-display' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'State of the Art World Intelligence Hub',
  description:
    'Daily briefings on global state-of-the-art advancements across longevity, AI, pharmaceuticals, automation, and more. Updated by autonomous AI research agents.',
  metadataBase: new URL('https://example.com'),
  keywords: [
    'state of the art',
    'longevity research',
    'AI trends',
    'pharmaceutical best practices',
    'automation strategies',
    'innovation dashboard',
    'future technology',
    'deep research AI'
  ],
  openGraph: {
    title: 'State of the Art World Intelligence Hub',
    description:
      'Exploring the latest breakthroughs in longevity, AI, pharmaceuticals, and automation with AI-curated intelligence.',
    url: 'https://example.com',
    siteName: 'SOTA World',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SOTA World — AI Curated Frontier Intelligence',
    description:
      'Stay ahead with daily AI-researched reports on the world’s most advanced technologies and strategies.'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${inter.variable}`}>
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0000000000000000"
          crossOrigin="anonymous"
        ></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'G-XXXXXXXXXX');`
          }}
        />
      </head>
      <body className="bg-midnight text-white min-h-screen font-body">
        <div className="bg-gradient-to-br from-midnight via-black to-slate-900 min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
