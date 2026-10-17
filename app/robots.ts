import { siteUrl } from '@configs/site';

import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/404'
    },
    sitemap: `${siteUrl}/sitemap.xml`
  };
}
