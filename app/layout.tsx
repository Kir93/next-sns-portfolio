import { notoSans } from '@configs/bigContents';

import ChakraUIProvider from '@provider/ChakraUIProvider';
import ReactQueryProvider from '@provider/ReactQueryProvider';

import { AppLayout } from '@components/layout';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NextJS App Router Zustand ReactQuery Template',
  description: 'Simple NextJS App Route Template'
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
          <ChakraUIProvider>
            <AppLayout>{children}</AppLayout>
          </ChakraUIProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
