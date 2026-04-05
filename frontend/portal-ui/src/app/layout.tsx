import type { Metadata, Viewport } from 'next';
import { Inter, Cinzel } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'UBI Platform — Universal Basic Income Portal',
    template: '%s | UBI Platform',
  },
  description:
    'Your gateway to Universal Basic Income, tasks, agents, and treasury management.',
  keywords: ['UBI', 'Universal Basic Income', 'Portal', 'Dashboard', 'Finance'],
  authors: [{ name: 'UBI Platform' }],
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#0d1117',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${cinzel.variable}`}>
      <head>
        {/* Prevent flash of unstyled theme – inline script runs before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try {
    var stored = localStorage.getItem('ubi-theme');
    var themeId = stored ? JSON.parse(stored).state?.currentTheme : 'castellar';
    if (themeId) document.documentElement.setAttribute('data-theme', themeId);
    // all non-light themes keep the dark class
    var lightThemes = ['arctic','ghost','sakura'];
    if (!lightThemes.includes(themeId)) {
      document.documentElement.classList.add('dark');
    }
  } catch(e){}
})();
`,
          }}
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
