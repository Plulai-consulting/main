import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/site/routes'

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/portal', '/api/', '/login', '/signup'] }], sitemap: SITE + '/sitemap.xml' }
}
