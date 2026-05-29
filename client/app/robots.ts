import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tmailcc.app';

  return {
    rules: [
      {
        // Allow all crawlers
        userAgent: '*',
        allow: '/',
        // Disallow API endpoints, app routes, and private areas
        disallow: [
          '/api/',
          '/app/',
          '/otp/',
          '/developer/',
          '/admin/',
          '/api-docs/',
        ],
      },
      // Google-specific rules
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/app/',
          '/otp/',
          '/developer/',
          '/admin/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
