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
        <ReactQueryProvider>
          <MswProvider>
            <AppLayout>{children}</AppLayout>
          </MswProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
