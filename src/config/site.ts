// On Vercel the production domain comes from its system env, so the deployed
// robots/sitemap never point at localhost when NEXT_PUBLIC_DOMAIN_URL is unset.
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

/** Canonical site origin shared by robots and sitemap. */
export const siteUrl =
  process.env.NEXT_PUBLIC_DOMAIN_URL ||
  (vercelUrl ? `https://${vercelUrl}` : 'http://localhost:3000');
