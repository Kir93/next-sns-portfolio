import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_DOMAIN_URL || 'http://localhost:3000';

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
