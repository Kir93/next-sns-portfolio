import './globals.css';

import { notoSans } from '@configs/bigContents';

import MswProvider from '@provider/MswProvider';
import ReactQueryProvider from '@provider/ReactQueryProvider';

import { AppLayout } from '@components/layout';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Next SNS Portfolio',
  description: 'X-style mobile SNS feed portfolio'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={notoSans.className} suppressHydrationWarning>
      <body>
        <a
          href="#main"
          className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-2 focus-visible:top-2 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-white focus-visible:px-3 focus-visible:py-2 focus-visible:shadow"
        >
          본문으로 건너뛰기
        </a>
        <ReactQueryProvider>
          <MswProvider>
            <AppLayout>{children}</AppLayout>
          </MswProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
